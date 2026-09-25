import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../cache/cache.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { buildPaginationMeta, calculatePagination } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists.`);
    }

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.cache.delPattern('categories:*');
    return created;
  }

  async findAll(query: QueryCategoryDto): Promise<PaginatedResult<any>> {
    const cacheKey = `categories:list:${JSON.stringify(query)}`;
    return this.cache.remember(cacheKey, 3600, async () => {
      const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

      const where: Prisma.CategoryWhereInput = {};
      if (query.search) {
        const search = query.search.trim();
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        this.prisma.category.count({ where }),
        this.prisma.category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: { duas: true },
            },
          },
        }),
      ]);

      return {
        data: items,
        meta: buildPaginationMeta(total, page, limit),
      };
    });
  }

  async findOne(id: string) {
    const cacheKey = `categories:item:${id}`;
    return this.cache.remember(cacheKey, 3600, async () => {
      const category = await this.prisma.category.findFirst({
        where: {
          OR: [{ id }, { slug: id }],
        },
        include: {
          _count: {
            select: { duas: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Category with identifier '${id}' was not found.`);
      }

      return category;
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const slug = dto.slug.toLowerCase().trim();
      const existingSlug = await this.prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });
      if (existingSlug) {
        throw new ConflictException(`Category with slug '${slug}' already exists.`);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.slug && { slug: dto.slug.toLowerCase().trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.cache.delPattern('categories:*');
    return updated;
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const linkedDuasCount = await this.prisma.dua.count({
      where: { categoryId: category.id },
    });

    if (linkedDuasCount > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it contains ${linkedDuasCount} active Dua(s). Please reassign or remove them first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id: category.id },
    });

    await this.cache.delPattern('categories:*');
    return { message: `Category '${category.name}' deleted successfully.` };
  }
}
