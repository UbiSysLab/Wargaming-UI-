import { OpOrderData } from './opOrder.types';

export interface TaskSyncRow {
  id: string;
  asltUnit: string;          // 2. UnitName (e.g. "A Company", "41 Infantry Brigade")
  relatedFrom: string;       // 4. Related from (Parent formation, e.g. "12 Infantry Battalion")
  formation: string;         // 11. Formation (e.g. "Two-front formation", "Column", "Line")
  task: string;              // 3. Task (Verb: "Capture", "Establish", "Isolate", "Breach", etc.)
  objective: string;         // 7. Objective (e.g. "Kigali North", "Paris", "Bridgehead")
  taskDesc: string;          // Task description or purpose clause
  isCtgcy: boolean;          // Contingency / On Orders
  resUnit: string;           // 5. RelatedTo (Supported / Reserve unit, e.g. "D Company", "223 Armoured Brigade")
  relatedToPurpose: string;  // 6. RelatedToPuropse (Purpose to related unit, e.g. "Provide Firebase")
  fireUnit: string;          // Fire support unit (e.g. "Divisional Artillery Brigade")
  startLoc: string;          // 12. StartLoc (e.g. "FUP Alpha", "Assembly Area RED")
  timingType: string;        // 8. TimingType (e.g. "DTG", "H Hr", "ST", "NLT", "NET", "on-order")
  startTime: string;         // 9. DTG / start time (e.g. "110100Z FEB 25", "100600")
  endType: string;           // End qualifier ("By", "ET", "To", "NLT")
  endTime: string;           // End time / DTG
  east: string;              // East grid / coordinate
  north: string;             // North grid / coordinate
  successSignal: string;     // 10. Success Signal (e.g. "Green star flare", "Codeword VICTOR")
  remarks: string;           // 13. Remarks (e.g. "Maintain radio silence", "ROE Alpha")
  execCode: string;          // Exec code / codeword
}

export interface TaskSyncPhase {
  id: string;
  name: string;
  label: string;
  taskType: string;
  taskDesc: string;
  fromTime: string;
  toTime: string;
  east: string;
  north: string;
  color: string;
  rows: TaskSyncRow[];
}

export interface TaskSyncData {
  planName: string;
  isCtgcy: boolean;
  objectives: Array<{ id: string; label: string; text: string }>;
  overallFrom: string;
  overallTo: string;
  phases: TaskSyncPhase[];
}

/**
 * Universally extracts Task Sync matrix data from either:
 * 1. Backend LLM generated JSON (DRDO 13-field Single Command records or standard OPORD schema)
 * 2. Document OPORD text (EXECUTION, MISSION, OWN, ENEMY)
 */
export function extractTaskSyncFromOpOrder(
  opOrder: Partial<OpOrderData>,
  structuredJson?: any
): TaskSyncData {
  const executionText = opOrder.execution || '';
  const missionText = opOrder.mission || '';
  const ownText = opOrder.own || '';

  // 1. Extract Objectives
  const objectives = extractObjectives(missionText, structuredJson);

  // 2. Extract structured Unit Task Sections from OPORD execution text
  const docUnitBlocks = parseUnitTaskSections(executionText, ownText);

  // 3. Extract Phases from OPORD & LLM JSON
  const phases = buildPhases(executionText, missionText, ownText, docUnitBlocks, structuredJson);

  // Overall timing
  const overallFrom = extractTimeFromText(missionText || executionText || ownText, 'start') || '100600';
  const overallTo = extractTimeFromText(missionText || executionText || ownText, 'end') || '121200';

  return {
    planName: opOrder.reportNumber || structuredJson?.metadata?.operation_name || 'Op Plan 1',
    isCtgcy: false,
    objectives: objectives.length > 0 ? objectives : [
      { id: 'obj-1', label: 'Obj 1', text: '' },
      { id: 'obj-2', label: 'Obj 2', text: '' },
    ],
    overallFrom: overallFrom !== '100600' ? overallFrom : '110400',
    overallTo: overallTo !== '121200' ? overallTo : '121200',
    phases,
  };
}

/**
 * Extracts objectives from mission text or structured JSON
 */
function extractObjectives(missionText: string, json?: any): Array<{ id: string; label: string; text: string }> {
  const list: Array<{ id: string; label: string; text: string }> = [];

  // Check structured JSON objectives (max 2)
  if (json?.mission?.objectives && Array.isArray(json.mission.objectives) && json.mission.objectives.length > 0) {
    json.mission.objectives.slice(0, 2).forEach((obj: any, idx: number) => {
      const text = typeof obj === 'string' ? obj : obj.text || obj.description || '';
      if (text && list.length < 2) list.push({ id: `obj-${idx + 1}`, label: `Obj ${idx + 1}`, text: text.trim() });
    });
  }

  // If text is available and list has space, extract at most up to 2
  if (missionText && list.length < 2) {
    const clauses = missionText.split(/[,;\n]+/).map((c) => c.trim()).filter((c) => c.length > 10);
    for (const c of clauses) {
      if (list.length >= 2) break;
      if (/bridgehead|isolation|foothold|capture|progress operations|projection area|secure/i.test(c)) {
        const clean = c.replace(/^(?:to\s+include\s+|and\s+)/i, '').trim();
        if (!list.some((existing) => existing.text.toLowerCase().includes(clean.toLowerCase().slice(0, 15)))) {
          list.push({
            id: `obj-${list.length + 1}`,
            label: `Obj ${list.length + 1}`,
            text: clean,
          });
        }
      }
    }
  }

  // Handle flat JSON task descriptions as objective
  if (list.length === 0 && json?.task?.name) {
    list.push({ id: 'obj-1', label: 'Obj 1', text: json.task.name });
    if (json.task.description && json.task.description !== json.task.name) {
      list.push({ id: 'obj-2', label: 'Obj 2', text: json.task.description });
    }
  }

  // Strictly enforce 2 slots matching the Lunacy design
  while (list.length < 2) {
    list.push({
      id: `obj-${list.length + 1}`,
      label: `Obj ${list.length + 1}`,
      text: '',
    });
  }

  return list.slice(0, 2);
}

