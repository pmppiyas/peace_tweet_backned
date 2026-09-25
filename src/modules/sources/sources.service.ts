import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../../cache/cache.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  buildPaginationMeta,
  calculatePagination,
} from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { QuerySourceDto } from './dto/query-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateSourceDto) {
    const existing = await this.prisma.source.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`Source '${dto.name}' already exists.`);
    }

    const created = await this.prisma.source.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description?.trim(),
      },
    });

    await this.cache.delPattern('sources:*');
    return created;
  }

  async findAll(query: QuerySourceDto): Promise<PaginatedResult<any>> {
    const cacheKey = `sources:list:${JSON.stringify(query)}`;
    return this.cache.remember(cacheKey, 3600, async () => {
      const { page, limit, skip, sortBy, sortOrder } = calculatePagination(query);

      const where: Prisma.SourceWhereInput = {};

      if (query.type) {
        where.type = query.type;
      }

      if (query.search) {
        const search = query.search.trim();
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        this.prisma.source.count({ where }),
        this.prisma.source.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: { duaReferences: true },
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
    const cacheKey = `sources:item:${id}`;
    return this.cache.remember(cacheKey, 3600, async () => {
      const source = await this.prisma.source.findUnique({
        where: { id },
        include: {
          _count: {
            select: { duaReferences: true },
          },
        },
      });

      if (!source) {
        throw new NotFoundException(`Source with ID '${id}' not found.`);
      }

      return source;
    });
  }

  async update(id: string, dto: UpdateSourceDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.source.findFirst({
        where: {
          name: { equals: dto.name.trim(), mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`Source with name '${dto.name}' already exists.`);
      }
    }

    const updated = await this.prisma.source.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.type && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
      },
    });

    await this.cache.delPattern('sources:*');
    return updated;
  }

  async remove(id: string) {
    const source = await this.findOne(id);

    const refCount = await this.prisma.duaReference.count({
      where: { sourceId: id },
    });

    if (refCount > 0) {
      throw new BadRequestException(
        `Cannot delete source '${source.name}' because ${refCount} Dua reference(s) are linked to it.`,
      );
    }

    await this.prisma.source.delete({
      where: { id },
    });

    await this.cache.delPattern('sources:*');
    return { message: `Source '${source.name}' deleted successfully.` };
  }
}
