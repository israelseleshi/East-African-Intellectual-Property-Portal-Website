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
  getAll: financialsApi.listInvoices,
  listDeleted: financialsApi.listDeletedInvoices,
  restore: financialsApi.restoreInvoice
};

export const metaService = {
  getNiceClasses: async () => {
    const response = await api.get('/nice-classes');
    return response.data;
  }
};

export const systemService = {
  getTrash: async () => {
    // Collect from multiple trash endpoints
    const [cases, clients, invoices] = await Promise.all([
      api.get('/cases/trash'),
      api.get('/clients/trash').catch(() => ({ data: [] })),
      financialsApi.listDeletedInvoices().catch(() => [])
    ]);
    
    const formattedCases = (cases.data || []).map((c: any) => ({ ...c, type: 'trademark_cases' }));
    const formattedClients = (clients.data || []).map((c: any) => ({ ...c, type: 'clients' }));
    const formattedInvoices = (invoices || []).map((i: any) => ({ ...i, type: 'invoices' }));

    return {
      items: [...formattedCases, ...formattedClients, ...formattedInvoices].sort(
        (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      )
    };
  },
  restoreFromTrash: async (type: string, id: string) => {
    if (type === 'invoices') {
      return financialsApi.restoreInvoice(id);
    }
    const endpoint = type === 'trademark_cases' ? '/cases' : '/clients';
    return api.post(`${endpoint}/${id}/restore`);
  },
  purgeFromTrash: async (type: string, id: string) => {
    if (type === 'invoices') {
      return financialsApi.deleteInvoice(id);
    }
    const endpoint = type === 'trademark_cases' ? `/cases/${id}/permanent` : `/clients/${id}/permanent`;
    return api.delete(endpoint);
  }
};

export const authService = authApi;
