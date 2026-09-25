import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PostType } from '../../../common/enums/post-type.enum';

export class QueryFeedDto {
  @ApiPropertyOptional({
    description: 'Cursor (Post ID) for pagination to fetch items older than this cursor',
    example: 'd8a6e8b2-5f33-4f0e-9494-b1c73a0889cf',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return per page (min: 1, max: 50, default: 20)',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: PostType,
    description: 'Filter posts by specific type',
  })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;
}
