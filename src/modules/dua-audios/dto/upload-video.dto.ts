import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadVideoDto {
  @ApiPropertyOptional({
    description: 'Name of the Qari / Reciter (e.g. Mishary Rashid Alafasy)',
    example: 'Mishary Rashid Alafasy',
  })
  @IsOptional()
  @IsString()
  reciterName?: string;

  @ApiPropertyOptional({
    description: 'Language code or name of the recitation (e.g. ar, bn, en)',
    example: 'ar',
  })
  @IsOptional()
  @IsString()
  language?: string;
}
