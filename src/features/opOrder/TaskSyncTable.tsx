import React, { useState, useEffect } from 'react';
import { useWizard } from '../../stores/WizardContext';
import { extractTaskSyncFromOpOrder, TaskSyncData, TaskSyncRow, TaskSyncPhase } from './taskSyncExtractor';
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

  useEffect(() => {
    if (initialData) {
      setTaskData(initialData);
    }
  }, [initialData]);

  const activePhase: TaskSyncPhase = taskData.phases[selectedPhaseIndex] || taskData.phases[0];

  const handleUpdateRow = (rowId: string, field: keyof TaskSyncRow, value: any) => {
    setTaskData((prev) => {
      const newPhases = prev.phases.map((phase, pIdx) => {
        if (pIdx !== selectedPhaseIndex) return phase;
        return {
          ...phase,
          rows: phase.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
        };
      });
      return { ...prev, phases: newPhases };
    });
  };

  const handleAddRow = () => {
    setTaskData((prev) => {
      const newPhases = prev.phases.map((phase, pIdx) => {
        if (pIdx !== selectedPhaseIndex) return phase;
        const newRow: TaskSyncRow = {
          id: `row-${pIdx + 1}-${phase.rows.length + 1}`,
          asltUnit: 'INF BN ' + String.fromCharCode(65 + phase.rows.length),
          resUnit: '-',
          fireUnit: '-',
          task: 'Capture',
          isCtgcy: false,
          taskDesc: 'New Tactical Task',
          execCode: '',
          startType: 'ST',
          startTime: '110300',
          endType: 'ET',
          endTime: '110700',
          east: '4908',
          north: '8403',
        };
        return { ...phase, rows: [...phase.rows, newRow] };
      });
      return { ...prev, phases: newPhases };
    });
  };

  const handleDeleteRow = (rowId: string) => {
    setTaskData((prev) => {
      const newPhases = prev.phases.map((phase, pIdx) => {
        if (pIdx !== selectedPhaseIndex) return phase;
        return { ...phase, rows: phase.rows.filter((r) => r.id !== rowId) };
      });
      return { ...prev, phases: newPhases };
    });
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

  const handleDeleteObjective = (objId: string) => {
    setTaskData((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((o) => o.id !== objId),
    }));
  };

  const handleAddPhase = () => {
    const nextIdx = taskData.phases.length + 1;
    const newPhase: TaskSyncPhase = {
      id: `phase-${nextIdx}`,
      name: `Phase ${nextIdx}`,
      label: `Phase ${nextIdx}`,
      taskType: 'Capture',
      taskDesc: 'Phase Objective',
      fromTime: '110300',
      toTime: '110700',
      east: '4908',
      north: '8403',
      color: '#3b82f6',
      rows: [
        {
          id: `row-${nextIdx}-1`,
          asltUnit: 'INF BN A',
          resUnit: 'INF BN C',
          fireUnit: '-',
          task: 'Capture',
          isCtgcy: false,
          taskDesc: 'Capture Objective',
          execCode: '',
          startType: 'H Hr',
          startTime: '110300',
          endType: 'By',
          endTime: '110700',
          east: '4908',
          north: '8403',
        },
      ],
    };
    setTaskData((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhase],
    }));
    setSelectedPhaseIndex(taskData.phases.length);
  };

  return (
    <div className={styles.windowCard}>
      {/* Window Title Bar Tabs */}
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
            <span className={styles.tabClose}>✕</span>
          </div>
        </div>

        <div className={styles.windowControls}>
          <span>—</span>
          <span>□</span>
          {onClose ? (
            <span style={{ cursor: 'pointer' }} onClick={onClose}>✕</span>
          ) : (
            <span>✕</span>
          )}
        </div>
      </div>

      {/* Main Task Sync Content */}
      <div className={styles.bodyContent}>
        {/* Top Header Row with Title, Op Plan dropdown, Objectives */}
        <div className={styles.topRow}>
          <div className={styles.planSection}>
            <h1 className={styles.tasksTitle}>Tasks</h1>
            <div className={styles.planSelectorGroup}>
              <select className={styles.planSelect} defaultValue={taskData.planName}>
                <option value="Op Plan 1">Op Plan 1</option>
                <option value="Op Plan 2">Op Plan 2</option>
              </select>
              <label className={styles.ctgcyLabel}>
                <input type="checkbox" defaultChecked={taskData.isCtgcy} />
                <span>Ctgcy</span>
              </label>
            </div>
          </div>

          {/* Objectives List */}
          <div className={styles.objectivesSection}>
            {taskData.objectives.map((obj) => (
              <div key={obj.id} className={styles.objectiveRow}>
                <span className={styles.objLabel}>{obj.label}</span>
                <input
                  type="text"
                  className={styles.objInput}
                  placeholder="Enter Objective"
                  value={obj.text}
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
                  onClick={() => handleDeleteObjective(obj.id)}
                >
                  ✕
                </button>
              </div>
            ))}

            <button type="button" className={styles.addObjBtn} onClick={handleAddObjective}>
              <span>+</span> Add Objective
            </button>
          </div>

          {/* Overall From & To */}
          <div className={styles.timingSection}>
            <div className={styles.timingRow}>
              <span className={styles.timeLabel}>From:</span>
              <input type="text" className={styles.timeInput} defaultValue={taskData.overallFrom} />
            </div>
            <div className={styles.timingRow}>
              <span className={styles.timeLabel}>To:</span>
              <input type="text" className={styles.timeInput} defaultValue={taskData.overallTo} />
            </div>
          </div>
        </div>

        {/* Phase Header Controls Bar */}
        <div className={styles.phaseBar}>
          <div className={styles.phaseSelector}>
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
            <input
              type="text"
              className={styles.phaseNameInput}
              value={activePhase.label}
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

          <div className={styles.phaseTaskFields}>
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
              <option value="Isolate">Isolate</option>
              <option value="Establish">Establish</option>
              <option value="Support">Support</option>
              <option value="Invest">Invest</option>
              <option value="Attack">Attack</option>
              <option value="Defend">Defend</option>
            </select>
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

          <div className={styles.phaseCoords}>
            <div className={styles.coordRow}>
              <span className={styles.coordLabel}>From:</span>
              <input type="text" className={styles.coordInput} defaultValue={activePhase.fromTime} />
              <span className={styles.coordLabel}>E:</span>
              <input type="text" className={styles.coordInputSmall} defaultValue={activePhase.east} />
            </div>
            <div className={styles.coordRow}>
              <span className={styles.coordLabel}>To:</span>
              <input type="text" className={styles.coordInput} defaultValue={activePhase.toTime} />
              <span className={styles.coordLabel}>N:</span>
              <input type="text" className={styles.coordInputSmall} defaultValue={activePhase.north} />
            </div>
          </div>

          <div className={styles.colorSwatch} style={{ background: activePhase.color }} />

          <button type="button" className={styles.newPhaseBtn} onClick={handleAddPhase}>
            + New Phase
          </button>
        </div>

        {/* Units / Tasks Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Aslt Unit</th>
                <th style={{ width: '13%' }}>Res Unit</th>
                <th style={{ width: '10%' }}>Fire Unit</th>
                <th style={{ width: '32%' }}>Tasks</th>
                <th style={{ width: '16%' }}>Time</th>
                <th style={{ width: '10%' }}>Location</th>
                <th style={{ width: '6%' }}>
                  <div className={styles.tableToggleIcons}>
                    <span className={styles.iconTableActive}>▦</span>
                    <span className={styles.iconChart}>📊</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {activePhase.rows.map((row) => (
                <tr key={row.id} className={styles.tableRow}>
                  {/* Aslt Unit */}
                  <td>
                    <input
                      type="text"
                      className={styles.cellInput}
                      value={row.asltUnit}
                      onChange={(e) => handleUpdateRow(row.id, 'asltUnit', e.target.value)}
                    />
                  </td>

                  {/* Res Unit */}
                  <td>
                    <select
                      className={styles.cellSelect}
                      value={row.resUnit}
                      onChange={(e) => handleUpdateRow(row.id, 'resUnit', e.target.value)}
                    >
                      <option value="-">-</option>
                      <option value="INF BN A">INF BN A</option>
                      <option value="INF BN B">INF BN B</option>
                      <option value="INF BN C">INF BN C</option>
                    </select>
                  </td>

                  {/* Fire Unit */}
                  <td>
                    <select
                      className={styles.cellSelect}
                      value={row.fireUnit}
                      onChange={(e) => handleUpdateRow(row.id, 'fireUnit', e.target.value)}
                    >
                      <option value="-">-</option>
                      <option value="DIV ARTY">DIV ARTY</option>
                      <option value="BTY A">BTY A</option>
                    </select>
                  </td>

                  {/* Tasks Column */}
                  <td>
                    <div className={styles.taskCellStack}>
                      <div className={styles.taskTopLine}>
                        <select
                          className={styles.taskVerbSelect}
                          value={row.task}
                          onChange={(e) => handleUpdateRow(row.id, 'task', e.target.value)}
                        >
                          <option value="Capture">Capture</option>
                          <option value="Isolate">Isolate</option>
                          <option value="Establish">Establish</option>
                          <option value="Support">Support</option>
                          <option value="Invest">Invest</option>
                          <option value="Attack">Attack</option>
                          <option value="Defend">Defend</option>
                          <option value="-">-</option>
                        </select>
                        <label className={styles.rowCtgcyLabel}>
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
                        className={styles.cellInputDesc}
                        value={row.taskDesc}
                        placeholder="Task Description"
                        onChange={(e) => handleUpdateRow(row.id, 'taskDesc', e.target.value)}
                      />

                      <input
                        type="text"
                        className={styles.cellInputExec}
                        value={row.execCode}
                        placeholder="Enter Exec. Code"
                        onChange={(e) => handleUpdateRow(row.id, 'execCode', e.target.value)}
                      />
                    </div>
                  </td>

                  {/* Time Column */}
                  <td>
                    <div className={styles.timeCellStack}>
                      <div className={styles.timeRow}>
                        <select
                          className={styles.timeKindSelect}
                          value={row.startType}
                          onChange={(e) => handleUpdateRow(row.id, 'startType', e.target.value)}
                        >
                          <option value="H Hr">H Hr</option>
                          <option value="ST">ST</option>
                          <option value="From">From</option>
                        </select>
                        <input
                          type="text"
                          className={styles.timeValInput}
                          value={row.startTime}
                          onChange={(e) => handleUpdateRow(row.id, 'startTime', e.target.value)}
                        />
                      </div>

                      <div className={styles.timeRow}>
                        <select
                          className={styles.timeKindSelect}
                          value={row.endType}
                          onChange={(e) => handleUpdateRow(row.id, 'endType', e.target.value)}
                        >
                          <option value="By">By</option>
                          <option value="ET">ET</option>
                          <option value="To">To</option>
                        </select>
                        <input
                          type="text"
                          className={styles.timeValInput}
                          value={row.endTime}
                          onChange={(e) => handleUpdateRow(row.id, 'endTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Location Column */}
                  <td>
                    <div className={styles.locCellStack}>
                      <div className={styles.locRow}>
                        <span className={styles.locLabel}>E:</span>
                        <input
                          type="text"
                          className={styles.locInput}
                          value={row.east}
                          onChange={(e) => handleUpdateRow(row.id, 'east', e.target.value)}
                        />
                      </div>
                      <div className={styles.locRow}>
                        <span className={styles.locLabel}>N:</span>
                        <input
                          type="text"
                          className={styles.locInput}
                          value={row.north}
                          onChange={(e) => handleUpdateRow(row.id, 'north', e.target.value)}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Row Action Buttons */}
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.deleteRowBtn}
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete task row"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        className={styles.addRowBtn}
                        onClick={handleAddRow}
                        title="Add task row"
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
