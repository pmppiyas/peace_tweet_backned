import { randomUUID } from 'crypto';
import httpStatus from 'http-status-codes';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import AppError from '../../utils/appError';
import { getSafeIO } from '../../../socket';
import {
  DEFAULT_POINT_TASKS,
  getDhakaDateKey,
  getYesterdayDhakaDateKey,
  POINT_LEVELS,
  resolveLevelInfo,
} from './points.constants';
import { REDEEM_BY_CODE, REDEEM_CATALOG } from './redeem.constants';

const TASK_BY_CODE = new Map(DEFAULT_POINT_TASKS.map((t) => [t.code, t]));

const enrichTransaction = <
  T extends {
    entryType?: string;
    taskCode?: string | null;
    rewardCode?: string | null;
    titleBn?: string | null;
    titleEn?: string | null;
  },
>(
  tx: T,
) => {
  const staticDef =
    tx.entryType === 'REDEEM' && tx.rewardCode
      ? REDEEM_BY_CODE.get(tx.rewardCode)
      : tx.taskCode
        ? TASK_BY_CODE.get(tx.taskCode)
        : undefined;
  return {
    ...tx,
    titleBn: staticDef?.titleBn ?? tx.titleBn ?? tx.rewardCode ?? tx.taskCode ?? '',
    titleEn: staticDef?.titleEn ?? tx.titleEn ?? tx.rewardCode ?? tx.taskCode ?? '',
  };
};

let tasksSeeded = false;
let seedingPromise: Promise<void> | null = null;

/** Ensure all default PointTaskDefinition rows exist in PostgreSQL. */
export const ensureTaskDefinitionsSeeded = async () => {
  if (tasksSeeded) return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      await Promise.all(
        DEFAULT_POINT_TASKS.map((task) =>
          prisma.pointTaskDefinition.upsert({
            where: { code: task.code },
            update: {
              category: task.category,
              titleBn: task.titleBn,
              titleEn: task.titleEn,
              descriptionBn: task.descriptionBn,
              descriptionEn: task.descriptionEn,
              points: task.points,
              frequency: task.frequency,
              dailyLimit: task.dailyLimit ?? null,
              maxLimit: task.maxLimit ?? null,
              targetCount: task.targetCount ?? 1,
              actionRoute: task.actionRoute ?? null,
              icon: task.icon,
              sortOrder: task.sortOrder,
              isActive: true,
            },
            create: {
              code: task.code,
              category: task.category,
              titleBn: task.titleBn,
              titleEn: task.titleEn,
              descriptionBn: task.descriptionBn,
              descriptionEn: task.descriptionEn,
              points: task.points,
              frequency: task.frequency,
              dailyLimit: task.dailyLimit ?? null,
              maxLimit: task.maxLimit ?? null,
              targetCount: task.targetCount ?? 1,
              actionRoute: task.actionRoute ?? null,
              icon: task.icon,
              sortOrder: task.sortOrder,
              isActive: true,
            },
          }),
        ),
      );
      await prisma.pointTaskDefinition.updateMany({
        where: { code: { in: ['BLOOD_DONATION_COMPLETE', 'COMPLETE_PROFILE_100'] } },
        data: { isActive: false },
      });
      tasksSeeded = true;
    } catch (err: any) {
      console.warn('Failed seeding point task definitions:', err?.message);
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
};

const invalidateUserPointsCache = async (userId: string) => {
  try {
    await cacheService.delPattern(`user:id:${userId}*`);
    await cacheService.delPattern(`user:me:${userId}*`);
    await cacheService.delPattern(`points:*:${userId}*`);
    await cacheService.delPattern('points:leaderboard*');
    await cacheService.delPattern('user:username:*');
  } catch {}
};

const emitPointsEarned = (
  userId: string,
  payload: {
    taskCode: string;
    pointsDelta: number;
    totalPoints: number;
    lifetimePoints: number;
    titleBn: string;
    titleEn: string;
  },
) => {
  try {
    const io = getSafeIO();
    if (io) {
      io.to(`user:${userId}`).emit('points:earned', payload);
    }
  } catch {}
};

/** Sync and return the user's username as their invite/referral identifier. */
const ensureUserReferralCode = async (userId: string, usernameHint?: string): Promise<string> => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, username: true },
  });
  const targetUsername = (existing?.username || usernameHint || '').trim();
  if (!targetUsername) return '';

  if (existing?.referralCode !== targetUsername) {
    try {
      await prisma.user.updateMany({
        where: { referralCode: targetUsername, NOT: { id: userId } },
        data: { referralCode: null },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: targetUsername },
      });
    } catch {}
  }

  return targetUsername;
};

