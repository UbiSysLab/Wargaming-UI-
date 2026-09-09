import { OpOrderData } from './opOrder.types';

export interface TaskSyncRow {
  id: string;
  asltUnit: string;
  resUnit: string;
  fireUnit: string;
  task: string;
  isCtgcy: boolean;
  taskDesc: string;
  execCode: string;
  startType: string;
  startTime: string;
  endType: string;
  endTime: string;
  east: string;
  north: string;
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
 * 1. Backend LLM generated JSON (standard schema or flat structure)
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
      { id: 'obj-1', label: 'Obj 1', text: 'Establish and secure bridgehead on the canal' },
      { id: 'obj-2', label: 'Obj 2', text: 'Isolation of Ulm and London by 1200 hrs on 12 Feb 25' }
    ],
    overallFrom,
    overallTo,
    phases,
  };
}

/**
 * Extracts objectives from mission text or structured JSON
 */
function extractObjectives(missionText: string, json?: any): Array<{ id: string; label: string; text: string }> {
  const list: Array<{ id: string; label: string; text: string }> = [];

  // Check structured JSON objectives
  if (json?.mission?.objectives && Array.isArray(json.mission.objectives) && json.mission.objectives.length > 0) {
    json.mission.objectives.forEach((obj: any, idx: number) => {
      const text = typeof obj === 'string' ? obj : obj.text || obj.description || '';
      if (text) list.push({ id: `obj-${idx + 1}`, label: `Obj ${idx + 1}`, text: text.trim() });
    });
  }

  // If text is available, extract specific military objectives
  if (missionText) {
    // Match clauses like "establishment and securing of bridgehead...", "isolation of Ulm and London...", "progress operations towards..."
    const clauses = missionText.split(/[,;\n]+/).map((c) => c.trim()).filter((c) => c.length > 10);
    clauses.forEach((c) => {
      if (/bridgehead|isolation|foothold|capture|progress operations|projection area|secure/i.test(c)) {
        if (!list.some((existing) => existing.text.toLowerCase().includes(c.toLowerCase().slice(0, 20)))) {
          list.push({
            id: `obj-${list.length + 1}`,
            label: `Obj ${list.length + 1}`,
            text: c.replace(/^(?:to\s+include\s+|and\s+)/i, '').trim(),
          });
        }
      }
    });
  }

  // Handle flat JSON task descriptions as objective
  if (list.length === 0 && json?.task?.name) {
    list.push({ id: 'obj-1', label: 'Obj 1', text: json.task.name });
    if (json.task.description && json.task.description !== json.task.name) {
      list.push({ id: 'obj-2', label: 'Obj 2', text: json.task.description });
    }
  }

  return list;
}

interface ParsedUnitTask {
  unitName: string;
  grouping: string;
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

  // Split by unit headings (e.g. "41 Infantry Brigade", "52 Infantry Brigade", "63 Infantry Brigade", "24 Mechanised Battalion", etc.)
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

      units.push({
        unitName,
        grouping: groupingText,
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
  // 1. Try parsing directly from structured LLM JSON (e.g. execution.general.phases)
  if (json) {
    const llmPhases = parseLlmPhases(json, docUnits);
    if (llmPhases && llmPhases.length > 0) {
      return llmPhases;
    }
  }

  const phases: TaskSyncPhase[] = [];

  // Extract any task verb and timing hints from flat JSON
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
      if (!taskStr && docUnits.length > 3) return; // Skip units with no phase 1 task if there are many

      const verb = inferTaskVerb(taskStr || u.unitName);
      p1Rows.push({
        id: `row-1-${idx + 1}`,
        asltUnit: u.unitName,
        resUnit: u.grouping !== '-' ? u.grouping : (idx > 0 ? docUnits[0].unitName : '-'),
        fireUnit: 'Divisional Artillery Brigade',
        task: verb,
        isCtgcy: /be prepared|on orders/i.test(taskStr),
        taskDesc: taskStr || `${verb} designated objectives`,
        execCode: '',
        startType: idx === 0 ? 'H Hr' : 'ST',
        startTime: '100600',
        endType: idx === 0 ? 'By' : 'ET',
        endTime: u.phase1Time || flatTime || '110700',
        east: '4908',
        north: '8403',
      });
    });

