import type { TranscribeResponse } from './recordAudio.types';

let discoveredAsrUrl: string | null = null;

// Always use the relative /transcribe route so API Gateway proxies it cleanly on both HTTP and HTTPS
export async function discoverAsrServer(): Promise<string> {
  if (discoveredAsrUrl) return discoveredAsrUrl;
  discoveredAsrUrl = '/transcribe';
  return '/transcribe';
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

