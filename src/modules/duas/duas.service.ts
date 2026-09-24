import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DuaStatus } from '../../common/enums/dua-status.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  buildPaginationMeta,
  calculatePagination,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { CreateDuaDto } from './dto/create-dua.dto';
import { QueryDuaDto } from './dto/query-dua.dto';
import { UpdateDuaDto } from './dto/update-dua.dto';

@Injectable()
export class DuasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDuaDto, createdById: string) {
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!categoryExists) {
      throw new BadRequestException(
        `Category with ID '${dto.categoryId}' does not exist.`,
      );
    }

    return this.prisma.dua.create({
      data: {
        title: dto.title.trim(),
        fadilah: dto.fadilah.trim(),
        duaBangla: dto.duaBangla.trim(),
        meaningBangla: dto.meaningBangla.trim(),
        arabicText: dto.arabicText?.trim(),
        transliteration: dto.transliteration?.trim(),
        categoryId: dto.categoryId,
        createdById,
        status: dto.status ?? DuaStatus.DRAFT,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  async findAll(
    query: QueryDuaDto,
    currentUser?: ActiveUserData,
  ): Promise<PaginatedResult<any>> {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

    const where: Prisma.DuaWhereInput = {};

    // Role-based visibility
    const isPrivileged =
      currentUser &&
      (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR);

    if (query.status) {
      if (!isPrivileged && query.status !== DuaStatus.PUBLISHED) {
        where.status = DuaStatus.PUBLISHED;
      } else {
        where.status = query.status;
      }
    } else if (!isPrivileged) {
      where.status = DuaStatus.PUBLISHED;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { duaBangla: { contains: search, mode: 'insensitive' } },
        { meaningBangla: { contains: search, mode: 'insensitive' } },
        { fadilah: { contains: search, mode: 'insensitive' } },
        { arabicText: { contains: search, mode: 'insensitive' } },
        { transliteration: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.dua.count({ where }),
      this.prisma.dua.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          references: {
            include: {
              source: true,
            },
          },
          audios: true,
          _count: {
            select: {
              references: true,
              audios: true,
              savedBy: true,
            },
          },
        },
      }),
    ]);

    // If currentUser is logged in, attach isSaved flag
    let enrichedItems = items;
    if (currentUser) {
      const savedDuaIds = new Set(
        (
          await this.prisma.savedDua.findMany({
            where: {
              userId: currentUser.id,
              duaId: { in: items.map((i) => i.id) },
            },
            select: { duaId: true },
          })
        ).map((s) => s.duaId),
      );

      enrichedItems = items.map((item) => ({
        ...item,
        isSaved: savedDuaIds.has(item.id),
      }));
    }

    return {
      data: enrichedItems,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, currentUser?: ActiveUserData) {
    const isPrivileged =
      currentUser &&
      (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR);

    const dua = await this.prisma.dua.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        references: {
          include: {
            source: true,
          },
        },
        audios: true,
        _count: {
          select: {
            references: true,
            audios: true,
            savedBy: true,
          },
        },
      },
    });

    if (!dua) {
      throw new NotFoundException(`Dua with ID '${id}' was not found.`);
    }

    if (dua.status !== DuaStatus.PUBLISHED && !isPrivileged) {
      throw new NotFoundException(`Dua with ID '${id}' is not available.`);
    }

    let isSaved = false;
    if (currentUser) {
      const saved = await this.prisma.savedDua.findUnique({
        where: {
          userId_duaId: {
            userId: currentUser.id,
            duaId: id,
          },
        },
      });
      isSaved = !!saved;
    }

    return {
      ...dua,
      isSaved,
    };
  }

  async update(id: string, dto: UpdateDuaDto) {
    const existing = await this.prisma.dua.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dua with ID '${id}' not found.`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestException(
          `Category with ID '${dto.categoryId}' does not exist.`,
        );
      }
    }

    return this.prisma.dua.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.fadilah && { fadilah: dto.fadilah.trim() }),
        ...(dto.duaBangla && { duaBangla: dto.duaBangla.trim() }),
        ...(dto.meaningBangla && { meaningBangla: dto.meaningBangla.trim() }),
        ...(dto.arabicText !== undefined && { arabicText: dto.arabicText?.trim() }),
        ...(dto.transliteration !== undefined && {
          transliteration: dto.transliteration?.trim(),
        }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        category: true,
        references: {
          include: { source: true },
        },
        audios: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.dua.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dua with ID '${id}' not found.`);
    }

    await this.prisma.dua.delete({
      where: { id },
    });

    return { message: `Dua '${existing.title}' deleted successfully.` };
  }
}
