export const KAFKA_TOPIC_POST_CREATED = 'peacetweet.post.created';

export interface PostCreatedEvent {
  postId: string;
  authorId: string;
  type: string;
  createdAt: Date | string;
  status: string;
}
