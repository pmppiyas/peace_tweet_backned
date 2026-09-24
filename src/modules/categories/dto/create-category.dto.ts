import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'সকাল-সন্ধ্যা', description: 'Category name' })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'morning-evening',
    description: 'Unique URL slug (lowercase alphanumeric and hyphens)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 'সকাল ও সন্ধ্যার দৈনন্দিন মাসনুন দোয়া ও যিকিরসমূহ',
    description: 'Description of the category',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display sort order index', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number = 0;
}
