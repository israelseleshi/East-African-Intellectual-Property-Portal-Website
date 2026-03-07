import axios from 'axios';

const API_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const trademarkService = {
  getCases: async (query?: { q?: string; status?: string; jurisdiction?: string }) => {
    const params = new URLSearchParams();
    if (query?.q) params.append('q', query.q);
    if (query?.status) params.append('status', query.status);
    if (query?.jurisdiction) params.append('jurisdiction', query.jurisdiction);

    const response = await api.get(`/cases?${params.toString()}`);
    return response.data;
  },
  getCase: async (id: string) => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },
  createCase: async (data: Record<string, unknown>) => {
    const response = await api.post('/cases', data);
    return response.data;
  },
  updateStatus: async (id: string, status: string, actionNote?: string) => {
    const response = await api.patch(`/cases/${id}/status`, { status, actionNote });
    return response.data;
  },
  updateFlowStage: async (id: string, stage: string, triggerDate?: string, notes?: string, extraData: Record<string, unknown> = {}) => {
    const response = await api.patch(`/cases/${id}/flow-stage`, { stage, triggerDate, notes, ...extraData });
    return response.data;
  },
  deleteCase: async (id: string) => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
  },
};

export const clientService = {
  getClients: async (params?: { q?: string; type?: string; page?: number; limit?: number }) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },
  bulkDelete: async (ids: string[]) => {
    const response = await api.post('/clients/bulk-delete', { ids });
    return response.data;
  },
  getDuplicates: async () => {
    const response = await api.get('/clients/duplicates');
    return response.data;
  },
  mergeClients: async (sourceId: string, targetId: string) => {
    const response = await api.post('/clients/merge', { sourceId, targetId });
    return response.data;
  },
  getClient: async (id: string) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },
  createClient: async (data: Record<string, unknown>) => {
    const response = await api.post('/clients', data);
    return response.data;
  },
  updateClient: async (id: string, data: Record<string, unknown>) => {
    const response = await api.patch(`/clients/${id}`, data);
    return response.data;
  },
};

export const deadlineService = {
  getUpcomingDeadlines: async (days: number = 30) => {
    const response = await api.get(`/deadlines/upcoming?days=${days}`);
    return response.data;
  },
  completeDeadline: async (id: string) => {
    const response = await api.patch(`/deadlines/${id}/complete`);
    return response.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getUnifiedDashboard: async () => {
    const response = await api.get('/dashboard/dashboard-unified');
    return response.data;
  },
};

export const documentService = {
  generate: async (caseId: string, templateName: string) => {
    const response = await api.post('/documents/generate', { caseId, templateName });
    return response.data;
  },
  upload: async (file: File, caseId: string, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('type', type);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export const invoiceService = {
  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/invoices');
    return response.data;
  }
};

export const metaService = {
  getNiceClasses: async () => {
    const response = await api.get('/nice-classes');
    return response.data;
  },
};
