import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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
    description: 'Type of post (TEXT, DUA, BLOOD_REQUEST, QUESTION, ANNOUNCEMENT)',
  })
  @IsEnum(PostType, {
    message: 'Type must be one of: TEXT, DUA, BLOOD_REQUEST, QUESTION, ANNOUNCEMENT',
  })
  @IsNotEmpty()
  type: PostType;

  @ApiPropertyOptional({
    example: 'Indeed, prayer prohibits immorality and wrongdoing. [Al-Ankabut: 45]',
    description: 'Text content of the post.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Content cannot exceed 5000 characters.' })
  content?: string;

  @ApiPropertyOptional({
    example: ['https://example.com/uploads/photo1.jpg'],
    description: 'List of image/photo URLs attached to this post (General post).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({
    example: 'COLLAGE',
    description: 'Layout style for multiple photos: COLLAGE or SWIPE.',
  })
  @IsOptional()
  @IsString()
  mediaLayout?: string;

  @ApiPropertyOptional({
    example: 'blessed',
    description: 'Feeling attached to this post (e.g., blessed, grateful, happy).',
  })
  @IsOptional()
  @IsString()
  feeling?: string;

  @ApiPropertyOptional({
    example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf',
    description: 'Linked Dua ID. Optional if duaData is provided.',
  })
  @IsOptional()
  @IsString()
  duaId?: string;

  @ApiPropertyOptional({
    description: 'Embedded Dua data to create a new Dua alongside the post.',
  })
  @IsOptional()
  duaData?: {
    title?: string;
    transliteration?: string;
    meaning?: string;
    meaningBangla?: string;
    fadilah?: string;
    arabicText?: string;
  };

  @ApiPropertyOptional({
    example: 'c6f6f1c4-1234-4b56-789a-0123456789ab',
    description: 'Linked Blood Request ID. Optional if bloodRequestData is provided.',
  })
  @IsOptional()
  @IsString()
  bloodRequestId?: string;

  @ApiPropertyOptional({
    description: 'Embedded Blood Request data to create a new blood request alongside the post.',
  })
  @IsOptional()
  bloodRequestData?: {
    patientName: string;
    patientAge?: number;
    problem?: string;
    bloodGroup: any;
    units?: number;
    hospitalName: string;
    hospitalAddress?: string;
    location: string;
    contactNumber: string;
    alternateContact?: string;
    neededDate: string | Date;
    urgency?: any;
    note?: string;
    forMyself?: boolean;
  };

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
