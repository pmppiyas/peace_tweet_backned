export interface ISendFriendRequestInput {
  receiverId: string;
}

export interface IFriendQuery {
  cursor?: string;
  limit?: number;
  search?: string;
}
