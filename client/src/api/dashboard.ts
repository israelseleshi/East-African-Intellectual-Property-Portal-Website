import { apiClient } from './httpClient';

export const dashboardApi = {
  async stats() {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  async unified() {
    const response = await apiClient.get('/dashboard/dashboard-unified');
    return response.data;
  }
};