interface ParsedUnitTask {
  unitName: string;
  grouping: string;
  relatedFrom: string;
  formation: string;
  startLoc: string;
  successSignal: string;
  remarks: string;
  objective: string;
  phase1Task: string;
  phase1Time: string;
  phase2Task: string;
  phase2Time: string;
  generalTask: string;
}

/**
 * Parses individual Unit Task & Grouping sections from standard military OPORD execution
 */
function parseUnitTaskSections(executionText: string, ownText: string): ParsedUnitTask[] {
  const combined = executionText + '\n\n' + ownText;
  const units: ParsedUnitTask[] = [];

  const unitHeadingRegex = /(?:^|\n)(?:[0-9]+\.\s*)?([0-9]+\s*(?:Infantry\s*Brigade|Mechanised\s*Battalion|Armoured\s*Brigade|Armoured\s*Regiment)|Divisional\s*(?:Integral\s*)?Armoured\s*Regiment|Divisional\s*Artillery\s*Brigade|[0-9]+\s*Corps|[0-9]+\s*Infantry\s*Division)/gi;

  const matches = Array.from(combined.matchAll(unitHeadingRegex));

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const unitName = match[1].trim();
      const startIndex = match.index! + match[0].length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index! : combined.length;
      const unitBlock = combined.slice(startIndex, endIndex);

      // Extract Grouping
      const groupingMatch = unitBlock.match(/Grouping\.?([\s\S]*?)(?:Tasks\.?|Tasks\b|$)/i);
      const groupingText = groupingMatch ? cleanGroupingText(groupingMatch[1]) : '-';

      // Extract Phase 1 Tasks
      const p1Match = unitBlock.match(/Phase\s*1\.?([\s\S]*?)(?:Phase\s*2\.?|Subsequent\s*Operations\.?|$)/i);
      const p1Text = p1Match ? cleanTaskText(p1Match[1]) : '';
      const p1Time = extractTimeFromText(p1Text, 'end') || '110700';

      // Extract Phase 2 Tasks
      const p2Match = unitBlock.match(/Phase\s*2\.?([\s\S]*?)(?:Subsequent\s*Operations\.?|Coordination|$)/i);
      const p2Text = p2Match ? cleanTaskText(p2Match[1]) : '';
      const p2Time = extractTimeFromText(p2Text, 'end') || '121200';

      // General task if not split by phase
      const tasksMatch = unitBlock.match(/Tasks\.?([\s\S]*?)(?:Grouping|Coordination|$)/i);
      const generalText = tasksMatch ? cleanTaskText(tasksMatch[1]) : '';

      // Extract canonical military attributes from unit block
      const startLoc = extractStartLocFromText(unitBlock);
      const formation = extractFormationFromText(unitBlock);
      const successSignal = extractSuccessSignalFromText(unitBlock);
      const remarks = extractRemarksFromText(unitBlock);
      const objective = extractObjectiveFromText(unitBlock);
      const relatedFrom = extractRelatedFromText(unitBlock, ownText);

      units.push({
        unitName,
        grouping: groupingText,
        relatedFrom,
        formation,
        startLoc,
        successSignal,
        remarks,
        objective,
        phase1Task: p1Text,
        phase1Time: p1Time,
        phase2Task: p2Text,
        phase2Time: p2Time,
        generalTask: generalText,
      });
    }
  }

  return units;
}

/**
 * Constructs the multi-phase matrix combining LLM JSON, unit blocks, and text
 */
