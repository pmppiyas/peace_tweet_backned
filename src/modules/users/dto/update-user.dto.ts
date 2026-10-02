import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BloodGroup } from '../../../common/enums/blood-group.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Abdullah Al Mamun' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'abdullah99' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ example: 'abdullah@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1/cover.png' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ enum: BloodGroup, example: BloodGroup.A_POSITIVE })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'Seeking peace and spiritual knowledge' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  bio?: string;

  @ApiPropertyOptional({ example: 'Standard Member' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  badge?: string;

  @ApiPropertyOptional({ example: 'NON_VERIFIED' })
  @IsOptional()
  @IsString()
  userStatus?: any;
}
