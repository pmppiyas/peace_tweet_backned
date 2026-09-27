export const KAFKA_TOPIC_DUA_AUDIO_REQUESTED = 'dua.audio.requested';

export interface DuaAudioRequestedEvent {
  jobId: string;
  duaId: string;
  videoPath: string;
  originalFilename: string;
  reciterName?: string;
  language?: string;
  requestedBy?: string;
  timestamp: string;
}
