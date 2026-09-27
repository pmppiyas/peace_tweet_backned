import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_GROUPS_LIMIT,
  MAX_GROUPS_LIMIT,
  MIN_GROUPS_LIMIT,
} from '../../../common/constants';
import { GroupMemberRole } from '../../../common/enums/group-member-role.enum';

export class MemberQueryDto {
  @ApiPropertyOptional({
    description: 'Number of members to return per page',
    default: DEFAULT_GROUPS_LIMIT,
    minimum: MIN_GROUPS_LIMIT,
    maximum: MAX_GROUPS_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_GROUPS_LIMIT)
  @Max(MAX_GROUPS_LIMIT)
  limit?: number = DEFAULT_GROUPS_LIMIT;

  @ApiPropertyOptional({
    description: 'Cursor (member ID) for pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Search term for member name or username',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by member role',
    enum: GroupMemberRole,
  })
  @IsOptional()
  @IsEnum(GroupMemberRole)
  role?: GroupMemberRole;
}
