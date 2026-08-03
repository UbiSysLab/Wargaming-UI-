import type { TranscribeResponse } from './recordAudio.types';

const TRANSCRIBE_ENDPOINT = 'http://127.0.0.1:8000/transcribe';

export async function transcribeAudio(blob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio_file', blob, 'recording.webm');
  formData.append('mode', 'dialogue');

  const response = await fetch(TRANSCRIBE_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Transcription request failed: ${response.status} ${response.statusText} ${responseText}`);
  }

  return response.json() as Promise<TranscribeResponse>;
}