function buildPhases(
  executionText: string,
  missionText: string,
  ownText: string,
  docUnits: ParsedUnitTask[],
  json?: any
): TaskSyncPhase[] {
  // 1. Try parsing directly from structured LLM JSON
  if (json) {
    const llmPhases = parseLlmPhases(json, docUnits);
    if (llmPhases && llmPhases.length > 0) {
      return llmPhases;
    }
  }

  const phases: TaskSyncPhase[] = [];

  const flatVerb = json?.task_verb ? formatMilitaryTitle(json.task_verb) : '';
  const flatType = json?.task_type ? formatMilitaryTitle(json.task_type) : '';
  const flatTaskDesc = (flatVerb && flatType) ? `${flatVerb} ${flatType}` : (flatVerb || flatType || '');
  const flatTime = json?.time?.value ? extractTimeFromText(json.time.value, 'end') : '';

  // 2. If we have parsed unit blocks with Phase 1 and Phase 2 tasks:
  const hasPhase1Units = docUnits.some((u) => u.phase1Task || u.generalTask);
  const hasPhase2Units = docUnits.some((u) => u.phase2Task);

  if (hasPhase1Units || docUnits.length > 0) {
    const p1Rows: TaskSyncRow[] = [];
    docUnits.forEach((u, idx) => {
      const taskStr = u.phase1Task || u.generalTask || (idx === 0 && flatTaskDesc ? flatTaskDesc : '');
      if (!taskStr && docUnits.length > 3) return;

      const verb = inferTaskVerb(taskStr || u.unitName);
      p1Rows.push({
        id: `row-1-${idx + 1}`,
        asltUnit: u.unitName,
        relatedFrom: u.relatedFrom || '11 Infantry Division',
        formation: u.formation || (idx === 0 ? 'Two-front formation' : 'Column formation'),
        task: verb,
        objective: u.objective || (idx === 0 ? 'Bridgehead Delhi-York' : 'FZDL Kigali'),
        taskDesc: taskStr || `${verb} designated objectives`,
        isCtgcy: /be prepared|on orders/i.test(taskStr),
        resUnit: '-',
        relatedToPurpose: idx === 0 ? 'Provide anti-tank overwatch' : 'Facilitate brigade breakout',
        fireUnit: '-',
        startLoc: u.startLoc || (idx === 0 ? 'FUP Alpha' : 'Assembly Area RED'),
        timingType: idx === 0 ? 'H Hr' : 'ST',
        startTime: '100600',
        endType: idx === 0 ? 'By' : 'ET',
        endTime: u.phase1Time || flatTime || '110700',
        east: '4908',
        north: '8403',
        successSignal: u.successSignal || (idx === 0 ? 'Green star flare' : 'Codeword VICTOR'),
        remarks: u.remarks || 'Maintain radio silence during induction',
        execCode: `EX-1-${idx + 1}`,
      });
    });

    phases.push({
      id: 'phase-1',
      name: 'Phase 1',
      label: 'Phase One',
      taskType: flatVerb || 'Capture',
      taskDesc: flatTaskDesc || 'Capture Adv. Pos.',
      fromTime: '222200',
      toTime: flatTime || '230100',
      east: '4908',
      north: '8403',
      color: '#d946ef',
      rows: p1Rows.length > 0 ? p1Rows : createDefaultRows('Phase 1'),
    });
  }

  if (hasPhase2Units || docUnits.length > 1) {
    const p2Rows: TaskSyncRow[] = [];
    docUnits.forEach((u, idx) => {
      const taskStr = u.phase2Task || u.generalTask;
      if (!taskStr && docUnits.length > 3) return;

      const verb = inferTaskVerb(taskStr || u.unitName);
      p2Rows.push({
        id: `row-2-${idx + 1}`,
        asltUnit: u.unitName,
        relatedFrom: u.relatedFrom || '11 Infantry Division',
        formation: u.formation || 'Line formation',
        task: verb,
        objective: u.objective || 'Strong points Ulm & London',
        taskDesc: taskStr || `${verb} designated objectives`,
        isCtgcy: /be prepared|on orders/i.test(taskStr),
        resUnit: '-',
        relatedToPurpose: 'Block enemy counter-attack from East',
        fireUnit: '-',
        startLoc: u.startLoc || 'ORP Charlie',
        timingType: 'ST',
        startTime: '110700',
        endType: 'ET',
        endTime: u.phase2Time || '121200',
        east: '4908',
        north: '8403',
        successSignal: u.successSignal || 'Red star flare x 2',
        remarks: u.remarks || 'On orders of Force Commander',
        execCode: `EX-2-${idx + 1}`,
      });
    });

    if (p2Rows.length > 0) {
      phases.push({
        id: 'phase-2',
        name: 'Phase 2',
        label: 'Phase Two',
        taskType: 'Isolate',
        taskDesc: 'Isolate London and Ulm and breakout',
        fromTime: '110700',
        toTime: '121200',
        east: '4908',
        north: '8403',
        color: '#3b82f6',
        rows: p2Rows,
      });
    }
  }

  // 3. Fallback default
  if (phases.length === 0) {
    phases.push({
      id: 'phase-1',
      name: 'Phase 1',
      label: 'Phase One',
      taskType: flatVerb || 'Capture',
      taskDesc: flatTaskDesc || 'Capture Adv. Pos.',
      fromTime: '222200',
      toTime: flatTime || '230100',
      east: '4908',
      north: '8403',
      color: '#d946ef',
      rows: createDefaultRows('Phase 1'),
    });
  }

  return phases;
}

/**
 * Normalizes phase identifiers (e.g. 'PHASE_1', 'phase_1', 'Phase 1', 'Phase I') into a canonical 'phase1' key.
 */
function normalizePhaseKey(key: string): string {
  if (!key) return '';
  const numMatch = key.match(/[0-9]+/);
  if (numMatch) return `phase${numMatch[0]}`;
  const romanMap: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
  const cleaned = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [r, n] of Object.entries(romanMap)) {
    if (cleaned.endsWith(r)) return `phase${n}`;
  }
  return cleaned;
}

/**
 * Dynamically parses LLM generated JSON hierarchical structures or standard schema arrays
 */
