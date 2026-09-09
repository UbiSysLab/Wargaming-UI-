import type { TranscribeResponse } from './recordAudio.types';

let discoveredAsrUrl: string | null = null;

// Background subnet scan to automatically discover the ASR server's active IP
export async function discoverAsrServer(): Promise<string> {
  if (discoveredAsrUrl) return discoveredAsrUrl;

  // If loaded over HTTPS (Secure Context), we must use the relative route to avoid Mixed Content Blocking
  if (window.location.protocol === 'https:') {
    discoveredAsrUrl = '/transcribe';
    return '/transcribe';
  }

  try {
    // 1. Fetch server IP relatively from config.json
    const configRes = await fetch('/config.json');
    if (!configRes.ok) throw new Error();
    const config = await configRes.json();
    const serverIp = config.server_ip;
    if (!serverIp) throw new Error();

    // 2. Extract subnet prefix
    const parts = serverIp.split('.');
    if (parts.length !== 4) throw new Error();
    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;

    // 3. Scan the subnet in parallel
    const scanPromises: Promise<string>[] = [];
    for (let i = 2; i <= 254; i++) {
      const targetIp = `${prefix}${i}`;
      scanPromises.push(
        new Promise<string>((resolve, reject) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1200);

          fetch(`http://${targetIp}:8000/`, { signal: controller.signal })
            .then(() => {
              clearTimeout(timer);
              resolve(`http://${targetIp}:8000/transcribe`);
            })
            .catch(() => {
              clearTimeout(timer);
              reject();
            });
        })
      );
    }

    const activeUrl = await Promise.any(scanPromises);
    discoveredAsrUrl = activeUrl;
    return activeUrl;
  } catch (err) {
    // Fallback to localhost in development
    return 'http://127.0.0.1:8000/transcribe';
  }
}

export async function transcribeAudio(fileOrBlob: Blob | File): Promise<TranscribeResponse> {
  const url = await discoverAsrServer();
  const formData = new FormData();
  
  // Resolve correct filename & extension for audio files
  let filename = 'recording.webm';
  if (fileOrBlob instanceof File && fileOrBlob.name) {
    filename = fileOrBlob.name;
  } else {
    const mimeType = (fileOrBlob.type || '').toLowerCase();
    let extension = 'webm';
    if (mimeType.includes('m4a') || mimeType.includes('aac')) {
      extension = 'm4a';
    } else if (mimeType.includes('wav')) {
      extension = 'wav';
    } else if (mimeType.includes('ogg')) {
      extension = 'ogg';
    } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      extension = 'mp3';
    } else if (mimeType.includes('webm')) {
      extension = 'webm';
    }
    filename = `recording.${extension}`;
  }
  
  formData.append('audio_file', fileOrBlob, filename);
  formData.append('mode', 'dialogue');

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Transcription request failed: ${response.status} ${response.statusText} ${responseText}`);
  }

  return response.json() as Promise<TranscribeResponse>;
}

