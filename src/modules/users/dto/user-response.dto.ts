import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup } from '../../../common/enums/blood-group.enum';
import { Role } from '../../../common/enums/role.enum';
import { FriendshipStatusResponseDto } from '../../friends/dto/friend-response.dto';

export class UserDto {
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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1/cover.png' })
  coverUrl?: string | null;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  location?: string | null;

  @ApiPropertyOptional({ example: 'Bangladesh' })
  country?: string | null;

  @ApiPropertyOptional({ example: 'BD' })
  countryCode?: string | null;

  @ApiPropertyOptional({ example: 'Dhaka Division' })
  state?: string | null;

  @ApiPropertyOptional({ example: 'Dhaka' })
  city?: string | null;

  @ApiPropertyOptional({ enum: BloodGroup, example: BloodGroup.A_POSITIVE })
  bloodGroup?: BloodGroup | null;

  @ApiPropertyOptional({ example: 'Seeking peace and spiritual knowledge' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Standard Member' })
  badge?: string;

  @ApiPropertyOptional({ example: 'NON_VERIFIED' })
  userStatus?: string;

  @ApiPropertyOptional({ example: false })
  isDonor?: boolean;

  @ApiPropertyOptional({ example: 0 })
  donationCount?: number;

  @ApiPropertyOptional({ example: true })
  hasPassword?: boolean;

  @ApiPropertyOptional({ example: false })
  needPasswordUpdate?: boolean;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  updatedAt: Date;
}

export class UserProfileDto extends UserDto {
  @ApiPropertyOptional({ type: FriendshipStatusResponseDto })
  friendship?: FriendshipStatusResponseDto;
}
