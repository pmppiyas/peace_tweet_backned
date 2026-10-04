import { UsersService } from '../../../modules/users/users.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { friendsServices } from '../friends/friends.services';
import { IChangePasswordInput, IUpdateUserInput } from './users.interface';

const serviceInstance = new UsersService(prisma as any, friendsServices.instance);

const invalidateUserCache = async (userId: string, username?: string) => {
  try {
    await cacheService.delPattern(`user:*:${userId}*`);
    await cacheService.delPattern(`user:me:${userId}`);
    if (username) {
      await cacheService.delPattern(`user:username:${username}`);
    } else {
      await cacheService.delPattern('user:username:*');
    }
    await cacheService.delPattern('feed:*');
    await cacheService.delPattern('search:*');
  } catch (err: any) {
    console.warn('Cache invalidation error in users:', err.message);
  }
};

const findById = async (id: string) => {
  const cacheKey = `user:id:${id}`;
  return cacheService.remember(cacheKey, 300, () => serviceInstance.findById(id));
};

const findByUsername = async (username: string, viewerId?: string) => {
  if (!viewerId) {
    const cacheKey = `user:username:${username.toLowerCase()}`;
    return cacheService.remember(cacheKey, 300, () => serviceInstance.findByUsername(username));
  }
  return serviceInstance.findByUsername(username, viewerId);
};

const update = async (id: string, dto: IUpdateUserInput) => {
  const result = await serviceInstance.update(id, dto as any);
  await invalidateUserCache(id, (result as any)?.username);
  return result;
};

const changePassword = async (userId: string, dto: IChangePasswordInput) => {
  const result = await serviceInstance.changePassword(userId, dto);
  await invalidateUserCache(userId);
  return result;
};

export const usersServices = {
  findById,
  findByUsername,
  update,
  changePassword,
};
