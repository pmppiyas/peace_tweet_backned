import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DuaStatus } from '../../common/enums/dua-status.enum';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta, calculatePagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { autoCategorizeDua } from '../../app/modules/duas/utils/dua-categorizer';
import { CreateDuaDto } from './dto/create-dua.dto';
import { QueryDuaDto } from './dto/query-dua.dto';
import { UpdateDuaDto } from './dto/update-dua.dto';

@Injectable()
export class DuasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateDuaDto, createdById: string) {
    const transliteration = (dto.transliteration || (dto as any).duaBangla || '').trim();
    const meaningBangla = (dto.meaningBangla || (dto as any).meaning || '').trim();
    const fadilah = dto.fadilah ? dto.fadilah.trim() : null;
    const arabicText = dto.arabicText ? dto.arabicText.trim() : null;

    let categoryId = dto.categoryId;

    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestException(`Category with ID '${categoryId}' does not exist.`);
      }
    } else {
      // Non-LLM rule & root-based auto-categorization
      const detectedSlug = autoCategorizeDua({
        meaning: meaningBangla,
        transliteration,
        fadilah,
      });

      let category = await this.prisma.category.findUnique({
        where: { slug: detectedSlug },
      });

      if (!category) {
        category = await this.prisma.category.findUnique({
          where: { slug: 'others' },
        });
      }

      if (!category) {
        category = await this.prisma.category.findFirst();
      }

      if (!category) {
        throw new BadRequestException('No category found in database for categorization.');
      }

      categoryId = category.id;
    }

    const created = await this.prisma.dua.create({
      data: {
        fadilah,
        meaning: meaningBangla,
        arabicText,
        transliteration: transliteration || null,
        categoryId,
        createdById,
        status: dto.status ?? DuaStatus.PUBLISHED,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.cache.delPattern('categories:*');
    await this.cache.delPattern('duas:*');
    return created;
  }

  async findAll(query: QueryDuaDto, currentUser?: ActiveUserData): Promise<PaginatedResult<any>> {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

    const isPrivileged =
      currentUser && (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR);

    // Fetch base published items with Redis cache
    const cacheKey = `duas:list:${JSON.stringify(query)}:priv=${Boolean(isPrivileged)}`;
    const baseResult = await this.cache.remember(cacheKey, 300, async () => {
      const where: Prisma.DuaWhereInput = {};

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
          { transliteration: { contains: search, mode: 'insensitive' } },
          { meaning: { contains: search, mode: 'insensitive' } },
          { fadilah: { contains: search, mode: 'insensitive' } },
          { arabicText: { contains: search, mode: 'insensitive' } },
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
              },
            },
          },
        }),
      ]);

      return { total, items };
    });

    let enrichedItems = baseResult.items;
    if (currentUser) {
      const savedDuaIds = new Set(
        (
          await this.prisma.savedItem.findMany({
            where: {
              userId: currentUser.id,
              type: 'DUA',
              contentId: { in: baseResult.items.map((i: any) => i.id) },
            },
            select: { contentId: true },
          })
        ).map((s) => s.contentId),
      );

      enrichedItems = baseResult.items.map((item: any) => ({
        ...item,
        isSaved: savedDuaIds.has(item.id),
      }));
    }

    return {
      data: enrichedItems,
      meta: buildPaginationMeta(baseResult.total, page, limit),
    };
  }

  async findOne(id: string, currentUser?: ActiveUserData) {
    const isPrivileged =
      currentUser && (currentUser.role === Role.ADMIN || currentUser.role === Role.MODERATOR);

    const cacheKey = `duas:id:${id}`;
    const dua = await this.cache.remember(cacheKey, 600, async () => {
      return await this.prisma.dua.findUnique({
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
            },
          },
        },
      });
    });

    if (!dua) {
      throw new NotFoundException(`Dua with ID '${id}' was not found.`);
    }

    if (dua.status !== DuaStatus.PUBLISHED && !isPrivileged) {
      throw new ForbiddenException('Access denied to unpublished Dua.');
    }

    if (currentUser) {
      const saved = await this.prisma.savedItem.findUnique({
        where: {
          userId_type_contentId: {
            userId: currentUser.id,
            type: 'DUA',
            contentId: id,
          },
        },
      });
      return {
        ...dua,
        isSaved: Boolean(saved),
      };
    }

    return {
      ...dua,
      isSaved: false,
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
        throw new BadRequestException(`Category with ID '${dto.categoryId}' does not exist.`);
      }
    }

    const updated = await this.prisma.dua.update({
      where: { id },
      data: {
        ...(dto.fadilah && { fadilah: dto.fadilah.trim() }),
        ...(dto.transliteration !== undefined
          ? { transliteration: dto.transliteration?.trim() }
          : (dto as any).duaBangla
            ? { transliteration: (dto as any).duaBangla.trim() }
            : {}),
        ...((dto.meaning || dto.meaningBangla) && {
          meaning: (dto.meaning || dto.meaningBangla)!.trim(),
        }),
        ...(dto.arabicText !== undefined && { arabicText: dto.arabicText?.trim() }),
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

    await this.cache.delPattern('categories:*');
    await this.cache.delPattern('duas:*');
    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.dua.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dua with ID '${id}' not found.`);
    }

    await this.prisma.dua.delete({
      where: { id },
    });

    await this.cache.delPattern('categories:*');
    await this.cache.delPattern('duas:*');
    return { message: 'Dua deleted successfully.' };
  }
}
