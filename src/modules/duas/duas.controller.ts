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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { CreateDuaDto } from './dto/create-dua.dto';
import { QueryDuaDto } from './dto/query-dua.dto';
import { UpdateDuaDto } from './dto/update-dua.dto';
import { DuasService } from './duas.service';

@ApiTags('Duas')
@Controller('duas')
export class DuasController {
  constructor(private readonly duasService: DuasService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Create a new Dua (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Dua created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid category or payload' })
  async create(
    @Body() dto: CreateDuaDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.duasService.create(dto, user.id);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Get paginated list of Duas with search, category filtering, and status filtering',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Duas list retrieved successfully' })
  async findAll(
    @Query() query: QueryDuaDto,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.duasService.findAll(query, user);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get Dua full details by ID with references and audio links' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dua details retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.duasService.findOne(id, user);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update Dua details (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dua updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateDuaDto) {
    return this.duasService.update(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete Dua by ID (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dua deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async remove(@Param('id') id: string) {
    return this.duasService.remove(id);
  }
}
