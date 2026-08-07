import React, { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { useWizard } from '../../stores/WizardContext';
import { transcribeAudio } from './transcribeApi';
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
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<InstanceType<typeof RecordPlugin> | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Use ref to store dictation target to avoid stale closure in wavesurfer callbacks
  const dictationTargetRef = useRef(state.dictationTarget);
  useEffect(() => {
    dictationTargetRef.current = state.dictationTarget;
  }, [state.dictationTarget]);

  useEffect(() => {
    if (!waveformRef.current) {
      return undefined;
    }

    const recordPlugin = RecordPlugin.create({
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000,
      mediaRecorderTimeslice: 1000,
      renderRecordedAudio: true,
      continuousWaveform: true,
      scrollingWaveform: false,
    });

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      backend: 'WebAudio',
      height: 80,
      waveColor: '#7f7f7f',
      progressColor: '#2563eb',
      cursorColor: '#2563eb',
      cursorWidth: 0,
      barWidth: 2,
      barRadius: 2,
      normalize: true,
      plugins: [recordPlugin],
    });

    wsRef.current = wavesurfer;
    recordPluginRef.current = recordPlugin;

    // Listen to play/pause state of wavesurfer playback
    const unsubPlay = wavesurfer.on('play', () => setIsPlaying(true));
    const unsubPause = wavesurfer.on('pause', () => setIsPlaying(false));
    const unsubFinish = wavesurfer.on('finish', () => setIsPlaying(false));

    const onRecordStart = () => {
      setError(undefined);
      setIsRecording(true);
      setIsPaused(false);
      setHasAudio(false);
      setIsPlaying(false);
    };

    const onRecordEnd = async (blob: Blob) => {
      setIsRecording(false);
      setIsPaused(false);
      setIsTranscribing(true);
      setError(undefined);

      try {
        // Load the recorded blob URL into wavesurfer for playback
        const url = URL.createObjectURL(blob);
        wavesurfer.load(url);
        setHasAudio(true);

        const result = await transcribeAudio(blob);
        const text = result.text.trim();
        
        // Dispatch text to active target (mission / execution)
        const target = dictationTargetRef.current === 'none' ? 'execution' : dictationTargetRef.current;
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: { step: 'startPreparation', data: { [target]: text } },
        });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Transcription failed.');
      } finally {
        setIsTranscribing(false);
      }
    };

    const removeStart = recordPlugin.on('record-start', onRecordStart);
    const removeEnd = recordPlugin.on('record-end', onRecordEnd);

    return () => {
      unsubPlay();
      unsubPause();
      unsubFinish();
      removeStart();
      removeEnd();
      recordPlugin.destroy();
      wavesurfer.destroy();
    };
  }, [dispatch]);

  const handleToggleRecording = useCallback(async () => {
    const plugin = recordPluginRef.current;
    if (!plugin) {
      return;
    }

    if (isRecording) {
      plugin.stopRecording();
      return;
    }

    try {
      setError(undefined);
      setHasAudio(false);
      setIsPlaying(false);
      await plugin.startRecording();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start recording.');
      setIsRecording(false);
    }
  }, [isRecording]);

  const handlePauseToggle = useCallback(() => {
    const plugin = recordPluginRef.current;
    if (!plugin) return;
    
    if (plugin.isPaused()) {
      plugin.resumeRecording();
      setIsPaused(false);
    } else {
      plugin.pauseRecording();
      setIsPaused(true);
    }
  }, []);

  // Playback Control Handlers
  const handlePlayPause = useCallback(() => {
    if (wsRef.current && hasAudio) {
      if (wsRef.current.isPlaying()) {
        wsRef.current.pause();
      } else {
        wsRef.current.play();
      }
    }
  }, [hasAudio]);

  const handleStopPlayback = useCallback(() => {
    if (wsRef.current && hasAudio) {
      wsRef.current.pause();
      wsRef.current.setTime(0);
    }
  }, [hasAudio]);

  const handleDiscardAudio = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.empty();
      } catch (e) {
        // Safe clear
      }
      setHasAudio(false);
      setIsPlaying(false);
    }
  }, []);

  const handleRewind = useCallback(() => {
    if (wsRef.current) {
      try {
        const currentTime = wsRef.current.getCurrentTime();
        wsRef.current.setTime(Math.max(0, currentTime - 10));
      } catch (e) {
        // Safe seek check
      }
    }
  }, []);

  const handleForward = useCallback(() => {
    if (wsRef.current) {
      try {
        const currentTime = wsRef.current.getCurrentTime();
        const duration = wsRef.current.getDuration();
        wsRef.current.setTime(Math.min(duration || 0, currentTime + 10));
      } catch (e) {
        // Safe seek check
      }
    }
  }, []);

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
            onClick={handleRewind} 
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
                  onClick={handleToggleRecording}
                  title="Stop Recording"
                >
                  <img src={ongoingAudio} alt="Stop" className={styles.stopIconImg} />
                </button>

                {/* Pause/Resume Recording Button */}
                <button
                  type="button"
                  className={`${styles.pauseButton} ${isPaused ? styles.pausedActive : ''}`}
                  onClick={handlePauseToggle}
                  title={isPaused ? "Resume Recording" : "Pause Recording"}
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
                  onClick={handleDiscardAudio}
                  title="Discard and Record Again"
                >
                  <img src={recordAudioIcon} alt="Record" className={styles.micIconImg} />
                </button>

                {/* Play/Pause Playback Button */}
                <button
                  type="button"
                  className={`${styles.pauseButton} ${isPlaying ? styles.pausedActive : ''}`}
                  onClick={handlePlayPause}
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
                  onClick={handleStopPlayback}
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
                onClick={handleToggleRecording}
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
            onClick={handleForward} 
            className={styles.navButton} 
            title="Forward 10 seconds"
          >
            <img src={tenMinutesAhead} alt="Forward 10" className={styles.navSvg} />
          </button>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </section>
  );
}
