import React, { useState, useRef } from 'react';
import { WizardProvider, useWizard } from './stores/WizardContext';
import { SidePanel } from './components/SidePanel';
import MainToolbar from './components/MainToolbar';
import { RecordAudioPanel } from './features/recordAudio/RecordAudioPanel';
import { DocumentPreviewPanel } from './features/opOrder/DocumentPreviewPanel';
import { TacticalMapView } from './features/narrative/TacticalMapView';
import { StepBar } from './components/StepBar';
import { transcribeAudio } from './features/recordAudio/transcribeApi';
import { parseOpOrderDocument } from './features/opOrder/documentParser';
import { EditorScreen } from './features/editor/EditorScreen';
import { parseOpOrderWithBackend } from './features/opOrder/opOrderApi';
import { extractTaskSyncFromOpOrder, TaskSyncData } from './features/opOrder/taskSyncExtractor';

function AppContent() {
  const { state, dispatch } = useWizard();
  const [activeCenterView, setActiveCenterView] = useState<'record' | 'document' | 'idle'>('record');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGeneratingGraphics, setIsGeneratingGraphics] = useState(false);
  const [taskSyncData, setTaskSyncData] = useState<TaskSyncData | null>(null);

  // Hidden file input refs for native OS file selection
  const loadPlanRef = useRef<HTMLInputElement>(null);
  const uploadAudioRef = useRef<HTMLInputElement>(null);
  const uploadDocumentRef = useRef<HTMLInputElement>(null);
  const uploadImageRef = useRef<HTMLInputElement>(null);

  // Active state for the toolbar buttons
  const getActiveButton = (): 'record' | 'upload_audio' | 'upload_document' | 'upload_image' | 'load_plan' | 'none' => {
    if (activeCenterView === 'record') return 'record';
    if (activeCenterView === 'document') return 'upload_document';
    return 'none';
  };

  // Toggle record audio panel
  const handleRecordAudioClick = () => {
    if (activeCenterView === 'record') {
      setActiveCenterView('idle');
      dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
    } else {
      setActiveCenterView('record');
      if (state.dictationTarget === 'none') {
        dispatch({ type: 'SET_DICTATION_TARGET', payload: 'enemy' });
      }
    }
  };

  // Handles closing of the recording panel
  const handleCloseRecordPanel = () => {
    setActiveCenterView('idle');
    dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
  };

  // Handles closing of the document preview
  const handleCloseDocumentPreview = () => {
    setActiveCenterView('record');
  };

  // Native Load Plan Selection (.json)
  const handleLoadPlanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: {
            step: 'startPreparation',
            data: parsed,
          },
        });
      } catch {
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: {
            step: 'startPreparation',
            data: {
              reportNumber: 'WG-009-CONFIDENTIAL',
              classification: 'SECRET',
              dtg: '14-04-2025 10:20',
              references: 'MAP SECTOR HARYANA 1:25000',
              from: 'CO 3 DIV',
              to: 'OC 5 BDE',
              enemy: 'Enemy forces holding defensive positions along river line.',
              own: '5 BDE with one armoured regiment conduct offensive operations.',
              mission: 'Establish checkpoints and secure primary supply routes.',
              execution: '1. Deploy 5 BDE at 0400 hrs.\n2. Secure assembly points.',
              adminLogistics: '1. Medical evacuation through Route BRAVO.',
              commandSignal: '1. HQ at Grid 5523. Primary freq 47.5 MHz.',
            },
          },
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Native Upload Plan Audio Selection (audio/*)
  const handleUploadAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'enemy' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    try {
      const result = await transcribeAudio(file);
      const text = result.text.trim();
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: text },
        },
      });
    } catch {
      const dummyTranscription = `[Transcribed from ${file.name}]: The division will occupy Assembly Area RED to organize for defensive operations, securing main supply routes and preparing counter-mobility obstacles.`;
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: dummyTranscription },
        },
      });
    }
    event.target.value = '';
  };

  // Native Upload Plan Document Selection (.pdf, .docx, .doc, .txt)
  const handleUploadDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseOpOrderDocument(file);
      const cleanOpOrder = {
        reportNumber: '',
        classification: '',
        dtg: '',
        references: '',
        from: '',
        to: '',
        enemy: '',
        own: '',
        mission: '',
        execution: '',
        adminLogistics: '',
        commandSignal: '',
        ...parsed.data,
      };

      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: cleanOpOrder,
        },
      });
      setActiveCenterView('document');
    } catch (err) {
      console.error('Failed to parse document', err);
    }
    event.target.value = '';
  };

  // Native Upload Plan Image Selection (image/*)
  const handleUploadImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { references: file.name },
      },
    });
    event.target.value = '';
  };

  // AI Plan Generation Logic for Create Plan Button
  const handleCreatePlan = () => {
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: {
          reportNumber: 'OPORD 01',
          classification: 'CLASSIFIED',
          dtg: '14-04-2025 10:20',
          references: 'MAP SECTOR HARYANA 1:25000',
          from: 'CO 3 DIV',
          to: 'OC 5 BDE',
          enemy: 'An infantry brigade supported by a regiment of armour and other elements is deployed with a battalion on the canal and battalion strong points at Ulm and London, with one company in forward zone defended locality (FZDL) at Kigali. All positions are defended by',
          own: '5 BDE with two infantry battalions and one armoured regiment secure the main supply route.',
          mission: '2 BDE (BLUE) will seize and secure the western approach and crest of OBJ GREEN (Hill 234, grid H234-XY130045) NLT H+06 (2025-09-18 1200L)',
          execution: 'Phase I — Infiltration (H to H+02): Displace to LD-ALPHA; covert movement to assault positions. It\'s a well-known fact that there is a direct relation between the corporate ethics and philosophy and the advantage of the first-class package. However, the capacity of the major outcomes highlights the importance of The Modification of Adequate Regulation\n\nPhase II — Assault (H+02 to H+06): A Coy executes envelopment and seizure; B Coy fixes and blocks east. Fires suppression and CAS available; it\'s a well-known fact that there is a direct relation between the corporate ethics and philosophy and the advantage of the first-class package. However, the capacity of the major outcomes highlights the importance of The Modification of Adequate Regulation (Len Handley in The Book of the Operating Speed Model)\n\nPhase III — Consolidation (H+06 onward): Consolidate OBJ, prepare defensive posture and enable engineer breach of Route BLUE for brigade passage.',
          adminLogistics: '1. Medical evacuation through Route ALPHA.\n2. Resupply at 0600 hrs daily.',
          commandSignal: '1. HQ located at Grid 4521.\n2. Primary frequency 45.5 MHz.',
        },
      },
    });
  };

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  // Generate Graphics & Extract Task Sync via API & transition to Tactical Editor
  const handleGenerateGraphics = async () => {
    setIsGeneratingGraphics(true);
    setIsLoadingWorkspace(true);
    setIsEditorOpen(true);

    try {
      const extractedSync = await parseOpOrderWithBackend(state.data.startPreparation);
      setTaskSyncData(extractedSync);
    } catch (err) {
      console.error('Failed to generate graphics via backend', err);
      setTaskSyncData(extractTaskSyncFromOpOrder(state.data.startPreparation));
    } finally {
      setIsGeneratingGraphics(false);
      setIsLoadingWorkspace(false);
    }
  };

  const handleOpenEditor = () => {
    setIsLoadingWorkspace(false);
    setTaskSyncData(extractTaskSyncFromOpOrder(state.data.startPreparation));
    setIsEditorOpen(true);
  };

  if (isEditorOpen) {
    return (
      <EditorScreen 
        onBack={() => {
          setIsEditorOpen(false);
          setIsLoadingWorkspace(false);
        }} 
        initialTaskSyncData={taskSyncData}
        isLoadingWorkspace={isLoadingWorkspace}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#eaedf2', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Light Windows-style Title Bar */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: '#ffffff', 
        padding: '0.35rem 1rem', 
        fontSize: '0.75rem', 
        borderBottom: '1px solid #e2e8f0',
        userSelect: 'none',
        position: 'relative'
      }}>
        <div style={{ width: '200px' }} />
        
        {/* Centered App title / Sign in status */}
        <div style={{ display: 'flex', alignItems: 'center', color: '#0066cc', fontWeight: 600, fontSize: '0.8rem' }}>
          <span>Sign in to your account</span>
        </div>

        {/* Right side timestamp and Windows window controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#64748b' }}>
          <span>14 April 2025 &nbsp; 10:20:00</span>
          <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.85rem', color: '#64748b' }}>
            <span style={{ cursor: 'pointer' }}>—</span>
            <span style={{ cursor: 'pointer' }}>⬜</span>
            <span style={{ cursor: 'pointer', color: '#64748b' }}>✕</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0.75rem 1rem', gap: '1rem' }}>
        {/* Left Section containing Main View (Map or Toolbar/Recorder/Document) and Steps Navigation */}
        <main 
          style={{ 
            flex: 1, 
            minHeight: 0, 
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
            background: '#ffffff', 
            borderRadius: '6px', 
            border: '1px solid #e2e8f0', 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between'
          }}
        >
          {state.currentStep === 'startPreparation' ? (
            <>
              {/* Top section with Toolbar */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <MainToolbar 
                  activeButton={getActiveButton()}
                  onRecordAudioClick={handleRecordAudioClick} 
                  onUploadAudioClick={() => uploadAudioRef.current?.click()}
                  onUploadDocumentClick={() => {
                    uploadDocumentRef.current?.click();
                  }}
                  onUploadImageClick={() => uploadImageRef.current?.click()}
                  onLoadPlanClick={() => loadPlanRef.current?.click()}
                  onCreatePlanClick={handleCreatePlan}
                />
                
                {/* Divider line under toolbar */}
                <div style={{ height: '1px', background: '#e2e8f0', margin: '0.75rem 0' }} />
              </div>

              {/* Middle section with Audio Recorder OR Document Preview */}
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {activeCenterView === 'document' ? (
                  <DocumentPreviewPanel 
                    onClose={handleCloseDocumentPreview} 
                    onOpenEditor={handleOpenEditor}
                    onGenerateGraphics={handleGenerateGraphics}
                    isGenerating={isGeneratingGraphics}
                  />
                ) : activeCenterView === 'record' ? (
                  <RecordAudioPanel onClose={handleCloseRecordPanel} />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flex: 1, 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    padding: '2rem'
                  }}>
                    <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Record Audio</h1>
                    <p style={{ margin: 0, maxWidth: '540px', textAlign: 'center', fontSize: '0.88rem' }}>
                      Click the Record Audio button in the toolbar to open the recorder, or click Upload Plan Document to view an OPORD document.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Opening Narrative & other steps: Tactical Map Display */
            <TacticalMapView />
          )}

          {/* Bottom section with Steps Navigation Bar */}
          <div style={{ marginTop: '0.5rem' }}>
            <StepBar />
          </div>
        </main>

        {/* Right Section (SidePanel: Opening Narrative or OpOrder) */}
        <aside style={{ 
          width: '420px', 
          minWidth: '380px', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0 
        }}>
          <SidePanel 
            onOpenEditor={handleOpenEditor} 
            onGenerateGraphics={handleGenerateGraphics}
            isGenerating={isGeneratingGraphics}
          />
        </aside>
      </div>

      {/* Hidden native HTML5 file inputs */}
      <input 
        type="file" 
        ref={loadPlanRef} 
        style={{ display: 'none' }} 
        accept=".json" 
        onChange={handleLoadPlanChange} 
      />
      <input 
        type="file" 
        ref={uploadAudioRef} 
        style={{ display: 'none' }} 
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.aac,.flac,.webm" 
        onChange={handleUploadAudioChange} 
      />
      <input 
        type="file" 
        ref={uploadDocumentRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.docx,.doc,.txt" 
        onChange={handleUploadDocumentChange} 
      />
      <input 
        type="file" 
        ref={uploadImageRef} 
        style={{ display: 'none' }} 
        accept="image/*" 
        onChange={handleUploadImageChange} 
      />
    </div>
  );
}

export default function App() {
  return (
    <WizardProvider>
      <AppContent />
    </WizardProvider>
  );
}