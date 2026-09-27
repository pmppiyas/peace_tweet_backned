import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { GroupVisibility } from '../../../common/enums/group-visibility.enum';

export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: 'Name of the group',
    example: 'Islamic Knowledge & Supplications',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Unique URL-friendly slug for the group',
    example: 'islamic-knowledge-supplications',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and single hyphens.',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Brief description of the group purpose',
    example: 'An updated community description.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Visibility of the group',
    enum: GroupVisibility,
  })
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @ApiPropertyOptional({
    description: 'Optional avatar URL for the group',
    example: 'https://images.unsplash.com/photo-islamic-updated.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
