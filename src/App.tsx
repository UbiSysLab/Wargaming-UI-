import React, { useState } from 'react';
import { WizardProvider, useWizard } from './stores/WizardContext';
import { SidePanel } from './components/SidePanel';
import MainToolbar from './components/MainToolbar';
import { RecordAudioPanel } from './features/recordAudio/RecordAudioPanel';
import { StepBar } from './components/StepBar';
import { usePlanActions } from './hooks/usePlanActions';
import styles from './App.module.css';

function AppContent() {
  const { state, dispatch } = useWizard();
  
  // Custom hook encapsulates all OS file dialog click callbacks and templates parsing logic
  const {
    loadPlanRef,
    uploadAudioRef,
    uploadDocumentRef,
    uploadImageRef,
    handleLoadPlanChange,
    handleUploadAudioChange,
    handleUploadDocumentChange,
    handleUploadImageChange,
    handleCreatePlan,
  } = usePlanActions({ state, dispatch });

  const showRecordPanel = state.dictationTarget !== 'none';

  // Open the record panel
  const handleRecordAudioClick = () => {
    if (showRecordPanel) {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
    } else {
      dispatch({ type: 'SET_DICTATION_TARGET', payload: 'execution' });
    }
  };

  const handleCloseRecordPanel = () => {
    dispatch({ type: 'SET_DICTATION_TARGET', payload: 'none' });
  };

  const getActiveButton = () => {
    return showRecordPanel ? 'record' : 'none';
  };

  return (
    <div className={styles.appContainer}>
      
      {/* Light Windows-style Title Bar */}
      <header className={styles.titleBar}>
        <div className={styles.titleLeft}>
          <span>Sign in to your account</span>
        </div>
        <div className={styles.titleRight}>
          <span>14 April 2025 | 10:20:00</span>
          <div className={styles.windowControls}>
            <span className={styles.windowControlItem}>—</span>
            <span className={styles.windowControlItem}>⬜</span>
            <span className={styles.windowControlItemClose}>✕</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className={styles.workspaceWrapper}>
        
        {/* Left Section containing Toolbar, Workspace panel, and Steps Navigation */}
        <main className={`${styles.mainContent} ${showRecordPanel ? styles.mainContentActive : ''}`}>
          <section className={styles.cardSection}>
            <div className={styles.toolbarWrapper}>
              <MainToolbar 
                activeButton={getActiveButton()}
                onRecordAudioClick={handleRecordAudioClick} 
                onUploadAudioClick={() => uploadAudioRef.current?.click()}
                onUploadDocumentClick={() => uploadDocumentRef.current?.click()}
                onUploadImageClick={() => uploadImageRef.current?.click()}
                onLoadPlanClick={() => loadPlanRef.current?.click()}
                onCreatePlanClick={handleCreatePlan}
              />
              
              <div className={styles.recorderArea}>
                {showRecordPanel ? (
                  <RecordAudioPanel onClose={handleCloseRecordPanel} />
                ) : (
                  <div className={styles.savedPlansContainer}>
                    <h2 className={styles.savedPlansTitle}>Open Saved Plans</h2>
                    <div className={styles.savedPlansEmptyBox}>
                      No saved plans available. (Placeholder for future plan listing)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Steps Navigation Bar */}
          <div className={styles.stepBarRow}>
            <div className={styles.stepBarCol}>
              <StepBar />
            </div>
          </div>
        </main>

        {/* Right Section (OpOrder Panel Sidebar) */}
        <aside className={styles.sidebarContainer}>
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