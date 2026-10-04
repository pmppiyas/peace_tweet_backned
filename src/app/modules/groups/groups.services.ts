import { GroupsService } from '../../../modules/groups/groups.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { ICreateGroupInput, ICreateGroupPostInput, IUpdateGroupInput } from './groups.interface';

const serviceInstance = new GroupsService(prisma as any);

const invalidateGroupCache = async (groupId?: string, slug?: string) => {
  try {
    await cacheService.delPattern('groups:discover:*');
    await cacheService.delPattern('groups:my:*');
    await cacheService.delPattern('search:*');
    if (groupId) {
      await cacheService.delPattern(`groups:${groupId}:*`);
      await cacheService.delPattern(`groups:id:${groupId}:*`);
    }
    if (slug) {
      await cacheService.delPattern(`groups:slug:${slug}:*`);
    }
  } catch (err: any) {
    console.warn('Groups cache invalidation failed:', err.message);
  }
};

const createGroup = async (userId: string, dto: ICreateGroupInput) => {
  const result = await serviceInstance.createGroup(userId, dto as any);
  await invalidateGroupCache(result.id, result.slug);
  return result;
};

const discoverGroups = (query: any, viewerId?: string) => {
  const cacheKey = `groups:discover:${JSON.stringify(query)}:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.discoverGroups(
      {
        cursor: query.cursor,
        limit: query.limit ? Number(query.limit) : undefined,
        search: query.search,
        visibility: query.visibility,
      },
      viewerId,
    ),
  );
};

const getMyGroups = (userId: string, query: any) => {
  const cacheKey = `groups:my:${userId}:${JSON.stringify(query)}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getMyGroups(userId, {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      visibility: query.visibility,
    }),
  );
};

const getGroupById = (groupId: string, viewerId?: string) => {
  const cacheKey = `groups:id:${groupId}:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 120, () =>
    serviceInstance.getGroupById(groupId, viewerId),
  );
};

const getGroupBySlug = (slug: string, viewerId?: string) => {
  const cacheKey = `groups:slug:${slug}:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 120, () =>
    serviceInstance.getGroupBySlug(slug, viewerId),
  );
};

const updateGroup = async (groupId: string, userId: string, dto: IUpdateGroupInput) => {
  const result = await serviceInstance.updateGroup(groupId, userId, dto as any);
  await invalidateGroupCache(groupId, result.slug);
  return result;
};

const deleteGroup = async (groupId: string, userId: string) => {
  const result = await serviceInstance.deleteGroup(groupId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const joinGroup = async (groupId: string, userId: string) => {
  const result = await serviceInstance.joinGroup(groupId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const cancelJoinRequest = async (groupId: string, userId: string) => {
  const result = await serviceInstance.cancelJoinRequest(groupId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const leaveGroup = async (groupId: string, userId: string) => {
  const result = await serviceInstance.leaveGroup(groupId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const getMembers = (groupId: string, query: any, viewerId?: string) => {
  const cacheKey = `groups:${groupId}:members:${JSON.stringify(query)}:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getMembers(
      groupId,
      {
        cursor: query.cursor,
        limit: query.limit ? Number(query.limit) : undefined,
        search: query.search,
        role: query.role,
      },
      viewerId,
    ),
  );
};

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

const acceptJoinRequest = async (groupId: string, requestId: string, userId: string) => {
  const result = await serviceInstance.acceptJoinRequest(groupId, requestId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const rejectJoinRequest = async (groupId: string, requestId: string, userId: string) => {
  const result = await serviceInstance.rejectJoinRequest(groupId, requestId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const removeMember = async (groupId: string, targetUserId: string, userId: string) => {
  const result = await serviceInstance.removeMember(groupId, targetUserId, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const changeMemberRole = async (groupId: string, targetUserId: string, role: any, userId: string) => {
  const result = await serviceInstance.changeMemberRole(groupId, targetUserId, role, userId);
  await invalidateGroupCache(groupId);
  return result;
};

const getMembershipStatus = (groupId: string, viewerId?: string) => {
  const cacheKey = `groups:${groupId}:status:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getMembershipStatus(groupId, viewerId),
  );
};

const getGroupPosts = (groupId: string, query: any, viewerId?: string) => {
  const cacheKey = `groups:${groupId}:posts:${JSON.stringify(query)}:${viewerId || 'anon'}`;
  return cacheService.remember(cacheKey, 30, () =>
    serviceInstance.getGroupPosts(
      groupId,
      {
        cursor: query.cursor,
        limit: query.limit ? Number(query.limit) : undefined,
        search: query.search,
      },
      viewerId,
    ),
  );
};

const createGroupPost = async (groupId: string, userId: string, dto: ICreateGroupPostInput) => {
  const result = await serviceInstance.createGroupPost(groupId, userId, dto as any);
  await invalidateGroupCache(groupId);
  try {
    await cacheService.delPattern('feed:*');
  } catch (e) {}
  return result;
};

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
