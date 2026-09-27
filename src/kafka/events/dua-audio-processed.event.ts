export const KAFKA_TOPIC_DUA_AUDIO_PROCESSED = 'dua.audio.processed';

export interface DuaAudioProcessedEvent {
  jobId: string;
  duaId: string;
  audioUrl: string;
  audioPath: string;
  duration: number;
  reciterName?: string;
  language?: string;
  status: 'COMPLETED' | 'FAILED';
  error?: string;
  timestamp: string;
}