    phases.push({
      id: 'phase-1',
      name: 'Phase 1',
      label: 'Phase One',
      taskType: flatVerb || 'Establish',
      taskDesc: flatTaskDesc || 'Establish foothold and bridgehead between Delhi and York',
      fromTime: '100600',
      toTime: flatTime || '110700',
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
        resUnit: u.grouping !== '-' ? u.grouping : '-',
        fireUnit: 'Divisional Artillery Brigade',
        task: verb,
        isCtgcy: /be prepared|on orders/i.test(taskStr),
        taskDesc: taskStr || `${verb} designated objectives`,
        execCode: '',
        startType: 'ST',
        startTime: '110700',
        endType: 'ET',
        endTime: u.phase2Time || '121200',
        east: '4908',
        north: '8403',
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
      taskType: flatVerb || 'Establish',
      taskDesc: flatTaskDesc || 'Establish bridgehead and secure objectives',
      fromTime: '100600',
      toTime: flatTime || '110700',
      east: '4908',
      north: '8403',
      color: '#d946ef',
      rows: createDefaultRows('Phase 1'),
    });
  }

  return phases;
}

/**
 * Dynamically parses LLM generated JSON hierarchical structures (execution.general.phases) or standard schema arrays (phases + tasks + grouping)
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

  // Case A: Standard schema array `json.tasks` + `json.phases`
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

    // Group tasks by phase_id
    const phaseTasksMap: Record<string, any[]> = {};
    json.tasks.forEach((t: any) => {
      const pId = t.phase_id || t.phase || 'phase_1';
      if (!phaseTasksMap[pId]) phaseTasksMap[pId] = [];
      phaseTasksMap[pId].push(t);
    });

    const parsedFromTasks: TaskSyncPhase[] = [];
    rawPhases.forEach((pMeta, pIdx) => {
      const pId = pMeta.phase_id || `phase_${pIdx + 1}`;
      const tasksInPhase = phaseTasksMap[pId] || [];
      if (tasksInPhase.length === 0 && pIdx > 0 && Object.keys(phaseTasksMap).length > 0) return;

      const numMatch = (pMeta.name || pId).match(/[0-9]+/);
      const phaseNum = numMatch ? numMatch[0] : `${pIdx + 1}`;
      const wordNum = numberWordMap[phaseNum] || `${phaseNum}`;
      const phaseName = pMeta.name || `Phase ${phaseNum}`;
      const phaseLabel = `Phase ${wordNum}`;
      const phaseColor = colorPalette[pIdx % colorPalette.length];

      const rows: TaskSyncRow[] = [];
      let phaseFirstTask = '';
      let phaseMinTime = pIdx === 0 ? '100600' : '110700';
      let phaseMaxTime = pIdx === 0 ? '110700' : '121200';

      tasksInPhase.forEach((t: any, rIdx: number) => {
        const uName = getUnitName(t.unit || `Unit ${rIdx + 1}`);
        const uGrouping = getUnitGrouping(t.unit, uName);
        const taskVerb = t.task_verb ? formatMilitaryTitle(t.task_verb) : inferTaskVerb(t.purpose || '');
        const taskDesc = t.purpose || t.description || `${taskVerb} designated objectives`;
        if (!phaseFirstTask) phaseFirstTask = taskDesc;

        const timeStr = typeof t.time === 'object' ? (t.time?.raw || t.time?.end_iso || '') : (t.time || '');
        const extractedTime = extractTimeFromText(timeStr, 'end') || (pIdx === 0 ? '110700' : '121200');
        if (extractedTime) phaseMaxTime = extractedTime;

        rows.push({
          id: `row-${pIdx + 1}-${rIdx + 1}`,
          asltUnit: uName,
          resUnit: uGrouping,
          fireUnit: 'Divisional Artillery Brigade',
          task: taskVerb,
          isCtgcy: /be prepared|on orders|contingency/i.test(taskDesc),
          taskDesc: taskDesc,
          execCode: '',
          startType: rIdx === 0 && pIdx === 0 ? 'H Hr' : 'ST',
          startTime: phaseMinTime,
          endType: rIdx === 0 && pIdx === 0 ? 'By' : 'ET',
          endTime: extractedTime,
          east: '4908',
          north: '8403',
        });
      });

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

  // Case B: Hierarchical execution.general.phases or nested dicts
  let phasesContainer: any =
    json?.execution?.general?.phases ??
    json?.execution?.phases ??
    json?.phases ??
    json?.execution?.general ??
    json?.execution;

  if (!phasesContainer || typeof phasesContainer !== 'object') return null;

  // Flatten if it's an array of phase objects: e.g. [ { phase_1: {...}, phase_2: {...} } ]
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

        // Find any doc unit grouping
        const matchedDocUnit = docUnits.find(
          (du) => du.unitName.toLowerCase().includes(unitFormatted.toLowerCase()) ||
                  unitFormatted.toLowerCase().includes(du.unitName.toLowerCase())
        );
        const resUnit = matchedDocUnit?.grouping && matchedDocUnit.grouping !== '-'
          ? matchedDocUnit.grouping
          : '-';

        // Check tasks
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
              resUnit: resUnit,
              fireUnit: 'Divisional Artillery Brigade',
              task: verb,
              isCtgcy: /be prepared|on orders|contingency/i.test(taskFormatted),
              taskDesc: taskFormatted,
              execCode: '',
              startType: rows.length === 0 && pIdx === 0 ? 'H Hr' : 'ST',
              startTime: phaseMinTime,
              endType: rows.length === 0 && pIdx === 0 ? 'By' : 'ET',
              endTime: extractedTime,
              east: '4908',
              north: '8403',
            });
          });
        } else {
          // Unit with no explicit tasks object
          const desc = typeof uVal === 'string' ? uVal : formatMilitaryTitle(uKey);
          const verb = inferTaskVerb(desc);
          rows.push({
            id: `row-${pIdx + 1}-${rows.length + 1}`,
            asltUnit: unitFormatted,
            resUnit: resUnit,
            fireUnit: 'Divisional Artillery Brigade',
            task: verb,
            isCtgcy: false,
            taskDesc: desc,
            execCode: '',
            startType: rows.length === 0 && pIdx === 0 ? 'H Hr' : 'ST',
            startTime: phaseMinTime,
            endType: rows.length === 0 && pIdx === 0 ? 'By' : 'ET',
            endTime: phaseMaxTime,
            east: '4908',
            north: '8403',
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
      if (/^(fzdl|ulm|cop|fob|opord|hhr|tacp|arty|bde|bn|div|res)$/i.test(lower)) {
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
  // Matches "0700 hrs 11 Feb 2025" -> "110700", "1200 hrs on 12 Feb 25" -> "121200"
  const ddmmyyMatch = text.match(/([0-9]{4})\s*(?:hrs)?(?:\s*(?:on)?\s*([0-9]{1,2})\s*([A-Za-z]{3})\s*([0-9]{2,4})?)/i);
  if (ddmmyyMatch) {
    const time = ddmmyyMatch[1];
    const day = ddmmyyMatch[2]?.padStart(2, '0') || '';
    return day ? `${day}${time}` : time;
  }

  const rawMatch = text.match(/([0-9]{4,6})/);
  return rawMatch ? rawMatch[1] : '';
}

function cleanTimeString(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/[0-9]{4,6}/);
  return match ? match[0] : timeStr;
}

function createDefaultRows(phase: string): TaskSyncRow[] {
  return [
    {
      id: 'row-1',
      asltUnit: '41 Infantry Brigade',
      resUnit: 'Divisional Integral Armour',
      fireUnit: 'Divisional Artillery Brigade',
      task: 'Establish',
      isCtgcy: false,
      taskDesc: 'Establish bridgehead between Delhi and York',
      execCode: '',
      startType: 'H Hr',
      startTime: '100600',
      endType: 'By',
      endTime: '110700',
      east: '4908',
      north: '8403',
    },
    {
      id: 'row-2',
      asltUnit: '52 Infantry Brigade',
      resUnit: '223 Armoured Brigade',
      fireUnit: 'Divisional Artillery Brigade',
      task: 'Capture',
      isCtgcy: false,
      taskDesc: 'Capture enemy FZDL at Kigali and canal defences at Paris',
      execCode: '',
      startType: 'ST',
      startTime: '100600',
      endType: 'ET',
      endTime: '110700',
      east: '4908',
      north: '8403',
    },
    {
      id: 'row-3',
      asltUnit: '63 Infantry Brigade',
      resUnit: '24 Mechanised Battalion',
      fireUnit: 'Divisional Artillery Brigade',
      task: 'Isolate',
      isCtgcy: false,
      taskDesc: 'Isolate London and Ulm',
      execCode: '',
      startType: 'ST',
      startTime: '110700',
      endType: 'ET',
      endTime: '121200',
      east: '4908',
      north: '8403',
    },
  ];
}
