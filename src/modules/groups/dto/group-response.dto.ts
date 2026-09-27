import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupJoinRequestStatus } from '../../../common/enums/group-join-request-status.enum';
import { GroupMemberRole } from '../../../common/enums/group-member-role.enum';
import { GroupMembershipStatus } from '../../../common/enums/group-membership-status.enum';
import { GroupVisibility } from '../../../common/enums/group-visibility.enum';

export class GroupUserSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'Abu Bakr' })
  name: string;

  @ApiProperty({ example: 'abubakr' })
  username: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatarUrl: string | null;
}

export class GroupMembershipInfoDto {
  @ApiProperty({ enum: GroupMembershipStatus, example: GroupMembershipStatus.MEMBER })
  status: GroupMembershipStatus;

  @ApiPropertyOptional({ enum: GroupMemberRole, example: GroupMemberRole.MEMBER, nullable: true })
  role: GroupMemberRole | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  requestId?: string | null;
}

export class GroupDetailResponseDto {
  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22' })
  id: string;

  @ApiProperty({ example: 'Islamic Knowledge & Dua' })
  name: string;

  @ApiProperty({ example: 'islamic-knowledge-dua' })
  slug: string;

  @ApiPropertyOptional({
    example: 'A community for sharing authentic Islamic knowledge.',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: GroupVisibility, example: GroupVisibility.PUBLIC })
  visibility: GroupVisibility;

  @ApiProperty({ example: 42 })
  memberCount: number;

  @ApiPropertyOptional({ type: GroupMembershipInfoDto })
  membership?: GroupMembershipInfoDto;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  updatedAt: Date;
}

export class GroupMemberItemDto {
  @ApiProperty({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c33' })
  id: string;

  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22' })
  groupId: string;

  @ApiProperty({ enum: GroupMemberRole, example: GroupMemberRole.ADMIN })
  role: GroupMemberRole;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ type: GroupUserSummaryDto })
  user: GroupUserSummaryDto;
}

export class GroupJoinRequestItemDto {
  @ApiProperty({ example: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d44' })
  id: string;

  @ApiProperty({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22' })
  groupId: string;

  @ApiProperty({ enum: GroupJoinRequestStatus, example: GroupJoinRequestStatus.PENDING })
  status: GroupJoinRequestStatus;

  @ApiProperty({ example: '2026-09-27T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: GroupUserSummaryDto })
  user: GroupUserSummaryDto;
}

export class GroupActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully.' })
  message: string;
}

export class PaginatedGroupsResponseDto {
  @ApiProperty({ type: [GroupDetailResponseDto] })
  items: GroupDetailResponseDto[];

  @ApiPropertyOptional({ example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', nullable: true })
  nextCursor: string | null;
}

export class PaginatedGroupMembersResponseDto {
  @ApiProperty({ type: [GroupMemberItemDto] })
  items: GroupMemberItemDto[];

  @ApiPropertyOptional({ example: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', nullable: true })
  nextCursor: string | null;
}

export class PaginatedGroupJoinRequestsResponseDto {
  @ApiProperty({ type: [GroupJoinRequestItemDto] })
  items: GroupJoinRequestItemDto[];

  @ApiPropertyOptional({ example: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', nullable: true })
  nextCursor: string | null;
}
