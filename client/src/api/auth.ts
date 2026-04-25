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
  },

  async forgotPassword(payload: { email: string }) {
    const response = await apiClient.post('/auth/forgot-password', payload);
    return response.data;
  },

  async resetPassword(payload: { email: string; otp: string; password: string }) {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },

  async updateProfile(payload: { fullName?: string; phone?: string; firmName?: string }) {
    const response = await apiClient.patch('/auth/profile', payload);
    return response.data;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    const response = await apiClient.post('/auth/change-password', payload);
    return response.data;
  },

  async listPendingAdmins() {
    const response = await apiClient.get('/auth/pending');
    return response.data;
  },

  async approveAdmin(userId: string) {
    const response = await apiClient.patch(`/auth/approve/${userId}`);
    return response.data;
  },

  async rejectAdmin(userId: string) {
    const response = await apiClient.patch(`/auth/reject/${userId}`);
    return response.data;
  },

  async setup2FA() {
    const response = await apiClient.post('/auth/2fa/setup');
    return response.data;
  },

  async verify2FA(code: string) {
    const response = await apiClient.post('/auth/2fa/verify', { code });
    return response.data;
  },

  async disable2FA(code: string) {
    const response = await apiClient.post('/auth/2fa/disable', { code });
    return response.data;
  },

  async verify2FALogin(userId: string, code: string) {
    const response = await apiClient.post('/auth/2fa/verify-login', { userId, code });
    return response.data;
  },

  async get2FAStatus() {
    const response = await apiClient.get('/auth/2fa/status');
    return response.data;
  },

  async getBackupCodes() {
    const response = await apiClient.get('/auth/2fa/backup-codes');
    return response.data;
  }
};
