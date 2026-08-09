import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';
import { transcribeAudio } from '../features/recordAudio/transcribeApi';
import { DictationTarget } from '../types/wizard.types';

interface UseAudioRecorderResult {
  waveformRef: React.RefObject<HTMLDivElement | null>;
  isRecording: boolean;
  isPaused: boolean;
  isTranscribing: boolean;
  hasAudio: boolean;
  isPlaying: boolean;
  error: string | undefined;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  togglePauseRecording: () => void;
  togglePlayPausePlayback: () => void;
  stopPlayback: () => void;
  discardAudio: () => void;
  seekBackward: () => void;
  seekForward: () => void;
}

export function useAudioRecorder(
  activeTarget: DictationTarget,
  onTranscriptionSuccess: (target: DictationTarget, text: string) => void
): UseAudioRecorderResult {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<InstanceType<typeof RecordPlugin> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Keep a ref of activeTarget to avoid stale closures in wavesurfer callbacks
  const activeTargetRef = useRef(activeTarget);
  useEffect(() => {
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  // Keep a ref of the success callback to avoid re-triggering the useEffect block on every render
  const onTranscriptionSuccessRef = useRef(onTranscriptionSuccess);
  useEffect(() => {
    onTranscriptionSuccessRef.current = onTranscriptionSuccess;
  }, [onTranscriptionSuccess]);

  useEffect(() => {
    if (!waveformRef.current) return undefined;

    // Dynamically choose supported mimeType (iOS Safari does not support webm)
    let selectedMimeType = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        selectedMimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        selectedMimeType = 'audio/mp4'; // Supported by iOS Safari
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        selectedMimeType = 'audio/wav';
      } else {
        selectedMimeType = ''; // Let browser choose its default
      }
    }

    const recordPlugin = RecordPlugin.create({
      mimeType: selectedMimeType || undefined,
      audioBitsPerSecond: 128000,
      mediaRecorderTimeslice: 1000,
      renderRecordedAudio: true,
      continuousWaveform: true,
      scrollingWaveform: false,
    });

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
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

    // Listen to wavesurfer errors to show on-screen diagnostics if it fails on mobile
    const unsubError = wavesurfer.on('error', (err) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Ignore normal browser abort/cleanup errors
      if (errMsg.includes('aborted') || errMsg.includes('AbortError')) {
        return;
      }
      console.error('Wavesurfer error:', err);
      setError(errMsg);
    });

    // Listen to play/pause state
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
        const url = URL.createObjectURL(blob);
        wavesurfer.load(url);

        const result = await transcribeAudio(blob);
        const text = result.text.trim();
        
        onTranscriptionSuccessRef.current(activeTargetRef.current, text);
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
      unsubError();
      removeStart();
      removeEnd();
      recordPlugin.destroy();
      wavesurfer.destroy();
    };
  }, []);

  const startRecording = useCallback(async () => {
    const plugin = recordPluginRef.current;
    if (!plugin) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone blocked: Browsers require HTTPS or 'localhost' to access audio on a LAN. Please configure HTTPS or bypass checks in Chrome flags.");
      setIsRecording(false);
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
  }, []);

  const stopRecording = useCallback(() => {
    const plugin = recordPluginRef.current;
    if (plugin && isRecording) {
      if (plugin.isPaused()) {
        try {
          plugin.resumeRecording();
        } catch (e) {
          console.warn("Failed to resume before stopping:", e);
        }
      }
      
      // Allow WebKit a brief 50ms window to update state to 'recording' before stopping
      setTimeout(() => {
        try {
          plugin.stopRecording();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to stop recording.');
          setIsRecording(false);
        }
      }, 50);
    }
  }, [isRecording]);

  const togglePauseRecording = useCallback(() => {
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

  const togglePlayPausePlayback = useCallback(() => {
    if (wsRef.current && hasAudio) {
      if (wsRef.current.isPlaying()) {
        wsRef.current.pause();
      } else {
        wsRef.current.play();
      }
    }
  }, [hasAudio]);

  const stopPlayback = useCallback(() => {
    if (wsRef.current && hasAudio) {
      wsRef.current.pause();
      wsRef.current.setTime(0);
    }
  }, [hasAudio]);

  const discardAudio = useCallback(() => {
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

  const seekBackward = useCallback(() => {
    if (wsRef.current) {
      try {
        const current = wsRef.current.getCurrentTime();
        wsRef.current.setTime(Math.max(0, current - 10));
      } catch (e) {
        // Safe seek
      }
    }
  }, []);

  const seekForward = useCallback(() => {
    if (wsRef.current) {
      try {
        const current = wsRef.current.getCurrentTime();
        const duration = wsRef.current.getDuration();
        wsRef.current.setTime(Math.min(duration || 0, current + 10));
      } catch (e) {
        // Safe seek
      }
    }
  }, []);

  return {
    waveformRef,
    isRecording,
    isPaused,
    isTranscribing,
    hasAudio,
    isPlaying,
    error,
    startRecording,
    stopRecording,
    togglePauseRecording,
    togglePlayPausePlayback,
    stopPlayback,
    discardAudio,
    seekBackward,
    seekForward,
  };
}
