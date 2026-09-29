import { GroupMemberRole, GroupVisibility, PostType } from '@prisma/client';

export interface ICreateGroupInput {
  name: string;
  slug: string;
  description?: string;
  visibility?: GroupVisibility;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface IUpdateGroupInput {
  name?: string;
  slug?: string;
  description?: string;
  visibility?: GroupVisibility;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface IChangeMemberRoleInput {
  role: GroupMemberRole;
}

export interface ICreateGroupPostInput {
  content: string;
  type?: PostType;
  duaId?: string;
}