function parseLlmPhases(json: any, docUnits: ParsedUnitTask[]): TaskSyncPhase[] | null {
  const colorPalette = ['#d946ef', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const numberWordMap: Record<string, string> = {
    '1': 'One',
    '2': 'Two',
    '3': 'Three',
    '4': 'Four',
    '5': 'Five',
  };

  // Case A: Single Command array (OrderRecord list with 13 canonical fields)
  const singleCommandArray = Array.isArray(json)
    ? json
    : Array.isArray(json?.commands)
    ? json.commands
    : Array.isArray(json?.records)
    ? json.records
    : Array.isArray(json?.orders)
    ? json.orders
    : null;

  if (singleCommandArray && singleCommandArray.length > 0 && (singleCommandArray[0].UnitName || singleCommandArray[0].unit_name || singleCommandArray[0].Task)) {
    const phaseMap: Record<string, TaskSyncRow[]> = {};

    singleCommandArray.forEach((item: any, idx: number) => {
      const pRaw = item.Phaseno || item.phaseno || item.phase || 'Phase 1';
      const numMatch = String(pRaw).match(/[0-9]+/);
      const phaseNum = numMatch ? numMatch[0] : '1';
      const phaseKey = `Phase ${phaseNum}`;

      if (!phaseMap[phaseKey]) phaseMap[phaseKey] = [];

      const uName = item.UnitName || item.unit_name || `Unit ${idx + 1}`;
      const relFrom = item['Related from'] || item.related_from || item.relatedFrom || '11 Infantry Division';
      const formation = item.Formation || item.formation || 'Two-front formation';
      const task = item.Task || item.task || 'Capture';
      const obj = item.Objective || item.objective || '';
      const relTo = item.RelatedTo || item.related_to || item.relatedTo || '-';
      const relToPurpose = item.RelatedToPuropse || item.RelatedToPurpose || item.related_to_purpose || item.relatedToPurpose || '';
      const timingType = item.TimingType || item.timing_type || item.timingType || (idx === 0 ? 'H Hr' : 'ST');
      const dtg = item.DTG || item.dtg || item.time || (phaseNum === '1' ? '110100Z FEB 25' : '121200Z FEB 25');
      const succSignal = item['Success Signal'] || item.success_signal || item.successSignal || 'Green star flare';
      const startLoc = item.StartLoc || item.start_loc || item.startLoc || 'FUP Alpha';
      const remarks = item.Remarks || item.remarks || 'Maintain radio silence';

      phaseMap[phaseKey].push({
        id: `row-${phaseNum}-${phaseMap[phaseKey].length + 1}`,
        asltUnit: uName,
        relatedFrom: relFrom !== 'Not Available' ? relFrom : '11 Infantry Division',
        formation: formation !== 'Not Available' ? formation : 'Two-front formation',
        task: formatMilitaryTitle(task),
        objective: obj !== 'Not Available' ? obj : '',
        taskDesc: relToPurpose !== 'Not Available' ? relToPurpose : `${task} ${obj}`.trim(),
        isCtgcy: /be prepared|on orders|contingency/i.test(remarks || relToPurpose),
        resUnit: relTo !== 'Not Available' ? relTo : '-',
        relatedToPurpose: relToPurpose !== 'Not Available' ? relToPurpose : '',
        fireUnit: '-',
        startLoc: startLoc !== 'Not Available' ? startLoc : 'FUP Alpha',
        timingType: timingType !== 'Not Available' ? timingType : 'DTG',
        startTime: dtg !== 'Not Available' ? dtg : '100600',
        endType: 'By',
        endTime: dtg !== 'Not Available' ? dtg : '110700',
        east: '4908',
        north: '8403',
        successSignal: succSignal !== 'Not Available' ? succSignal : 'Green star flare',
        remarks: remarks !== 'Not Available' ? remarks : 'Maintain radio silence',
        execCode: `EX-${phaseNum}-${idx + 1}`,
      });
    });

    const parsedPhases: TaskSyncPhase[] = [];
    Object.keys(phaseMap).forEach((pName, pIdx) => {
      const rows = phaseMap[pName];
      const numMatch = pName.match(/[0-9]+/);
      const phaseNum = numMatch ? numMatch[0] : `${pIdx + 1}`;
      const wordNum = numberWordMap[phaseNum] || `${phaseNum}`;

      parsedPhases.push({
        id: `phase-${phaseNum}`,
        name: pName,
        label: `Phase ${wordNum}`,
        taskType: rows[0]?.task || 'Establish',
        taskDesc: rows[0]?.taskDesc || `${pName} Execution`,
        fromTime: rows[0]?.startTime || '100600',
        toTime: rows[rows.length - 1]?.endTime || '110700',
        east: '4908',
        north: '8403',
        color: colorPalette[pIdx % colorPalette.length],
        rows,
      });
    });

    if (parsedPhases.length > 0) return parsedPhases;
  }

  // Case B: Standard schema array `json.tasks` + `json.phases`
  if (json?.tasks && Array.isArray(json.tasks) && json.tasks.length > 0) {
    const rawPhases: any[] = Array.isArray(json.phases) ? json.phases : [
      { phase_id: 'phase_1', name: 'Phase 1', description: 'Phase One Execution' },
      { phase_id: 'phase_2', name: 'Phase 2', description: 'Phase Two Execution' },
    ];

    const unitsList: any[] = Array.isArray(json.grouping?.units) ? json.grouping.units : [];
    const getUnitName = (uid: string) => {
      const found = unitsList.find((u) => u.unit_id === uid || u.name === uid);
      return found?.name || formatMilitaryTitle(uid);
    };

    const getUnitGrouping = (uid: string, formattedName: string) => {
      const found = unitsList.find((u) => u.unit_id === uid || u.name === uid);
      if (found?.notes && found.notes !== '-') return found.notes;
      const matchedDoc = docUnits.find((du) =>
        du.unitName.toLowerCase().includes(formattedName.toLowerCase()) ||
        formattedName.toLowerCase().includes(du.unitName.toLowerCase())
      );
      return matchedDoc?.grouping && matchedDoc.grouping !== '-' ? matchedDoc.grouping : '-';
    };

    // Group tasks by phase_id (both normalized and raw keys)
    const phaseTasksMap: Record<string, any[]> = {};
    json.tasks.forEach((t: any) => {
      const rawPid = String(t.phase_id || t.phase || 'phase_1');
      const normKey = normalizePhaseKey(rawPid);
      if (!phaseTasksMap[normKey]) phaseTasksMap[normKey] = [];
      phaseTasksMap[normKey].push(t);
      if (!phaseTasksMap[rawPid]) phaseTasksMap[rawPid] = [];
      phaseTasksMap[rawPid].push(t);
    });

    const parsedFromTasks: TaskSyncPhase[] = [];
    rawPhases.forEach((pMeta, pIdx) => {
      const pId = pMeta.phase_id || `phase_${pIdx + 1}`;
      const normPid = normalizePhaseKey(pId);
      const numMatch = (pMeta.name || pId).match(/[0-9]+/);
      const phaseNum = numMatch ? numMatch[0] : `${pIdx + 1}`;
      const normByNum = `phase${phaseNum}`;

      const tasksInPhase = phaseTasksMap[normPid] || phaseTasksMap[normByNum] || phaseTasksMap[pId] || [];
      const wordNum = numberWordMap[phaseNum] || `${phaseNum}`;
      const phaseName = pMeta.name || `Phase ${phaseNum}`;
      const phaseLabel = `Phase ${wordNum}`;
      const phaseColor = colorPalette[pIdx % colorPalette.length];

      const rows: TaskSyncRow[] = [];
      let phaseFirstTask = '';
      let phaseMinTime = pIdx === 0 ? '100600' : '110700';
      let phaseMaxTime = pIdx === 0 ? '110700' : '121200';

      if (tasksInPhase.length > 0) {
        tasksInPhase.forEach((t: any, rIdx: number) => {
          const uName = getUnitName(t.unit || `Unit ${rIdx + 1}`);
          const uGrouping = getUnitGrouping(t.unit, uName);
          const taskVerb = t.task_verb ? formatMilitaryTitle(t.task_verb) : (t.task ? formatMilitaryTitle(t.task) : inferTaskVerb(t.purpose || ''));
          const taskDesc = t.purpose || t.description || `${taskVerb} designated objectives`;
          if (!phaseFirstTask) phaseFirstTask = taskDesc;

          const timeStr = typeof t.time === 'object' ? (t.time?.raw || t.time?.end_iso || '') : (t.time || '');
          const extractedTime = extractTimeFromText(timeStr, 'end') || (pIdx === 0 ? '110700' : '121200');
          if (extractedTime) phaseMaxTime = extractedTime;

          rows.push({
            id: `row-${pIdx + 1}-${rIdx + 1}`,
            asltUnit: uName,
            relatedFrom: t.related_from || t['Related from'] || '11 Infantry Division',
            formation: t.formation || t.Formation || 'Two-front formation',
            task: taskVerb,
            objective: t.objective || t.Objective || '',
            taskDesc: taskDesc,
            isCtgcy: /be prepared|on orders|contingency/i.test(taskDesc),
            resUnit: t.related_to || t.RelatedTo || uGrouping,
            relatedToPurpose: t.related_to_purpose || t.RelatedToPuropse || '',
            fireUnit: '-',
            startLoc: t.start_loc || t.StartLoc || 'FUP Alpha',
            timingType: t.timing_type || t.TimingType || (rIdx === 0 && pIdx === 0 ? 'H Hr' : 'ST'),
            startTime: phaseMinTime,
            endType: rIdx === 0 && pIdx === 0 ? 'By' : 'ET',
            endTime: extractedTime,
            east: '4908',
            north: '8403',
            successSignal: t.success_signal || t['Success Signal'] || 'Green star flare',
            remarks: t.remarks || t.Remarks || 'Standard Tactical ROE',
            execCode: `EX-${phaseNum}-${rIdx + 1}`,
          });
        });
      } else if (pIdx === 1 && docUnits.length > 0) {
        // Fallback for Phase 2: synthesize rows from document units so Phase 2 is never dropped
        docUnits.forEach((u, rIdx) => {
          const taskStr = u.phase2Task || u.generalTask;
          const verb = inferTaskVerb(taskStr || u.unitName);
          rows.push({
            id: `row-${pIdx + 1}-${rIdx + 1}`,
            asltUnit: u.unitName,
            relatedFrom: u.relatedFrom || '11 Infantry Division',
            formation: u.formation || 'Line formation',
            task: verb,
            objective: u.objective || 'Strong points Ulm & London',
            taskDesc: taskStr || `${verb} designated objectives`,
            isCtgcy: /be prepared|on orders/i.test(taskStr || ''),
            resUnit: '-',
            relatedToPurpose: 'Block enemy counter-attack from East',
            fireUnit: '-',
            startLoc: u.startLoc || 'ORP Charlie',
            timingType: 'ST',
            startTime: phaseMinTime,
            endType: 'ET',
            endTime: phaseMaxTime,
            east: '4908',
            north: '8403',
            successSignal: u.successSignal || 'Red star flare x 2',
            remarks: u.remarks || 'Standard Tactical ROE',
            execCode: `EX-${phaseNum}-${rIdx + 1}`,
          });
        });
      }

      if (rows.length > 0) {
        parsedFromTasks.push({
          id: `phase-${phaseNum.toLowerCase()}`,
          name: phaseName,
          label: phaseLabel,
          taskType: inferTaskVerb(phaseFirstTask || phaseName),
          taskDesc: pMeta.description || phaseFirstTask || `${phaseName} Execution`,
          fromTime: phaseMinTime,
          toTime: phaseMaxTime,
          east: '4908',
          north: '8403',
          color: phaseColor,
          rows,
        });
      }
    });

    if (parsedFromTasks.length > 0) return parsedFromTasks;
  }

  // Case C: Hierarchical execution.general.phases or nested dicts
  let phasesContainer: any =
    json?.execution?.general?.phases ??
    json?.execution?.phases ??
    json?.phases ??
    json?.execution?.general ??
    json?.execution;

  if (!phasesContainer || typeof phasesContainer !== 'object') return null;

  let phaseObjectsMap: Record<string, any> = {};

  if (Array.isArray(phasesContainer)) {
    phasesContainer.forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        const keys = Object.keys(item);
        const hasPhaseKey = keys.some((k) => /^phase[_\-\s]*[0-9]+/i.test(k));
        if (hasPhaseKey) {
          keys.forEach((k) => {
            if (/^phase[_\-\s]*[0-9]+/i.test(k)) {
              phaseObjectsMap[k] = item[k];
            }
          });
        } else if (item.name || item.phase) {
          const pName = item.name || item.phase;
          phaseObjectsMap[pName || `phase_${idx + 1}`] = item;
        } else {
          phaseObjectsMap[`phase_${idx + 1}`] = item;
        }
      }
    });
  } else if (typeof phasesContainer === 'object' && phasesContainer !== null) {
    const keys = Object.keys(phasesContainer);
    const hasPhaseKey = keys.some((k) => /^phase[_\-\s]*[0-9]+/i.test(k));
    if (hasPhaseKey) {
      keys.forEach((k) => {
        if (/^phase[_\-\s]*[0-9]+/i.test(k)) {
          phaseObjectsMap[k] = phasesContainer[k];
        }
      });
    } else {
      const hasUnitKeys = keys.some((k) => /brigade|battalion|regiment|company|corps|division/i.test(k));
      if (hasUnitKeys) {
        phaseObjectsMap['phase_1'] = phasesContainer;
      }
    }
  }

  const phaseKeys = Object.keys(phaseObjectsMap);
  if (phaseKeys.length === 0) return null;

  const parsedPhases: TaskSyncPhase[] = [];

  phaseKeys.forEach((pKey, pIdx) => {
    const phaseContent = phaseObjectsMap[pKey];
    const numMatch = pKey.match(/[0-9]+/);
    const phaseNum = numMatch ? numMatch[0] : `${pIdx + 1}`;
    const wordNum = numberWordMap[phaseNum] || `${phaseNum}`;
    const phaseName = `Phase ${phaseNum}`;
    const phaseLabel = `Phase ${wordNum}`;
    const phaseColor = colorPalette[pIdx % colorPalette.length];

    const rows: TaskSyncRow[] = [];
    let phaseFirstTask = '';
    let phaseMinTime = pIdx === 0 ? '100600' : '110700';
    let phaseMaxTime = pIdx === 0 ? '110700' : '121200';

    if (typeof phaseContent === 'object' && phaseContent !== null) {
      const unitKeys = Object.keys(phaseContent);

      unitKeys.forEach((uKey, uIdx) => {
        const uVal = phaseContent[uKey];
        const unitFormatted = formatMilitaryTitle(uKey);

        const matchedDocUnit = docUnits.find(
          (du) => du.unitName.toLowerCase().includes(unitFormatted.toLowerCase()) ||
                  unitFormatted.toLowerCase().includes(du.unitName.toLowerCase())
        );
        const resUnit = matchedDocUnit?.grouping && matchedDocUnit.grouping !== '-'
          ? matchedDocUnit.grouping
          : '-';

        const tasksObj = uVal?.tasks || uVal?.task || (typeof uVal === 'object' && !uVal.tasks ? uVal : null);

        if (tasksObj && typeof tasksObj === 'object') {
          const taskKeys = Object.keys(tasksObj);

          taskKeys.forEach((tKey, tIdx) => {
            const tVal = tasksObj[tKey];
            const taskNameRaw = typeof tVal === 'string' ? tVal : (tVal?.name || tVal?.description || tKey);
            const taskFormatted = formatMilitaryTitle(taskNameRaw);
            const verb = inferTaskVerb(taskFormatted);

            if (!phaseFirstTask) phaseFirstTask = taskFormatted;

            const timeStr = typeof tVal === 'object' ? (tVal?.time || tVal?.timing || tVal?.endTime || '') : '';
            const extractedTime = extractTimeFromText(timeStr, 'end') || (pIdx === 0 ? '110700' : '121200');
            if (extractedTime) phaseMaxTime = extractedTime;

            rows.push({
              id: `row-${pIdx + 1}-${rows.length + 1}`,
              asltUnit: unitFormatted,
              relatedFrom: matchedDocUnit?.relatedFrom || '11 Infantry Division',
              formation: matchedDocUnit?.formation || 'Two-front formation',
              task: verb,
              objective: matchedDocUnit?.objective || '',
              taskDesc: taskFormatted,
              isCtgcy: /be prepared|on orders|contingency/i.test(taskFormatted),
              resUnit: resUnit,
              relatedToPurpose: '',
              fireUnit: '-',
              startLoc: matchedDocUnit?.startLoc || 'FUP Alpha',
              timingType: rows.length === 0 && pIdx === 0 ? 'H Hr' : 'ST',
              startTime: phaseMinTime,
              endType: rows.length === 0 && pIdx === 0 ? 'By' : 'ET',
              endTime: extractedTime,
              east: '4908',
              north: '8403',
              successSignal: matchedDocUnit?.successSignal || 'Green star flare',
              remarks: matchedDocUnit?.remarks || 'Maintain radio silence',
              execCode: `EX-${phaseNum}-${rows.length + 1}`,
            });
          });
        } else {
          const desc = typeof uVal === 'string' ? uVal : formatMilitaryTitle(uKey);
          const verb = inferTaskVerb(desc);
          rows.push({
            id: `row-${pIdx + 1}-${rows.length + 1}`,
            asltUnit: unitFormatted,
            relatedFrom: matchedDocUnit?.relatedFrom || '11 Infantry Division',
            formation: matchedDocUnit?.formation || 'Two-front formation',
            task: verb,
            objective: matchedDocUnit?.objective || '',
            taskDesc: desc,
            isCtgcy: false,
            resUnit: resUnit,
            relatedToPurpose: '',
            fireUnit: '-',
            startLoc: matchedDocUnit?.startLoc || 'FUP Alpha',
            timingType: rows.length === 0 && pIdx === 0 ? 'H Hr' : 'ST',
            startTime: phaseMinTime,
            endType: rows.length === 0 && pIdx === 0 ? 'By' : 'ET',
            endTime: phaseMaxTime,
            east: '4908',
            north: '8403',
            successSignal: matchedDocUnit?.successSignal || 'Green star flare',
            remarks: matchedDocUnit?.remarks || 'Standard Tactical ROE',
            execCode: `EX-${phaseNum}-${rows.length + 1}`,
          });
        }
      });
    }

    if (rows.length > 0) {
      const topVerb = inferTaskVerb(phaseFirstTask || phaseName);
      parsedPhases.push({
        id: `phase-${phaseNum.toLowerCase()}`,
        name: phaseName,
        label: phaseLabel,
        taskType: topVerb,
        taskDesc: phaseFirstTask || `${topVerb} designated objectives`,
        fromTime: phaseMinTime,
        toTime: phaseMaxTime,
        east: '4908',
        north: '8403',
        color: phaseColor,
        rows,
      });
    }
  });

  return parsedPhases.length > 0 ? parsedPhases : null;
}