/** Grant the user's current level badge and replace older level badges cleanly. */
const LEVEL_BADGE_NAMES = new Set(POINT_LEVELS.map((l) => l.badgeName));

const syncPointLevelBadges = async (userId: string, lifetimePoints: number) => {
  try {
    const levelInfo = resolveLevelInfo(lifetimePoints);
    const targetBadgeName = levelInfo.current.badgeName;

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: { select: { name: true } } },
    });
    if (!current) return;

    const hasTarget = current.badges.some((b) => b.name === targetBadgeName);
    const staleLevelBadges = current.badges
      .filter((b) => LEVEL_BADGE_NAMES.has(b.name) && b.name !== targetBadgeName)
      .map((b) => ({ name: b.name }));

    if (hasTarget && staleLevelBadges.length === 0) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        badges: {
          ...(!hasTarget
            ? {
                connectOrCreate: {
                  where: { name: targetBadgeName },
                  create: { name: targetBadgeName },
                },
              }
            : {}),
          ...(staleLevelBadges.length > 0 ? { disconnect: staleLevelBadges } : {}),
        },
      },
    });

    await Promise.all([
      cacheService.delPattern(`user:*:${userId}*`).catch(() => {}),
      cacheService.delPattern(`user:me:${userId}`).catch(() => {}),
      cacheService.delPattern('user:username:*').catch(() => {}),
    ]);
  } catch {}
};

export interface AwardTaskResult {
  awarded: boolean;
  pointsDelta: number;
  totalPoints?: number;
  lifetimePoints?: number;
  taskCode: string;
}

/**
 * Core atomic & idempotent reward engine.
 * Safe to invoke from any backend hook without risking duplicate grants.
 */
export const awardTaskPoints = async (params: {
  userId: string;
  taskCode: string;
  sourceKey: string;
  metadata?: Record<string, any>;
}): Promise<AwardTaskResult> => {
  const { userId, taskCode, sourceKey, metadata } = params;
  if (!userId || !taskCode || !sourceKey) {
    return { awarded: false, pointsDelta: 0, taskCode };
  }

  await ensureTaskDefinitionsSeeded();

  const todayKey = getDhakaDateKey();

  const txResult = await prisma.$transaction(async (tx) => {
    const task = await tx.pointTaskDefinition.findUnique({
      where: { code: taskCode },
    });
    if (!task || !task.isActive || task.points <= 0) {
      return { awarded: false, pointsDelta: 0, taskCode };
    }

    // 1. Idempotency check by unique sourceKey
    const existingTx = await tx.pointTransaction.findUnique({
      where: { sourceKey },
      select: { id: true },
    });
    if (existingTx) {
      return { awarded: false, pointsDelta: 0, taskCode };
    }

    // 2. Frequency & cap check on UserTaskProgress
    const progress = await tx.userTaskProgress.findUnique({
      where: { userId_taskCode: { userId, taskCode } },
    });

    const effectiveTodayCount =
      progress && progress.lastResetDate === todayKey ? progress.todayCount : 0;
    const prevCompletedCount = progress?.completedCount ?? 0;

    if (task.frequency === 'ONE_TIME' && progress?.isCompleted) {
      return { awarded: false, pointsDelta: 0, taskCode };
    }
    if (
      task.frequency === 'DAILY' &&
      task.dailyLimit &&
      effectiveTodayCount >= task.dailyLimit
    ) {
      return { awarded: false, pointsDelta: 0, taskCode };
    }
    if (
      (task.frequency === 'CAPPED' || task.frequency === 'MILESTONE') &&
      task.maxLimit &&
      prevCompletedCount >= task.maxLimit
    ) {
      return { awarded: false, pointsDelta: 0, taskCode };
    }

    const nextCompletedCount = prevCompletedCount + 1;
    const nextTodayCount = effectiveTodayCount + 1;
    const nextIsCompleted =
      task.frequency === 'ONE_TIME'
        ? true
        : task.frequency === 'DAILY' && task.dailyLimit
          ? nextTodayCount >= task.dailyLimit
          : task.maxLimit
            ? nextCompletedCount >= task.maxLimit
            : false;

    // 3. Record lean ledger transaction (static titles resolved in-memory)
    await tx.pointTransaction.create({
      data: {
        userId,
        entryType: 'EARN',
        taskCode,
        pointsDelta: task.points,
        sourceKey,
        metadata: metadata ? metadata : undefined,
      },
    });

    // 4. Update progress
    await tx.userTaskProgress.upsert({
      where: { userId_taskCode: { userId, taskCode } },
      update: {
        completedCount: nextCompletedCount,
        todayCount: nextTodayCount,
        lastResetDate: todayKey,
        lastCompletedAt: new Date(),
        isCompleted: nextIsCompleted,
      },
      create: {
        userId,
        taskCode,
        completedCount: 1,
        todayCount: 1,
        lastResetDate: todayKey,
        lastCompletedAt: new Date(),
        isCompleted: nextIsCompleted,
      },
    });

    // 5. Increment user points atomically
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        points: { increment: task.points },
        lifetimePoints: { increment: task.points },
      },
      select: {
        points: true,
        lifetimePoints: true,
      },
    });

    return {
      awarded: true,
      pointsDelta: task.points,
      totalPoints: updatedUser.points,
      lifetimePoints: updatedUser.lifetimePoints,
      taskCode,
      titleBn: task.titleBn,
      titleEn: task.titleEn,
    };
  }, { maxWait: 10000, timeout: 20000 });

  if (txResult.awarded) {
    await invalidateUserPointsCache(userId);
    if (typeof txResult.lifetimePoints === 'number') {
      await syncPointLevelBadges(userId, txResult.lifetimePoints);
    }
    emitPointsEarned(userId, {
      taskCode,
      pointsDelta: txResult.pointsDelta,
      totalPoints: txResult.totalPoints ?? 0,
      lifetimePoints: txResult.lifetimePoints ?? 0,
      titleBn: (txResult as any).titleBn || '',
      titleEn: (txResult as any).titleEn || '',
    });
  }

  return txResult;
};

