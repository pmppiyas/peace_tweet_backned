import { FeedbackStatus, FeedbackType } from '@prisma/client';

export interface ICreateFeedbackPayload {
  name: string;
  email: string;
  type?: FeedbackType;
  subject: string;
  description: string;
  mediaUrls?: string[];
}

export interface IFeedbackFilter {
  search?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  page?: number | string;
  limit?: number | string;
}

export interface IUpdateFeedbackStatusPayload {
  status: FeedbackStatus;
  adminNote?: string;
}
