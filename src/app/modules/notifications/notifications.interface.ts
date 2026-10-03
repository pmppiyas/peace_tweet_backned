import { NotificationType } from '@prisma/client';

export interface INotificationQuery {
  page?: number | string;
  limit?: number | string;
  isRead?: boolean | string;
}

export interface ICreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title?: string | null;
  message: string;
  entityId?: string | null;
  entityType?: string | null;
}
