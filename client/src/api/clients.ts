import { apiClient } from './httpClient';

export interface ClientsQuery {
  q?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const clientsApi = {
  async list(params?: ClientsQuery) {
    const response = await apiClient.get('/clients', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post('/clients', payload);
    return response.data;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const response = await apiClient.patch(`/clients/${id}`, payload);
    return response.data;
  },

  async bulkDelete(ids: string[]) {
    const response = await apiClient.post('/clients/bulk-delete', { ids });
    return response.data;
  },

  async getDuplicates() {
    const response = await apiClient.get('/clients/duplicates');
    return response.data;
  },

  async merge(sourceId: string, targetId: string) {
    const response = await apiClient.post('/clients/merge', { sourceId, targetId });
    return response.data;
  }
};
