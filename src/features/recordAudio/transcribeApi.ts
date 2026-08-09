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

  // If loaded from wargaming.com, use relative path immediately to bypass scanning
  const host = window.location.hostname.toLowerCase();
  // Always perform subnet scanning to locate the ASR server, even when accessed via wargaming.com.

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

export async function transcribeAudio(blob: Blob): Promise<TranscribeResponse> {
  const url = await discoverAsrServer();
  const formData = new FormData();
  
  // Dynamically resolve correct file extension based on actual blob type
  const mimeType = blob.type.toLowerCase();
  let extension = 'webm';
  if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) {
    extension = 'mp4';
  } else if (mimeType.includes('wav')) {
    extension = 'wav';
  } else if (mimeType.includes('ogg')) {
    extension = 'ogg';
  }
  
  formData.append('audio_file', blob, `recording.${extension}`);
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

export async function discoverAsrWs(): Promise<string> {
  if (window.location.protocol === 'https:') {
    return `wss://${window.location.host}/stream-transcribe`;
  }
  const httpUrl = await discoverAsrServer();
  const wsUrl = httpUrl.replace(/^http:/, 'ws:').replace(/\/transcribe$/, '/stream-transcribe');
  return wsUrl;
}