/**
 * Text extraction helper functions for 13 canonical DRDO fields
 */
function extractStartLocFromText(text: string): string {
  const match = text.match(/(?:from|starting from|at|AA|FUP|ORP)\s+([A-Za-z0-9\s\-]+?(?:FUP|Assembly Area|AA|Position|ORP|Sector|Alpha|Bravo|Charlie|Delta|RED|BLUE|GREEN|Lion)[A-Za-z0-9\s\-]*)/i);
  if (match) return match[1].trim().replace(/^(?:from|at)\s+/i, '');
  const directMatch = text.match(/\b(FUP\s+[A-Za-z0-9]+|AA\s+[A-Za-z0-9]+|Assembly Area\s+[A-Za-z0-9]+|ORP\s+[A-Za-z0-9]+|LD-[A-Za-z0-9]+)\b/i);
  return directMatch ? directMatch[1].trim() : 'FUP Alpha';
}

function extractFormationFromText(text: string): string {
  const match = text.match(/(?:in\s+)?([a-z0-9\-\s]+formation|two-front formation|single file|column formation|line formation|box formation|wedge formation|wedge|column|line|echelon)/i);
  return match ? formatMilitaryTitle(match[1].trim()) : 'Two-front formation';
}

function extractSuccessSignalFromText(text: string): string {
  const match = text.match(/(?:success signal|signaling success with|signal success with|codeword)\s*[:\-]?\s*([^\n;,\.]+)/i);
  return match ? match[1].trim() : 'Green star flare';
}

