import React, { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { useWizard } from '../../stores/WizardContext';
import { transcribeAudio } from './transcribeApi';
import styles from './RecordAudioPanel.module.css';

export function RecordAudioPanel() {
  const { dispatch } = useWizard();
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<InstanceType<typeof RecordPlugin> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

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
      height: 180,
      waveColor: '#cbd5e1',
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

    const onRecordStart = () => {
      setError(undefined);
      setIsRecording(true);
    };

    const onRecordEnd = async (blob: Blob) => {
      setIsRecording(false);
      setIsTranscribing(true);
      setError(undefined);

      try {
        const result = await transcribeAudio(blob);
        const text = result.text.trim();
        dispatch({
          type: 'UPDATE_STEP_DATA',
          payload: { step: 'startPreparation', data: { execution: text } },
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
  }, []);

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
      await plugin.startRecording();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Unable to start recording.');
      setIsRecording(false);
    }
  }, [isRecording]);

  const statusLabel = isTranscribing
    ? 'Transcribing…'
    : isRecording
    ? 'Live recording in progress'
    : 'Ready to record';

  return (
    <section className={styles.panel} aria-label="Record audio panel">
      <div className={styles.header}>
        <h1 className={styles.title}>Record Audio</h1>
        <p className={styles.subtitle}>
          Use your microphone to capture the operation briefing and automatically populate Execution.
        </p>
      </div>

      <div className={styles.waveformCard}>
        <div className={styles.waveformContainer}>
          <div className={styles.waveformElement} ref={waveformRef} />
          <div className={styles.waveformOverlay}>
            <div className={styles.cursorLine} />
          </div>
        </div>

        <div className={styles.controls}>
          <span className={styles.timeLabel}>10</span>
          <button
            type="button"
            className={styles.recordButton}
            onClick={handleToggleRecording}
            disabled={isTranscribing}
          >
            {isRecording ? 'Stop' : 'Record'}
          </button>
          <span className={styles.timeLabel}>10</span>
        </div>

        <div className={styles.statusText}>{statusLabel}</div>
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </section>
  );
}
