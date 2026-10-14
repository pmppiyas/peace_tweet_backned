import httpStatus from 'http-status-codes';
import { prisma } from '../../config/prisma';
import AppError from '../../utils/appError';
import {
  ICreateFeedbackPayload,
  IFeedbackFilter,
  IUpdateFeedbackStatusPayload,
} from './feedback.interface';

const createFeedback = async (
  payload: ICreateFeedbackPayload,
  userId?: string,
) => {
  const result = await prisma.feedbackReport.create({
    data: {
      userId: userId || null,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      type: payload.type,
      subject: payload.subject.trim(),
      description: payload.description.trim(),
      mediaUrls: payload.mediaUrls || [],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  return result;
};

const getAllFeedbacks = async (filters: IFeedbackFilter) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.feedbackReport.count({ where }),
    prisma.feedbackReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

const getFeedbackById = async (id: string) => {
  const result = await prisma.feedbackReport.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Feedback report not found');
  }

  return result;
};

const updateFeedbackStatus = async (
  id: string,
  payload: IUpdateFeedbackStatusPayload,
) => {
  const isExist = await prisma.feedbackReport.findUnique({
    where: { id },
  });

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Feedback report not found');
  }

  const result = await prisma.feedbackReport.update({
    where: { id },
    data: {
      status: payload.status,
      adminNote: payload.adminNote !== undefined ? payload.adminNote : isExist.adminNote,
    },
  });

  return result;
};

export const feedbackServices = {
  createFeedback,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedbackStatus,
};
