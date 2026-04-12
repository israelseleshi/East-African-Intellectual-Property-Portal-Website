import { apiClient } from './httpClient';

export interface Agent {
  id: string;
  name: string;
  country: string;
  city: string;
  subcity: string;
  woreda: string;
  houseNo: string;
  telephone: string;
  email: string;
  poBox: string;
  fax: string;
  createdAt: string;
}

export interface CreateAgentData {
  name: string;
  country?: string;
  city?: string;
  subcity?: string;
  woreda?: string;
  houseNo?: string;
  telephone?: string;
  email?: string;
  poBox?: string;
  fax?: string;
}

export const agentsApi = {
  list: async (): Promise<{ success: boolean; data: Agent[] }> => {
    const response = await apiClient.get('/agents');
    return response.data;
  },
  getById: async (id: string): Promise<{ success: boolean; data: Agent }> => {
    const response = await apiClient.get(`/agents/${id}`);
    return response.data;
  },
  create: async (data: CreateAgentData): Promise<{ success: boolean; data: Agent }> => {
    const response = await apiClient.post('/agents', data);
    return response.data;
  },
  update: async (id: string, data: CreateAgentData): Promise<{ success: boolean; data: Agent }> => {
    const response = await apiClient.put(`/agents/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/agents/${id}`);
    return response.data;
  }
};
