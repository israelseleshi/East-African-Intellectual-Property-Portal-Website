import { apiClient } from './httpClient';

export const settingsApi = {
  getSettings: async () => {
    return apiClient.get('/settings');
  },
  
  updateSettings: async (data: {
    companyName?: string;
    companyAddress?: string;
    companyCity?: string;
    companyEmail?: string;
    companyPhone?: string;
    companyWebsite?: string;
    taxId?: string;
    logoUrl?: string;
  }) => {
    return apiClient.put('/settings', data);
  },

  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.post('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};