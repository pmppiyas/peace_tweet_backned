import { FriendsService } from '../../../modules/friends/friends.service';
import { prisma } from '../../config/prisma';
import { IFriendQuery } from './friends.interface';

const serviceInstance = new FriendsService(prisma as any);

const sendRequest = (senderId: string, receiverId: string) =>
  serviceInstance.sendRequest(senderId, receiverId);

const cancelRequest = (requestId: string, userId: string) =>
  serviceInstance.cancelRequest(requestId, userId);

const acceptRequest = (requestId: string, userId: string) =>
  serviceInstance.acceptRequest(requestId, userId);

const rejectRequest = (requestId: string, userId: string) =>
  serviceInstance.rejectRequest(requestId, userId);

const getReceivedRequests = (userId: string, query: IFriendQuery) =>
  serviceInstance.getReceivedRequests(userId, {
    cursor: query.cursor,
    limit: query.limit ? Number(query.limit) : 20,
  });

const getSentRequests = (userId: string, query: IFriendQuery) =>
  serviceInstance.getSentRequests(userId, {
    cursor: query.cursor,
    limit: query.limit ? Number(query.limit) : 20,
  });

const getFriends = (userId: string, query: IFriendQuery) =>
  serviceInstance.getFriends(userId, {
    cursor: query.cursor,
    limit: query.limit ? Number(query.limit) : 20,
    search: query.search,
  });

const unfriend = (userId: string, targetUserId: string) =>
  serviceInstance.unfriend(userId, targetUserId);

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