/** Evaluate user's profile fields, award any newly completed one-time profile tasks, and qualify pending referrals. */
export const syncProfileCompletionTasks = async (userId: string) => {
  await ensureTaskDefinitionsSeeded();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      emailVerified: true,
      userStatus: true,
      avatarUrl: true,
      coverUrl: true,
      bio: true,
      location: true,
      city: true,
      state: true,
      country: true,
      bloodGroup: true,
      referredById: true,
    },
  });
  if (!user) return;

  const hasEmailVerified = Boolean(user.emailVerified);
  const hasAvatar = Boolean(user.avatarUrl?.trim());
  const hasCover = Boolean(user.coverUrl?.trim());
  const hasBio = Boolean(user.bio?.trim());
  const hasLocation = Boolean(
    user.location?.trim() || user.city?.trim() || user.state?.trim() || user.country?.trim(),
  );
  const hasBloodGroup = Boolean(user.bloodGroup);

  const checks: { ok: boolean; code: string }[] = [
    { ok: hasAvatar, code: 'UPLOAD_AVATAR' },
    { ok: hasCover, code: 'UPLOAD_COVER' },
    { ok: hasBio, code: 'ADD_BIO' },
    { ok: hasLocation, code: 'SET_LOCATION' },
    { ok: hasBloodGroup, code: 'SET_BLOOD_GROUP' },
    { ok: hasEmailVerified, code: 'VERIFY_EMAIL' },
  ];

  for (const item of checks) {
    if (item.ok) {
      await awardTaskPoints({
        userId,
        taskCode: item.code,
        sourceKey: `${item.code}:${userId}`,
      });
    }
  }

  // Green verified icon requires mandatory email verification even if previously verified
  if (!hasEmailVerified && user.userStatus === 'VERIFIED') {
    await prisma.user.update({
      where: { id: userId },
      data: { userStatus: 'NON_VERIFIED' },
    });
    await invalidateUserPointsCache(userId);
    await cacheService.delPattern('feed:*').catch(() => {});
    await cacheService.delPattern('posts:*').catch(() => {});
  }

  // Qualify referral bonus if user came from a referral and uploaded avatar or completed a core field
  if (user.referredById && (hasAvatar || hasBio)) {
    await qualifyReferralIfPending(userId);
  }
};

