export interface TranscribeResponse {
  text: string;
}

export interface RecordAudioState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  error?: string;
}
