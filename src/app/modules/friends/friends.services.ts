import { FriendsService } from '../../../modules/friends/friends.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { IFriendQuery } from './friends.interface';

const serviceInstance = new FriendsService(prisma as any);

const invalidateFriendsCache = async () => {
  try {
    await cacheService.delPattern('friends:*');
    await cacheService.delPattern('feed:*');
  } catch (err: any) {
    console.warn('Cache invalidation error in friends:', err.message);
  }
};

const sendRequest = async (senderId: string, receiverId: string) => {
  const result = await serviceInstance.sendRequest(senderId, receiverId);
  await invalidateFriendsCache();
  return result;
};

const cancelRequest = async (requestId: string, userId: string) => {
  const result = await serviceInstance.cancelRequest(requestId, userId);
  await invalidateFriendsCache();
  return result;
};

const acceptRequest = async (requestId: string, userId: string) => {
  const result = await serviceInstance.acceptRequest(requestId, userId);
  await invalidateFriendsCache();
  return result;
};

const rejectRequest = async (requestId: string, userId: string) => {
  const result = await serviceInstance.rejectRequest(requestId, userId);
  await invalidateFriendsCache();
  return result;
};

const getReceivedRequests = async (userId: string, query: IFriendQuery) => {
  const cacheKey = `friends:received:${userId}:${query.cursor || 'start'}:${query.limit || 20}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getReceivedRequests(userId, {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : 20,
    }),
  );
};

const getSentRequests = async (userId: string, query: IFriendQuery) => {
  const cacheKey = `friends:sent:${userId}:${query.cursor || 'start'}:${query.limit || 20}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getSentRequests(userId, {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : 20,
    }),
  );
};

const getFriends = async (userId: string, query: IFriendQuery) => {
  const cacheKey = `friends:list:${userId}:${query.cursor || 'start'}:${query.limit || 20}:${query.search || ''}`;
  return cacheService.remember(cacheKey, 120, () =>
    serviceInstance.getFriends(userId, {
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
    }),
  );
};

const unfriend = async (userId: string, targetUserId: string) => {
  const result = await serviceInstance.unfriend(userId, targetUserId);
  await invalidateFriendsCache();
  return result;
};

const getRelationshipStatus = (viewerId: string | undefined, targetUserId: string) =>
  serviceInstance.getRelationshipStatus(viewerId, targetUserId);

export const friendsServices = {
  instance: serviceInstance,
  sendRequest,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  getReceivedRequests,
  getSentRequests,
  getFriends,
  unfriend,
  getRelationshipStatus,
};
