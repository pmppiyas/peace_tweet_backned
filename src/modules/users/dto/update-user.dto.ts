import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Abdullah Al Mamun' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'NewSecretPass123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password?: string;
}
