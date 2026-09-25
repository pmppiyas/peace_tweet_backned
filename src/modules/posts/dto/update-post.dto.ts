import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostStatus } from '../../../common/enums/post-status.enum';
import { PostVisibility } from '../../../common/enums/post-visibility.enum';

export class UpdatePostDto {
  @ApiPropertyOptional({
    example: 'Updated post content...',
    description: 'Updated text content',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    enum: PostVisibility,
    description: 'Updated visibility',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({
    enum: PostStatus,
    description: 'Updated status',
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
