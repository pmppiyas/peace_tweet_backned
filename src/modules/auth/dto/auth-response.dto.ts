import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup } from '../../../common/enums/blood-group.enum';
import { Role } from '../../../common/enums/role.enum';

export class UserProfileDto {
  @ApiProperty({ example: 'b6f6f1c4-1234-4b56-789a-0123456789ab' })
  id: string;

  @ApiProperty({ example: 'Abdullah Al Mamun' })
  name: string;

  @ApiProperty({ example: 'abdullah99' })
  username: string;

  @ApiProperty({ example: 'abdullah@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  location?: string | null;

  @ApiPropertyOptional({ enum: BloodGroup, example: BloodGroup.A_POSITIVE })
  bloodGroup?: BloodGroup | null;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  refreshToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...' })
  refreshToken: string;
}
