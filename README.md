# Wargaming UI: Tactical Decision & Operational Planning Console

A modern React 19 + TypeScript web application built with Vite for tactical operational order preparation, real-time voice command recording, interactive 2D/3D map visualization, and tactical task synchronization matrices.

---

## 1. Directory Structure

```
Wargaming-UI-/
├── src/
│   ├── App.tsx                       # Master layout, wizard stepper, generation coordinator
│   ├── index.css                     # Global reset and base typography
│   ├── components/                   # Shared UI Components
│   │   ├── MainToolbar.tsx           # Tactical toolbar (Record, Upload Document/Audio, Create Plan)
│   │   ├── StepBar.tsx               # 5-step military operational planning wizard stepper
│   │   └── SidePanel.tsx             # Collapsible narrative & OPORD form side panel
│   │
│   ├── features/                     # Feature-Driven Modular Architecture
│   │   ├── editor/                   # Tactical Map Editor & Annotation Workspace
│   │   │   ├── EditorScreen.tsx      # 2D/3D canvas, toolbar, layer switches, overlay tabs
│   │   │   ├── LoadingWorkspaceModal.tsx # Synchronized multi-stage progress loader
│   │   │   └── LoadingWorkspaceModal.module.css
│   │   ├── opOrder/                  # Operational Order Processing
│   │   │   ├── DocumentPreviewPanel.tsx  # Doctrinal paper document viewer & parse trigger
│   │   │   ├── TaskSyncTable.tsx     # Interactive multi-phase synchronization matrix
│   │   │   ├── taskSyncExtractor.ts  # Schema normalizer, phase mapper & fallback synthesis
│   │   │   ├── opOrderApi.ts         # Backend API client with offline resiliency
│   │   │   └── opOrder.types.ts      # TypeScript interfaces for OPORD data structures
│   │   ├── recordAudio/              # Audio Recording & Speech Interface
│   │   │   ├── RecordAudioPanel.tsx  # Waveform visualizer, mic capture, target dictation
│   │   │   └── transcribeApi.ts      # Gateway /transcribe endpoint integration
│   │   └── narrative/                # Tactical Operational Narrative & Map Layers
│   │       └── TacticalMapView.tsx   # Interactive military GIS canvas
│   │
│   └── stores/                       # State Management
│       ├── WizardContext.tsx         # Central state store for OPORD paragraphs & steps
│       └── wizardReducer.ts          # Action dispatchers & data update handlers
│
├── public/                           # Static assets, manifests, icons
├── dist/                             # Compiled production build served by API Gateway
├── package.json                      # Dependencies (React 19, Vite 8, etc.)
└── vite.config.js                    # Vite configuration
```

---

## 2. Key Features

1. **Doctrinal OPORD Preparation Wizard**:
   - 5-step doctrinal preparation flow (Situation, Mission, Execution, Admin & Logistics, Command & Signal).
   - Voice dictation target routing directly into specific OPORD sections.
2. **Synchronized Multi-Stage Progress Loader**:
   - Displays real-time pipeline extraction stages.
   - Holds asymptotically at **92%** during local LLM inference.
   - Strictly monotonic forward progress (can never jump backwards).
   - Holds at **100% for exactly 2 seconds** before smoothly revealing the tactical workspace.
3. **Interactive Task Sync Matrix**:
   - Multi-phase execution table displaying units, tactical tasks, objectives, timing, formations, and signals.
   - Robust case-insensitive phase normalization (`PHASE_1` vs `phase_1` vs `Phase I`) ensuring multi-phase operations (Phase 2+) are never dropped.
   - Full CRUD capability on rows and operational objectives.
4. **Offline Resilience**:
   - Built to operate seamlessly inside air-gapped command networks without external CDNs or internet access.

---

## 3. Development & Build Commands

### Install Dependencies
```bash
npm install
```

### Run Local Vite Development Server
```bash
npm run dev
# Default: http://localhost:5173
```

### Type Checking (TypeScript)
```bash
npm run typecheck
# Strict typecheck with 0 errors
```

### Build for Production
```bash
npm run build
# Compiles into dist/
```

### Synchronize to API Gateway
```bash
cp -r dist/* ../gateway/dist/
```
