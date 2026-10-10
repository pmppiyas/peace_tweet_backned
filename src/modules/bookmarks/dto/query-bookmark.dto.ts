import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryBookmarkDto extends PaginationQueryDto {
  timeSlot?: string;
  type?: 'ALL' | 'DUA' | 'POST';
}

