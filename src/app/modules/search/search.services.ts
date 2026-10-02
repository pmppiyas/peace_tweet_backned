import { prisma } from '../../config/prisma';
import { AddSearchHistoryInput, SearchQueryParams } from './search.interface';

const searchGlobal = async (params: SearchQueryParams) => {
  const q = params.q?.trim() || '';
  const scope = params.type || 'ALL';
  const limit = Math.min(params.limit || 8, 30);

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

  // Parallel promises for ultra-fast query execution
  const userPromise =
    scope === 'ALL' || scope === 'USERS'
      ? prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            userStatus: true,
            badge: true,
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
              { title: { contains: q, mode: 'insensitive' } },
              { meaningBangla: { contains: q, mode: 'insensitive' } },
              { duaBangla: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            title: true,
            meaningBangla: true,
            duaBangla: true,
            arabicText: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
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
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
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

  const postPromise =
    scope === 'ALL' || scope === 'POSTS'
      ? prisma.post.findMany({
          where: {
            status: 'PUBLISHED',
            content: { contains: q, mode: 'insensitive' },
          },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          take: limit,
        })
      : Promise.resolve([]);

  const [users, duas, groups, posts] = await Promise.all([
    userPromise,
    duaPromise,
    groupPromise,
    postPromise,
  ]);

  return {
    query: q,
    scope,
    users,
    duas,
    groups,
    posts,
    total: users.length + duas.length + groups.length + posts.length,
  };
};

const getSearchHistory = async (userId: string, limit: number = 8) => {
  return prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
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

  return created;
};

const deleteSearchHistoryItem = async (userId: string, id: string) => {
  return prisma.searchHistory.deleteMany({
    where: { id, userId },
  });
};

const clearSearchHistory = async (userId: string) => {
  return prisma.searchHistory.deleteMany({
    where: { userId },
  });
};

export const searchServices = {
  searchGlobal,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory,
};
