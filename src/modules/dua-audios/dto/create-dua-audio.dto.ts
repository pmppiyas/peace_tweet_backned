import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDuaAudioDto {
  @ApiProperty({
    example: 'https://audio.example.com/duas/sleep-bukhari-6324.mp3',
    description: 'URL of the audio recording',
  })
  @IsString()
  @IsNotEmpty({ message: 'audioUrl is required' })
  audioUrl: string;

  @ApiPropertyOptional({
    example: 'Mishary Rashid Alafasy',
    description: 'Name of the Qari/Reciter',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reciterName?: string;

  @ApiPropertyOptional({
    example: 8,
    description: 'Audio duration in seconds',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    example: 'ar',
    description: 'Audio language code (e.g. ar, bn, en)',
    default: 'ar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string = 'ar';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether audio recitation pronunciation has been verified',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean = false;
}
