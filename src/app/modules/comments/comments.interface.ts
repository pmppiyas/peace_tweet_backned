export interface ICreateCommentInput {
  postId?: string;
  content: string;
  parentId?: string | null;
}

export interface IUpdateCommentInput {
  content: string;
}
