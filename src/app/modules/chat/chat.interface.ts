export interface ISendMessageInput {
  conversationId?: string;
  receiverId: string;
  text: string;
}

export interface IMessageQuery {
  cursor?: string;
  limit?: number;
}
