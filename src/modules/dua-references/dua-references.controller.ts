import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { CreateDuaReferenceDto } from './dto/create-dua-reference.dto';
import { UpdateDuaReferenceDto } from './dto/update-dua-reference.dto';
import { DuaReferencesService } from './dua-references.service';

@ApiTags('Dua References')
@Controller('duas/:duaId/references')
export class DuaReferencesController {
  constructor(private readonly duaReferencesService: DuaReferencesService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Add a new reference/hadith link to a Dua (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Reference added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async create(
    @Param('duaId') duaId: string,
    @Body() dto: CreateDuaReferenceDto,
  ) {
    return this.duaReferencesService.create(duaId, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all citations/references for a specific Dua' })
  @ApiResponse({ status: HttpStatus.OK, description: 'References retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async findAll(@Param('duaId') duaId: string) {
    return this.duaReferencesService.findAllByDuaId(duaId);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':referenceId')
  @ApiOperation({ summary: 'Update reference details (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reference updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reference not found' })
  async update(
    @Param('duaId') duaId: string,
    @Param('referenceId') referenceId: string,
    @Body() dto: UpdateDuaReferenceDto,
  ) {
    return this.duaReferencesService.update(duaId, referenceId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':referenceId')
  @ApiOperation({ summary: 'Delete reference from Dua (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reference deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reference not found' })
  async remove(
    @Param('duaId') duaId: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.duaReferencesService.remove(duaId, referenceId);
  }
}
