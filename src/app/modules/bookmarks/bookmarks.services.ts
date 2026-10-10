import { BookmarksService } from '../../../modules/bookmarks/bookmarks.service';
import { PostsService } from '../../../modules/posts/posts.service';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { IBookmarkQuery } from './bookmarks.interface';

const serviceInstance = new BookmarksService(prisma as any);
const postsServiceInstance = new PostsService(prisma as any);

const saveDua = async (userId: string, duaId: string, timeSlot?: string) => {
  const result = await serviceInstance.saveDua(userId, duaId, timeSlot);
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

const updateTimeSlot = async (
  userId: string,
  id: string,
  type: 'DUA' | 'POST',
  timeSlot: string | null,
) => {
  // 1. Check if a saved item already exists for this user and contentId
  const existing = await (prisma as any).savedItem.findFirst({
    where: {
      userId,
      contentId: id,
    },
  });

  let targetType: 'DUA' | 'POST' = existing ? existing.type : type;

  // 2. If not already saved, identify whether id belongs to a Post or a Dua
  if (!existing) {
    const isPost = await (prisma as any).post.findUnique({
      where: { id },
      select: { id: true },
    });
    if (isPost) {
      targetType = 'POST';
    } else {
      const isDua = await (prisma as any).dua.findUnique({
        where: { id },
        select: { id: true },
      });
      if (isDua) {
        targetType = 'DUA';
      }
    }
  }

  // 3. Upsert so updating timeSlot or saving with a timeSlot is resilient and never fails
  const result = await (prisma as any).savedItem.upsert({
    where: {
      userId_type_contentId: {
        userId,
        type: targetType,
        contentId: id,
      },
    },
    create: {
      userId,
      type: targetType,
      contentId: id,
      timeSlot,
    },
    update: {
      timeSlot,
    },
  });

  try {
    await cacheService.delPattern(`bookmarks:${userId}:*`);
    await cacheService.delPattern(`feed:*`);
  } catch (err: any) {
    console.warn('Bookmarks cache invalidation failed:', err.message);
  }
  return { success: true, timeSlot: result.timeSlot };
};

const getSavedDuas = (userId: string, query: IBookmarkQuery) => {
  const cacheKey = `bookmarks:${userId}:duas:${JSON.stringify(query)}`;
  return cacheService.remember(cacheKey, 60, () =>
    serviceInstance.getSavedDuas(userId, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 10,
      timeSlot: query.timeSlot,
      search: query.search,
    }),
  );
};

