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
  @ApiProperty({
    example: 'ঘুমানোর সময় পড়ার দোয়া',
    description: 'Title or name of the Dua',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'রাসূলুল্লাহ (সা.) ঘুমানোর পূর্বে এই দোয়া পাঠ করতেন...',
    description: 'Virtues, context, or benefits (Fadilah) of the Dua',
  })
  @IsString()
  @IsNotEmpty({ message: 'Fadilah is required' })
  fadilah: string;

  @ApiProperty({
    example: 'হে আল্লাহ! আপনারই নামে আমি মৃত্যুবরণ (ঘুমাই) করছি...',
    description: 'Bangla translation and pronunciation representation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Bangla text of Dua is required' })
  duaBangla: string;

  @ApiProperty({
    example: 'হে আল্লাহ! আপনার নাম নিয়ে আমি মৃত্যুবরণ করি এবং জীবিত হই।',
    description: 'Detailed meaning and explanation in Bengali',
  })
  @IsString()
  @IsNotEmpty({ message: 'Bengali meaning is required' })
  meaningBangla: string;

  @ApiPropertyOptional({
    example: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    description: 'Original Arabic text with Tashkeel (harakat)',
  })
  @IsOptional()
  @IsString()
  arabicText?: string;

  @ApiPropertyOptional({
    example: "Bismika Allahumma amootu wa-ahya",
    description: 'English / Latin transliteration of the Arabic text',
  })
  @IsOptional()
  @IsString()
  transliteration?: string;

  @ApiProperty({
    example: 'c6f6f1c4-1234-4b56-789a-0123456789ab',
    description: 'ID of Category this Dua belongs to',
  })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

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
