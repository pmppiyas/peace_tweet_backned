import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { CloudinaryService, UploadResult } from './cloudinary.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  // Upload an image publicly (for registration, avatars, etc.)
  @Public()
  @Post('image')
  @ApiOperation({ summary: 'Upload an image file to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WEBP, GIF, max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image uploaded successfully to Cloudinary',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://res.cloudinary.com/demo/image/upload/v1/peacetweet/uploads/sample.jpg',
        },
        publicId: { type: 'string', example: 'peacetweet/uploads/sample' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.cloudinaryService.uploadImage(file, 'peacetweet/uploads');
  }

  // Upload avatar for logged-in user
  @ApiBearerAuth('JWT-auth')
  @Post('avatar')
  @ApiOperation({ summary: 'Upload an avatar image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image (max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Avatar uploaded successfully',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @CurrentUser() user?: ActiveUserData,
  ): Promise<UploadResult> {
    const folder = user ? `peacetweet/avatars/${user.id}` : 'peacetweet/avatars';
    return this.cloudinaryService.uploadImage(file, folder);
  }
}
