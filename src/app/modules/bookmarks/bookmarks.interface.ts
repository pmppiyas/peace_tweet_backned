export interface IBookmarkQuery {
  page?: number;
  limit?: number;
  timeSlot?: string;
  type?: 'ALL' | 'DUA' | 'POST';
  search?: string;
}
