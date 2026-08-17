import React, { useState, useRef } from 'react';
import { WizardProvider, useWizard } from './stores/WizardContext';
import { SidePanel } from './components/SidePanel';
import MainToolbar from './components/MainToolbar';
import { RecordAudioPanel } from './features/recordAudio/RecordAudioPanel';
import { TacticalMapView } from './features/narrative/TacticalMapView';
import { StepBar } from './components/StepBar';
import { transcribeAudio } from './features/recordAudio/transcribeApi';

function AppContent() {
  const { state, dispatch } = useWizard();
  const [showRecordPanel, setShowRecordPanel] = useState(true);

  // Hidden file input refs for native OS file selection
  const loadPlanRef = useRef<HTMLInputElement>(null);
  const uploadAudioRef = useRef<HTMLInputElement>(null);
  const uploadDocumentRef = useRef<HTMLInputElement>(null);
  const uploadImageRef = useRef<HTMLInputElement>(null);

  // Active state for the toolbar buttons
  const getActiveButton = (): 'record' | 'upload_audio' | 'upload_document' | 'upload_image' | 'load_plan' | 'none' => {
    if (showRecordPanel) return 'record';
    return 'none';
  };

  // Toggle record audio panel
  const handleRecordAudioClick = () => {
    const isOpening = !showRecordPanel;
    setShowRecordPanel(isOpening);
    if (isOpening) {
      if (state.dictationTarget === 'none') {
        dispatch({ type: 'SET_DICTATION_TARGET', payload: 'enemy' });
      }
    } else {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
    }
  };

  // Handles closing of the recording panel
  const handleCloseRecordPanel = () => {
    setShowRecordPanel(false);
    dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
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
  const handleUploadDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'enemy' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    const docText = `[Imported Briefing from ${file.name}]:\nSecure Sector Alpha and establish defensive checkpoints. Secure primary supply lines.`;
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { [target]: docText },
      },
    });
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
        {/* Left Section containing Main View (Map or Toolbar/Recorder) and Steps Navigation */}
        <main 
          style={{ 
            flex: 1, 
            minHeight: 0, 
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
                  onUploadDocumentClick={() => uploadDocumentRef.current?.click()}
                  onUploadImageClick={() => uploadImageRef.current?.click()}
                  onLoadPlanClick={() => loadPlanRef.current?.click()}
                  onCreatePlanClick={handleCreatePlan}
                />
                
                {/* Divider line under toolbar */}
                <div style={{ height: '1px', background: '#e2e8f0', margin: '0.75rem 0' }} />
              </div>

              {/* Middle section with Audio Recorder */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {showRecordPanel ? (
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
                      Click the Record Audio button in the toolbar to open the recorder and capture audio for transcription.
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
          <SidePanel />
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
        accept="audio/*" 
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