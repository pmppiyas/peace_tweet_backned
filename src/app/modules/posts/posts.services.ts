import { PostsService } from '../../../modules/posts/posts.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import {
  ICreateCommentInput,
  ICreatePostInput,
  IQueryFeed,
  IUpdatePostInput,
} from './posts.interface';

import { kafkaProducerService } from '../../config/kafka';
import { KAFKA_TOPIC_POST_CREATED } from '../../../kafka/events/post-created.event';

const serviceInstance = new PostsService(prisma as any);

const invalidatePostCache = async (postId?: string) => {
  try {
    await cacheService.delPattern('feed:*');
    if (postId) {
      await cacheService.delPattern(`posts:id:${postId}*`);
      await cacheService.delPattern(`posts:comments:${postId}*`);
    } else {
      await cacheService.delPattern('posts:*');
    }
    await cacheService.delPattern('search:*');
  } catch (err: any) {
    console.warn('Cache invalidation error in posts:', err.message);
  }
};

const create = async (dto: ICreatePostInput, authorId: string) => {
  const result = await serviceInstance.create(dto as any, authorId);
  await invalidatePostCache(result?.id);

  // Publish to Kafka message broker for asynchronous processing & event streaming
  try {
    await kafkaProducerService.emit(KAFKA_TOPIC_POST_CREATED, result.id, {
      postId: result.id,
      authorId,
      type: result.type,
      createdAt: result.createdAt,
      status: result.status,
    });
  } catch (err: any) {
    console.warn('Kafka event dispatch notice:', err.message);
  }

  return result;
};

const getFeed = async (query: IQueryFeed, user?: any) => {
  const cacheKey = user
    ? `feed:user:${user.id}:${query.type || 'ALL'}:${query.cursor || 'start'}:${query.limit || 20}`
    : `feed:public:${query.type || 'ALL'}:${query.cursor || 'start'}:${query.limit || 20}`;

  return cacheService.remember(cacheKey, 30, () =>
    serviceInstance.getFeed(
      {
        cursor: query.cursor,
        limit: query.limit ? Number(query.limit) : 20,
        type: query.type as any,
      },
      user,
    ),
  );
};

const findOne = async (id: string, user?: any) => {
  if (!user) {
    const cacheKey = `posts:id:${id}:public`;
    return cacheService.remember(cacheKey, 60, () => serviceInstance.findOne(id, user));
  }
  return serviceInstance.findOne(id, user);
};

const update = async (id: string, dto: IUpdatePostInput, user: any) => {
  const result = await serviceInstance.update(id, dto as any, user);
  await invalidatePostCache(id);
  return result;
};

const remove = async (id: string, user: any) => {
  const result = await serviceInstance.remove(id, user);
  await invalidatePostCache(id);
  return result;
};

const savePost = async (postId: string, userId: string) => {
  const result = await serviceInstance.savePost(postId, userId);
  await invalidatePostCache(postId);
  return result;
};

const unsavePost = async (postId: string, userId: string) => {
  const result = await serviceInstance.unsavePost(postId, userId);
  await invalidatePostCache(postId);
  return result;
};

const react = async (postId: string, userId: string) => {
  const result = await serviceInstance.react(postId, userId);
  await invalidatePostCache(postId);
  return result;
};

const unreact = async (postId: string, userId: string) => {
  const result = await serviceInstance.unreact(postId, userId);
  await invalidatePostCache(postId);
  return result;
};

const getComments = async (postId: string, limit = 50) => {
  const cacheKey = `posts:comments:${postId}:${limit}`;
  return cacheService.remember(cacheKey, 60, () => serviceInstance.getComments(postId, limit));
};

const createComment = async (postId: string, userId: string, dto: ICreateCommentInput) => {
  const result = await serviceInstance.createComment(postId, userId, dto as any);
  await invalidatePostCache(postId);
  return result;
};

export const postsServices = {
  create,
  getFeed,
  findOne,
  update,
  remove,
  savePost,
  unsavePost,
  react,
  unreact,
  getComments,
  createComment,
};