/** Mark referral as QUALIFIED and reward inviter once invitee becomes active. */
export const qualifyReferralIfPending = async (inviteeId: string) => {
  try {
    const referral = await prisma.referral.findUnique({
      where: { inviteeId },
    });
    if (!referral || referral.qualifiedBonusAwarded) return;

    const updated = await prisma.referral.updateMany({
      where: { id: referral.id, qualifiedBonusAwarded: false },
      data: {
        status: 'QUALIFIED',
        qualifiedBonusAwarded: true,
        qualifiedAt: new Date(),
      },
    });
    if (updated.count === 0) return;

    await awardTaskPoints({
      userId: referral.inviterId,
      taskCode: 'INVITE_FRIEND_QUALIFIED',
      sourceKey: `INVITE_QUALIFIED:${referral.inviterId}:${inviteeId}`,
      metadata: { inviteeId },
    });
  } catch (err: any) {
    console.warn('Failed qualifying referral:', err?.message);
  }
};

/** Apply invite reward on registration (matches inviter username or legacy referralCode). */
export const processRegistrationReferral = async (
  inviteeId: string,
  referralInput?: string | null,
) => {
  const cleanCode = referralInput?.trim().replace(/^@+/, '');
  if (!cleanCode) return;

  try {
    await ensureTaskDefinitionsSeeded();

    const inviter = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanCode, mode: 'insensitive' } },
          { referralCode: { equals: cleanCode, mode: 'insensitive' } },
        ],
      },
      select: { id: true, referralCode: true, username: true },
    });

    if (!inviter || inviter.id === inviteeId) return;

    const existing = await prisma.referral.findUnique({
      where: { inviteeId },
      select: { id: true },
    });
    if (existing) return;

    const inviterCode = await ensureUserReferralCode(inviter.id, inviter.username);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: inviteeId },
        data: { referredById: inviter.id },
      });
      await tx.referral.create({
        data: {
          inviterId: inviter.id,
          inviteeId,
          referralCode: inviterCode,
          status: 'REGISTERED',
          registerPointsAwarded: true,
        },
      });
    }, { maxWait: 10000, timeout: 20000 });

    await awardTaskPoints({
      userId: inviter.id,
      taskCode: 'INVITE_FRIEND_JOIN',
      sourceKey: `INVITE_JOIN:${inviter.id}:${inviteeId}`,
      metadata: { inviteeId },
    });

    await awardTaskPoints({
      userId: inviteeId,
      taskCode: 'WELCOME_REFERRAL_BONUS',
      sourceKey: `WELCOME_REFERRAL:${inviteeId}`,
      metadata: { inviterId: inviter.id },
    });
  } catch (err: any) {
    console.warn('Referral processing notice:', err?.message);
  }
};

/** Sync friend milestone bonuses whenever a new friendship is accepted. */
export const syncFriendMilestones = async (userId: string) => {
  try {
    const acceptedCount = await prisma.friendship.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });
    if (acceptedCount >= 5) {
      await awardTaskPoints({
        userId,
        taskCode: 'MILESTONE_5_FRIENDS',
        sourceKey: `MILESTONE_5_FRIENDS:${userId}`,
      });
    }
    if (acceptedCount >= 25) {
      await awardTaskPoints({
        userId,
        taskCode: 'MILESTONE_25_FRIENDS',
        sourceKey: `MILESTONE_25_FRIENDS:${userId}`,
      });
    }
  } catch {}
};

/** Daily check-in + 7-day streak reward. */
export const dailyCheckIn = async (userId: string) => {
  await ensureTaskDefinitionsSeeded();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, currentStreak: true, lastCheckInAt: true, points: true, lifetimePoints: true },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const todayKey = getDhakaDateKey();
  const yesterdayKey = getYesterdayDhakaDateKey();
  const lastKey = user.lastCheckInAt ? getDhakaDateKey(user.lastCheckInAt) : null;

  if (lastKey === todayKey) {
    return {
      alreadyCheckedIn: true,
      pointsAwarded: 0,
      streakBonusAwarded: 0,
      currentStreak: user.currentStreak,
      points: user.points,
      lifetimePoints: user.lifetimePoints,
    };
  }

  const nextStreak = lastKey === yesterdayKey ? user.currentStreak + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: nextStreak,
      lastCheckInAt: new Date(),
    },
  });

  const checkInRes = await awardTaskPoints({
    userId,
    taskCode: 'DAILY_CHECKIN',
    sourceKey: `DAILY_CHECKIN:${userId}:${todayKey}`,
    metadata: { streak: nextStreak },
  });

  let streakBonusAwarded = 0;
  if (nextStreak > 0 && nextStreak % 7 === 0) {
    const weekBucket = Math.floor(nextStreak / 7);
    const streakRes = await awardTaskPoints({
      userId,
      taskCode: 'WEEKLY_STREAK_7',
      sourceKey: `WEEKLY_STREAK_7:${userId}:${todayKey}:${weekBucket}`,
      metadata: { streak: nextStreak },
    });
    if (streakRes.awarded) {
      streakBonusAwarded = streakRes.pointsDelta;
    }
  }

  const freshUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, lifetimePoints: true, currentStreak: true },
  });

  return {
    alreadyCheckedIn: false,
    pointsAwarded: checkInRes.pointsDelta,
    streakBonusAwarded,
    currentStreak: freshUser?.currentStreak ?? nextStreak,
    points: freshUser?.points ?? user.points,
    lifetimePoints: freshUser?.lifetimePoints ?? user.lifetimePoints,
  };
};

