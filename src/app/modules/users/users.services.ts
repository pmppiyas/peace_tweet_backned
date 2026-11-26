import { UsersService } from '../../../modules/users/users.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { friendsServices } from '../friends/friends.services';
import { pointsServices } from '../points/points.services';
import { IChangePasswordInput, IUpdateUserInput } from './users.interface';

const serviceInstance = new UsersService(prisma as any, friendsServices.instance);

const invalidateUserCache = async (
  userId: string,
  username?: string,
  invalidatePublicFeeds = false,
) => {
  try {
    const tasks: Promise<any>[] = [
      cacheService.delPattern(`user:*:${userId}*`),
      cacheService.delPattern(`user:me:${userId}`),
      username
        ? cacheService.delPattern(`user:username:${username.toLowerCase()}`)
        : cacheService.delPattern('user:username:*'),
    ];
    if (invalidatePublicFeeds) {
      tasks.push(
        cacheService.delPattern('feed:*'),
        cacheService.delPattern('posts:*'),
        cacheService.delPattern('search:*'),
      );
    }
    await Promise.all(tasks);
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
  const affectsPoints =
    dto.avatarUrl !== undefined ||
    dto.coverUrl !== undefined ||
    dto.bio !== undefined ||
    dto.location !== undefined ||
    dto.city !== undefined ||
    dto.state !== undefined ||
    dto.country !== undefined ||
    dto.email !== undefined;

  if (affectsPoints) {
    try {
      await pointsServices.syncProfileCompletionTasks(id);
    } catch (err: any) {
      console.warn('Points sync notice on profile update:', err?.message);
    }
  }

  const affectsPublicFeeds =
    dto.name !== undefined ||
    dto.username !== undefined ||
    dto.avatarUrl !== undefined ||
    dto.coverUrl !== undefined ||
    dto.email !== undefined ||
    dto.userStatus !== undefined;

  await invalidateUserCache(id, (result as any)?.username, affectsPublicFeeds);
  if (affectsPoints) {
    return serviceInstance.findById(id);
  }
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
