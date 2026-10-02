export type SearchScope = 'ALL' | 'USERS' | 'DUAS' | 'GROUPS' | 'POSTS';

export interface SearchQueryParams {
  q?: string;
  type?: SearchScope;
  limit?: number;
  page?: number;
}

export interface AddSearchHistoryInput {
  query: string;
  entityType?: 'KEYWORD' | 'USER' | 'DUA' | 'GROUP';
  entityId?: string | null;
  entityName?: string | null;
  entityAvatar?: string | null;
  entitySubtext?: string | null;
}
