import { CommentsService } from '../../../modules/comments/comments.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import {
  ICreateCommentInput,
  IUpdateCommentInput,
} from './comments.interface';

const serviceInstance = new CommentsService(prisma as any);

const invalidateCommentCache = async (postId?: string) => {
  try {
    await cacheService.delPattern('feed:*');
    await cacheService.delPattern('*feed*');
    await cacheService.delPattern('comments:*');
    if (postId) {
      await cacheService.delPattern(`posts:id:${postId}*`);
      await cacheService.delPattern(`posts:comments:${postId}*`);
      await cacheService.delPattern(`comments:post:${postId}*`);
      await cacheService.delPattern(`*${postId}*`);
    } else {
      await cacheService.delPattern('posts:*');
      await cacheService.delPattern('*posts*');
    }
    await cacheService.delPattern('groups:*');
    await cacheService.delPattern('*groups*');
  } catch (err: any) {
    console.warn('Cache invalidation error in comments:', err.message);
  }
};

const getCommentsByPost = async (
  postId: string,
  limit = 50,
  currentUser?: any,
) => {
  return serviceInstance.getCommentsByPost(postId, limit, currentUser);
};

const findOne = async (commentId: string, currentUser?: any) => {
  return serviceInstance.findOne(commentId, currentUser);
};

const createComment = async (
  postId: string | undefined,
  userId: string,
  dto: ICreateCommentInput,
) => {
  const result = await serviceInstance.createComment(postId, userId, dto as any);
  await invalidateCommentCache(result?.comment?.postId || postId);
  return result;
};

const updateComment = async (
  commentId: string,
  userId: string,
  dto: IUpdateCommentInput,
  userRole?: string,
) => {
  const result = await serviceInstance.updateComment(
    commentId,
    userId,
    dto as any,
    userRole,
  );
  await invalidateCommentCache(result?.postId);
  return result;
};

const deleteComment = async (
  commentId: string,
  currentUser: { id: string; role?: string },
) => {
  const result = await serviceInstance.deleteComment(commentId, currentUser);
  await invalidateCommentCache(result?.postId);
  return result;
};

export const commentsServices = {
  getCommentsByPost,
  findOne,
  createComment,
  updateComment,
  deleteComment,
};
