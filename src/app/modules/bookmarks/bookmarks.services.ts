import { BookmarksService } from '../../../modules/bookmarks/bookmarks.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { IBookmarkQuery } from './bookmarks.interface';

const serviceInstance = new BookmarksService(prisma as any);

const saveDua = async (userId: string, duaId: string) => {
  const result = await serviceInstance.saveDua(userId, duaId);
  try {
    await cacheService.delPattern(`bookmarks:${userId}:*`);
  } catch (err: any) {
    console.warn('Bookmarks cache invalidation failed:', err.message);
  }
  return result;
};

const unsaveDua = async (userId: string, duaId: string) => {
  const result = await serviceInstance.unsaveDua(userId, duaId);
  try {
    await cacheService.delPattern(`bookmarks:${userId}:*`);
  } catch (err: any) {
    console.warn('Bookmarks cache invalidation failed:', err.message);
  }
  return result;
};

const getSavedDuas = (userId: string, query: IBookmarkQuery) => {
  const cacheKey = `bookmarks:${userId}:${JSON.stringify(query)}`;
  return cacheService.remember(cacheKey, 120, () =>
    serviceInstance.getSavedDuas(userId, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
    }),
  );
};

export const bookmarksServices = {
  saveDua,
  unsaveDua,
  getSavedDuas,
};
