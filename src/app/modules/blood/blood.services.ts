import httpStatus from 'http-status-codes';
import { prisma } from '../../config/prisma';
import { cacheService } from '../../config/cache';
import AppError from '../../utils/appError';
import {
  ICreateBloodRequestInput,
  IBloodRequestQuery,
  IDonorQuery,
} from './blood.interface';
import { BloodRequestStatus } from '@prisma/client';

const invalidateBloodCache = async (requestId?: string) => {
  try {
    await cacheService.delPattern('blood:*');
    await cacheService.delPattern('feed:*');
    if (requestId) {
      await cacheService.delPattern(`blood:request:${requestId}`);
    }
  } catch (err: any) {
    console.warn('Cache invalidation error in blood:', err.message);
  }
};

const createBloodRequest = async (
  userId: string,
  payload: ICreateBloodRequestInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const patientName = payload.forMyself
    ? payload.patientName || user.name
    : payload.patientName;

  const result = await prisma.bloodRequest.create({
    data: {
      requesterId: userId,
      forMyself: Boolean(payload.forMyself),
      patientName: patientName.trim(),
      patientAge: payload.patientAge || null,
      problem: payload.problem?.trim() || null,
      bloodGroup: payload.bloodGroup,
      units: payload.units || 1,
      hospitalName: payload.hospitalName.trim(),
      hospitalAddress: payload.hospitalAddress?.trim() || null,
      location: payload.location.trim(),
      contactNumber: payload.contactNumber.trim(),
      alternateContact: payload.alternateContact?.trim() || null,
      neededDate: new Date(payload.neededDate),
      urgency: payload.urgency || 'REGULAR',
      status: 'PENDING',
      note: payload.note?.trim() || null,
    },
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
  });

  await invalidateBloodCache();

  return result;
};

const getAllBloodRequests = async (query: IBloodRequestQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const cacheKey = `blood:requests:${JSON.stringify(query)}`;

  return cacheService.remember(cacheKey, 60, async () => {
    const where: any = {};

    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.urgency) {
      where.urgency = query.urgency;
    }
    if (query.location) {
      where.location = {
        contains: query.location.trim(),
        mode: 'insensitive',
      };
    }
    if (query.requesterId) {
      where.requesterId = query.requesterId;
    }
    if (query.donorId) {
      where.donations = {
        some: {
          donorId: query.donorId,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
      };
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { patientName: { contains: s, mode: 'insensitive' } },
        { hospitalName: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { problem: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.bloodRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { urgency: 'desc' },
          { neededDate: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
          donations: {
            where: {
              status: { in: ['ACCEPTED', 'COMPLETED'] },
            },
            include: {
              donor: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  bloodGroup: true,
                  donationCount: true,
                },
              },
            },
          },
        },
      }),
      prisma.bloodRequest.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      items,
    };
  });
};

const getBloodRequestById = async (requestId: string) => {
  const cacheKey = `blood:request:${requestId}`;

  return cacheService.remember(cacheKey, 120, async () => {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            email: true,
          },
        },
        donations: {
          include: {
            donor: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                bloodGroup: true,
                donationCount: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');
    }

    return request;
  });
};

const acceptBloodRequest = async (
  requestId: string,
  donorUserId: string,
) => {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
    include: {
      donations: true,
    },
  });

  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');
  }

  if (request.requesterId === donorUserId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot donate blood to your own request',
    );
  }

  if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This blood request is closed and cannot accept more donors',
    );
  }

  // Check if donor has already accepted
  const alreadyDonating = request.donations.find(
    (d) => d.donorId === donorUserId && d.status !== 'CANCELLED',
  );

  if (alreadyDonating) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already accepted to donate for this blood request',
    );
  }

  // Check remaining units (1 row = 1 unit)
  const activePledgedUnits = request.donations.filter(
    (d) => d.status === 'ACCEPTED' || d.status === 'COMPLETED',
  ).length;

  if (activePledgedUnits >= request.units) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'All required units for this request have already been accepted',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const donation = await tx.bloodDonation.create({
      data: {
        bloodRequestId: requestId,
        donorId: donorUserId,
        status: 'ACCEPTED',
      },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bloodGroup: true,
            donationCount: true,
          },
        },
      },
    });

    const newTotalPledged = activePledgedUnits + 1;
    const newStatus =
      newTotalPledged >= request.units ? 'FULLY_ACCEPTED' : 'PARTIALLY_ACCEPTED';

    const updatedRequest = await tx.bloodRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
      include: {
        donations: {
          include: {
            donor: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                bloodGroup: true,
              },
            },
          },
        },
      },
    });

    return { donation, request: updatedRequest };
  });

  await invalidateBloodCache(requestId);

  return result;
};

