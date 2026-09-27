import React, { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { useWizard } from '../../stores/WizardContext';
import { transcribeAudio } from './transcribeApi';
import { postProcessAsrText } from './asrPostProcessor';
import styles from './RecordAudioPanel.module.css';
import tenMinutesBehiend from '../../assets/tenMinutesBehiend.svg';
import tenMinutesAhead from '../../assets/tenMinutesAhead.svg';
import pauseIcon from '../../assets/pause.svg';
import ongoingAudio from '../../assets/ongoingAudio.svg';
import recordAudioIcon from '../../assets/recordAudio.svg';

interface RecordAudioPanelProps {
  onClose?: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  reportNumber: 'Report Number',
  classification: 'Classification',
  dtg: 'DTG',
  references: 'References',
  from: 'From',
  to: 'To',
  enemy: 'Enemy',
  own: 'Own',
  mission: 'Mission',
  execution: 'Execution',
  adminLogistics: 'Administration & Logistics',
  commandSignal: 'Command & Signal',
};

export function RecordAudioPanel({ onClose }: RecordAudioPanelProps) {
  const { state, dispatch } = useWizard();
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<InstanceType<typeof RecordPlugin> | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Active section heading based on dictationTarget (defaults to 'Enemy')
  const activeSectionLabel = 
    state.dictationTarget !== 'none' 
      ? SECTION_LABELS[state.dictationTarget] || 'Enemy'
      : 'Enemy';

  // Use ref to store dictation target to avoid stale closure in callbacks
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
      scrollingWaveform: true,
    });

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      backend: 'WebAudio',
      height: 100,
      waveColor: '#1e293b',
      progressColor: '#0284c7',
      cursorColor: '#0087e0',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      normalize: true,
      autoScroll: true,
      autoCenter: true,
      minPxPerSec: 50,
      plugins: [recordPlugin],
    });

    wsRef.current = wavesurfer;
    recordPluginRef.current = recordPlugin;

    const onRecordStart = () => {
      setError(undefined);
      setIsRecording(true);
      setIsPaused(false);
    };

    const onRecordEnd = async (blob: Blob) => {
      setIsRecording(false);
      setIsPaused(false);
      setIsTranscribing(true);
      setError(undefined);

      try {
        const result = await transcribeAudio(blob);
        const rawText = result.text.trim();
        const text = postProcessAsrText(rawText);
        
        // Dispatch text directly to active target (appends into existing text)
        const target = dictationTargetRef.current === 'none' ? 'enemy' : dictationTargetRef.current;
        const existingVal = (state.data.startPreparation as Record<string, string>)[target] || '';
        const combinedVal = existingVal.trim() ? `${existingVal.trim()}
${text}` : text;
        
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: { step: 'startPreparation', data: { [target]: combinedVal } },
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
      removeStart();
      removeEnd();
      recordPlugin.destroy();
      wavesurfer.destroy();
    };
  }, [dispatch]);

  const handleToggleRecording = useCallback(async () => {
    const plugin = recordPluginRef.current;
    if (!plugin) return;

    if (isRecording) {
      plugin.stopRecording();
      return;
    }

    try {
      setError(undefined);
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

  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    setIsTranscribing(true);
    setError(undefined);

    if (wsRef.current) {
      try {
        wsRef.current.loadBlob(file);
      } catch {
        // Safe fallback
      }
    }

    try {
      const result = await transcribeAudio(file);
      const text = result.text.trim();
      const target = dictationTargetRef.current === 'none' ? 'enemy' : dictationTargetRef.current;
      dispatch({
        type: 'UPDATE_STEP_DATA',
        payload: { step: 'startPreparation', data: { [target]: text } },
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Audio transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|aac|flac|webm)$/i.test(file.name)) {
        handleAudioUpload(file);
      } else {
        setError('Please drop a valid audio file (.mp3, .wav, .m4a, .ogg, .webm).');
      }
    }
  };

  return (
    <div className={styles.panel} aria-label="Record audio panel">
      {/* Header with Section title on Left and Close button on Right */}
      <div className={styles.headerRow}>
        <h2 className={styles.sectionHeading}>{activeSectionLabel}</h2>
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
      </div>

      {/* Waveform Card Container with Drag & Drop Support */}
      <div 
        className={styles.waveformContainer}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        title="Waveform visualizer (or drop audio file here)"
      >
        {/* Center horizontal baseline line */}
        <div className={styles.baseline} />
        
        {/* WaveSurfer canvas container */}
        <div className={styles.waveformElement} ref={waveformRef} />
        
        {/* Blue vertical cursor indicator with dot pin */}
        <div className={styles.cursorLine} />
      </div>

      {/* Controls row: Rewind 10, Mic button, Upload Audio button, Forward 10 */}
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

        {/* Central Record & Upload Controls */}
        <div className={styles.centerButtons}>
          {isRecording ? (
            <>
              {/* Stop Recording Button -> Stops and transcribes directly into target */}
              <button
                type="button"
                className={styles.stopButton}
                onClick={handleToggleRecording}
                title="Stop Recording"
              >
                <img src={ongoingAudio} alt="Stop" className={styles.controlIconImg} />
              </button>

              {/* Pause/Resume Recording Button */}
              <button
                type="button"
                className={`${styles.pauseButton} ${isPaused ? styles.pausedActive : ''}`}
                onClick={handlePauseToggle}
                title={isPaused ? "Resume Recording" : "Pause Recording"}
              >
                <img src={pauseIcon} alt="Pause" className={styles.controlIconImg} />
              </button>
            </>
          ) : (
            /* Idle Mic Button to Start Recording */
            <button
              type="button"
              className={styles.micButton}
              onClick={handleToggleRecording}
              disabled={isTranscribing}
              title={`Start recording for ${activeSectionLabel}`}
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

      {isTranscribing && (
        <div className={styles.transcribingBox}>
          <div className={styles.spinner} />
          <p className={styles.statusText}>Transcribing audio for {activeSectionLabel}...</p>
        </div>
      )}

      {error ? <p className={styles.errorText}>{error}</p> : null}
    </div>
  );
}