const getUnifiedSaved = async (userId: string, query: IBookmarkQuery) => {
  const cacheKey = `bookmarks:${userId}:unified:${JSON.stringify(query)}`;
  return cacheService.remember(cacheKey, 120, async () => {
    const type = query.type || 'ALL';
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const timeSlot = query.timeSlot;
    const search = query.search?.trim();

    const where: any = {
      userId,
      ...(timeSlot && timeSlot !== 'all' ? { timeSlot } : {}),
      ...(type && type !== 'ALL' ? { type } : {}),
    };

    const [total, savedItems] = await Promise.all([
      (prisma as any).savedItem.count({ where }),
      (prisma as any).savedItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
      }),
    ]);

    const postIds = savedItems
      .filter((i: any) => i.type === 'POST')
      .map((i: any) => i.contentId);
    const duaIds = savedItems
      .filter((i: any) => i.type === 'DUA')
      .map((i: any) => i.contentId);

    const [posts, duas, postCountGroups] = await Promise.all([
      postIds.length > 0
        ? (prisma as any).post.findMany({
            where: {
              id: { in: postIds },
              ...(search
                ? { content: { contains: search, mode: 'insensitive' } }
                : {}),
            },
            include: {
              author: {
                select: { id: true, name: true, username: true, avatarUrl: true },
              },
              dua: {
                include: {
                  category: true,
                  references: { include: { source: true } },
                  audios: true,
                },
              },
              originalPost: {
                include: {
                  author: {
                    select: { id: true, name: true, username: true, avatarUrl: true },
                  },
                  dua: {
                    include: {
                      category: true,
                      references: { include: { source: true } },
                      audios: true,
                    },
                  },
                  bloodRequest: {
                    include: {
                      requester: {
                        select: { id: true, name: true, username: true, avatarUrl: true },
                      },
                      donations: true,
                    },
                  },
                },
              },
              bloodRequest: {
                include: {
                  requester: {
                    select: { id: true, name: true, username: true, avatarUrl: true },
                  },
                  donations: true,
                },
              },
              _count: {
                select: {
                  reactions: true,
                  comments: true,
                  shares: true,
                  reposts: true,
                },
              },
              reactions: { where: { userId }, select: { type: true } },
            },
          })
        : [],
      duaIds.length > 0
        ? (prisma as any).dua.findMany({
            where: {
              id: { in: duaIds },
              ...(search
                ? {
                    OR: [
                      {
                        transliteration: { contains: search, mode: 'insensitive' },
                      },
                      { meaning: { contains: search, mode: 'insensitive' } },
                    ],
                  }
                : {}),
            },
            include: {
              category: true,
              references: { include: { source: true } },
              audios: true,
              createdBy: { select: { id: true, name: true, username: true } },
            },
          })
        : [],
      postIds.length > 0
        ? (prisma as any).savedItem.groupBy({
            by: ['contentId'],
            where: {
              type: 'POST',
              contentId: { in: postIds },
            },
            _count: {
              contentId: true,
            },
          })
        : [],
    ]);

    const postMap = new Map((posts as any[]).map((p) => [p.id, p]));
    const duaMap = new Map((duas as any[]).map((d) => [d.id, d]));
    const saveCountMap = new Map<string, number>(
      ((postCountGroups || []) as any[]).map((c) => [c.contentId, c._count.contentId]),
    );

    const resultItems: any[] = [];

    for (const item of savedItems) {
      if (item.type === 'POST') {
        const p = postMap.get(item.contentId);
        if (p) {
          const formatted = postsServiceInstance.formatPostResponse(p, userId, {
            hasSaved: true,
            timeSlot: item.timeSlot,
            saveCount: saveCountMap.get(p.id) || 1,
          });
          formatted.savedId = item.id;
          formatted.savedAt = item.savedAt;
          formatted.savedType = 'POST';
          resultItems.push(formatted);
        }
      } else if (item.type === 'DUA') {
        const d = duaMap.get(item.contentId);
        if (d) {
          resultItems.push({
            id: d.id,
            type: 'DUA',
            savedType: 'DUA',
            content: null,
            createdAt: d.createdAt || item.savedAt,
            author: {
              id: d.createdBy?.id || 'scholar',
              name: d.createdBy?.name || 'PeaceTweet Scholar',
              username: d.createdBy?.username || 'scholar',
              avatar: null,
            },
            dua: {
              id: d.id,
              title: d.title,
              fadilah: d.fadilah,
              transliteration: d.transliteration,
              meaningBangla: d.meaningBangla,
              arabicText: d.arabicText,
              category: d.category,
              references: d.references || [],
              audios: d.audios || [],
              audioUrl: d.audios?.[0]?.audioUrl || null,
            },
            stats: {
              reactionCount: 0,
              commentCount: 0,
              saveCount: 0,
              shareCount: 0,
            },
            viewer: { hasReacted: false, hasSaved: true, timeSlot: item.timeSlot },
            savedId: item.id,
            timeSlot: item.timeSlot,
            savedAt: item.savedAt,
          });
        }
      }
    }

    return {
      data: resultItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  });
};

export const bookmarksServices = {
  saveDua,
  unsaveDua,
  updateTimeSlot,
  getSavedDuas,
  getUnifiedSaved,
};
