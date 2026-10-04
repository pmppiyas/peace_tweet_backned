import { ShareContentType, ShareTarget } from '@prisma/client';

export interface ICreateShareInput {
  contentType: ShareContentType;
  contentId: string;
  target: ShareTarget;
  groupId?: string;
  caption?: string;
}
