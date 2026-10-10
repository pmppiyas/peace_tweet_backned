import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta, calculatePagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { QueryBookmarkDto } from './dto/query-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDua(userId: string, duaId: string, timeSlot?: string) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
      include: { category: true },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    const existingSave = await this.prisma.savedItem.findUnique({
      where: {
        userId_type_contentId: {
          userId,
          type: 'DUA',
          contentId: duaId,
        },
      },
    });

    if (existingSave) {
      if (timeSlot !== undefined) {
        const updated = await this.prisma.savedItem.update({
          where: {
            userId_type_contentId: {
              userId,
              type: 'DUA',
              contentId: duaId,
            },
          },
          data: {
            timeSlot: timeSlot || null,
          },
        });
        return {
          message: 'Saved Dua time slot updated successfully.',
          data: { ...updated, dua },
        };
      }
      return {
        message: 'Dua is already saved.',
        data: { ...existingSave, dua },
      };
    }

    const savedRecord = await this.prisma.savedItem.create({
      data: {
        userId,
        type: 'DUA',
        contentId: duaId,
        timeSlot: timeSlot || null,
      },
    });

    return {
      message: 'Dua saved successfully to your collection.',
      data: { ...savedRecord, dua },
    };
  }

  async updateDuaTimeSlot(userId: string, duaId: string, timeSlot: string | null) {
    const updated = await this.prisma.savedItem.upsert({
      where: {
        userId_type_contentId: {
          userId,
          type: 'DUA',
          contentId: duaId,
        },
      },
      create: {
        userId,
        type: 'DUA',
        contentId: duaId,
        timeSlot: timeSlot || null,
      },
      update: {
        timeSlot: timeSlot || null,
      },
    });

    return {
      message: 'Time slot updated successfully.',
      data: updated,
    };
  }

  async unsaveDua(userId: string, duaId: string) {
    await this.prisma.savedItem.deleteMany({
      where: {
        userId,
        contentId: duaId,
      },
    });

    return { message: 'Dua removed from your saved list.' };
  }

  async getSavedDuas(userId: string, query: QueryBookmarkDto): Promise<PaginatedResult<any>> {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

    const where: Prisma.SavedItemWhereInput = {
      userId,
      type: 'DUA',
    };

    if (query.timeSlot && query.timeSlot !== 'all') {
      where.timeSlot = query.timeSlot;
    }

    const [total, items] = await Promise.all([
      this.prisma.savedItem.count({ where }),
      this.prisma.savedItem.findMany({
        where,
        skip,
        take: limit,
        orderBy:
          sortBy === 'createdAt' || sortBy === 'savedAt'
            ? { savedAt: sortOrder }
            : { savedAt: 'desc' },
      }),
    ]);

    const duaIds = items.map((i) => i.contentId);
    const search = query.search?.trim();

    const duas = await this.prisma.dua.findMany({
      where: {
        id: { in: duaIds },
        ...(search
          ? {
              OR: [
                { transliteration: { contains: search, mode: 'insensitive' } },
                { meaning: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        references: {
          include: {
            source: true,
          },
        },
        audios: true,
      },
    });

    const duaMap = new Map(duas.map((d) => [d.id, d]));

    const formattedData: any[] = [];
    for (const item of items) {
      const dua = duaMap.get(item.contentId);
      if (dua) {
        formattedData.push({
          ...dua,
          bookmarkId: item.id,
          savedId: item.id,
          timeSlot: item.timeSlot,
          savedAt: item.savedAt,
          isSaved: true,
        });
      }
    }

    return {
      data: formattedData,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
