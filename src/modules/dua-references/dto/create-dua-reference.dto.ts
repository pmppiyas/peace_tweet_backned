import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDuaReferenceDto {
  @ApiProperty({
    example: 'd6f6f1c4-1234-4b56-789a-0123456789ab',
    description: 'ID of the source (Quran or Hadith book)',
  })
  @IsUUID('4', { message: 'sourceId must be a valid UUID' })
  @IsNotEmpty({ message: 'sourceId is required' })
  sourceId: string;

  @ApiProperty({
    example: '6324',
    description: 'Reference number, chapter, or verse details (e.g. 6324, Surah Al-Baqarah: 255)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reference number/location is required' })
  @MaxLength(200)
  reference: string;

  @ApiPropertyOptional({
    example: 'সহীহ বুখারী, কিতাবুদ দাওয়াত',
    description: 'Optional footnote or commentary note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this reference has been verified by Islamic scholar/moderator',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean = false;
}