/** Build full Points & Tasks dashboard payload for mobile & web. */
export const getUserPointsDashboard = async (userId: string) => {
  await ensureTaskDefinitionsSeeded();
  const referralCode = await ensureUserReferralCode(userId);
  await syncProfileCompletionTasks(userId);

  const todayKey = getDhakaDateKey();

  const [user, definitions, progressRows, transactions, referrals, friendsCount] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          emailVerified: true,
          emailVerifiedAt: true,
          userStatus: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          location: true,
          city: true,
          state: true,
          country: true,
          bloodGroup: true,
          points: true,
          lifetimePoints: true,
          currentStreak: true,
          lastCheckInAt: true,
          referralCode: true,
        },
      }),
      prisma.pointTaskDefinition.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }],
      }),
      prisma.userTaskProgress.findMany({
        where: { userId },
      }),
      prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.referral.findMany({
        where: { inviterId: userId },
        include: {
          invitee: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),
    ]);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const progressMap = new Map(progressRows.map((p) => [p.taskCode, p]));

  const tasks = definitions.map((def) => {
    const staticTask = TASK_BY_CODE.get(def.code);
    const p = progressMap.get(def.code);
    const todayCount = p && p.lastResetDate === todayKey ? p.todayCount : 0;
    const completedCount = p?.completedCount ?? 0;

    let currentCount = completedCount;
    let isCompleted = Boolean(p?.isCompleted);

    if (def.frequency === 'DAILY') {
      currentCount = todayCount;
      isCompleted = def.dailyLimit ? todayCount >= def.dailyLimit : todayCount > 0;
    } else if (def.code === 'MILESTONE_5_FRIENDS' || def.code === 'MILESTONE_25_FRIENDS') {
      currentCount = Math.min(def.targetCount, friendsCount);
      isCompleted = Boolean(p?.isCompleted);
    }

    return {
      code: def.code,
      category: def.category,
      titleBn: staticTask?.titleBn ?? def.titleBn,
      titleEn: staticTask?.titleEn ?? def.titleEn,
      descriptionBn: staticTask?.descriptionBn ?? def.descriptionBn,
      descriptionEn: staticTask?.descriptionEn ?? def.descriptionEn,
      points: staticTask?.points ?? def.points,
      frequency: def.frequency,
      dailyLimit: def.dailyLimit,
      maxLimit: def.maxLimit,
      targetCount: def.targetCount,
      actionRoute: staticTask?.actionRoute ?? def.actionRoute,
      icon: staticTask?.icon ?? def.icon,
      completedCount,
      todayCount,
      currentCount,
      isCompleted,
      lastCompletedAt: p?.lastCompletedAt ?? null,
    };
  });

  const profileChecks = [
    { key: 'avatar', done: Boolean(user.avatarUrl?.trim()), labelBn: 'প্রোফাইল ছবি', labelEn: 'Profile Photo' },
    { key: 'cover', done: Boolean(user.coverUrl?.trim()), labelBn: 'কভার ফটো', labelEn: 'Cover Photo' },
    { key: 'bio', done: Boolean(user.bio?.trim()), labelBn: 'বায়ো', labelEn: 'Bio' },
    {
      key: 'location',
      done: Boolean(
        user.location?.trim() || user.city?.trim() || user.state?.trim() || user.country?.trim(),
      ),
      labelBn: 'ঠিকানা',
      labelEn: 'Location',
    },
    {
      key: 'bloodGroup',
      done: Boolean(user.bloodGroup),
      labelBn: 'রক্তের গ্রুপ',
      labelEn: 'Blood Group',
    },
    {
      key: 'emailVerified',
      done: Boolean(user.emailVerified),
      labelBn: 'জিমেইল ভেরিফাই (+30)',
      labelEn: 'Verify Gmail (+30)',
    },
  ];
  const completedSteps = profileChecks.filter((c) => c.done).length;
  const totalSteps = profileChecks.length;

  const lastCheckInKey = user.lastCheckInAt ? getDhakaDateKey(user.lastCheckInAt) : null;
  const checkedInToday = lastCheckInKey === todayKey;

  const qualifiedCount = referrals.filter((r) => r.status === 'QUALIFIED').length;

  return {
    points: user.points,
    lifetimePoints: user.lifetimePoints,
    currentStreak: user.currentStreak,
    checkedInToday,
    emailVerified: Boolean(user.emailVerified),
    userStatus: user.userStatus,
    level: resolveLevelInfo(user.lifetimePoints),
    levels: POINT_LEVELS,
    referral: {
      code: referralCode,
      totalInvited: referrals.length,
      qualifiedCount,
      recentInvitees: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        user: r.invitee,
      })),
    },
    profileCompletion: {
      percentage: Math.round((completedSteps / totalSteps) * 100),
      completedSteps,
      totalSteps,
      steps: profileChecks,
    },
    tasks,
    recentTransactions: transactions.map(enrichTransaction),
  };
};

