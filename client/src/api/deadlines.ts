import { apiClient } from './httpClient';

export const deadlinesApi = {
  async listUpcoming(days = 30) {
    const response = await apiClient.get('/deadlines/upcoming', { params: { days } });
    return response.data;
  },

  async complete(id: string) {
    const response = await apiClient.patch(`/deadlines/${id}/complete`);
    return response.data;
  }
};
