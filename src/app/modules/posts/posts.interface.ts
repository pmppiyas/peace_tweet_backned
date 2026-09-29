import { PostStatus, PostType, PostVisibility } from '@prisma/client';

export interface ICreatePostInput {
  content: string;
  type?: PostType;
  visibility?: PostVisibility;
  status?: PostStatus;
  duaId?: string;
}

export interface IUpdatePostInput {
  content?: string;
  type?: PostType;
  visibility?: PostVisibility;
  status?: PostStatus;
  duaId?: string;
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