export const getPointsHistory = async (userId: string, page = 1, limit = 25) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.pointTransaction.count({ where: { userId } }),
  ]);

  return {
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
    items: items.map(enrichTransaction),
  };
};

export interface RedeemDeliveryInput {
  recipientName?: string;
  phone?: string;
  address?: string;
  note?: string;
}

interface RewardEffectHandler {
  isAlreadyOwned?: (user: {
    userStatus: string;
    activeAvatarFrame?: string | null;
    activeProfileTheme?: string | null;
  }) => boolean;
  isEquipped?: (user: {
    activeAvatarFrame?: string | null;
    activeProfileTheme?: string | null;
  }) => boolean;
  equipField?: 'activeAvatarFrame' | 'activeProfileTheme';
  applyEffect?: (
    tx: Prisma.TransactionClient,
    user: { id: string; badges: { name: string }[] },
  ) => Promise<void>;
}

const FRESH_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  emailVerified: true,
  emailVerifiedAt: true,
  role: true,
  userStatus: true,
  activeAvatarFrame: true,
  activeProfileTheme: true,
  avatarUrl: true,
  coverUrl: true,
  bio: true,
  country: true,
  countryCode: true,
  state: true,
  city: true,
  location: true,
  bloodGroup: true,
  isDonor: true,
  donationCount: true,
  points: true,
  lifetimePoints: true,
  referralCode: true,
  currentStreak: true,
  badges: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const invalidateAllUserPresentationCaches = async (userId: string) => {
  await Promise.all([
    invalidateUserPointsCache(userId),
    cacheService.delPattern(`user:*:${userId}*`).catch(() => {}),
    cacheService.delPattern(`user:me:${userId}`).catch(() => {}),
    cacheService.delPattern('user:username:*').catch(() => {}),
    cacheService.delPattern('feed:*').catch(() => {}),
    cacheService.delPattern('posts:*').catch(() => {}),
  ]);
};

const REDEEM_HANDLERS: Record<string, RewardEffectHandler> = {
  GREEN_VERIFIED_BADGE: {
    isAlreadyOwned: (user) =>
      user.userStatus === 'VERIFIED' || user.userStatus === 'PREMIUM',
    applyEffect: async (tx, user) => {
      const hasNonVerifiedBadge = user.badges.some(
        (b) => b.name === 'NON VERIFIED',
      );
      await tx.user.update({
        where: { id: user.id },
        data: {
          userStatus: 'VERIFIED',
          badges: {
            connectOrCreate: {
              where: { name: 'VERIFIED' },
              create: { name: 'VERIFIED' },
            },
            ...(hasNonVerifiedBadge
              ? { disconnect: [{ name: 'NON VERIFIED' }] }
              : {}),
          },
        },
      });
    },
  },
  EMERALD_AVATAR_FRAME: {
    equipField: 'activeAvatarFrame',
    isAlreadyOwned: (user) => user.activeAvatarFrame === 'EMERALD_AVATAR_FRAME',
    isEquipped: (user) => user.activeAvatarFrame === 'EMERALD_AVATAR_FRAME',
    applyEffect: async (tx, user) => {
      await tx.user.update({
        where: { id: user.id },
        data: { activeAvatarFrame: 'EMERALD_AVATAR_FRAME' },
      });
    },
  },
  NOOR_PROFILE_THEME: {
    equipField: 'activeProfileTheme',
    isAlreadyOwned: (user) => user.activeProfileTheme === 'NOOR_PROFILE_THEME',
    isEquipped: (user) => user.activeProfileTheme === 'NOOR_PROFILE_THEME',
    applyEffect: async (tx, user) => {
      await tx.user.update({
        where: { id: user.id },
        data: { activeProfileTheme: 'NOOR_PROFILE_THEME' },
      });
    },
  },
};

