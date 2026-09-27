import React, { useState, useEffect } from 'react';
import { TaskSyncTable } from '../opOrder/TaskSyncTable';
import { TaskSyncData } from '../opOrder/taskSyncExtractor';
import { LoadingWorkspaceModal } from './LoadingWorkspaceModal';
import styles from './EditorScreen.module.css';

interface EditorScreenProps {
  onBack: () => void;
  initialTaskSyncData?: TaskSyncData | null;
  isLoadingWorkspace?: boolean;
}

export function EditorScreen({ onBack, initialTaskSyncData, isLoadingWorkspace = false }: EditorScreenProps) {
  const [showLoader, setShowLoader] = useState<boolean>(isLoadingWorkspace);
  const [showTaskSync, setShowTaskSync] = useState(!isLoadingWorkspace);
  const [showOpOverlay, setShowOpOverlay] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<'2D' | '2.5D' | '3D' | 'GIS'>('2D');
  const [selectedOverlayTab, setSelectedOverlayTab] = useState('Terrain');
  const [selectedDrawTool, setSelectedDrawTool] = useState('pen');
  const [selectedColor, setSelectedColor] = useState('#2563eb');

  useEffect(() => {
    if (isLoadingWorkspace) {
      setShowLoader(true);
      setShowTaskSync(false);
    } else {
      // Failsafe: when backend generation completes (isLoadingWorkspace=false), guarantee loader closes and task sync displays
      const fallbackTimer = setTimeout(() => {
        setShowLoader(false);
        setShowTaskSync(true);
      }, 2300);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isLoadingWorkspace]);

  return (
    <div className={styles.editorContainer}>
      {/* 1. Top HUD Tactical Bar (Black / Dark Navy) */}
      <div className={styles.topHudBar}>
        <div className={styles.hudLeft}>
          <div className={styles.hudStat}>
            <span className={styles.hudStatLabel}>Game Time:</span>
            <span className={styles.hudStatVal}>101122</span>
          </div>
          <div className={styles.hudStat}>
            <span className={styles.hudStatLabel}>Game Pace:</span>
            <span className={styles.hudStatVal}>1:10</span>
          </div>

          <div className={styles.redTimeBadge}>
            <span className={styles.redTimeText}>Red Time: 1230 Hrs</span>
            <div className={styles.pinkIcons}>
              <span className={styles.pinkIconCircle}>⚑</span>
              <span className={styles.pinkIconCircle}>⚲</span>
              <span className={styles.pinkIconCircle}>⚙</span>
            </div>
          </div>

          <div className={styles.preparePill}>
            <span>Prepare</span>
            <span className={styles.prepareTimer}>1:00:00 ⏱</span>
          </div>

          <div className={styles.modeGroup}>
            <button type="button" className={styles.modePill}>War</button>
            <button type="button" className={styles.modePill}>Analysis</button>
            <button type="button" className={styles.modePill}>Sit</button>
            <button type="button" className={`${styles.modePill} ${styles.modePillActive}`}>Ops</button>
          </div>
        </div>

        <div className={styles.hudCenter}>
          <div className={styles.stepperPill}>
            <span className={styles.stepperArrow}>&lt;</span>
            <span className={styles.stepperText}>1/8</span>
            <span className={styles.stepperArrow}>&gt;</span>
          </div>

          <button type="button" className={styles.restartPill}>
            <span>🔄</span> Restart
          </button>

          <div className={styles.quickTools}>
            <button type="button" className={styles.roundToolBtn} title="Download / Export">⬇</button>
            <button type="button" className={styles.roundToolBtn} title="Sync">↺</button>
            <button type="button" className={styles.roundToolBtn} title="Grid">⊡</button>
            <button type="button" className={styles.roundToolBtn} title="Target">⚲</button>
          </div>
        </div>

        <div className={styles.hudRight}>
          <div className={styles.blueTimeBadge}>
            <span>Blue Time:</span>
            <span className={styles.blueTimeSub}>D + 04</span>
            <span className={styles.blueTimeClock}>13:00</span>
          </div>

          <span className={styles.unitBadge}>INF BDE A: G1</span>

          <div className={styles.userAvatar} title="User Profile">
            👤
          </div>

          <div className={styles.windowControls}>
            <span>—</span>
            <span>□</span>
            <span
              style={{ cursor: 'pointer' }}
              onClick={onBack}
              title="Return to Preparation / OPORD Wizard"
            >
              ✕
            </span>
          </div>
        </div>
      </div>

      {/* 2. Secondary Command Ribbon (White Background) */}
      <div className={styles.secondaryRibbon}>
        <div className={styles.ribbonLeft}>
          <button type="button" className={styles.planBtn}>
            Op Plan 1 <span>+</span>
          </button>
          <span className={styles.ribbonDots}>⋮</span>

          <button
            type="button"
            className={`${styles.ribbonBtn} ${showOpOverlay ? styles.ribbonBtnActive : ''}`}
            onClick={() => setShowOpOverlay(!showOpOverlay)}
          >
            <span className={styles.btnIcon}>⛶</span> Op Overlay
          </button>

          <button type="button" className={styles.ribbonBtn}>
            Support Plan Tables
          </button>

          <button
            type="button"
            className={`${styles.ribbonBtn} ${showTaskSync ? styles.ribbonBtnTabActive : ''}`}
            onClick={() => setShowTaskSync(!showTaskSync)}
          >
            Task Sync
          </button>

          <button type="button" className={styles.ribbonBtn}>
            <span>≡</span> Op Appreciation
          </button>

          <button type="button" className={styles.ribbonBtn}>
            <span>❖</span> Op Ranking
          </button>

          <button type="button" className={styles.ribbonBtn}>
            <span>⤓</span> Import Elements
          </button>

          <button type="button" className={styles.ribbonBtn}>
            Narratives
          </button>
        </div>

        <div className={styles.ribbonRight}>
          <div className={styles.splitViewControls}>
            <button type="button" className={styles.splitBtn} title="Single View">[ ]</button>
            <button type="button" className={styles.splitBtn} title="Split Vertical">[ | ]</button>
            <button type="button" className={styles.splitBtn} title="Split Horizontal">[ — ]</button>
            <button type="button" className={styles.splitBtn} title="Three Columns">[ || ]</button>
            <button type="button" className={styles.splitBtn} title="Quad Grid">[ 田 ]</button>
          </div>

          <button type="button" className={styles.outlineActionBtn}>
            Order Editor
          </button>

          <button type="button" className={styles.outlineActionBtn}>
            Fetch SIT
          </button>

          <span className={styles.sitTimestamp}>
            Sit last updated at: 212020 (2hrs 40min ago)
          </span>
        </div>
      </div>

      {/* 3. Main Workspace Area: Tactical Map + Floating Controls */}
      <div className={styles.workspace}>
        {/* Floating View Mode Switcher (2D / 2.5D / 3D / GIS) */}
        <div className={styles.viewModeFloatBar}>
          <div className={styles.viewModePillGroup}>
            <button
              type="button"
              className={`${styles.viewPill} ${activeViewMode === '2D' ? styles.viewPillActive : ''}`}
              onClick={() => setActiveViewMode('2D')}
            >
              <span style={{ fontSize: '0.8rem', marginRight: '4px' }}>🌐</span> 2D
            </button>
            <button
              type="button"
              className={`${styles.viewPill} ${activeViewMode === '2.5D' ? styles.viewPillActive : ''}`}
              onClick={() => setActiveViewMode('2.5D')}
            >
              2.5D
            </button>
            <button
              type="button"
              className={`${styles.viewPill} ${activeViewMode === '3D' ? styles.viewPillActive : ''}`}
              onClick={() => setActiveViewMode('3D')}
            >
              3D
            </button>
            <button
              type="button"
              className={`${styles.viewPill} ${activeViewMode === 'GIS' ? styles.viewPillActive : ''}`}
              onClick={() => setActiveViewMode('GIS')}
            >
              GIS
            </button>
          </div>
        </div>

        {/* Map Top-Right Compass & Weather Widget */}
        <div className={styles.mapTopRightWidgets}>
          <div className={styles.scaleBarIndicator}>
            <span>1km</span>
            <div className={styles.scaleRulerGraphic} />
          </div>
          <div className={styles.weatherIcon}>⛅</div>
          <div className={styles.compassRose}>
            <span className={styles.compassN}>N</span>
            <div className={styles.compassArrow} />
          </div>
        </div>

        {/* SVG Tactical Map Graphic matching reference */}
        <svg className={styles.mapCanvas} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Topographic grid */}
            <pattern id="tacGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#d6cbb8" strokeWidth="0.7" opacity="0.7" />
              <path d="M 40 0 L 40 80 M 0 40 L 80 40" fill="none" stroke="#e3dacb" strokeWidth="0.4" strokeDasharray="3,3" />
            </pattern>

            {/* Tactical arrows markers */}
            <marker id="arrowBlueManeuver" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 1 1 L 11 6 L 1 11 L 4 6 z" fill="#1d4ed8" />
            </marker>
          </defs>

          {/* Map Base Topography */}
          <rect width="100%" height="100%" fill="#efe8dc" />
          <rect width="100%" height="100%" fill="url(#tacGrid)" />

          {/* Elevation Contours */}
          <g stroke="#bcaaa4" strokeWidth="1.2" fill="none" opacity="0.65">
            <path d="M -50 180 C 250 120, 400 350, 650 320 S 1100 180, 1650 260" />
            <path d="M -50 340 C 220 380, 480 500, 800 460 S 1220 400, 1650 500" />
            <path d="M -50 580 C 320 620, 580 760, 920 710 S 1300 660, 1650 800" />
            <path d="M 100 850 C 400 900, 700 820, 1100 920" />
          </g>

          {/* Roads & Tracks */}
          <g stroke="#94a3b8" strokeWidth="2.5" fill="none" opacity="0.8">
            <path d="M 380 -50 L 500 420 L 640 1050" />
            <path d="M -50 460 L 500 420 L 1650 510" />
            <path d="M 200 980 L 450 720 L 900 680" strokeDasharray="6,4" />
          </g>

          {/* Water / Canal Line */}
          <path
            d="M 220 -50 Q 280 280 250 530 T 290 1050"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="6"
            strokeDasharray="14, 4"
            opacity="0.85"
          />

          {/* Phase Line PL- 230130 */}
          <g>
            <path d="M 120 180 L 480 140" stroke="#ca8a04" strokeWidth="2.5" strokeDasharray="8,4" />
            <circle cx="280" cy="160" r="5" fill="#ec4899" />
            <rect x="230" y="125" width="85" height="20" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <text x="272" y="139" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle">
              PL- 230130
            </text>
          </g>

          {/* Phase Line PL- 230530 */}
          <g>
            <path d="M 460 180 L 440 450 L 320 820" stroke="#16a34a" strokeWidth="3" strokeDasharray="10,5" />
            <circle cx="490" cy="330" r="5" fill="#3b82f6" />
            <rect x="440" y="290" width="85" height="20" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <text x="482" y="304" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle">
              PL- 230530
            </text>
          </g>

          {/* Concentric Objective Area: Kakra */}
          <g transform="translate(430, 440)">
            {/* Outer green dashed circle */}
            <circle r="120" fill="none" stroke="#65a30d" strokeWidth="4" strokeDasharray="8,6" />

            {/* Inner red ellipse sectors */}
            <ellipse rx="85" ry="60" fill="rgba(239, 68, 68, 0.08)" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" />
            <line x1="-85" y1="0" x2="85" y2="0" stroke="#ef4444" strokeWidth="1.5" />
            <line x1="0" y1="-60" x2="0" y2="60" stroke="#ef4444" strokeWidth="1.5" />

            {/* Sector Labels A, B, C, D */}
            <text x="0" y="-35" fill="#dc2626" fontSize="12" fontWeight="700" textAnchor="middle">A</text>
            <text x="65" y="4" fill="#dc2626" fontSize="12" fontWeight="700" textAnchor="middle">B</text>
            <text x="0" y="45" fill="#dc2626" fontSize="12" fontWeight="700" textAnchor="middle">C</text>
            <text x="-65" y="4" fill="#dc2626" fontSize="12" fontWeight="700" textAnchor="middle">D</text>

            {/* Kakra Center Town Label */}
            <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#ffffff" stroke="#dc2626" strokeWidth="1.5" />
            <text x="0" y="4" fill="#991b1b" fontSize="12" fontWeight="800" textAnchor="middle">
              Kakra
            </text>
          </g>

          {/* Objective Positions: Jhar / Thaona (Three vertical blue ellipses) */}
          <g transform="translate(620, 480)">
            <ellipse cx="0" cy="-120" rx="35" ry="55" fill="none" stroke="#2563eb" strokeWidth="3" />
            <line x1="-15" y1="-120" x2="15" y2="-120" stroke="#2563eb" strokeWidth="2" />

            <ellipse cx="0" cy="0" rx="35" ry="55" fill="none" stroke="#2563eb" strokeWidth="3" />
            <line x1="-15" y1="0" x2="15" y2="0" stroke="#2563eb" strokeWidth="2" />

            <ellipse cx="0" cy="120" rx="35" ry="55" fill="none" stroke="#2563eb" strokeWidth="3" />
            <line x1="-15" y1="120" x2="15" y2="120" stroke="#2563eb" strokeWidth="2" />

            <text x="70" y="-30" fill="#1e3a8a" fontSize="13" fontWeight="800">Jhar</text>
            <text x="30" y="150" fill="#1e3a8a" fontSize="13" fontWeight="800">Thaona</text>
          </g>

          {/* Rendezvous Positions: RV 1 & RV 2 */}
          <g transform="translate(710, 240)">
            <rect x="-10" y="-12" width="60" height="24" rx="12" fill="#67e8f9" stroke="#0891b2" strokeWidth="1.5" />
            <text x="20" y="4" fill="#083344" fontSize="11" fontWeight="800" textAnchor="middle">RV 1</text>
          </g>

          <g transform="translate(730, 595)">
            <rect x="-10" y="-12" width="60" height="24" rx="12" fill="#67e8f9" stroke="#0891b2" strokeWidth="1.5" />
            <text x="20" y="4" fill="#083344" fontSize="11" fontWeight="800" textAnchor="middle">RV 2</text>
          </g>

          {/* Objective Mukam & Dashed Ellipses */}
          <g transform="translate(350, 680)">
            <ellipse cx="0" cy="0" rx="55" ry="28" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="6,4" />
            <ellipse cx="95" cy="5" rx="45" ry="25" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="6,4" />
            <text x="-70" y="-5" fill="#1e3a8a" fontSize="13" fontWeight="800">Mukam</text>
          </g>

          {/* Tactical Blue Maneuver Arrows circling Kakra */}
          <g fill="none" stroke="#1d4ed8" strokeWidth="3.5" markerEnd="url(#arrowBlueManeuver)">
            {/* North envelopment */}
            <path d="M 390 140 C 470 140, 560 170, 620 220" />
            <path d="M 640 290 L 690 380" />
            <path d="M 700 390 L 700 520" />
            {/* South envelopment */}
            <path d="M 700 660 L 660 760" />
            <path d="M 620 800 C 500 810, 420 800, 320 780" />
            <path d="M 300 760 L 250 670" />
            <path d="M 245 420 C 255 310, 310 210, 380 150" />
          </g>

          {/* Tactical Friendly Units on Map */}
          {/* Unit A (Top) */}
          <g transform="translate(390, 150)">
            <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
            <text x="32" y="5" fill="#1d4ed8" fontSize="13" fontWeight="800">A</text>
          </g>

          {/* Unit B (Middle) */}
          <g transform="translate(650, 235)">
            <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
            <text x="32" y="5" fill="#1d4ed8" fontSize="13" fontWeight="800">B</text>
          </g>

          {/* Unit C (Lower Right) */}
          <g transform="translate(700, 555)">
            <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
            <text x="32" y="5" fill="#1d4ed8" fontSize="13" fontWeight="800">C</text>
          </g>

          {/* Unit B1 (Lower Left) */}
          <g transform="translate(300, 680)">
            <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
            <text x="30" y="5" fill="#1d4ed8" fontSize="12" fontWeight="800">B1</text>
          </g>

          {/* Unit A1 (Bottom Center) */}
          <g transform="translate(540, 755)">
            <rect x="-24" y="-16" width="48" height="32" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2.5" />
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#1d4ed8" strokeWidth="2" />
            <text x="30" y="5" fill="#1d4ed8" fontSize="12" fontWeight="800">A1</text>
          </g>

          {/* Surrounding Village Labels */}
          <text x="660" y="810" fill="#0f172a" fontSize="12" fontWeight="700">Gundusar</text>
          <text x="870" y="845" fill="#0f172a" fontSize="12" fontWeight="700">Manisar</text>
          <text x="250" y="400" fill="#0f172a" fontSize="12" fontWeight="700">C1</text>
        </svg>

        {/* 4. Left Floating Panel: "Op Overlay" */}
        {showOpOverlay && (
          <div className={styles.opOverlayPanel}>
            <div className={styles.opOverlayHeader}>
              <span className={styles.opOverlayTitle}>Op Overlay</span>
              <div className={styles.opOverlayControls}>
                <span>—</span>
                <span>⤢</span>
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowOpOverlay(false)}
                >
                  ✕
                </span>
              </div>
            </div>

            <div className={styles.opOverlaySearch}>
              <input type="text" placeholder="Search" className={styles.opSearchInput} />
              <span className={styles.searchIcon}>🔍</span>
            </div>

            <div className={styles.opOverlayActionRow}>
              <button type="button" className={styles.opPlanPill}>Op Plan 1 +</button>
              <button type="button" className={styles.addLayerBtn}>[Add Layer]</button>
              <div className={styles.opActionCircleBtns}>
                <button type="button" className={styles.opCircleBtn}>📄</button>
                <button type="button" className={styles.opCircleBtn}>≡</button>
              </div>
            </div>

            <div className={styles.opOverlayCategories}>
              <div className={styles.categoryRow}>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'Terrain' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('Terrain')}
                >
                  Terrain
                </button>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'En & Oth' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('En & Oth')}
                >
                  En &amp; Oth
                </button>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'Civilian' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('Civilian')}
                >
                  Civilian
                </button>
              </div>
              <div className={styles.categoryRow}>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'Unit & Eqpt' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('Unit & Eqpt')}
                >
                  Unit &amp; Eqpt
                </button>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'Ctrl Measure' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('Ctrl Measure')}
                >
                  Ctrl Measure
                </button>
                <button
                  type="button"
                  className={`${styles.catPill} ${selectedOverlayTab === 'Support Pln' ? styles.catPillActive : ''}`}
                  onClick={() => setSelectedOverlayTab('Support Pln')}
                >
                  Support Pln
                </button>
              </div>
            </div>

            <div className={styles.layerTreeList}>
              {/* Natural Obstacles */}
              <div className={styles.treeSection}>
                <div className={styles.treeGroupHeader}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeSectionName}>Natural Obstacles</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Canal</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Reserve Forest</span>
                </div>
              </div>

              {/* Manmade Obstacles */}
              <div className={styles.treeSection}>
                <div className={styles.treeGroupHeader}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeSectionName}>Manmade Obstacles</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▸</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Minefield</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▸</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Fence</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▸</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Anti tank ditch</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▸</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Ditch cum bund (DCB)</span>
                </div>
              </div>

              {/* Resources */}
              <div className={styles.treeSection}>
                <div className={styles.treeGroupHeader}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeSectionName}>Resources</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Water</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span className={styles.treeArrow}>▾</span>
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Ration</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span style={{ width: '12px' }} />
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Hospitals</span>
                </div>
                <div className={styles.treeSubItem}>
                  <span style={{ width: '12px' }} />
                  <span className={styles.treeEye}>👁</span>
                  <span className={styles.treeItemName}>Airstrips</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Loading Modal if applicable */}
        {showLoader && (
          <LoadingWorkspaceModal
            isLoading={isLoadingWorkspace}
            onComplete={() => {
              setShowLoader(false);
              setShowTaskSync(true);
            }}
          />
        )}

        {/* 6. Center-Right Floating "Task Sync" Table Window */}
        {!showLoader && showTaskSync && (
          <div className={styles.taskSyncFloatingWrapper}>
            <TaskSyncTable
              onClose={() => setShowTaskSync(false)}
              initialData={initialTaskSyncData}
            />
          </div>
        )}

        {/* 7. Bottom Center Floating Toolbar Palette */}
        <div className={styles.bottomPalette}>
          <div className={styles.paletteToolsLeft}>
            <button type="button" className={styles.paletteBtn} title="Undo">↩</button>
            <button type="button" className={styles.paletteBtn} title="Redo">↪</button>
            <div className={styles.paletteDivider} />
            <button type="button" className={styles.paletteBtn} title="Ruler">📐</button>
            <button
              type="button"
              className={`${styles.paletteBtn} ${selectedDrawTool === 'pen' ? styles.paletteBtnActive : ''}`}
              onClick={() => setSelectedDrawTool('pen')}
              title="Pen"
            >
              🖊️
            </button>
            <button
              type="button"
              className={`${styles.paletteBtn} ${selectedDrawTool === 'highlighter' ? styles.paletteBtnActive : ''}`}
              onClick={() => setSelectedDrawTool('highlighter')}
              title="Highlighter"
            >
              🖍️
            </button>
            <button
              type="button"
              className={`${styles.paletteBtn} ${selectedDrawTool === 'eraser' ? styles.paletteBtnActive : ''}`}
              onClick={() => setSelectedDrawTool('eraser')}
              title="Eraser"
            >
              🧹
            </button>
          </div>

          <div className={styles.paletteDivider} />

          {/* Color Swatches */}
          <div className={styles.colorSwatches}>
            {[
              '#000000',
              '#1e3a8a',
              '#0284c7',
              '#06b6d4',
              '#10b981',
              '#facc15',
              '#f97316',
              '#ec4899',
              '#dc2626',
              '#8b5cf6',
            ].map((color) => (
              <div
                key={color}
                className={`${styles.colorDot} ${selectedColor === color ? styles.colorDotSelected : ''}`}
                style={{ background: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>

          <div className={styles.paletteDivider} />

          <div className={styles.strokeSettings}>
            <span className={styles.strokeFillBox}>Fill</span>
            <span className={styles.strokeText}>Stroke: 1</span>
          </div>

          <div className={styles.paletteDivider} />

          {/* Tactical Element Categories */}
          <div className={styles.tacticalCategories}>
            {['Weapons', 'Sensors', 'Lines', 'Manoever', 'Areas', 'Obstacle', 'Resource', 'Civilian', 'Routes', 'Boundary', 'Shapes'].map((cat) => (
              <button key={cat} type="button" className={styles.catToolBtn}>
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.layerSheetsIcon} title="Layer Management">
            📑
          </div>
        </div>

        {/* 8. Bottom Map HUD Status Bar */}
        <div className={styles.bottomMapHud}>
          <div className={styles.bottomHudLeft}>
            <span>Ex. Name: <strong>Operation Vikram</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Map Sheet No.: <strong>GH/44A, RJ/22F, RD/41B</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span className={styles.prototypePlayerTag}>Prototype Player</span>
          </div>

          <div className={styles.bottomHudRight}>
            <span>Grid: <strong>RJ E 78051 N 78051</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Grid Fig. <strong>⌃</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Apprx Ht.: <strong>200 m</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Lat: <strong>40051</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Lon: <strong>40051</strong></span>
            <span className={styles.hudDivider}>|</span>
            <span>Scale: <strong>1:50000</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
