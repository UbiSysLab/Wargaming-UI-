import React, { useState } from 'react';
import { WizardProvider } from './stores/WizardContext';
import { StepBar } from './components/StepBar';
import { SidePanel } from './components/SidePanel';
import MainToolbar from './components/MainToolbar';
import { RecordAudioPanel } from './features/recordAudio/RecordAudioPanel';

export default function App() {
  const [showRecordPanel, setShowRecordPanel] = useState(false);

  return (
    <WizardProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <main style={{ flex: 1, minHeight: 0, background: '#eef2ff', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section style={{ flex: 1, minHeight: 0, borderRadius: '22px', background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <MainToolbar onRecordAudioClick={() => setShowRecordPanel(true)} />
              {showRecordPanel ? (
                <RecordAudioPanel />
              ) : (
                <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', color: '#475569' }}>
                  <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Record Audio</h1>
                  <p style={{ margin: 0, maxWidth: '580px', textAlign: 'center' }}>
                    Click the Record Audio button in the toolbar to open the recorder and capture audio for transcription.
                  </p>
                </div>
              )}
            </section>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', marginTop: '-1rem', position: 'relative', zIndex: 2 }}>
              <div style={{ width: '100%', maxWidth: '1100px' }}>
                <StepBar />
              </div>
            </div>
          </main>
          <aside style={{ width: 380, minWidth: 380, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '1rem', background: 'transparent' }}>
            <SidePanel />
          </aside>
        </div>
      </div>
    </WizardProvider>
  );
}