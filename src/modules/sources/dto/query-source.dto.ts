import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SourceType } from '../../../common/enums/source-type.enum';

export class QuerySourceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SourceType, description: 'Filter by source type' })
  @IsOptional()
  @IsEnum(SourceType)
  type?: SourceType;
}
