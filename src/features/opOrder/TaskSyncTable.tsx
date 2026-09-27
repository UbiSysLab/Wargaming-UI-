import React, { useState, useEffect, useRef } from 'react';
import { useWizard } from '../../stores/WizardContext';
import { extractTaskSyncFromOpOrder, TaskSyncData, TaskSyncRow, TaskSyncPhase } from './taskSyncExtractor';
import { transcribeAudio } from '../recordAudio/transcribeApi';
import { postProcessAsrText } from '../recordAudio/asrPostProcessor';
import { parseSingleCommand, mapOrderRecordToTaskSyncRow } from './singleCommandApi';
import styles from './TaskSyncTable.module.css';

interface TaskSyncTableProps {
  onClose?: () => void;
  initialData?: TaskSyncData | null;
}

export function TaskSyncTable({ onClose, initialData }: TaskSyncTableProps) {
  const { state } = useWizard();
  const opOrder = state.data.startPreparation;

  // Initialize extracted Task Sync data from props or active OPORD
  const [taskData, setTaskData] = useState<TaskSyncData>(() => initialData || extractTaskSyncFromOpOrder(opOrder));
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);

  // Single Command Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialData) {
      setTaskData(initialData);
    }
  }, [initialData]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      setCommandFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          await processVoiceAudio(audioBlob);
        }
      };

      recorder.start(500);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setCommandFeedback({
        type: 'error',
        message: `Microphone error: ${err.message || 'Permission denied. Ensure HTTPS or install certificate.'}`,
      });
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processVoiceAudio = async (audioBlob: Blob) => {
    setIsProcessingCommand(true);
    setCommandFeedback({
      type: 'loading',
      message: 'Transcribing speech with ASR engine...',
    });

    try {
      const res = await transcribeAudio(audioBlob);
      const rawText = res.text.trim();
      if (!rawText) {
        throw new Error('No speech detected in recording.');
      }
      const cleaned = postProcessAsrText(rawText);
      await executeSingleCommand(cleaned);
    } catch (err: any) {
      console.error('Voice command transcription failed:', err);
      setCommandFeedback({
        type: 'error',
        message: err.message || 'Speech transcription failed',
      });
      setIsProcessingCommand(false);
    }
  };

  const executeSingleCommand = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    setIsProcessingCommand(true);
    setCommandFeedback({
      type: 'loading',
      message: 'Extracting tactical fields via LLM single command pipeline...',
    });

    try {
      const extracted = await parseSingleCommand(clean);
      const newRow = mapOrderRecordToTaskSyncRow(extracted);

      // Determine target phase (e.g. "Phase 2" -> 2nd phase)
      const rawPhase = String(extracted.Phaseno || extracted.phaseno || '').toLowerCase();
      let targetPhaseIdx = selectedPhaseIndex;

      const phaseMatch = rawPhase.match(/\b([1-9]|10)\b/);
      if (phaseMatch) {
        const pNum = parseInt(phaseMatch[1], 10);
        targetPhaseIdx = pNum - 1;
      }

      setTaskData((prev) => {
        const phases = [...prev.phases];

        // If target phase doesn't exist, create it
        while (phases.length <= targetPhaseIdx) {
          const idx = phases.length + 1;
          phases.push({
            id: `phase-${idx}`,
            name: `Phase ${idx}`,
            label: `Phase ${idx}`,
            taskType: 'Attack',
            taskDesc: 'Tactical Operation',
            fromTime: '110300',
            toTime: '110700',
            east: '4908',
            north: '8403',
            color: idx === 2 ? '#3b82f6' : idx === 3 ? '#10b981' : '#f59e0b',
            rows: [],
          });
        }

        // Add the new row to the target phase
        phases[targetPhaseIdx] = {
          ...phases[targetPhaseIdx],
          rows: [newRow, ...phases[targetPhaseIdx].rows],
        };

        return { ...prev, phases };
      });

      setSelectedPhaseIndex(targetPhaseIdx);
      setCommandFeedback({
        type: 'success',
        message: `Parsed: [${newRow.asltUnit}] ${newRow.task} ${newRow.objective || ''} -> Phase ${targetPhaseIdx + 1}`,
      });

      setTimeout(() => {
        setCommandFeedback((prev) => (prev?.type === 'success' ? null : prev));
      }, 5000);
    } catch (err: any) {
      console.error('Single command execution failed:', err);
      setCommandFeedback({
        type: 'error',
        message: err.message || 'LLM parsing failed',
      });
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const activePhase = taskData.phases[selectedPhaseIndex] || taskData.phases[0] || {
    id: 'phase-1',
    name: 'Phase 1',
    label: 'Phase One',
    taskType: 'Capture',
    taskDesc: 'Capture Adv. Pos.',
    fromTime: '222200',
    toTime: '230100',
    east: '4908',
    north: '8403',
    color: '#d946ef',
    rows: [],
  };

  const handleUpdateRow = (rowId: string, field: keyof TaskSyncRow, value: any) => {
    setTaskData((prev) => {
      const newPhases = [...prev.phases];
      const p = newPhases[selectedPhaseIndex];
      if (!p) return prev;

      const newRows = p.rows.map((row) => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      });

      newPhases[selectedPhaseIndex] = { ...p, rows: newRows };
      return { ...prev, phases: newPhases };
    });
  };

  const handleDeleteRow = (rowId: string) => {
    setTaskData((prev) => {
      const newPhases = [...prev.phases];
      const p = newPhases[selectedPhaseIndex];
      if (!p) return prev;

      newPhases[selectedPhaseIndex] = {
        ...p,
        rows: p.rows.filter((r) => r.id !== rowId),
      };
      return { ...prev, phases: newPhases };
    });
  };

  const handleInsertRowAfter = (rowId: string) => {
    setTaskData((prev) => {
      const newPhases = [...prev.phases];
      const p = newPhases[selectedPhaseIndex];
      if (!p) return prev;

      const newRow: TaskSyncRow = {
        id: `row-${Date.now()}`,
        asltUnit: '',
        relatedFrom: '11 Infantry Division',
        formation: 'Two-front formation',
        task: 'Capture',
        objective: '',
        taskDesc: '',
        isCtgcy: false,
        resUnit: '-',
        relatedToPurpose: '',
        fireUnit: '-',
        startLoc: 'FUP Alpha',
        timingType: 'ST',
        startTime: '110300',
        endType: 'ET',
        endTime: '110700',
        east: '4908',
        north: '8403',
        successSignal: 'Green star flare',
        remarks: '',
        execCode: '',
      };

      const rowIndex = p.rows.findIndex((r) => r.id === rowId);
      const updatedRows = [...p.rows];
      if (rowIndex !== -1) {
        updatedRows.splice(rowIndex + 1, 0, newRow);
      } else {
        updatedRows.push(newRow);
      }

      newPhases[selectedPhaseIndex] = { ...p, rows: updatedRows };
      return { ...prev, phases: newPhases };
    });
  };

  const handleAddPhase = () => {
    const newIdx = taskData.phases.length + 1;
    const wordNum = newIdx === 2 ? 'Two' : newIdx === 3 ? 'Three' : newIdx === 4 ? 'Four' : `${newIdx}`;
    const newPhase: TaskSyncPhase = {
      id: `phase-${newIdx}`,
      name: `Phase ${newIdx}`,
      label: `Phase ${wordNum}`,
      taskType: 'Capture',
      taskDesc: 'Capture Adv. Pos.',
      fromTime: '110300',
      toTime: '110700',
      east: '4908',
      north: '8403',
      color: newIdx === 2 ? '#3b82f6' : newIdx === 3 ? '#10b981' : '#f59e0b',
      rows: [
        {
          id: `row-${newIdx}-1`,
          asltUnit: 'INF BN A',
          relatedFrom: '11 Infantry Division',
          formation: 'Two-front formation',
          task: 'Capture',
          objective: '',
          taskDesc: 'Capture designated objective',
          isCtgcy: false,
          resUnit: '-',
          relatedToPurpose: '',
          fireUnit: '-',
          startLoc: 'FUP Alpha',
          timingType: 'H Hr',
          startTime: '110300',
          endType: 'By',
          endTime: '110700',
          east: '4908',
          north: '8403',
          successSignal: 'Green star flare',
          remarks: '',
          execCode: '',
        },
      ],
    };

    setTaskData((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhase],
    }));
    setSelectedPhaseIndex(newIdx - 1);
  };

  const handleAddObjective = () => {
    setTaskData((prev) => ({
      ...prev,
      objectives: [
        ...prev.objectives,
        {
          id: `obj-${prev.objectives.length + 1}`,
          label: `Obj ${prev.objectives.length + 1}`,
          text: '',
        },
      ],
    }));
  };

  const handleDeleteObjective = (id: string) => {
    setTaskData((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((o) => o.id !== id),
    }));
  };

  return (
    <div className={styles.windowCard}>
      {/* 1. Header / Tabs */}
      <div className={styles.windowHeader}>
        <div className={styles.tabsContainer}>
          <div className={styles.tab}>
            <span>Messages</span>
            <span className={styles.tabClose}>✕</span>
          </div>
          <div className={styles.tab}>
            <span>Sp Plan Tables</span>
            <span className={styles.tabClose}>✕</span>
          </div>
          <div className={`${styles.tab} ${styles.activeTab}`}>
            <span>Task Sync</span>
            <span className={styles.tabClose} onClick={onClose}>✕</span>
          </div>
        </div>

        <div className={styles.windowControls}>
          <span title="Minimize">—</span>
          <span title="Maximize">□</span>
          <span title="Close" onClick={onClose}>✕</span>
        </div>
      </div>

      {/* 2. Body Content */}
      <div className={styles.bodyContent}>
        {/* Top Row: Tasks Header + Objectives + Timing */}
        <div className={styles.topRow}>
          <div className={styles.planSection}>
            <h2 className={styles.tasksTitle}>Tasks</h2>
            <div className={styles.planSelectorGroup}>
              <select
                className={styles.planSelect}
                value={taskData.planName}
                onChange={(e) => setTaskData((prev) => ({ ...prev, planName: e.target.value }))}
              >
                <option value="Op Plan 1">Op Plan 1</option>
                <option value="Op Plan 2">Op Plan 2</option>
                <option value="Op Plan 3">Op Plan 3</option>
              </select>
              <label className={styles.ctgcyLabel}>
                <input
                  type="checkbox"
                  checked={taskData.isCtgcy}
                  onChange={(e) => setTaskData((prev) => ({ ...prev, isCtgcy: e.target.checked }))}
                />
                <span>Ctgcy</span>
              </label>
            </div>
          </div>

          {/* Objectives Section strictly matching Lunacy design */}
          <div className={styles.objectivesSection}>
            {taskData.objectives.map((obj) => (
              <div key={obj.id} className={styles.objectiveRow}>
                <span className={styles.objLabel}>{obj.label}</span>
                <input
                  type="text"
                  className={styles.objInput}
                  value={obj.text}
                  placeholder="Enter Objective"
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => ({
                      ...prev,
                      objectives: prev.objectives.map((o) => (o.id === obj.id ? { ...o, text: val } : o)),
                    }));
                  }}
                />
                <button
                  type="button"
                  className={styles.objDeleteBtn}
                  title="Remove Objective"
                  onClick={() => handleDeleteObjective(obj.id)}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className={styles.objectiveActionRow}>
              <button type="button" className={styles.addObjBtn} onClick={handleAddObjective}>
                <span className={styles.actionIconCircle}>+</span>
                <span>Add Objective</span>
              </button>

              {/* Seamless Single Command Mic Button matching exact circular blue design language */}
              {isRecording ? (
                <button
                  type="button"
                  className={styles.micRecordingBtn}
                  onClick={handleStopRecording}
                  title="Click to Stop Recording & Send to LLM Single Command Pipeline"
                >
                  <span className={styles.recordingPulseDot} />
                  <span>Listening (0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}) — Click to Send</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.micActionBtn}
                  onClick={handleStartRecording}
                  disabled={isProcessingCommand}
                  title="Speak single tactical command (ASR -> LLM pipeline)"
                >
                  <span className={styles.actionIconCircle}>🎤</span>
                  <span>{isProcessingCommand ? 'Processing Voice...' : 'Speak Command'}</span>
                </button>
              )}

              {commandFeedback && (
                <span
                  className={styles.feedbackText}
                  style={{
                    color: commandFeedback.type === 'error' ? '#ef4444' : commandFeedback.type === 'success' ? '#16a34a' : '#0266cc',
                  }}
                >
                  {commandFeedback.message}
                </span>
              )}
            </div>
          </div>

          {/* Timing Section */}
          <div className={styles.timingSection}>
            <div className={styles.timingRow}>
              <span className={styles.timeLabel}>From:</span>
              <input
                type="text"
                className={styles.timeInput}
                value={taskData.overallFrom}
                onChange={(e) => setTaskData((prev) => ({ ...prev, overallFrom: e.target.value }))}
              />
            </div>
            <div className={styles.timingRow}>
              <span className={styles.timeLabel}>To:</span>
              <input
                type="text"
                className={styles.timeInput}
                value={taskData.overallTo}
                onChange={(e) => setTaskData((prev) => ({ ...prev, overallTo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* 3. Phase Header Controls Bar (2-Row Compact Grid matching Reference) */}
        <div className={styles.phaseSection}>
          <div className={styles.phaseGrid}>
            {/* Col 1: Phase Selector & Phase Label */}
            <div className={styles.phaseCol1}>
              <div className={styles.phaseDropdownWrapper}>
                <select
                  className={styles.phaseDropdown}
                  value={selectedPhaseIndex}
                  onChange={(e) => setSelectedPhaseIndex(Number(e.target.value))}
                >
                  {taskData.phases.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      Phase {idx + 1}
                    </option>
                  ))}
                </select>
                <span className={styles.selectChevron}>⌵</span>
              </div>
              <input
                type="text"
                className={styles.phaseNameInput}
                value={activePhase.label}
                placeholder="Phase One"
                onChange={(e) => {
                  const val = e.target.value;
                  setTaskData((prev) => {
                    const newPhases = [...prev.phases];
                    newPhases[selectedPhaseIndex].label = val;
                    return { ...prev, phases: newPhases };
                  });
                }}
              />
            </div>

            {/* Col 2: Task Verb & Description */}
            <div className={styles.phaseCol2}>
              <div className={styles.taskVerbSelectWrapper}>
                <select
                  className={styles.phaseTaskSelect}
                  value={activePhase.taskType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => {
                      const newPhases = [...prev.phases];
                      newPhases[selectedPhaseIndex].taskType = val;
                      return { ...prev, phases: newPhases };
                    });
                  }}
                >
                  <option value="Capture">Capture</option>
                  <option value="Establish">Establish</option>
                  <option value="Isolate">Isolate</option>
                  <option value="Breach">Breach</option>
                  <option value="Support">Support</option>
                  <option value="Invest">Invest</option>
                  <option value="Attack">Attack</option>
                  <option value="Defend">Defend</option>
                </select>
                <span className={styles.selectChevron}>⌵</span>
              </div>
              <input
                type="text"
                className={styles.phaseTaskDescInput}
                value={activePhase.taskDesc}
                placeholder="Capture Adv. Pos."
                onChange={(e) => {
                  const val = e.target.value;
                  setTaskData((prev) => {
                    const newPhases = [...prev.phases];
                    newPhases[selectedPhaseIndex].taskDesc = val;
                    return { ...prev, phases: newPhases };
                  });
                }}
              />
            </div>

            {/* Col 3: Coordinates From/To and E/N */}
            <div className={styles.phaseCol3}>
              <div className={styles.coordLine}>
                <span className={styles.coordLabel}>From:</span>
                <input
                  type="text"
                  className={styles.coordInputTime}
                  value={activePhase.fromTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => {
                      const newPhases = [...prev.phases];
                      newPhases[selectedPhaseIndex].fromTime = val;
                      return { ...prev, phases: newPhases };
                    });
                  }}
                />
                <span className={styles.coordLabelSmall}>E:</span>
                <input
                  type="text"
                  className={styles.coordInputGrid}
                  value={activePhase.east}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => {
                      const newPhases = [...prev.phases];
                      newPhases[selectedPhaseIndex].east = val;
                      return { ...prev, phases: newPhases };
                    });
                  }}
                />
              </div>
              <div className={styles.coordLine}>
                <span className={styles.coordLabel}>To:</span>
                <input
                  type="text"
                  className={styles.coordInputTime}
                  value={activePhase.toTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => {
                      const newPhases = [...prev.phases];
                      newPhases[selectedPhaseIndex].toTime = val;
                      return { ...prev, phases: newPhases };
                    });
                  }}
                />
                <span className={styles.coordLabelSmall}>N:</span>
                <input
                  type="text"
                  className={styles.coordInputGrid}
                  value={activePhase.north}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTaskData((prev) => {
                      const newPhases = [...prev.phases];
                      newPhases[selectedPhaseIndex].north = val;
                      return { ...prev, phases: newPhases };
                    });
                  }}
                />
              </div>
            </div>

            {/* Col 4: Color Swatch with Chevron */}
            <div className={styles.phaseCol4}>
              <div className={styles.colorSwatchBox}>
                <div className={styles.colorSwatch} style={{ background: activePhase.color }} />
                <span className={styles.swatchChevron}>⌵</span>
              </div>
            </div>

            {/* Col 5: New Phase Solid Blue Button */}
            <div className={styles.phaseCol5}>
              <button type="button" className={styles.newPhaseBtn} onClick={handleAddPhase}>
                + New Phase
              </button>
            </div>
          </div>

          {/* Stepper Dashes under Phase Bar */}
          <div className={styles.phaseStepperLine}>
            {taskData.phases.map((_, pIdx) => (
              <div
                key={`dash-${pIdx}`}
                className={`${styles.stepperDash} ${pIdx === selectedPhaseIndex ? styles.stepperDashActive : ''}`}
                onClick={() => setSelectedPhaseIndex(pIdx)}
                title={`Switch to Phase ${pIdx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 4. Units / Tasks Table displaying exact 6 Columns + Actions */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.colAsltUnit}>Aslt Unit</th>
                <th className={styles.colResUnit}>Res Unit</th>
                <th className={styles.colFireUnit}>Fire Unit</th>
                <th className={styles.colTasks}>Tasks</th>
                <th className={styles.colTime}>Time</th>
                <th className={styles.colLoc}>Location</th>
                <th className={styles.colActions}>
                  <div className={styles.tableToggleIcons}>
                    <span className={styles.iconTableActive} title="Table View">目</span>
                    <span className={styles.iconChart} title="Expand / Action">⇪</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {activePhase.rows.map((row, rowIndex) => (
                <tr key={row.id} className={styles.tableRow}>
                  {/* Column 1: Aslt Unit */}
                  <td className={styles.colAsltUnit}>
                    <input
                      type="text"
                      className={styles.cellInput}
                      value={row.asltUnit}
                      placeholder="INF BN A"
                      onChange={(e) => handleUpdateRow(row.id, 'asltUnit', e.target.value)}
                    />
                  </td>

                  {/* Column 2: Res Unit - Clean Dropdown matching Reference */}
                  <td className={styles.colResUnit}>
                    <div className={styles.cellSelectWrapper}>
                      <select
                        className={styles.cellSelect}
                        value={row.resUnit || '-'}
                        onChange={(e) => handleUpdateRow(row.id, 'resUnit', e.target.value)}
                      >
                        <option value="-">-</option>
                        <option value="INF BN A">INF BN A</option>
                        <option value="INF BN B">INF BN B</option>
                        <option value="INF BN C">INF BN C</option>
                        <option value="223 Armoured Brigade">223 Armoured Brigade</option>
                        <option value="24 Mechanised Battalion">24 Mechanised Battalion</option>
                        <option value="Divisional Integral Armour">Divisional Integral Armour</option>
                      </select>
                      <span className={styles.selectChevron}>⌵</span>
                    </div>
                  </td>

                  {/* Column 3: Fire Unit - Clean Dropdown matching Reference */}
                  <td className={styles.colFireUnit}>
                    <div className={styles.cellSelectWrapper}>
                      <select
                        className={styles.cellSelect}
                        value={row.fireUnit || '-'}
                        onChange={(e) => handleUpdateRow(row.id, 'fireUnit', e.target.value)}
                      >
                        <option value="-">-</option>
                        <option value="Divisional Artillery Brigade">Divisional Artillery Brigade</option>
                        <option value="DIV ARTY">DIV ARTY</option>
                        <option value="Air Support Group">Air Support Group</option>
                      </select>
                      <span className={styles.selectChevron}>⌵</span>
                    </div>
                  </td>

                  {/* Column 4: Tasks (Line 1: Select + Ctgcy, Line 2: Task Desc, Line 3: Exec Code) */}
                  <td className={styles.colTasks}>
                    <div className={styles.taskCellStack}>
                      <div className={styles.taskLine1}>
                        <div className={styles.cellSelectWrapper}>
                          <select
                            className={styles.taskVerbSelect}
                            value={row.task}
                            onChange={(e) => handleUpdateRow(row.id, 'task', e.target.value)}
                          >
                            <option value="-">-</option>
                            <option value="Capture">Capture</option>
                            <option value="Establish">Establish</option>
                            <option value="Isolate">Isolate</option>
                            <option value="Breach">Breach</option>
                            <option value="Attack">Attack</option>
                            <option value="Defend">Defend</option>
                            <option value="Support">Support</option>
                            <option value="Invest">Invest</option>
                            <option value="Move">Move</option>
                          </select>
                          <span className={styles.selectChevron}>⌵</span>
                        </div>
                        <label className={styles.ctgcyCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={row.isCtgcy}
                            onChange={(e) => handleUpdateRow(row.id, 'isCtgcy', e.target.checked)}
                          />
                          <span>Ctgcy</span>
                        </label>
                      </div>

                      <input
                        type="text"
                        className={styles.taskDescInput}
                        value={row.taskDesc || ''}
                        placeholder={rowIndex === 0 ? "Capture en COY A" : rowIndex === 1 ? "Capture en COY B" : "-"}
                        onChange={(e) => handleUpdateRow(row.id, 'taskDesc', e.target.value)}
                      />

                      <input
                        type="text"
                        className={styles.execCodeInput}
                        value={row.execCode || ''}
                        placeholder="Enter Exec. Code"
                        onChange={(e) => handleUpdateRow(row.id, 'execCode', e.target.value)}
                      />
                    </div>
                  </td>

                  {/* Column 5: Time (Row 1: H Hr/By selects; Rows 2-3: ST/ET labels) */}
                  <td className={styles.colTime}>
                    <div className={styles.timeCellStack}>
                      <div className={styles.timeRow}>
                        {rowIndex === 0 ? (
                          <div className={styles.timeSelectWrapper}>
                            <select
                              className={styles.timeTypeSelect}
                              value={row.timingType || 'H Hr'}
                              onChange={(e) => handleUpdateRow(row.id, 'timingType', e.target.value)}
                            >
                              <option value="H Hr">H Hr</option>
                              <option value="ST">ST</option>
                              <option value="DTG">DTG</option>
                              <option value="From">From</option>
                            </select>
                            <span className={styles.selectChevron}>⌵</span>
                          </div>
                        ) : (
                          <span className={styles.timeStaticLabel}>ST:</span>
                        )}
                        <input
                          type="text"
                          className={styles.timeValInput}
                          value={row.startTime || ''}
                          placeholder={rowIndex === 0 ? '110300' : rowIndex === 1 ? '110300' : '-'}
                          onChange={(e) => handleUpdateRow(row.id, 'startTime', e.target.value)}
                        />
                      </div>

                      <div className={styles.timeRow}>
                        {rowIndex === 0 ? (
                          <div className={styles.timeSelectWrapper}>
                            <select
                              className={styles.timeTypeSelect}
                              value={row.endType || 'By'}
                              onChange={(e) => handleUpdateRow(row.id, 'endType', e.target.value)}
                            >
                              <option value="By">By</option>
                              <option value="ET">ET</option>
                              <option value="To">To</option>
                            </select>
                            <span className={styles.selectChevron}>⌵</span>
                          </div>
                        ) : (
                          <span className={styles.timeStaticLabel}>ET:</span>
                        )}
                        <input
                          type="text"
                          className={styles.timeValInput}
                          value={row.endTime || ''}
                          placeholder={rowIndex === 0 ? '110700' : rowIndex === 1 ? '110700' : '-'}
                          onChange={(e) => handleUpdateRow(row.id, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Column 6: Location (Line 1: East, Line 2: North) */}
                  <td className={styles.colLoc}>
                    <div className={styles.locCellStack}>
                      <div className={styles.locRow}>
                        <span className={styles.locLabel}>E:</span>
                        <input
                          type="text"
                          className={styles.locInput}
                          value={row.east || ''}
                          placeholder={rowIndex === 2 ? '-' : '4908'}
                          onChange={(e) => handleUpdateRow(row.id, 'east', e.target.value)}
                        />
                      </div>
                      <div className={styles.locRow}>
                        <span className={styles.locLabel}>N:</span>
                        <input
                          type="text"
                          className={styles.locInput}
                          value={row.north || ''}
                          placeholder={rowIndex === 2 ? '-' : '8403'}
                          onChange={(e) => handleUpdateRow(row.id, 'north', e.target.value)}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Column 7: Actions (Stacked Circle ✕ and + buttons) */}
                  <td className={styles.colActions}>
                    <div className={styles.rowActionsStack}>
                      <button
                        type="button"
                        className={styles.circleDeleteBtn}
                        title="Delete Row"
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className={styles.circleAddBtn}
                        title="Add Row Below"
                        onClick={() => handleInsertRowAfter(row.id)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
