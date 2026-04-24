import { apiClient } from './httpClient';

export interface CasesQuery {
  q?: string;
  status?: string;
  jurisdiction?: string;
  page?: number;
  pageSize?: number;
  sort?: 'created_at_desc' | 'created_at_asc' | 'mark_name_asc' | 'mark_name_desc' | 'filing_date_desc' | 'filing_date_asc';
  includeDeadlines?: boolean;
}

export interface CasesListResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const casesApi = {
  async list(query?: CasesQuery) {
    const response = await apiClient.get('/cases', {
      params: {
        page: 1,
        pageSize: 200,
        includeDeadlines: true,
        ...query
      }
    });
    return Array.isArray(response.data) ? response.data : (response.data?.data || []);
  },

  async listPage<T = any>(query?: CasesQuery): Promise<CasesListResponse<T>> {
    const response = await apiClient.get('/cases', {
      params: {
        page: 1,
        pageSize: 25,
        includeDeadlines: false,
        sort: 'created_at_desc',
        ...query
      }
    });
    if (Array.isArray(response.data)) {
      return {
        data: response.data as T[],
        total: response.data.length,
        page: 1,
        pageSize: response.data.length || 25,
        hasMore: false
      };
    }
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get(`/cases/${id}`);
    return response.data;
  },

  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post('/cases', payload);
    return response.data;
  },

  async updateStatus(id: string, status: string, actionNote?: string) {
    const response = await apiClient.patch(`/cases/${id}/status`, { status, actionNote });
    return response.data;
  },

  async updateFlowStage(id: string, stage: string, triggerDate?: string, notes?: string, extraData: Record<string, unknown> = {}) {
    const response = await apiClient.patch(`/cases/${id}/flow-stage`, { stage, triggerDate, notes, ...extraData });
    return response.data;
  },

  async updateCase(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch(`/cases/${id}`, payload);
    return response.data;
  },

  async remove(id: string) {
    const response = await apiClient.delete(`/cases/${id}`);
    return response.data;
  },

  async bulkDelete(ids: string[]) {
    const response = await apiClient.post('/cases/bulk-delete', { ids });
    return response.data;
  },

  async initiateRenewal(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.post(`/cases/${id}/renewal`, payload);
    return response.data;
  }
};