const completeDonation = async (
  requestId: string,
  donationId: string,
  currentUserId: string,
) => {
  const donation = await prisma.bloodDonation.findUnique({
    where: { id: donationId },
    include: { bloodRequest: true },
  });

  if (!donation || donation.bloodRequestId !== requestId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Donation record not found');
  }

  if (donation.bloodRequest.requesterId !== currentUserId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the blood requester can confirm a donation as completed',
    );
  }

  if (donation.status === 'COMPLETED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This donation has already been marked as completed',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark donation as completed
    const updatedDonation = await tx.bloodDonation.update({
      where: { id: donationId },
      data: {
        status: 'COMPLETED',
        donatedAt: new Date(),
      },
    });

    // 2. Increment donor's donationCount
    await tx.user.update({
      where: { id: donation.donorId },
      data: {
        donationCount: { increment: 1 },
      },
    });

    // 3. Update blood request fulfilled count (1 donation = 1 unit)
    const newFulfilled = donation.bloodRequest.unitsFulfilled + 1;
    const isAllFulfilled = newFulfilled >= donation.bloodRequest.units;

    const updatedRequest = await tx.bloodRequest.update({
      where: { id: requestId },
      data: {
        unitsFulfilled: newFulfilled,
        status: isAllFulfilled ? 'COMPLETED' : donation.bloodRequest.status,
      },
    });

    return { donation: updatedDonation, request: updatedRequest };
  });

  await invalidateBloodCache(requestId);

  return result;
};

const cancelDonation = async (requestId: string, donorUserId: string) => {
  const donation = await prisma.bloodDonation.findFirst({
    where: {
      bloodRequestId: requestId,
      donorId: donorUserId,
      status: 'ACCEPTED',
    },
    include: { bloodRequest: true },
  });

  if (!donation) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Active accepted donation record not found',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.bloodDonation.update({
      where: { id: donation.id },
      data: { status: 'CANCELLED' },
    });

    // Recalculate remaining active pledges (1 donation = 1 unit)
    const remainingActive = await tx.bloodDonation.findMany({
      where: {
        bloodRequestId: requestId,
        status: { in: ['ACCEPTED', 'COMPLETED'] },
        id: { not: donation.id },
      },
    });

    const activePledges = remainingActive.length;

    const newStatus =
      activePledges > 0 ? 'PARTIALLY_ACCEPTED' : 'PENDING';

    const updatedRequest = await tx.bloodRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    return { message: 'Donation acceptance cancelled successfully', request: updatedRequest };
  });

  await invalidateBloodCache(requestId);

  return result;
};

const updateBloodRequestStatus = async (
  requestId: string,
  userId: string,
  status: BloodRequestStatus,
) => {
  const request = await prisma.bloodRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, 'Blood request not found');
  }

  if (request.requesterId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the requester can update this blood request status',
    );
  }

  const updated = await prisma.bloodRequest.update({
    where: { id: requestId },
    data: { status },
  });

  await invalidateBloodCache(requestId);

  return updated;
};

const getDonorModeStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      bloodGroup: true,
      isDonor: true,
      donationCount: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

const toggleDonorMode = async (userId: string, isDonor?: boolean) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isDonor: true },
  });

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const nextStatus =
    typeof isDonor === 'boolean' ? isDonor : !currentUser.isDonor;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isDonor: nextStatus },
    select: {
      id: true,
      name: true,
      username: true,
      bloodGroup: true,
      isDonor: true,
      donationCount: true,
    },
  });

  await invalidateBloodCache();
  try {
    await cacheService.delPattern(`user:*:${userId}*`);
  } catch (e) {}

  return user;
};

const getAvailableDonors = async (query: IDonorQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const cacheKey = `blood:donors:${JSON.stringify(query)}`;

  return cacheService.remember(cacheKey, 120, async () => {
    const where: any = {
      isDonor: true,
    };

    if (query.bloodGroup) {
      where.bloodGroup = query.bloodGroup;
    }
    if (query.location) {
      where.location = {
        contains: query.location.trim(),
        mode: 'insensitive',
      };
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [donors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { donationCount: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bloodGroup: true,
          location: true,
          bio: true,
          isDonor: true,
          donationCount: true,
          badge: true,
          userStatus: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      items: donors,
    };
  });
};

export const bloodServices = {
  createBloodRequest,
  getAllBloodRequests,
  getBloodRequestById,
  acceptBloodRequest,
  completeDonation,
  cancelDonation,
  updateBloodRequestStatus,
  toggleDonorMode,
  getDonorModeStatus,
  getAvailableDonors,
};
