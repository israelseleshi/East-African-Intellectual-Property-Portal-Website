import { authApi } from '../api/auth';
import { casesApi } from '../api/cases';
import { clientsApi } from '../api/clients';
import { dashboardApi } from '../api/dashboard';
import { deadlinesApi } from '../api/deadlines';
import { documentsApi } from '../api/documents';
import { financialsApi } from '../api/financials';
import { apiClient } from '../api/httpClient';

export const api = apiClient;

export const trademarkService = {
  getCases: casesApi.list,
  getCase: casesApi.getById,
  createCase: casesApi.create,
  updateStatus: casesApi.updateStatus,
  updateFlowStage: casesApi.updateFlowStage,
  updateCase: casesApi.updateCase,
  deleteCase: casesApi.remove
};

export const clientService = {
  getClients: clientsApi.list,
  bulkDelete: clientsApi.bulkDelete,
  getDuplicates: clientsApi.getDuplicates,
  mergeClients: clientsApi.merge,
  getClient: clientsApi.getById,
  createClient: clientsApi.create,
  updateClient: clientsApi.update
};

export const deadlineService = {
  getUpcomingDeadlines: deadlinesApi.listUpcoming,
  completeDeadline: deadlinesApi.complete
};

export const dashboardService = {
  getStats: dashboardApi.stats,
  getUnifiedDashboard: dashboardApi.unified
};

export const documentService = {
  generate: documentsApi.generate,
  upload: documentsApi.upload
};

export const invoiceService = {
  create: financialsApi.createInvoice,
  getAll: financialsApi.listInvoices
};

export const metaService = {
  getNiceClasses: async () => {
    const response = await api.get('/nice-classes');
    return response.data;
  }
};

export const authService = authApi;
