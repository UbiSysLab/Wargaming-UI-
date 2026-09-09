import React, { useState } from 'react';
import { TaskSyncTable } from '../opOrder/TaskSyncTable';
import { TaskSyncData } from '../opOrder/taskSyncExtractor';
import styles from './EditorScreen.module.css';

interface EditorScreenProps {
  onBack: () => void;
  initialTaskSyncData?: TaskSyncData | null;
}

export function EditorScreen({ onBack, initialTaskSyncData }: EditorScreenProps) {
  const [showTaskSync, setShowTaskSync] = useState(true);
  const [showOpOverlay, setShowOpOverlay] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<'2D' | '2.5D' | '3D' | 'GIS'>('2D');
  const [selectedOverlayTab, setSelectedOverlayTab] = useState('Terrain');

  return (
    <div className={styles.editorContainer}>
      {/* Top Application Bar */}
      <div className={styles.topAppBar}>
        <div className={styles.topAppLeft}>
          <button type="button" className={styles.backBtn} onClick={onBack} title="Return to Wizard / OPORD Preparation">
            ← Back to Preparation
          </button>
          <div className={styles.menuItems}>
            <span className={styles.menuItem}>File</span>
            <span className={styles.menuItem}>Edit</span>
            <span className={styles.menuItem}>Layer</span>
            <span className={styles.menuItem}>Text</span>
            <span className={styles.menuItem}>View</span>
            <span className={styles.menuItem}>AI</span>
            <span className={styles.menuItem}>Help</span>
          </div>

          <div className={styles.appTabs}>
            <span className={`${styles.appTab} ${styles.appTabActive}`}>Initial Login Flow +</span>
          </div>
        </div>

        <div className={styles.topAppRight}>
          <span>67%</span>
          <span>🌙</span>
          <div className={styles.windowActions}>
            <span>—</span>
            <span>□</span>
            <span style={{ cursor: 'pointer' }} onClick={onBack}>✕</span>
          </div>
        </div>
      </div>

      {/* Secondary Status & Time Ribbon */}
      <div className={styles.secondaryRibbon}>
        <div className={styles.ribbonLeft}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Game Time:</span>
            <span className={styles.statVal}>101122</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Game Pace:</span>
            <span className={styles.statVal}>1:10</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Red Time:</span>
            <span className={styles.statValRed}>1230 Hrs</span>
          </div>
          <div className={styles.phasePill}>
            <span>Prepare</span>
            <span style={{ opacity: 0.85, fontSize: '0.68rem' }}>1:00:00</span>
          </div>
          <div className={styles.stepPills}>
            <span>War</span>
            <span>Analysis</span>
            <span>Sit</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Ops</span>
          </div>
        </div>

        <div className={styles.ribbonCenter}>
          <span>&lt; 27/52 &gt;</span>
          <button type="button" className={styles.restartBtn}>
            <span>🔄</span> Restart
          </button>
        </div>

        <div className={styles.ribbonRight}>
          <span className={styles.blueTimePill}>Blue Time: D + 04 13:00</span>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>INF BDE A: G1</span>
          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Sit last updated at 212020</span>
        </div>
      </div>

      {/* Command Ribbon */}
      <div className={styles.commandRibbon}>
        <div className={styles.commandLeft}>
          <button type="button" className={styles.cmdBtn}>
            Op Plan 1 +
          </button>
          <button
            type="button"
            className={`${styles.cmdBtn} ${showOpOverlay ? styles.cmdBtnActive : ''}`}
            onClick={() => setShowOpOverlay(!showOpOverlay)}
          >
            Op Overlay
          </button>
          <button type="button" className={styles.cmdBtn}>
            Support Plan Tables
          </button>
          <button
            type="button"
            className={`${styles.cmdBtn} ${showTaskSync ? styles.cmdBtnActive : ''}`}
            onClick={() => setShowTaskSync(!showTaskSync)}
          >
            Task Sync
          </button>
          <button type="button" className={styles.cmdBtn}>
            Op Appreciation
          </button>
          <button type="button" className={styles.cmdBtn}>
            Op Ranking
          </button>
          <button type="button" className={styles.cmdBtn}>
            Import Elements
          </button>
          <button type="button" className={styles.cmdBtn}>
            Narratives
          </button>
        </div>

        <div className={styles.viewModeToggles}>
          {(['2D', '2.5D', '3D', 'GIS'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.viewModeBtn} ${activeViewMode === mode ? styles.viewModeActive : ''}`}
              onClick={() => setActiveViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tactical Map Canvas & Floating Panels */}
      <div className={styles.workspace}>
        {/* SVG Tactical Map Canvas */}
        <svg className={styles.mapCanvas} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Topographic Map Grid Pattern */}
            <pattern id="gridPattern" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#d5ccba" strokeWidth="0.8" opacity="0.6" />
              <path d="M 50 0 L 50 100 M 0 50 L 100 50" fill="none" stroke="#e0d7c6" strokeWidth="0.4" strokeDasharray="3,3" />
            </pattern>

            {/* Tactical Arrow Marker */}
            <marker id="arrowBlue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
            </marker>
            <marker id="arrowRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Map Base background with elevation contours */}
          <rect width="100%" height="100%" fill="#ece5d8" />
          <rect width="100%" height="100%" fill="url(#gridPattern)" />

          {/* Contour Lines */}
          <g stroke="#b5a68c" strokeWidth="1.2" fill="none" opacity="0.55">
            <path d="M -50 200 C 300 150, 450 400, 700 350 S 1100 200, 1650 300" />
            <path d="M -50 350 C 200 400, 500 550, 850 500 S 1200 450, 1650 550" />
            <path d="M -50 600 C 350 650, 600 800, 950 750 S 1350 700, 1650 850" />
          </g>

          {/* Natural Features: Canal / River */}
          <path
            d="M 180 -50 Q 240 300 210 550 T 260 1050"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="8"
            strokeDasharray="16, 4"
            opacity="0.85"
          />
          <text x="230" y="420" fill="#2563eb" fontSize="13" fontWeight="bold" transform="rotate(75, 230, 420)">
            CANAL LINE
          </text>

          {/* Roads & Highways */}
          <g stroke="#94a3b8" strokeWidth="3" fill="none" opacity="0.8">
            <path d="M 400 -50 L 520 450 L 680 1050" />
            <path d="M -50 480 L 520 450 L 1650 520" />
          </g>

          {/* Defense Objective Rings (Kakra, Mukam, Jhar) */}
          {/* Objective Kakra */}
          <g transform="translate(520, 440)">
            <ellipse rx="130" ry="100" fill="rgba(234, 179, 8, 0.12)" stroke="#ca8a04" strokeWidth="3" strokeDasharray="8,5" />
            <ellipse rx="75" ry="50" fill="rgba(239, 68, 68, 0.15)" stroke="#dc2626" strokeWidth="2.5" />
            <text x="0" y="5" fill="#991b1b" fontSize="15" fontWeight="800" textAnchor="middle">
              Kakra
            </text>
            <text x="0" y="-115" fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle">
              PL- 230530
            </text>
          </g>

          {/* Objective Mukam */}
          <g transform="translate(380, 680)">
            <ellipse rx="95" ry="60" fill="rgba(59, 130, 246, 0.12)" stroke="#2563eb" strokeWidth="2" strokeDasharray="6,4" />
            <text x="0" y="5" fill="#1e3a8a" fontSize="14" fontWeight="800" textAnchor="middle">
              Mukam
            </text>
          </g>

          {/* Objective Jhar / Thaona */}
          <g transform="translate(740, 520)">
            <ellipse rx="100" ry="70" fill="rgba(59, 130, 246, 0.12)" stroke="#2563eb" strokeWidth="2" strokeDasharray="6,4" />
            <text x="0" y="5" fill="#1e3a8a" fontSize="14" fontWeight="800" textAnchor="middle">
              Jhar / Thaona
            </text>
          </g>

          {/* Tactical Blue Maneuver Arrows */}
          <g fill="none" stroke="#1d4ed8" strokeWidth="4" markerEnd="url(#arrowBlue)">
            {/* North Envelopment Arrow */}
            <path d="M 450 150 C 350 220, 320 320, 350 420" />
            <path d="M 750 250 C 650 280, 620 360, 600 420" />
            {/* South Envelopment Arrow */}
            <path d="M 320 820 C 400 780, 480 720, 500 620" />
            <path d="M 720 780 C 680 720, 620 660, 580 580" />
          </g>

          {/* Unit Tactical Symbols (RV 1, RV 2, A1, B1) */}
          <g transform="translate(780, 260)">
            <ellipse rx="38" ry="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" opacity="0.8" />
            <text x="0" y="5" fill="#0c4a6e" fontSize="12" fontWeight="bold" textAnchor="middle">
              RV 1
            </text>
          </g>

          <g transform="translate(800, 600)">
            <ellipse rx="38" ry="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" opacity="0.8" />
            <text x="0" y="5" fill="#0c4a6e" fontSize="12" fontWeight="bold" textAnchor="middle">
              RV 2
            </text>
          </g>

          {/* Friendly Battalion Icons */}
          <g transform="translate(340, 680)" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5">
            <rect x="-18" y="-14" width="36" height="28" rx="3" fill="#3b82f6" />
            <line x1="-18" y1="-14" x2="18" y2="14" stroke="#ffffff" strokeWidth="2" />
            <line x1="-18" y1="14" x2="18" y2="-14" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="24" fill="#1e3a8a" fontSize="11" fontWeight="bold" textAnchor="middle">
              B1
            </text>
          </g>

          <g transform="translate(620, 780)" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5">
            <rect x="-18" y="-14" width="36" height="28" rx="3" fill="#3b82f6" />
            <line x1="-18" y1="-14" x2="18" y2="14" stroke="#ffffff" strokeWidth="2" />
            <line x1="-18" y1="14" x2="18" y2="-14" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="24" fill="#1e3a8a" fontSize="11" fontWeight="bold" textAnchor="middle">
              A1
            </text>
          </g>
        </svg>

        {/* Left Floating "Op Overlay" Panel */}
        {showOpOverlay && (
          <div className={styles.opOverlayPanel}>
            <div className={styles.opOverlayHeader}>
              <span>Op Overlay</span>
              <span style={{ cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setShowOpOverlay(false)}>
                ✕
              </span>
            </div>

            <div className={styles.opOverlaySearch}>
              <input type="text" placeholder="Search overlays..." className={styles.opSearchInput} />
            </div>

            <div className={styles.opOverlaySubTabs}>
              {['Terrain', 'En & Oth', 'Civilian', 'Unit & Lopt', 'Ctrl Measure'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.opSubTab} ${selectedOverlayTab === tab ? styles.opSubTabActive : ''}`}
                  onClick={() => setSelectedOverlayTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.layerTreeList}>
              <div className={styles.treeGroupTitle}>
                <span>▾</span>
                <span>🌊 Natural Obstacles</span>
              </div>
              <div className={styles.treeSubItem}>
                <input type="checkbox" defaultChecked />
                <span>Canal</span>
              </div>
              <div className={styles.treeSubItem}>
                <input type="checkbox" defaultChecked />
                <span>Reserve Forest</span>
              </div>

              <div className={styles.treeGroupTitle} style={{ marginTop: '6px' }}>
                <span>▾</span>
                <span>🚧 Manmade Obstacles</span>
              </div>
              <div className={styles.treeSubItem}>
                <input type="checkbox" defaultChecked />
                <span>Minefield</span>
              </div>
              <div className={styles.treeSubItem}>
                <input type="checkbox" defaultChecked />
                <span>Fence / Anti-tank ditch</span>
              </div>

              <div className={styles.treeGroupTitle} style={{ marginTop: '6px' }}>
                <span>▾</span>
                <span>📦 Resources</span>
              </div>
              <div className={styles.treeSubItem}>
                <input type="checkbox" defaultChecked />
                <span>Water / Ration / Medical</span>
              </div>
            </div>
          </div>
        )}

        {/* Center-Right Floating "Task Sync" Table Window */}
        {showTaskSync && (
          <div className={styles.taskSyncFloatingWrapper}>
            <TaskSyncTable 
              onClose={() => setShowTaskSync(false)} 
              initialData={initialTaskSyncData}
            />
          </div>
        )}

        {/* Bottom Floating Tactical Annotation Tools */}
        <div className={styles.bottomFloatingToolbar}>
          <div className={styles.toolGroup}>
            <button type="button" className={`${styles.toolBtn} ${styles.toolBtnActive}`} title="Pen / Marker">
              ✏️
            </button>
            <button type="button" className={styles.toolBtn} title="Highlighter">
              🖍️
            </button>
            <button type="button" className={styles.toolBtn} title="Eraser">
              🧹
            </button>
          </div>

          <div className={styles.toolDivider} />

          <div className={styles.toolGroup}>
            <button type="button" className={styles.toolBtn} title="Weapons">
              🎯
            </button>
            <button type="button" className={styles.toolBtn} title="Sensors">
              📡
            </button>
            <button type="button" className={styles.toolBtn} title="Maneuver Line">
              ➔
            </button>
            <button type="button" className={styles.toolBtn} title="Obstacle Area">
              ⬡
            </button>
            <button type="button" className={styles.toolBtn} title="Boundary">
              ☵
            </button>
          </div>

          <div className={styles.toolDivider} />

          <div className={styles.colorPalette}>
            <div className={styles.colorDot} style={{ background: '#000000' }} />
            <div className={styles.colorDot} style={{ background: '#2563eb' }} />
            <div className={styles.colorDot} style={{ background: '#dc2626' }} />
            <div className={styles.colorDot} style={{ background: '#16a34a' }} />
            <div className={styles.colorDot} style={{ background: '#ca8a04' }} />
          </div>
        </div>

        {/* Bottom Status & Coordinate Information */}
        <div className={styles.bottomStatusBar}>
          <div>
            <span>Ex. Name: </span>
            <strong style={{ color: '#0f172a' }}>Operation Vikram</strong>
            <span style={{ marginLeft: '1rem', color: '#64748b' }}>Map Sheet No.: GH/44A, RJ/22F, RD/41B</span>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Grid: <strong>RJ E 78051 N 78051</strong></span>
            <span>Apprx Ht.: <strong>200 m</strong></span>
            <span>Scale: <strong>1:50000</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
