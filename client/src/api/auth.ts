import { apiClient } from './httpClient';

export const authApi = {
  async login(payload: { email: string; password: string }) {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  async register(payload: { fullName: string; email: string; phone?: string; firmName?: string; password: string }) {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  async verifyOtp(payload: { email: string; otp: string }) {
    const response = await apiClient.post('/auth/verify-otp', payload);
    return response.data;
  },

  async me() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
};
