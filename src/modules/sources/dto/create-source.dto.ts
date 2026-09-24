import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SourceType } from '../../../common/enums/source-type.enum';

export class CreateSourceDto {
  @ApiProperty({ example: 'Sahih al-Bukhari', description: 'Name of the source book/origin' })
  @IsString()
  @IsNotEmpty({ message: 'Source name is required' })
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    enum: SourceType,
    example: SourceType.HADITH,
    description: 'Type of Islamic source (QURAN, HADITH, OTHER)',
  })
  @IsEnum(SourceType, { message: 'Source type must be QURAN, HADITH, or OTHER' })
  @IsNotEmpty({ message: 'Source type is required' })
  type: SourceType;

  @ApiPropertyOptional({
    example: 'সহীহুল বুখারী - ইমাম বুখারী (রহ.) সংকলিত প্রামাণ্য হাদীস গ্রন্থ',
    description: 'Description of the source',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
