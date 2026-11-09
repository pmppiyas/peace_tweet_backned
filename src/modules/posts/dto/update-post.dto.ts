import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
    example: ['https://example.com/uploads/photo1.jpg'],
    description: 'Updated list of image/photo URLs attached to this post.',
  })
  @IsOptional()
  mediaUrls?: string[];

  @ApiPropertyOptional({
    example: 'COLLAGE',
    description: 'Updated layout style for multiple photos: COLLAGE or SWIPE.',
  })
  @IsOptional()
  @IsString()
  mediaLayout?: string;

  @ApiPropertyOptional({
    example: 'blessed',
    description: 'Updated feeling attached to this post.',
  })
  @IsOptional()
  @IsString()
  feeling?: string;

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

  @ApiPropertyOptional({
    description: 'Embedded Dua data to update the attached Dua.',
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
    description: 'Embedded Blood Request data to update the attached blood request.',
  })
  @IsOptional()
  bloodRequestData?: {
    patientName?: string;
    patientAge?: number;
    problem?: string;
    bloodGroup?: any;
    units?: number;
    hospitalName?: string;
    country?: string;
    countryCode?: string;
    state?: string;
    city?: string;
    location?: string;
    contactNumber?: string;
    alternateContact?: string;
    neededDate?: string | Date;
    forMyself?: boolean;
    note?: string;
  };
}
