import { apiClient } from './httpClient';

export const jurisdictionsApi = {
  async list() {
    const response = await apiClient.get('/jurisdictions');
    return response.data;
  }
};