export const getRedeemStore = async (userId: string) => {
  const [user, redemptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        userStatus: true,
        activeAvatarFrame: true,
        activeProfileTheme: true,
        points: true,
        lifetimePoints: true,
      },
    }),
    prisma.userRedemption.findMany({
      where: { userId },
      orderBy: { redeemedAt: 'desc' },
    }),
  ]);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const redemptionsByCode = new Map<string, typeof redemptions>();
  for (const r of redemptions) {
    const list = redemptionsByCode.get(r.rewardCode) || [];
    list.push(r);
    redemptionsByCode.set(r.rewardCode, list);
  }

  const items = REDEEM_CATALOG.filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const records = redemptionsByCode.get(item.code) || [];
      const activeRecord = records.find(
        (r) =>
          r.status === 'ACTIVE' ||
          r.status === 'PENDING' ||
          r.status === 'FULFILLED',
      );
      const handler = REDEEM_HANDLERS[item.code];
      const ownedByHandler = handler?.isAlreadyOwned?.(user) ?? false;
      const isRedeemed = !item.isRepeatable
        ? Boolean(activeRecord) || ownedByHandler
        : false;
      const isEquipped = handler?.isEquipped?.(user) ?? false;
      const missingEmailVerification =
        item.requiresEmailVerified && !user.emailVerified;
      const pointsNeeded = Math.max(0, item.costPoints - user.points);
      const canRedeem =
        !item.comingSoon &&
        !isRedeemed &&
        !missingEmailVerification &&
        pointsNeeded === 0;

      return {
        ...item,
        isRedeemed,
        isEquipped,
        redeemCount: records.filter((r) => r.status !== 'REVOKED').length,
        redeemedAt: activeRecord?.redeemedAt ?? records[0]?.redeemedAt ?? null,
        missingEmailVerification,
        pointsNeeded,
        canRedeem,
      };
    });

  return {
    points: user.points,
    lifetimePoints: user.lifetimePoints,
    emailVerified: Boolean(user.emailVerified),
    userStatus: user.userStatus,
    activeAvatarFrame: user.activeAvatarFrame,
    activeProfileTheme: user.activeProfileTheme,
    items,
    redemptions: redemptions.map((r) => {
      const def = REDEEM_BY_CODE.get(r.rewardCode);
      return {
        ...r,
        category: def?.category ?? 'BADGE',
        fulfillmentType: def?.fulfillmentType ?? 'INSTANT_BADGE',
        titleBn: def?.titleBn ?? r.rewardCode,
        titleEn: def?.titleEn ?? r.rewardCode,
      };
    }),
  };
};

