export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export interface ApiListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiListMeta;
}
