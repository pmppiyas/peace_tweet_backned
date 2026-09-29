import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BloodGroup } from '../../../common/enums/blood-group.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Abdullah Al Mamun', description: 'Full name of user' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    example: 'abdullah99',
    description: 'Auto-generated username (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores and hyphens',
  })
  username?: string;

  @ApiProperty({ example: 'abdullah@example.com', description: 'Unique email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password (min 6 chars, at least 1 letter and 1 number)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(50, { message: 'Password cannot exceed 50 characters' })
  password: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ example: 'Dhaka, Bangladesh', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
  location?: string;

  @ApiProperty({ enum: BloodGroup, example: BloodGroup.A_POSITIVE, required: false })
  @IsOptional()
  @IsEnum(BloodGroup, { message: 'Invalid blood group value' })
  bloodGroup?: BloodGroup;
}
