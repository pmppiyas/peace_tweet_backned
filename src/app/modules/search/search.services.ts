import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import { AddSearchHistoryInput, SearchQueryParams } from './search.interface';
import { PostsService } from '../../../modules/posts/posts.service';

const postsServiceInstance = new PostsService(prisma as any);

/**
 * Bengali letters
 */
const buildQueryVariants = (raw: string): string[] => {
  const nfc = raw.normalize('NFC');
  const decomposed = nfc
    .replace(/\u09DF/g, '\u09AF\u09BC')
    .replace(/\u09DC/g, '\u09A1\u09BC')
    .replace(/\u09DD/g, '\u09A2\u09BC');
  const precomposed = decomposed
    .replace(/\u09AF\u09BC/g, '\u09DF')
    .replace(/\u09A1\u09BC/g, '\u09DC')
    .replace(/\u09A2\u09BC/g, '\u09DD');

  return Array.from(new Set([raw, nfc, decomposed, precomposed])).filter((v) => v.length > 0);
};

const searchGlobal = async (params: SearchQueryParams) => {
  const q = params.q?.trim() || '';
  const scope = params.type || 'ALL';
  const limit = Math.min(params.limit || 8, 30);
  const userId = params.userId;
  const variants = buildQueryVariants(q);

  if (!q) {
    return {
      query: '',
      users: [],
      duas: [],
      groups: [],
      posts: [],
      total: 0,
    };
  }

  const cacheKey = `search:${scope}:${q.normalize('NFC').toLowerCase()}:${limit}:${userId || 'anon'}`;

  return cacheService.remember(cacheKey, 180, async () => {
    const containsAny = (field: string) =>
      variants.map((v) => ({
        [field]: { contains: v, mode: 'insensitive' as const },
      }));

    // Parallel promises for ultra-fast query execution
    const userPromise =
      scope === 'ALL' || scope === 'USERS'
        ? prisma.user.findMany({
            where: {
              OR: [...containsAny('name'), ...containsAny('username')],
            },
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              userStatus: true,
              badges: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: limit,
          })
        : Promise.resolve([]);

    const duaPromise =
      scope === 'ALL' || scope === 'DUAS'
        ? prisma.dua.findMany({
            where: {
              status: 'PUBLISHED',
              OR: [
                ...containsAny('meaning'),
                ...containsAny('transliteration'),
                ...containsAny('fadilah'),
                ...containsAny('arabicText'),
              ],
            },
            select: {
              id: true,
              meaning: true,
              transliteration: true,
              arabicText: true,
              fadilah: true,
              references: {
                include: {
                  source: true,
                },
              },
            },
            take: limit,
          })
        : Promise.resolve([]);

    const groupPromise =
      scope === 'ALL' || scope === 'GROUPS'
        ? prisma.group.findMany({
            where: {
              OR: [...containsAny('name'), ...containsAny('slug')],
            },
            select: {
              id: true,
              name: true,
              slug: true,
              avatarUrl: true,
              visibility: true,
              _count: {
                select: {
                  members: true,
                },
              },
            },
            take: limit,
          })
        : Promise.resolve([]);

    const postInclude: any = {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
      dua: {
        include: {
          references: {
            include: {
              source: true,
            },
          },
          audios: true,
        },
      },
      bloodRequest: {
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
          donations: true,
        },
      },
      originalPost: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
          dua: {
            include: {
              references: {
                include: {
                  source: true,
                },
              },
              audios: true,
            },
          },
          bloodRequest: {
            include: {
              requester: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                },
              },
              donations: true,
            },
          },
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
      ...(userId
        ? {
            reactions: {
              where: { userId },
              select: { id: true },
            },
          }
        : {}),
    };

    const postPromise =
      scope === 'ALL' || scope === 'POSTS'
        ? prisma.post.findMany({
            where: {
              status: 'PUBLISHED',
              OR: [
                ...containsAny('content'),
                ...containsAny('feeling'),
                {
                  dua: {
                    OR: [
                      ...containsAny('meaning'),
                      ...containsAny('transliteration'),
                      ...containsAny('fadilah'),
                      ...containsAny('arabicText'),
                    ],
                  },
                },
                {
                  bloodRequest: {
                    OR: [
                      ...containsAny('patientName'),
                      ...containsAny('hospitalName'),
                      ...containsAny('problem'),
                      ...containsAny('location'),
                    ],
                  },
                },
                {
                  author: {
                    OR: [...containsAny('name'), ...containsAny('username')],
                  },
                },
              ],
            },
            include: postInclude,
            orderBy: {
              createdAt: 'desc',
            },
            take: limit,
          })
        : Promise.resolve([]);

    const [users, duas, groups, rawPosts] = await Promise.all([
      userPromise,
      duaPromise,
      groupPromise,
      postPromise,
    ]);

    let formattedPosts: any[] = (rawPosts as any[]) || [];

    if (formattedPosts.length > 0) {
      const postIds = formattedPosts.map((p) => p.id);
      const savedMap = new Map<string, string | null>();
      const saveCountMap = new Map<string, number>();

      const [savedItems, countGroups] = await Promise.all([
        userId
          ? prisma.savedItem.findMany({
              where: {
                userId,
                type: 'POST',
                contentId: { in: postIds },
              },
              select: { contentId: true, timeSlot: true },
            })
          : Promise.resolve([]),
        prisma.savedItem.groupBy({
          by: ['contentId'],
          where: {
            type: 'POST',
            contentId: { in: postIds },
          },
          _count: {
            contentId: true,
          },
        }),
      ]);

      savedItems.forEach((s: any) => savedMap.set(s.contentId, s.timeSlot));
      countGroups.forEach((c: any) => saveCountMap.set(c.contentId, c._count.contentId));

      formattedPosts = (rawPosts as any[]).map((post: any) =>
        postsServiceInstance.formatPostResponse(post, userId, {
          hasSaved: savedMap.has(post.id),
          timeSlot: savedMap.get(post.id) || null,
          saveCount: saveCountMap.get(post.id) || 0,
        }),
      );
    }

    return {
      query: q,
      scope,
      users,
      duas,
      groups,
      posts: formattedPosts,
      total: users.length + duas.length + groups.length + formattedPosts.length,
    };
  });
};

