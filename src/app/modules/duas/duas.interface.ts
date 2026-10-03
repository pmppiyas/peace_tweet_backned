import { DuaStatus } from '@prisma/client';

export interface ICreateDuaInput {
  title?: string;
  transliteration?: string;
  meaningBangla?: string;
  meaning?: string;
  fadilah?: string;
  arabicText?: string;
  categoryId?: string;
  status?: DuaStatus;
  duaBangla?: string; // Legacy alias mapped to transliteration
}

export interface IUpdateDuaInput {
  title?: string;
  transliteration?: string;
  meaningBangla?: string;
  meaning?: string;
  fadilah?: string;
  arabicText?: string;
  categoryId?: string;
  status?: DuaStatus;
  duaBangla?: string; // Legacy alias mapped to transliteration
}
