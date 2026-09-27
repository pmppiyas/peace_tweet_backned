import { RelationshipStatus } from '../enums/relationship-status.enum';

// User relationship status details
export interface FriendshipStatusData {
  status: RelationshipStatus;
  requestId: string | null;
}

// User summary representation in friend listings
export interface FriendUserSummary {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

// Friend item in friend list
export interface FriendItem {
  id: string;
  friendId: string;
  friendSince: Date;
  user: FriendUserSummary;
}

// Friend request item in request listings
export interface FriendRequestItem {
  id: string;
  status: string;
  createdAt: Date;
  sender?: FriendUserSummary;
  receiver?: FriendUserSummary;
}

// Paginated response wrapper for friends
export interface PaginatedFriendsResponse {
  items: FriendItem[];
  nextCursor: string | null;
}

// Paginated response wrapper for friend requests
export interface PaginatedFriendRequestsResponse {
  items: FriendRequestItem[];
  nextCursor: string | null;
}
