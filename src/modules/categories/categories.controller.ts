import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Create a new Dua category (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category with slug already exists' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get paginated list of categories with dua counts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of categories retrieved' })
  async findAll(@Query() query: QueryCategoryDto) {
    return this.categoriesService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single category details by ID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update category details (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category by ID (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete category containing Duas' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
