import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DuaStatus } from '../../../common/enums/dua-status.enum';

export class CreateDuaDto {
  @ApiPropertyOptional({
    example: 'ঘুমানোর সময় পড়ার দোয়া',
    description: 'Title or name of the Dua',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'রাসূলুল্লাহ (সা.) ঘুমানোর পূর্বে এই দোয়া পাঠ করতেন...',
    description: 'Virtues, context, or benefits (Fadilah) of the Dua',
  })
  @IsOptional()
  @IsString()
  fadilah?: string;

  @ApiPropertyOptional({
    example: 'আল্লাহুম্মা বিসমিকা আমূতু ওয়া আহ্ইয়া',
    description: 'Pronunciation of Arabic in Bengali letters (transliteration / উচ্চারণ)',
  })
  @IsOptional()
  @IsString()
  transliteration?: string;

  @ApiPropertyOptional({
    example: 'আল্লাহুম্মা বিসমিকা আমূতু ওয়া আহ্ইয়া',
    description: 'Bangla pronunciation / text representation',
  })
  @IsOptional()
  @IsString()
  duaBangla?: string;

  @ApiPropertyOptional({
    example: 'হে আল্লাহ! আপনার নাম নিয়ে আমি মৃত্যুবরণ করি এবং জীবিত হই।',
    description: 'Detailed meaning and explanation in Bengali',
  })
  @IsOptional()
  @IsString()
  meaningBangla?: string;

  @ApiPropertyOptional({
    example: 'হে আল্লাহ! আপনার নাম নিয়ে আমি মৃত্যুবরণ করি এবং জীবিত হই।',
    description: 'Meaning in Bengali (alias)',
  })
  @IsOptional()
  @IsString()
  meaning?: string;

  @ApiPropertyOptional({
    example: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    description: 'Original Arabic text with Tashkeel (harakat)',
  })
  @IsOptional()
  @IsString()
  arabicText?: string;

  @ApiPropertyOptional({
    example: 'c6f6f1c4-1234-4b56-789a-0123456789ab',
    description: 'ID of Category (optional - auto-categorized if not provided)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: DuaStatus,
    default: DuaStatus.DRAFT,
    example: DuaStatus.PUBLISHED,
    description: 'Publication status',
  })
  @IsOptional()
  @IsEnum(DuaStatus)
  status?: DuaStatus = DuaStatus.DRAFT;
}
