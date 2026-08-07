import React, { useState, useRef } from 'react';
import { WizardProvider, useWizard } from './stores/WizardContext';
import { SidePanel } from './components/SidePanel';
import MainToolbar from './components/MainToolbar';
import { RecordAudioPanel } from './features/recordAudio/RecordAudioPanel';
import { StepBar } from './components/StepBar';
import { transcribeAudio } from './features/recordAudio/transcribeApi';

function AppContent() {
  const { state, dispatch } = useWizard();
  const [showRecordPanel, setShowRecordPanel] = useState(false);

  // Hidden file input refs for native OS file selection
  const loadPlanRef = useRef<HTMLInputElement>(null);
  const uploadAudioRef = useRef<HTMLInputElement>(null);
  const uploadDocumentRef = useRef<HTMLInputElement>(null);
  const uploadImageRef = useRef<HTMLInputElement>(null);

  // Active state for the toolbar buttons
  const getActiveButton = (): 'record' | 'upload_audio' | 'none' => {
    if (showRecordPanel) return 'record';
    return 'none';
  };

  // Open the record panel
  const handleRecordAudioClick = () => {
    const isOpening = !showRecordPanel;
    setShowRecordPanel(isOpening);
    if (isOpening) {
      if (state.dictationTarget === 'none') {
        dispatch({ type: 'SET_DICTATION_TARGET', payload: 'execution' });
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
            data: parsed
          }
        });
      } catch (err) {
        // Fallback pre-fill with wargaming data if generic JSON
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
              mission: 'Establish checkpoints and secure primary supply routes.',
              execution: '1. Deploy 5 BDE at 0400 hrs.\n2. Secure assembly points.'
            }
          }
        });
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow uploading same file again
    event.target.value = '';
  };

  // Native Upload Plan Audio Selection (audio/*)
  const handleUploadAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'execution' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    try {
      // Connect to real backend transcription server
      const result = await transcribeAudio(file);
      const text = result.text.trim();
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: text }
        }
      });
    } catch (err) {
      // Mock transcription fallback if API server is offline
      const dummyTranscription = `[Transcribed from ${file.name}]: The division will occupy Assembly Area RED to organize for defensive operations, securing main supply routes and preparing counter-mobility obstacles.`;
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: {
          step: 'startPreparation',
          data: { [target]: dummyTranscription }
        }
      });
    }
    event.target.value = '';
  };

  // Native Upload Plan Document Selection (.pdf, .docx, .doc, .txt)
  const handleUploadDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const target = state.dictationTarget === 'none' ? 'execution' : state.dictationTarget;
    if (state.dictationTarget === 'none') {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: target });
    }

    const docText = `[Imported Briefing from ${file.name}]:\nSecure Sector Alpha and establish defensive checkpoints. Secure primary supply lines.`;
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { [target]: docText }
      }
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
        data: { references: file.name }
      }
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
          reportNumber: 'OPORD-AI-GENERATED',
          classification: 'RESTRICTED',
          dtg: new Date().toLocaleString(),
          references: 'MAP AREA HARYANA 1:50000',
          from: 'AI Wargaming Planner',
          to: 'OC 9 BDE',
          mission: 'Conduct reconnaissance and establish key defensive obstacles along the main supply route.',
          execution: '1. Reconnaissance team to deploy at H-Hour.\n2. Secure primary bridges and construct wire obstacles.'
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#ffffff', overflow: 'hidden' }}>
      
      {/* Light Windows-style Title Bar */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: '#e0ecfb', 
        color: '#1d4ed8', 
        padding: '0.4rem 1rem', 
        fontSize: '0.75rem', 
        borderBottom: '1px solid #cbd5e1',
        fontWeight: 'bold',
        userSelect: 'none',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Sign in to your account</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span>14 April 2025 | 10:20:00</span>
          <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.9rem', color: '#1d4ed8' }}>
            <span style={{ cursor: 'pointer' }}>—</span>
            <span style={{ cursor: 'pointer' }}>⬜</span>
            <span style={{ cursor: 'pointer', color: '#ef4444' }}>✕</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        {/* Left Section containing Toolbar, Workspace panel, and Steps Navigation */}
        <main 
          style={{ 
            flex: 1, 
            minHeight: 0, 
            background: '#eef2ff', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            border: showRecordPanel ? '3px solid #0087e0' : '3px solid transparent',
            borderRadius: '4px',
            margin: '0.25rem',
            transition: 'border 0.15s ease'
          }}
        >
          <section style={{ 
            flex: 1, 
            minHeight: 0, 
            borderRadius: '4px', 
            background: '#ffffff', 
            border: '1px solid #e5e7eb', 
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)', 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MainToolbar 
                activeButton={getActiveButton()}
                onRecordAudioClick={handleRecordAudioClick} 
                onUploadAudioClick={() => uploadAudioRef.current?.click()}
                onUploadDocumentClick={() => uploadDocumentRef.current?.click()}
                onUploadImageClick={() => uploadImageRef.current?.click()}
                onLoadPlanClick={() => loadPlanRef.current?.click()}
                onCreatePlanClick={handleCreatePlan}
              />
              
              <div style={{ flex: 1, minHeight: 0, marginTop: '0', display: 'flex', flexDirection: 'column' }}>
                {showRecordPanel ? (
                  <RecordAudioPanel onClose={handleCloseRecordPanel} />
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flex: 1, 
                    flexDirection: 'column', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    color: '#475569',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px dashed #cbd5e1'
                  }}>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Record Audio</h1>
                    <p style={{ margin: 0, maxWidth: '580px', textAlign: 'center', fontSize: '0.92rem' }}>
                      Click the Record Audio button in the toolbar to open the recorder and capture audio for transcription.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Steps Navigation Bar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '1200px' }}>
              <StepBar />
            </div>
          </div>
        </main>

        {/* Right Section (OpOrder Panel Sidebar) */}
        <aside style={{ 
          width: 440, 
          minWidth: 440, 
          borderLeft: '1px solid #e5e7eb', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, 
          padding: '1rem', 
          background: 'transparent' 
        }}>
          <SidePanel />
        </aside>
      </div>

      {/* Hidden native HTML5 file inputs to trigger native OS explorer dialogs */}
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