function extractRemarksFromText(text: string): string {
  const match = text.match(/(?:remarks|note|instructions|roe|restrictions)\s*[:\-]?\s*([^\n;\.]+)/i);
  if (match) return match[1].trim();
  if (/maintain radio silence/i.test(text)) return 'Maintain radio silence';
  if (/on orders/i.test(text)) return 'On orders of Force Commander';
  return 'Standard Tactical ROE';
}

function extractObjectiveFromText(text: string): string {
  const match = text.match(/(?:to\s+(?:capture|secure|seize|isolate|establish|invest)\s+)([A-Za-z0-9\s\-]+?)(?:\s+(?:by|at|from|to|in|with|signaling|NLT|DTG)|\.|\,|$)/i);
  return match ? match[1].trim() : '';
}

function extractRelatedFromText(unitBlock: string, ownText: string): string {
  const match = unitBlock.match(/(?:under\s+command|from|parent formation|integral to)\s+([0-9]+\s+[A-Za-z\s]+(?:Division|Corps|Brigade))/i);
  if (match) return match[1].trim();
  const ownMatch = ownText.match(/([0-9]+\s+[A-Za-z\s]+(?:Division|Corps|Bde|Brigade))/i);
  return ownMatch ? ownMatch[1].trim() : '11 Infantry Division';
}

