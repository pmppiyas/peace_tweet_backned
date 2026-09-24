import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DuaStatus } from '../../../common/enums/dua-status.enum';

export class QueryDuaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ enum: DuaStatus, description: 'Filter by publication status (Admin/Moderator only for DRAFT/ARCHIVED)' })
  @IsOptional()
  @IsEnum(DuaStatus)
  status?: DuaStatus;
}
