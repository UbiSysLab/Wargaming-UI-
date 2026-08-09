import { useCallback, useEffect, useRef, useState } from 'react';
import { discoverAsrWs } from '../features/recordAudio/transcribeApi';
import { DictationTarget } from '../types/wizard.types';

interface UseAudioStreamerResult {
  isStreaming: boolean;
  isPaused: boolean;
  isMuted: boolean;
  audioLevel: number;
  partialTranscript: string;
  error: string | null;
  startStreaming: (initialText: string) => Promise<void>;
  stopStreaming: () => void;
  togglePauseStreaming: () => void;
  toggleMuteStreaming: () => void;
  clearTranscript: () => void;
}

// Smart text accumulator using overlap alignment to prevent duplication
function appendOverlap(base: string, incoming: string): string {
  const baseWords = base.trim().split(/\s+/).filter(Boolean);
  const incomingWords = incoming.trim().split(/\s+/).filter(Boolean);

  if (baseWords.length === 0) return incoming;
  if (incomingWords.length === 0) return base;

  let maxOverlap = 0;
  const maxCheck = Math.min(baseWords.length, incomingWords.length);

  for (let len = 1; len <= maxCheck; len++) {
    let match = true;
    for (let i = 0; i < len; i++) {
      // Normalize words by lowercasing and stripping punctuation for robust comparisons
      const baseWord = baseWords[baseWords.length - len + i].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const incomingWord = incomingWords[i].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      if (baseWord !== incomingWord) {
        match = false;
        break;
      }
    }
    if (match) {
      maxOverlap = len;
    }
  }

  const newPart = incomingWords.slice(maxOverlap).join(' ');
  if (!newPart) return base;
  return base + (base ? ' ' : '') + newPart;
}

export function useAudioStreamer(
  activeTarget: DictationTarget,
  onTranscriptionSuccess: (target: DictationTarget, text: string) => void
): UseAudioStreamerResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for audio graph nodes and connection
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Refs for tracking mutable states in the audio processing loop (to avoid stale closures)
  const isPausedRef = useRef(isPaused);
  const isMutedRef = useRef(isMuted);
  const activeTargetRef = useRef(activeTarget);
  const onTranscriptionSuccessRef = useRef(onTranscriptionSuccess);

  // Keep refs synchronized
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  useEffect(() => {
    onTranscriptionSuccessRef.current = onTranscriptionSuccess;
  }, [onTranscriptionSuccess]);

  // Main teardown function
  const cleanup = useCallback(() => {
    // 1. Stop audio tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. Disconnect and close audio context
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {}
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((e) => console.warn('Error closing AudioContext:', e));
      }
      audioContextRef.current = null;
    }

    // 3. Close WebSocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }

    // 4. Delete global references to ensure garbage collection occurs ONLY now
    delete (window as any)._audioContext;
    delete (window as any)._audioSource;
    delete (window as any)._audioProcessor;
    delete (window as any)._mediaStream;

    setIsStreaming(false);
    setIsPaused(false);
    setAudioLevel(0);
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startStreaming = useCallback(async (initialText: string) => {
    cleanup();
    setError(null);
    setAudioLevel(0);
    setPartialTranscript(initialText);

    // 1. Resolve WebSocket URI
    let wsUrl: string;
    try {
      wsUrl = await discoverAsrWs();
    } catch (err) {
      setError('Could not discover backend ASR server address.');
      return;
    }

    // 2. Get User Microphone Stream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err) {
      setError('Microphone access blocked. Please check your system/browser permissions.');
      return;
    }

    // 3. Setup WebSocket Connection
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;
    } catch (err) {
      setError(`Failed to connect to streaming ASR WebSocket endpoint at: ${wsUrl}`);
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      console.log('Streaming ASR WebSocket connection established.');
      setIsStreaming(true);
    };

    socket.onerror = (evt) => {
      console.error('WebSocket Error:', evt);
      setError('ASR WebSocket connection error occurred.');
    };

    socket.onclose = (evt) => {
      console.log('ASR WebSocket connection closed:', evt.code, evt.reason);
      setIsStreaming(false);
    };

    // Real-time overlapping transcription accumulator
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.text === 'string') {
          const incomingText = data.text.trim();

          setPartialTranscript((prev) => {
            const updated = appendOverlap(prev, incomingText);
            // Propagate real-time update back to main state
            onTranscriptionSuccessRef.current(activeTargetRef.current, updated);
            return updated;
          });
        }
      } catch (err) {
        console.error('Error parsing ASR JSON message:', err);
      }
    };

    // 4. Setup AudioContext & Processing Node
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // 4096 buffer size, 1 input channel, 1 output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      // Crucial: Hold references on window to prevent Chrome Garbage Collection
      (window as any)._audioContext = audioContext;
      (window as any)._audioSource = source;
      (window as any)._audioProcessor = processor;
      (window as any)._mediaStream = stream;

      let packetCount = 0;
      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);

        // Compute signal RMS for live volume meter
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        // Normalize RMS to 0 - 100 range
        const level = Math.min(100, Math.round(rms * 250));
        setAudioLevel(level);

        // If streaming is active, unpaused and unmuted, stream float32 PCM bytes
        if (
          socket.readyState === WebSocket.OPEN &&
          !isPausedRef.current &&
          !isMutedRef.current
        ) {
          // Send raw array buffer
          const bufferCopy = new Float32Array(channelData).buffer;
          socket.send(bufferCopy);
          
          packetCount++;
          if (packetCount % 15 === 0) {
            console.log(`[useAudioStreamer] Sent 15 audio chunks (approx 3.8s) of float32 PCM data to WebSocket.`);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error('Failed to configure Web Audio pipeline:', err);
      setError(`Audio initialization error: ${err instanceof Error ? err.message : String(err)}`);
      cleanup();
    }
  }, [cleanup]);

  const stopStreaming = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const togglePauseStreaming = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const toggleMuteStreaming = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const clearTranscript = useCallback(() => {
    setPartialTranscript('');
    onTranscriptionSuccessRef.current(activeTargetRef.current, '');
  }, []);

  return {
    isStreaming,
    isPaused,
    isMuted,
    audioLevel,
    partialTranscript,
    error,
    startStreaming,
    stopStreaming,
    togglePauseStreaming,
    toggleMuteStreaming,
    clearTranscript,
  };
}
