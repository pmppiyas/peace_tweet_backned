import { PostStatus, PostType, PostVisibility } from '@prisma/client';

export interface ICreatePostInput {
  content?: string;
  type?: PostType;
  visibility?: PostVisibility;
  status?: PostStatus;
  mediaUrls?: string[];
  mediaLayout?: string;
  duaId?: string;
  duaData?: {
    title?: string;
    transliteration?: string;
    meaning?: string;
    meaningBangla?: string;
    fadilah?: string;
    arabicText?: string;
  };
  bloodRequestId?: string;
  bloodRequestData?: {
    patientName: string;
    patientAge?: number;
    problem?: string;
    bloodGroup: any;
    units?: number;
    hospitalName: string;
    hospitalAddress?: string;
    location: string;
    contactNumber: string;
    alternateContact?: string;
    neededDate: string | Date;
    urgency?: any;
    note?: string;
    forMyself?: boolean;
  };
}

export interface IUpdatePostInput {
  content?: string;
  type?: PostType;
  visibility?: PostVisibility;
  status?: PostStatus;
  mediaUrls?: string[];
  mediaLayout?: string;
  duaId?: string;
  bloodRequestId?: string;
}

export interface ICreateCommentInput {
  content: string;
}

export interface IQueryFeed {
  cursor?: string;
  limit?: number;
  type?: PostType;
  search?: string;
  authorId?: string;
}
