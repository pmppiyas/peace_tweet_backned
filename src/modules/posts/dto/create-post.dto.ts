import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PostStatus } from '../../../common/enums/post-status.enum';
import { PostType } from '../../../common/enums/post-type.enum';
import { PostVisibility } from '../../../common/enums/post-visibility.enum';

export class CreatePostDto {
  @ApiProperty({
    enum: PostType,
    example: PostType.TEXT,
    description: 'Type of post (TEXT, DUA, QUESTION, ANNOUNCEMENT)',
  })
  @IsEnum(PostType, {
    message: 'Type must be one of: TEXT, DUA, QUESTION, ANNOUNCEMENT',
  })
  @IsNotEmpty()
  type: PostType;

  @ApiPropertyOptional({
    example: 'Indeed, prayer prohibits immorality and wrongdoing. [Al-Ankabut: 45]',
    description: 'Text content of the post. Required for TEXT, QUESTION, and ANNOUNCEMENT posts.',
  })
  @ValidateIf((o) => o.type !== PostType.DUA || o.content)
  @IsString()
  @IsNotEmpty({ message: 'Content cannot be empty for this post type.' })
  @MaxLength(5000, { message: 'Content cannot exceed 5000 characters.' })
  content?: string;

  @ApiPropertyOptional({
    example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf',
    description: 'Linked Dua ID. Required when type is DUA.',
  })
  @ValidateIf((o) => o.type === PostType.DUA)
  @IsString()
  @IsNotEmpty({ message: 'duaId is required when post type is DUA.' })
  duaId?: string;

  @ApiPropertyOptional({
    enum: PostVisibility,
    default: PostVisibility.PUBLIC,
    description: 'Post visibility scope (PUBLIC)',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility = PostVisibility.PUBLIC;

  @ApiPropertyOptional({
    enum: PostStatus,
    default: PostStatus.PUBLISHED,
    description: 'Post status (PUBLISHED, DRAFT, etc.)',
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus = PostStatus.PUBLISHED;
}
