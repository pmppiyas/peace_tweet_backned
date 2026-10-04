import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { ICreateNotificationInput, INotificationQuery } from './notifications.interface';

const invalidateNotificationCache = async (userId: string) => {
  try {
    await cacheService.delPattern(`notifications:*:${userId}*`);
  } catch (err: any) {
    console.warn('Cache invalidation error in notifications:', err.message);
  }
};

const createNotification = async (payload: ICreateNotificationInput) => {
  // Avoid notifying if actor is recipient (e.g. liking/commenting on own post)
  if (payload.actorId && payload.actorId === payload.recipientId) {
    return null;
  }

  try {
    const created = await prisma.notification.create({
      data: {
        recipientId: payload.recipientId,
        actorId: payload.actorId || null,
        type: payload.type,
        title: payload.title || null,
        message: payload.message,
        entityId: payload.entityId || null,
        entityType: payload.entityType || null,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    await invalidateNotificationCache(payload.recipientId);
    return created;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

const getNotifications = async (userId: string, query: INotificationQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const cacheKey = `notifications:list:${userId}:${page}:${limit}:${query.isRead ?? 'all'}`;

  return cacheService.remember(cacheKey, 60, async () => {
    const where: any = { recipientId: userId };
    if (query.isRead !== undefined && query.isRead !== '') {
      where.isRead = String(query.isRead) === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
      data: notifications,
    };
  });
};

const getUnreadCount = async (userId: string) => {
  const cacheKey = `notifications:unread:${userId}`;
  return cacheService.remember(cacheKey, 60, async () => {
    const count = await prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
    return { unreadCount: count };
  });
};

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, recipientId: userId },
  });

  if (!notification) {
    return { success: false, message: 'Notification not found' };
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
    },
  });

  await invalidateNotificationCache(userId);
  return { success: true, data: updated };
};

const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: {
      isRead: true,
    },
  });

  await invalidateNotificationCache(userId);
  return { success: true, message: 'All notifications marked as read' };
};

const remove = async (id: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, recipientId: userId },
  });

  if (!notification) {
    return { success: false, message: 'Notification not found' };
  }

  await prisma.notification.delete({
    where: { id },
  });

  await invalidateNotificationCache(userId);
  return { success: true, message: 'Notification deleted successfully' };
};

export const notificationsServices = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  remove,
};
