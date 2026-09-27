import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GroupVisibility } from '../../../common/enums/group-visibility.enum';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Name of the group',
    example: 'Islamic Knowledge & Dua',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Unique URL-friendly slug for the group',
    example: 'islamic-knowledge-dua',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and single hyphens.',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Brief description of the group purpose',
    example: 'A community for sharing authentic Islamic knowledge, supplications, and reflections.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Visibility of the group',
    enum: GroupVisibility,
    default: GroupVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility = GroupVisibility.PUBLIC;

  @ApiPropertyOptional({
    description: 'Optional avatar URL for the group',
    example: 'https://images.unsplash.com/photo-islamic.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
