import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_FRIENDS_LIMIT,
  MAX_FRIENDS_LIMIT,
  MIN_FRIENDS_LIMIT,
} from '../../../common/constants';

// Query parameters for friend requests listing
export class FriendRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor ID for pagination to fetch records older than this cursor',
    example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: `Number of records to fetch per page (min: ${MIN_FRIENDS_LIMIT}, max: ${MAX_FRIENDS_LIMIT}, default: ${DEFAULT_FRIENDS_LIMIT})`,
    default: DEFAULT_FRIENDS_LIMIT,
    minimum: MIN_FRIENDS_LIMIT,
    maximum: MAX_FRIENDS_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_FRIENDS_LIMIT)
  @Max(MAX_FRIENDS_LIMIT)
  limit: number = DEFAULT_FRIENDS_LIMIT;
}

// Query parameters for friends listing with optional search
export class FriendQueryDto extends FriendRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Search string to filter friends by name or username',
    example: 'abdullah',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
