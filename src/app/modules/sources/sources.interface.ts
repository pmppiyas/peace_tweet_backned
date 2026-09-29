import { SourceType } from '@prisma/client';

export interface ICreateSourceInput {
  nameBangla: string;
  nameEnglish?: string;
  type?: SourceType;
}

export interface IUpdateSourceInput {
  nameBangla?: string;
  nameEnglish?: string;
  type?: SourceType;
}
