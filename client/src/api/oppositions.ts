import { apiClient } from './httpClient';

export const oppositionsApi = {
  async listByCase(caseId: string) {
    const response = await apiClient.get(`/oppositions/case/${caseId}`);
    return response.data;
  },

  async create(payload: Record<string, unknown>) {
    const response = await apiClient.post('/oppositions', payload);
    return response.data;
  },

  async updateStatus(id: string, payload: { status: string; responseFiledDate?: string; outcome?: string }) {
    const response = await apiClient.patch(`/oppositions/${id}/status`, payload);
    return response.data;
  }
};
