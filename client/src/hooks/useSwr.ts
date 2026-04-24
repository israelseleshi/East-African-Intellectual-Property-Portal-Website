import useSWR, { SWRResponse, SWRConfiguration } from 'swr';
import { apiClient } from '@/api/httpClient';
import { swrConfig } from '@/api/swrConfig';

type FetcherFn<T> = () => Promise<T>;

export function useSwr<T>(
  key: string | null,
  fetcher?: FetcherFn<T>,
  options?: SWRConfiguration
): SWRResponse<T, Error> {
  return useSWR<T>(
    key,
    fetcher ?? (() => apiClient.get(key!).then(r => r.data)),
    { ...swrConfig, ...options }
  );
}

// Specialized hooks for common data fetching patterns
export interface DashboardStats {
  totalCases: number;
  activeTrademarks: number;
  pendingDeadlines: number;
  renewalWindow: number;
  totalInvoiced?: number;
  totalOutstanding?: number;
  totalOverdue?: number;
  collectionRate?: number;
}

export interface CurrencyStats {
  currency: string;
  totalInvoiced: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export interface RecentActivity {
  id: number;
  caseId: string;
  action: string;
  mark_name: string;
  createdAt: string;
}

export interface UnifiedData {
  stats: DashboardStats;
  currencyBreakdown?: CurrencyStats[];
  recentActivity: RecentActivity[];
  upcomingDeadlines: unknown[];
}

export interface CaseFilters {
  q?: string;
  status?: string;
  jurisdiction?: string;
  page?: number;
  limit?: number;
}

export function useDashboardData() {
  return useSwr<UnifiedData>('/dashboard/dashboard-unified');
}

export function useCases(filters?: CaseFilters) {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  
  const query = params.toString();
  const key = query ? `/cases?${query}` : '/cases';
  return useSwr(key);
}

export function useCase(id: string | null) {
  return useSwr(id ? `/cases/${id}` : null);
}

export interface ClientListResponse {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export function useClients(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const key = `/clients?page=${page}&limit=${limit}`;
  return useSwr<ClientListResponse>(key);
}

export function useClient(id: string | null) {
  return useSwr(id ? `/clients/${id}` : null);
}

export function useDeadlines() {
  return useSwr('/deadlines');
}

export function useUpcomingDeadlines() {
  return useSwr('/deadlines/upcoming');
}

export function useAgents() {
  return useSwr('/agents');
}

export function useAgent(id: string | null) {
  return useSwr(id ? `/agents/${id}` : null);
}

export function useNiceClasses() {
  return useSwr('/nice-classes');
}
