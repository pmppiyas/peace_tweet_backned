import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname, join } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { CreateDuaAudioDto } from './dto/create-dua-audio.dto';
import { UpdateDuaAudioDto } from './dto/update-dua-audio.dto';
import { UploadVideoDto } from './dto/upload-video.dto';
import { DuaAudiosService } from './dua-audios.service';

const videoStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `video_${uniqueSuffix}${ext}`);
  },
});

const videoFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedExtensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Invalid file type. Allowed video formats: ${allowedExtensions.join(', ')}`,
      ),
      false,
    );
  }
};

@ApiTags('Dua Audios')
@Controller('duas/:duaId/audios')
export class DuaAudiosController {
  constructor(private readonly duaAudiosService: DuaAudiosService) {}

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post('upload-video')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: videoStorage,
      fileFilter: videoFileFilter,
      limits: {
        fileSize: 200 * 1024 * 1024, // 200 MB max video limit
      },
    }),
  )
  @ApiOperation({
    summary:
      'Upload Video recitation $\\rightarrow$ Kafka Job $\\rightarrow$ FFmpeg Worker $\\rightarrow$ Extracted DuaAudio',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'Video file (.mp4, .mov, .mkv, .webm)',
        },
        reciterName: {
          type: 'string',
          description: 'Name of the reciter (optional)',
          example: 'Sheikh Mishary Rashid Alafasy',
        },
        language: {
          type: 'string',
          description: 'Recitation language code (e.g. ar, bn, en)',
          example: 'ar',
        },
      },
      required: ['video'],
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Video received and audio extraction job enqueued to Kafka',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Dua not found' })
  async uploadVideo(
    @Param('duaId') duaId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadVideoDto,
    @CurrentUser() user?: ActiveUserData,
  ) {
    return this.duaAudiosService.requestVideoAudioExtraction(
      duaId,
      file,
      dto,
      user?.id,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  @ApiOperation({ summary: 'Add audio recording URL directly to a Dua (Admin/Moderator only)' })
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
