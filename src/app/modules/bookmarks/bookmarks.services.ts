import { BookmarksService } from '../../../modules/bookmarks/bookmarks.service';
import { prisma } from '../../config/prisma';
import { IBookmarkQuery } from './bookmarks.interface';

const serviceInstance = new BookmarksService(prisma as any);

const saveDua = (userId: string, duaId: string) => serviceInstance.saveDua(userId, duaId);

const unsaveDua = (userId: string, duaId: string) => serviceInstance.unsaveDua(userId, duaId);

const getSavedDuas = (userId: string, query: IBookmarkQuery) =>
  serviceInstance.getSavedDuas(userId, {
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 10,
  });

export const bookmarksServices = {
  saveDua,
  unsaveDua,
  getSavedDuas,
};