/**
 * Formats snake_case, kebab-case, or camelCase keys to Title Case military terms
 */
function formatMilitaryTitle(str: string): string {
  if (!str) return '';
  return str
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      if (/^(fzdl|ulm|cop|fob|opord|hhr|tacp|arty|bde|bn|div|res|orp|fup|aa|roe|dtg|nlt|net)$/i.test(lower)) {
        return lower.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function cleanGroupingText(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\([a-z0-9]+\)\s*/i, '').trim())
    .filter((l) => l.length > 3 && !/others|xxx/i.test(l));
  return lines.join(', ') || '-';
}

function cleanTaskText(text: string): string {
  return text
    .replace(/^\s*\([a-z0-9]+\)\s*/i, '')
    .replace(/^\s*Phase\s*[0-9]+\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferTaskVerb(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('establish') || lower.includes('bridgehead') || lower.includes('foothold')) return 'Establish';
  if (lower.includes('capture')) return 'Capture';
  if (lower.includes('isolate')) return 'Isolate';
  if (lower.includes('invest')) return 'Invest';
  if (lower.includes('support') || lower.includes('assist')) return 'Support';
  if (lower.includes('seize')) return 'Seize';
  if (lower.includes('secure')) return 'Secure';
  if (lower.includes('hold') || lower.includes('defend')) return 'Defend';
  if (lower.includes('break out') || lower.includes('breaking out')) return 'Break Out';
  if (lower.includes('move') || lower.includes('induct') || lower.includes('progress')) return 'Move';
  if (lower.includes('attack') || lower.includes('assault')) return 'Attack';
  return 'Capture';
}

function extractTimeFromText(text: string, kind: 'start' | 'end'): string {
  const ddmmyyMatch = text.match(/([0-9]{4})\s*(?:hrs)?(?:\s*(?:on)?\s*([0-9]{1,2})\s*([A-Za-z]{3})\s*([0-9]{2,4})?)/i);
  if (ddmmyyMatch) {
    const time = ddmmyyMatch[1];
    const day = ddmmyyMatch[2]?.padStart(2, '0') || '';
    return day ? `${day}${time}` : time;
  }

  const rawMatch = text.match(/([0-9]{4,6})/);
  return rawMatch ? rawMatch[1] : '';
}

function createDefaultRows(phase: string): TaskSyncRow[] {
  return [
    {
      id: 'row-1',
      asltUnit: 'INF BN A',
      relatedFrom: '11 Infantry Division',
      formation: 'Two-front formation',
      task: 'Capture',
      objective: 'en COY A',
      taskDesc: 'Capture en COY A',
      isCtgcy: false,
      resUnit: '-',
      relatedToPurpose: 'Support flank maneuver',
      fireUnit: '-',
      startLoc: 'FUP Alpha',
      timingType: 'H Hr',
      startTime: '110300',
      endType: 'By',
      endTime: '110700',
      east: '4908',
      north: '8403',
      successSignal: 'Green star flare',
      remarks: 'Maintain radio silence during induction',
      execCode: '',
    },
    {
      id: 'row-2',
      asltUnit: 'INF BN B',
      relatedFrom: '11 Infantry Division',
      formation: 'Column formation',
      task: 'Capture',
      objective: 'en COY B',
      taskDesc: 'Capture en COY B',
      isCtgcy: false,
      resUnit: '-',
      relatedToPurpose: 'Facilitate breakout to Mahe Plains',
      fireUnit: '-',
      startLoc: 'Assembly Area RED',
      timingType: 'ST',
      startTime: '110300',
      endType: 'ET',
      endTime: '110700',
      east: '4908',
      north: '8403',
      successSignal: 'Codeword VICTOR',
      remarks: 'Engage with priority on canal sluice gates',
      execCode: '',
    },
    {
      id: 'row-3',
      asltUnit: 'INF BN C',
      relatedFrom: '11 Infantry Division',
      formation: 'Line formation',
      task: '-',
      objective: '',
      taskDesc: '',
      isCtgcy: false,
      resUnit: '-',
      relatedToPurpose: '',
      fireUnit: '-',
      startLoc: 'ORP Charlie',
      timingType: 'ST',
      startTime: '-',
      endType: 'ET',
      endTime: '-',
      east: '-',
      north: '-',
      successSignal: 'Red star flare x 2',
      remarks: 'On orders of Force Commander',
      execCode: '',
    },
  ];
}
