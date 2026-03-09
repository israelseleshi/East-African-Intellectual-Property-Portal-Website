import { apiClient } from './httpClient';

export const documentsApi = {
  async generate(caseId: string, templateName: string) {
    const response = await apiClient.post('/documents/generate', { caseId, templateName });
    return response.data;
  },

  async upload(file: File, caseId: string, type: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('type', type);
    const response = await apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
