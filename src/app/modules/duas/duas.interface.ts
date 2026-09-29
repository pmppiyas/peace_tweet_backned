import { DuaStatus } from '@prisma/client';

export interface ICreateDuaInput {
  title: string;
  fadilah: string;
  duaBangla: string;
  meaningBangla: string;
  arabicText?: string;
  transliteration?: string;
  categoryId: string;
  status?: DuaStatus;
}

export interface IUpdateDuaInput {
  title?: string;
  fadilah?: string;
  duaBangla?: string;
  meaningBangla?: string;
  arabicText?: string;
  transliteration?: string;
  categoryId?: string;
  status?: DuaStatus;
}
