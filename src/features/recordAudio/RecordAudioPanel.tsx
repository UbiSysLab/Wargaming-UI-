import React from 'react';
import { useWizard } from '../../stores/WizardContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioStreamer } from '../../hooks/useAudioStreamer';
import { DictationTarget } from '../../types/wizard.types';
import styles from './RecordAudioPanel.module.css';
import tenMinutesBehiend from '../../assets/tenMinutesBehiend.svg';
import tenMinutesAhead from '../../assets/tenMinutesAhead.svg';
import pauseIcon from '../../assets/pause.svg';
import ongoingAudio from '../../assets/ongoingAudio.svg';
import recordAudioIcon from '../../assets/recordAudio.svg';

interface RecordAudioPanelProps {
  onClose?: () => void;
}

export function RecordAudioPanel({ onClose }: RecordAudioPanelProps) {
  const { state, dispatch } = useWizard();
  const [activeMode, setActiveMode] = React.useState<'single' | 'stream'>('stream');

  // Success transcription dispatch handler passed to hooks
  const handleTranscriptionSuccess = (target: DictationTarget, text: string) => {
    const activeTarget = target === 'none' ? 'mission' : target;
    dispatch({
      type: 'UPDATE_STEP_DATA',
      payload: {
        step: 'startPreparation',
        data: { [activeTarget]: text },
      },
    });
  };

  // 1. Classic WaveSurfer Recorder Hook
  const {
    waveformRef,
    isRecording,
    isPaused: isRecPaused,
    isTranscribing,
    hasAudio,
    isPlaying,
    error: recError,
    startRecording,
    stopRecording,
    togglePauseRecording,
    togglePlayPausePlayback,
    stopPlayback,
    discardAudio,
    seekBackward,
    seekForward,
  } = useAudioRecorder(state.dictationTarget, handleTranscriptionSuccess);

  // 2. Real-time WebSocket Streaming Hook
  const {
    isStreaming,
    isPaused: isStreamPaused,
    isMuted,
    audioLevel,
    partialTranscript,
    error: streamError,
    startStreaming,
    stopStreaming,
    togglePauseStreaming,
    toggleMuteStreaming,
    clearTranscript,
  } = useAudioStreamer(state.dictationTarget, handleTranscriptionSuccess);

  // Stop current active sessions on mode change to prevent conflicts
  React.useEffect(() => {
    if (activeMode === 'single') {
      stopStreaming();
    } else {
      if (isRecording) {
        stopRecording();
      }
    }
  }, [activeMode, isRecording, stopRecording, stopStreaming]);

  React.useEffect(() => {
    dispatch({ type: 'SET_TRANSCRIBING', payload: isTranscribing });
  }, [isTranscribing, dispatch]);

  return (
    <section className={styles.panel} aria-label="Record audio panel" style={{ position: 'relative' }}>
      {onClose && (
        <button 
          type="button" 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label="Close recorder"
        >
          ✕
        </button>
      )}

      {/* Modern Tab Selector */}
      <div className={styles.tabContainer}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeMode === 'stream' ? styles.tabActive : ''}`}
          onClick={() => setActiveMode('stream')}
        >
          Live Streaming ASR
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeMode === 'single' ? styles.tabActive : ''}`}
          onClick={() => setActiveMode('single')}
        >
          Single Record
        </button>
      </div>

      {activeMode === 'stream' ? (
        /* Real-Time WebSocket Streaming Mode */
        <div className={styles.streamCard}>
          <div className={styles.streamHeader}>
            <div className={styles.streamStatus}>
              {isStreaming ? (
                <>
                  <span className={`${styles.statusDot} ${isStreamPaused ? styles.dotPaused : styles.dotActive}`} />
                  <span className={styles.statusText}>
                    {isStreamPaused ? 'STREAM PAUSED' : 'LIVE TRANSMITTING'}
                  </span>
                </>
              ) : (
                <>
                  <span className={`${styles.statusDot} ${styles.dotIdle}`} />
                  <span className={styles.statusText}>READY TO STREAM</span>
                </>
              )}
            </div>

            <div className={styles.streamTarget}>
              Dictating: <strong style={{ textTransform: 'uppercase', color: '#2563eb' }}>{state.dictationTarget === 'none' ? 'mission' : state.dictationTarget}</strong>
            </div>
          </div>

          {/* Visual Signal Level Indicator */}
          <div className={styles.visualizerContainer}>
            {isStreaming && !isStreamPaused ? (
              <div className={styles.barsContainer}>
                {[...Array(15)].map((_, i) => {
                  const factor = Math.sin((i / 14) * Math.PI) * 0.7 + 0.3;
                  const barHeight = Math.max(6, Math.round(audioLevel * factor * 0.75));
                  return (
                    <div
                      key={i}
                      className={styles.visualizerBar}
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: isMuted ? '#94a3b8' : '#2563eb',
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={styles.visualizerPlaceholder}>
                {isStreamPaused ? 'Streaming Paused' : 'Microphone Idle'}
              </div>
            )}
          </div>

          {/* Live Subtitles Overlay */}
          <div className={styles.subtitlesContainer}>
            <p className={styles.subtitleLabel}>Live Transcription:</p>
            <div className={styles.subtitleText}>
              {partialTranscript ? (
                partialTranscript
              ) : (
                <span className={styles.placeholderText}>Click Start Live Stream and begin speaking to transcribe in real-time...</span>
              )}
            </div>
          </div>

          {/* Streaming Controls */}
          <div className={styles.streamControls}>
            {!isStreaming ? (
              <button
                type="button"
                className={styles.startStreamBtn}
                onClick={() => {
                  const activeField = state.dictationTarget === 'none' ? 'mission' : state.dictationTarget;
                  const initialText = state.data.startPreparation[activeField] || '';
                  startStreaming(initialText);
                }}
              >
                🎙️ Start Live Stream
              </button>
            ) : (
              <div className={styles.controlsRow}>
                <button
                  type="button"
                  className={`${styles.streamControlBtn} ${isStreamPaused ? styles.btnActive : ''}`}
                  onClick={togglePauseStreaming}
                  title={isStreamPaused ? "Resume Live Stream" : "Pause Live Stream"}
                >
                  {isStreamPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>

                <button
                  type="button"
                  className={`${styles.streamControlBtn} ${isMuted ? styles.btnDanger : ''}`}
                  onClick={toggleMuteStreaming}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? '🎙️ Unmute' : '🔇 Mute'}
                </button>

                <button
                  type="button"
                  className={styles.streamControlBtn}
                  onClick={clearTranscript}
                  title="Clear field"
                >
                  🗑️ Clear
                </button>

                <button
                  type="button"
                  className={styles.stopStreamBtn}
                  onClick={stopStreaming}
                  title="Finish Streaming & Save"
                >
                  🛑 Stop
                </button>
              </div>
            )}
          </div>

          {streamError && <p className={styles.errorText}>{streamError}</p>}
        </div>
      ) : (
        /* Classic WaveSurfer Recorder Mode */
        <div className={styles.waveformCard}>
          <div className={styles.waveformContainer}>
            <div className={styles.waveformElement} ref={waveformRef} />
            <div className={styles.waveformOverlay}>
              <div className={styles.cursorLine} />
            </div>
          </div>

          <div className={styles.controlsContainer}>
            {/* Rewind 10 Button */}
            <button 
              type="button" 
              onClick={seekBackward} 
              className={styles.navButton} 
              title="Rewind 10 seconds"
            >
              <img src={tenMinutesBehiend} alt="Rewind 10" className={styles.navSvg} />
            </button>

            {/* Recording & Playback Central Buttons */}
            <div className={styles.centerButtons}>
              {isRecording ? (
                <>
                  {/* Stop Recording Button */}
                  <button
                    type="button"
                    className={styles.stopButton}
                    onClick={stopRecording}
                    title="Stop Recording"
                  >
                    <img src={ongoingAudio} alt="Stop" className={styles.stopIconImg} />
                  </button>

                  {/* Pause/Resume Recording Button */}
                  <button
                    type="button"
                    className={`${styles.pauseButton} ${isRecPaused ? styles.pausedActive : ''}`}
                    onClick={togglePauseRecording}
                    title={isRecPaused ? "Resume Recording" : "Pause Recording"}
                  >
                    <img src={pauseIcon} alt="Pause" className={styles.pauseIconImg} />
                  </button>
                </>
              ) : hasAudio ? (
                <>
                  {/* Re-record Discard Button */}
                  <button
                    type="button"
                    className={styles.micButton}
                    onClick={discardAudio}
                    title="Discard and Record Again"
                  >
                    <img src={recordAudioIcon} alt="Record" className={styles.micIconImg} />
                  </button>

                  {/* Play/Pause Playback Button */}
                  <button
                    type="button"
                    className={`${styles.pauseButton} ${isPlaying ? styles.pausedActive : ''}`}
                    onClick={togglePlayPausePlayback}
                    title={isPlaying ? "Pause Playback" : "Start Playback"}
                  >
                    {isPlaying ? (
                      <img src={pauseIcon} alt="Pause" className={styles.pauseIconImg} />
                    ) : (
                      <span style={{ fontSize: '1.1rem', color: '#2563eb' }}>▶️</span>
                    )}
                  </button>

                  {/* Stop Playback Button */}
                  <button
                    type="button"
                    className={styles.stopButton}
                    onClick={stopPlayback}
                    title="Stop Playback"
                  >
                    <img src={ongoingAudio} alt="Stop" className={styles.stopIconImg} />
                  </button>
                </>
              ) : (
                /* Idle Mic Button to Start Recording */
                <button
                  type="button"
                  className={styles.micButton}
                  onClick={startRecording}
                  disabled={isTranscribing}
                  title="Start Recording"
                >
                  <img src={recordAudioIcon} alt="Record" className={styles.micIconImg} />
                </button>
              )}
            </div>

            {/* Forward 10 Button */}
            <button 
              type="button" 
              onClick={seekForward} 
              className={styles.navButton} 
              title="Forward 10 seconds"
            >
              <img src={tenMinutesAhead} alt="Forward 10" className={styles.navSvg} />
            </button>
          </div>

          {recError ? (
            <p className={styles.errorText}>
              {recError.includes("Microphone blocked") ? (
                <>
                  Microphone blocked: Browsers require HTTPS to access audio on a LAN. Click here to open the{' '}
                  <a href="/setup" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 'bold' }}>
                    Microphone Setup Guide
                  </a>{' '}
                  to download and install the security certificate.
                </>
              ) : (
                recError
              )}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
