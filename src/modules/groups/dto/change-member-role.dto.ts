import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { GroupMemberRole } from '../../../common/enums/group-member-role.enum';

export class ChangeMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member. Note: OWNER cannot be assigned via this endpoint.',
    enum: [GroupMemberRole.MEMBER, GroupMemberRole.MODERATOR, GroupMemberRole.ADMIN],
    example: GroupMemberRole.MODERATOR,
  })
  @IsNotEmpty()
  @IsEnum(GroupMemberRole, {
    message: 'Role must be one of: MEMBER, MODERATOR, ADMIN',
  })
  role: GroupMemberRole;
}
