import { GroupsService } from '../../../modules/groups/groups.service';
import { prisma } from '../../config/prisma';
import { ICreateGroupInput, ICreateGroupPostInput, IUpdateGroupInput } from './groups.interface';

const serviceInstance = new GroupsService(prisma as any);

const createGroup = (userId: string, dto: ICreateGroupInput) =>
  serviceInstance.createGroup(userId, dto as any);

const discoverGroups = (query: any, viewerId?: string) =>
  serviceInstance.discoverGroups(
    {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      visibility: query.visibility,
    },
    viewerId,
  );

const getMyGroups = (userId: string, query: any) =>
  serviceInstance.getMyGroups(userId, {
    cursor: query.cursor,
    limit: query.limit ? Number(query.limit) : undefined,
    search: query.search,
    visibility: query.visibility,
  });

const getGroupById = (groupId: string, viewerId?: string) =>
  serviceInstance.getGroupById(groupId, viewerId);

const getGroupBySlug = (slug: string, viewerId?: string) =>
  serviceInstance.getGroupBySlug(slug, viewerId);

const updateGroup = (groupId: string, userId: string, dto: IUpdateGroupInput) =>
  serviceInstance.updateGroup(groupId, userId, dto as any);

const deleteGroup = (groupId: string, userId: string) =>
  serviceInstance.deleteGroup(groupId, userId);

const joinGroup = (groupId: string, userId: string) => serviceInstance.joinGroup(groupId, userId);

const cancelJoinRequest = (groupId: string, userId: string) =>
  serviceInstance.cancelJoinRequest(groupId, userId);

const leaveGroup = (groupId: string, userId: string) => serviceInstance.leaveGroup(groupId, userId);

const getMembers = (groupId: string, query: any, viewerId?: string) =>
  serviceInstance.getMembers(
    groupId,
    {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      role: query.role,
    },
    viewerId,
  );

const getJoinRequests = (groupId: string, query: any, userId: string) =>
  serviceInstance.getJoinRequests(
    groupId,
    {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
    },
    userId,
  );

const acceptJoinRequest = (groupId: string, requestId: string, userId: string) =>
  serviceInstance.acceptJoinRequest(groupId, requestId, userId);

const rejectJoinRequest = (groupId: string, requestId: string, userId: string) =>
  serviceInstance.rejectJoinRequest(groupId, requestId, userId);

const removeMember = (groupId: string, targetUserId: string, userId: string) =>
  serviceInstance.removeMember(groupId, targetUserId, userId);

const changeMemberRole = (groupId: string, targetUserId: string, role: any, userId: string) =>
  serviceInstance.changeMemberRole(groupId, targetUserId, role, userId);

const getMembershipStatus = (groupId: string, viewerId?: string) =>
  serviceInstance.getMembershipStatus(groupId, viewerId);

const getGroupPosts = (groupId: string, query: any, viewerId?: string) =>
  serviceInstance.getGroupPosts(
    groupId,
    {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
    },
    viewerId,
  );

const createGroupPost = (groupId: string, userId: string, dto: ICreateGroupPostInput) =>
  serviceInstance.createGroupPost(groupId, userId, dto as any);

export const groupsServices = {
  createGroup,
  discoverGroups,
  getMyGroups,
  getGroupById,
  getGroupBySlug,
  updateGroup,
  deleteGroup,
  joinGroup,
  cancelJoinRequest,
  leaveGroup,
  getMembers,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  removeMember,
  changeMemberRole,
  getMembershipStatus,
  getGroupPosts,
  createGroupPost,
};
