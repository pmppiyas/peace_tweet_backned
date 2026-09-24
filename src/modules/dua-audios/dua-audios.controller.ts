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
import { CreateDuaAudioDto } from './dto/create-dua-audio.dto';
import { UpdateDuaAudioDto } from './dto/update-dua-audio.dto';
import { DuaAudiosService } from './dua-audios.service';

@ApiTags('Dua Audios')
@Controller('duas/:duaId/audios')
export class DuaAudiosController {
  constructor(private readonly duaAudiosService: DuaAudiosService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Add audio recording URL to a Dua (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Audio added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async create(
    @Param('duaId') duaId: string,
    @Body() dto: CreateDuaAudioDto,
  ) {
    return this.duaAudiosService.create(duaId, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all audio recitations for a specific Dua' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audios retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async findAll(@Param('duaId') duaId: string) {
    return this.duaAudiosService.findAllByDuaId(duaId);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':audioId')
  @ApiOperation({ summary: 'Update audio metadata (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audio updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Audio not found' })
  async update(
    @Param('duaId') duaId: string,
    @Param('audioId') audioId: string,
    @Body() dto: UpdateDuaAudioDto,
  ) {
    return this.duaAudiosService.update(duaId, audioId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':audioId')
  @ApiOperation({ summary: 'Delete audio from Dua (Admin/Moderator only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audio deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Audio not found' })
  async remove(
    @Param('duaId') duaId: string,
    @Param('audioId') audioId: string,
  ) {
    return this.duaAudiosService.remove(duaId, audioId);
  }
}
