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
import { CreateSourceDto } from './dto/create-source.dto';
import { QuerySourceDto } from './dto/query-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { SourcesService } from './sources.service';

@ApiTags('Sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Create a new Dua source (Quran/Hadith book) - Admin/Moderator only' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Source created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Source already exists' })
  async create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get paginated list of sources with optional type filter and search' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sources retrieved' })
  async findAll(@Query() query: QuerySourceDto) {
    return this.sourcesService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get source details by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source details retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Source not found' })
  async findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update source details (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Source not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete source by ID (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Source deleted successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete source with linked references' })
  async remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }
}
