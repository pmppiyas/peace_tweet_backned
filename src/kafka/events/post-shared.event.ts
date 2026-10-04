export const KAFKA_TOPIC_POST_SHARED = 'peacetweet.post.shared';

export interface PostSharedEvent {
  shareId?: string;
  userId: string;
  contentType: string;
  contentId: string;
  target: string;
  groupId?: string | null;
  sharedPostId?: string | null;
  createdAt: Date | string;
}
