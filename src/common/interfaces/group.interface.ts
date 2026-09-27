import { GroupJoinRequestStatus } from '../enums/group-join-request-status.enum';
import { GroupMemberRole } from '../enums/group-member-role.enum';
import { GroupMembershipStatus } from '../enums/group-membership-status.enum';
import { GroupVisibility } from '../enums/group-visibility.enum';

// User summary in group listings
export interface GroupUserSummary {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

// User membership information in a group
export interface GroupMembershipInfo {
  status: GroupMembershipStatus;
  role: GroupMemberRole | null;
  requestId?: string | null;
}

// Group summary / detail presentation
export interface GroupDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  visibility: GroupVisibility;
  memberCount: number;
  membership?: GroupMembershipInfo;
  createdAt: Date;
  updatedAt: Date;
}

// Group member listing item
export interface GroupMemberItem {
  id: string;
  groupId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  user: GroupUserSummary;
}

// Group join request item
export interface GroupJoinRequestItem {
  id: string;
  groupId: string;
  status: GroupJoinRequestStatus;
  createdAt: Date;
  user: GroupUserSummary;
}

// Generic action response
export interface GroupActionResponse {
  success: boolean;
  message: string;
}

// Paginated group listing response
export interface PaginatedGroupsResponse {
  items: GroupDetail[];
  nextCursor: string | null;
}

// Paginated group members listing response
export interface PaginatedGroupMembersResponse {
  items: GroupMemberItem[];
  nextCursor: string | null;
}

// Paginated group join requests response
export interface PaginatedGroupJoinRequestsResponse {
  items: GroupJoinRequestItem[];
  nextCursor: string | null;
}
