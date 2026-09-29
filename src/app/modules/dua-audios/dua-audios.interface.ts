export interface ICreateDuaAudioInput {
  audioUrl: string;
  reciterName?: string;
  language?: string;
  durationSeconds?: number;
}

export interface IUpdateDuaAudioInput {
  audioUrl?: string;
  reciterName?: string;
  language?: string;
  durationSeconds?: number;
}
