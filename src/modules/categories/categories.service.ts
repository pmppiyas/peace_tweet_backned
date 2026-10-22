import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  async create(_dto: CreateCategoryDto) {
    return { message: 'Categories feature disabled' };
  }

  async findAll(_query: QueryCategoryDto): Promise<PaginatedResult<any>> {
    return {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async findOne(_idOrSlug: string) {
    return null;
  }

  async update(_id: string, _dto: UpdateCategoryDto) {
    return { message: 'Categories feature disabled' };
  }

  async remove(_id: string) {
    return { message: 'Categories feature disabled' };
  }
}
