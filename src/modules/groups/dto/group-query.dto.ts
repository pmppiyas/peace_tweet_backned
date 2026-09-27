import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_GROUPS_LIMIT,
  MAX_GROUPS_LIMIT,
  MIN_GROUPS_LIMIT,
} from '../../../common/constants';
import { GroupVisibility } from '../../../common/enums/group-visibility.enum';

export class GroupQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items to return per page',
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
    description: 'Cursor (group ID) for pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Search term for group name, slug, or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by group visibility',
    enum: GroupVisibility,
  })
  @IsOptional()
  @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;
}
