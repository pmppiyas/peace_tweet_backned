import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'OldSecretPass123!',
    description: 'Current password (optional if setting password for the first time)',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    example: 'NewSecretPass123!',
    description: 'New password (min 6 chars, max 50 chars)',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  @MaxLength(50, { message: 'New password cannot exceed 50 characters' })
  newPassword: string;
}
