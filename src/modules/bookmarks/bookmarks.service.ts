import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  buildPaginationMeta,
  calculatePagination,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { QueryBookmarkDto } from './dto/query-bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDua(userId: string, duaId: string) {
    const dua = await this.prisma.dua.findUnique({
      where: { id: duaId },
    });
    if (!dua) {
      throw new NotFoundException(`Dua with ID '${duaId}' not found.`);
    }

    const existingSave = await this.prisma.savedDua.findUnique({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
    });

    if (existingSave) {
      throw new ConflictException('You have already saved this Dua.');
    }

    const savedRecord = await this.prisma.savedDua.create({
      data: {
        userId,
        duaId,
      },
      include: {
        dua: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      message: 'Dua saved successfully to your bookmarks.',
      data: savedRecord,
    };
  }

  async unsaveDua(userId: string, duaId: string) {
    const existingSave = await this.prisma.savedDua.findUnique({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
    });

    if (!existingSave) {
      throw new NotFoundException('Dua is not in your saved list.');
    }

    await this.prisma.savedDua.delete({
      where: {
        userId_duaId: {
          userId,
          duaId,
        },
      },
    });

    return { message: 'Dua removed from your saved list.' };
  }

  async getSavedDuas(
    userId: string,
    query: QueryBookmarkDto,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

    const where: Prisma.SavedDuaWhereInput = {
      userId,
    };

    if (query.search) {
      const search = query.search.trim();
      where.dua = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { duaBangla: { contains: search, mode: 'insensitive' } },
          { meaningBangla: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.savedDua.count({ where }),
      this.prisma.savedDua.findMany({
        where,
        skip,
        take: limit,
        orderBy:
          sortBy === 'createdAt' || sortBy === 'savedAt'
            ? { savedAt: sortOrder }
            : { savedAt: 'desc' },
        include: {
          dua: {
            include: {
              category: true,
              references: {
                include: {
                  source: true,
                },
              },
              audios: true,
            },
          },
        },
      }),
    ]);

    const formattedData = items.map((item) => ({
      savedAt: item.savedAt,
      id: item.id,
      ...item.dua,
      isSaved: true,
    }));

    return {
      data: formattedData,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