export const redeemReward = async (
  userId: string,
  rawRewardCode: string,
  deliveryInput?: RedeemDeliveryInput,
) => {
  const rewardCode = (rawRewardCode || '').trim().toUpperCase();
  const reward = REDEEM_BY_CODE.get(rewardCode);
  if (!reward || !reward.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Reward item not found.');
  }
  if (reward.comingSoon) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This reward is coming soon and cannot be redeemed yet.',
    );
  }

  let sanitizedDelivery: Record<string, string> | undefined;
  if (reward.requiresDeliveryInfo) {
    const recipientName = deliveryInput?.recipientName?.trim() || '';
    const phone = deliveryInput?.phone?.trim() || '';
    const address = deliveryInput?.address?.trim() || '';
    const note = deliveryInput?.note?.trim() || '';
    if (!recipientName || !phone || !address) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Recipient name, phone number, and delivery address are required for external gifts.',
      );
    }
    sanitizedDelivery = {
      recipientName,
      phone,
      address,
      ...(note ? { note } : {}),
    };
  }

  const handler = REDEEM_HANDLERS[reward.code];
  const redemptionId = randomUUID();
  const expiresAt =
    reward.durationDays && reward.durationDays > 0
      ? new Date(Date.now() + reward.durationDays * 86_400_000)
      : null;
  const initialStatus =
    reward.fulfillmentType === 'EXTERNAL_DELIVERY' ? 'PENDING' : 'ACTIVE';

  const redemption = await prisma.$transaction(
    async (tx) => {
      const [user, existing] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            emailVerified: true,
            userStatus: true,
            activeAvatarFrame: true,
            activeProfileTheme: true,
            points: true,
            badges: { select: { name: true } },
          },
        }),
        !reward.isRepeatable
          ? tx.userRedemption.findFirst({
              where: {
                userId,
                rewardCode: reward.code,
                status: { in: ['ACTIVE', 'PENDING', 'FULFILLED'] },
              },
            })
          : Promise.resolve(null),
      ]);

      if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
      }

      if (reward.requiresEmailVerified && !user.emailVerified) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Gmail verification is mandatory before redeeming this reward.',
        );
      }

      if (!reward.isRepeatable && (existing || handler?.isAlreadyOwned?.(user))) {
        throw new AppError(
          httpStatus.CONFLICT,
          'You have already redeemed this reward.',
        );
      }

      const deducted = await tx.user.updateMany({
        where: {
          id: userId,
          points: { gte: reward.costPoints },
          ...(reward.requiresEmailVerified ? { emailVerified: true } : {}),
        },
        data: {
          points: { decrement: reward.costPoints },
        },
      });

      if (deducted.count === 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient points. You need ${reward.costPoints} pts.`,
        );
      }

      const [, createdRedemption] = await Promise.all([
        handler?.applyEffect ? handler.applyEffect(tx, user) : Promise.resolve(),
        tx.userRedemption.create({
          data: {
            id: redemptionId,
            userId,
            rewardCode: reward.code,
            pointsSpent: reward.costPoints,
            status: initialStatus,
            ...(sanitizedDelivery ? { deliveryInfo: sanitizedDelivery } : {}),
            ...(expiresAt ? { expiresAt } : {}),
          },
        }),
        tx.pointTransaction.create({
          data: {
            userId,
            entryType: 'REDEEM',
            rewardCode: reward.code,
            pointsDelta: -reward.costPoints,
            sourceKey: `REDEEM:${reward.code}:${userId}:${redemptionId}`,
          },
        }),
      ]);

      return createdRedemption;
    },
    { maxWait: 10000, timeout: 20000 },
  );

  const [freshUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: FRESH_USER_SELECT,
    }),
    invalidateAllUserPresentationCaches(userId),
  ]);

  return {
    redeemed: true,
    rewardCode: reward.code,
    pointsSpent: reward.costPoints,
    titleBn: reward.titleBn,
    titleEn: reward.titleEn,
    redemption,
    user: freshUser,
  };
};

export const toggleEquipCosmetic = async (
  userId: string,
  rawRewardCode: string,
  equip = true,
) => {
  const rewardCode = (rawRewardCode || '').trim().toUpperCase();
  const reward = REDEEM_BY_CODE.get(rewardCode);
  const handler = REDEEM_HANDLERS[rewardCode];
  if (!reward || !handler?.equipField) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This item cannot be equipped.');
  }

  const owned = await prisma.userRedemption.findFirst({
    where: {
      userId,
      rewardCode,
      status: { in: ['ACTIVE', 'FULFILLED'] },
    },
  });
  if (!owned) {
    throw new AppError(httpStatus.FORBIDDEN, 'You have not unlocked this cosmetic yet.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      [handler.equipField]: equip ? rewardCode : null,
    },
    select: FRESH_USER_SELECT,
  });

  await invalidateAllUserPresentationCaches(userId);

  return {
    rewardCode,
    equipped: equip,
    user: updatedUser,
  };
};

export const getLeaderboard = async (limit = 20) => {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const cacheKey = `points:leaderboard:${safeLimit}`;

  return cacheService.remember(cacheKey, 60, async () => {
    const users = await prisma.user.findMany({
      where: { lifetimePoints: { gt: 0 } },
      orderBy: [{ lifetimePoints: 'desc' }, { createdAt: 'asc' }],
      take: safeLimit,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        points: true,
        lifetimePoints: true,
        badges: {
          select: { id: true, name: true },
        },
      },
    });

    return users.map((u, idx) => ({
      rank: idx + 1,
      ...u,
      level: resolveLevelInfo(u.lifetimePoints).current,
    }));
  });
};

export const pointsServices = {
  ensureTaskDefinitionsSeeded,
  ensureUserReferralCode,
  awardTaskPoints,
  syncProfileCompletionTasks,
  qualifyReferralIfPending,
  processRegistrationReferral,
  syncFriendMilestones,
  dailyCheckIn,
  getUserPointsDashboard,
  getPointsHistory,
  getRedeemStore,
  redeemReward,
  toggleEquipCosmetic,
  getLeaderboard,
};
