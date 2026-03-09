import { apiClient } from './httpClient';

export interface CasesQuery {
  q?: string;
  status?: string;
  jurisdiction?: string;
}

export const casesApi = {
  async list(query?: CasesQuery) {
    const response = await apiClient.get('/cases', { params: query });
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
  }
};