const invalidateSearchHistory = async (userId: string) => {
  try {
    await cacheService.delPattern(`search:history:${userId}*`);
  } catch (err: any) {
    console.warn('Failed to invalidate search history cache:', err.message);
  }
};

const getSearchHistory = async (userId: string, limit: number = 8) => {
  return cacheService.remember(`search:history:${userId}:${limit}`, 60, async () => {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  });
};

const addSearchHistory = async (userId: string, data: AddSearchHistoryInput) => {
  const query = data.query.trim();

  // If entry with same query or entityId exists, remove older duplicate so latest moves to top
  if (data.entityId) {
    await prisma.searchHistory.deleteMany({
      where: {
        userId,
        entityId: data.entityId,
      },
    });
  } else {
    await prisma.searchHistory.deleteMany({
      where: {
        userId,
        query: { equals: query, mode: 'insensitive' },
      },
    });
  }

  const created = await prisma.searchHistory.create({
    data: {
      userId,
      query,
      entityType: data.entityType || 'KEYWORD',
      entityId: data.entityId || null,
      entityName: data.entityName || null,
      entityAvatar: data.entityAvatar || null,
      entitySubtext: data.entitySubtext || null,
    },
  });

  // Keep history lean (trim beyond 20 records in background)
  prisma.searchHistory
    .findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      select: { id: true },
    })
    .then((oldRecords) => {
      if (oldRecords.length > 0) {
        prisma.searchHistory.deleteMany({
          where: { id: { in: oldRecords.map((r) => r.id) } },
        });
      }
    })
    .catch(() => {});

  await invalidateSearchHistory(userId);

  return created;
};

const deleteSearchHistoryItem = async (userId: string, id: string) => {
  const result = await prisma.searchHistory.deleteMany({
    where: { id, userId },
  });
  await invalidateSearchHistory(userId);
  return result;
};

const clearSearchHistory = async (userId: string) => {
  const result = await prisma.searchHistory.deleteMany({
    where: { userId },
  });
  await invalidateSearchHistory(userId);
  return result;
};

export const searchServices = {
  searchGlobal,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
};
