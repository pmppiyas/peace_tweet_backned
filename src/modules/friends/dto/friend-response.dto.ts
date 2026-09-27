import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RelationshipStatus } from '../../../common/enums/relationship-status.enum';

// Summary of user profile in friend listings
export class FriendUserSummaryDto {
  @ApiProperty({ example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf' })
  id: string;

  @ApiProperty({ example: 'Abdullah Al Mamun' })
  name: string;

  @ApiProperty({ example: 'abdullah99' })
  username: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatar: string | null;
}

// Friend item representation
export class FriendItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf' })
  friendId: string;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  friendSince: Date;

  @ApiProperty({ type: FriendUserSummaryDto })
  user: FriendUserSummaryDto;
}

// Friend request item representation
export class FriendRequestItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ type: FriendUserSummaryDto })
  sender?: FriendUserSummaryDto;

  @ApiPropertyOptional({ type: FriendUserSummaryDto })
  receiver?: FriendUserSummaryDto;
}

// Friendship status response
export class FriendshipStatusResponseDto {
  @ApiProperty({ enum: RelationshipStatus, example: RelationshipStatus.FRIENDS })
  status: RelationshipStatus;

  @ApiPropertyOptional({ example: null, nullable: true })
  requestId: string | null;
}

// Paginated friends response
export class PaginatedFriendsResponseDto {
  @ApiProperty({ type: [FriendItemDto] })
  items: FriendItemDto[];

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nullable: true })
  nextCursor: string | null;
}

// Paginated friend requests response
export class PaginatedFriendRequestsResponseDto {
  @ApiProperty({ type: [FriendRequestItemDto] })
  items: FriendRequestItemDto[];

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nullable: true })
  nextCursor: string | null;
}

// Action confirmation response
export class FriendActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Friend request sent successfully.' })
  message: string;
}
