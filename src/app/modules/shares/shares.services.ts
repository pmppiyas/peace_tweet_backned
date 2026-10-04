import { SharesService } from '../../../modules/shares/shares.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { ICreateShareInput } from './shares.interface';
import { kafkaProducerService } from '../../config/kafka';
import { KAFKA_TOPIC_POST_SHARED } from '../../../kafka/events/post-shared.event';
import { KAFKA_TOPIC_POST_CREATED } from '../../../kafka/events/post-created.event';

const sharesServiceInstance = new SharesService(prisma as any);

const createShare = async (userId: string, data: ICreateShareInput) => {
  const result = await sharesServiceInstance.createShare(userId, data as any);
  try {
    await cacheService.delPattern('feed:*');
    await cacheService.delPattern('posts:*');
    await cacheService.delPattern('groups:*');
  } catch (err: any) {
    console.warn('Cache invalidation error in shares:', err.message);
  }

  // Publish to Kafka message broker for asynchronous processing & event streaming
  try {
    const eventKey = result.shareRecord?.id || result.post?.id || userId;
    await kafkaProducerService.emit(KAFKA_TOPIC_POST_SHARED, eventKey, {
      shareId: result.shareRecord?.id,
      userId,
      contentType: data.contentType,
      contentId: data.contentId,
      target: data.target,
      groupId: data.groupId || null,
      sharedPostId: result.post?.id || null,
      createdAt: result.shareRecord?.createdAt || new Date(),
    });

    if (result.post) {
      await kafkaProducerService.emit(KAFKA_TOPIC_POST_CREATED, result.post.id, {
        postId: result.post.id,
        authorId: userId,
        type: result.post.type,
        createdAt: result.post.createdAt,
        status: result.post.status,
      });
    }
  } catch (err: any) {
    console.warn('Kafka share event dispatch notice:', err.message);
  }

  return result;
};

const getShareCount = async (contentType: any, contentId: string) => {
  return await sharesServiceInstance.getShareCount(contentType, contentId);
};

const getShares = async (query: any) => {
  return await sharesServiceInstance.getShares(query);
};

const deleteShare = async (shareId: string, user: any) => {
  const result = await sharesServiceInstance.deleteShare(shareId, user);
  try {
    await cacheService.delPattern('*feed*');
    await cacheService.delPattern('*posts*');
    await cacheService.delPattern('*groups*');
    await cacheService.delPattern('*search*');
  } catch (err: any) {
    console.warn('Cache invalidation error in deleteShare:', err.message);
  }
  return result;
};

export const sharesServices = {
  createShare,
  getShareCount,
  getShares,
  deleteShare,
};
