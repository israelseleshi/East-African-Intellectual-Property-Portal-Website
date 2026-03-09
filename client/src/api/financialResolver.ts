import { apiClient } from './httpClient';

const FINANCIAL_BASES = ['/financials', '/invoicing'] as const;

export const withFinancialEndpointFallback = async <T>(
  run: (basePath: (typeof FINANCIAL_BASES)[number]) => Promise<T>
): Promise<T> => {
  let lastError: unknown;

  for (const basePath of FINANCIAL_BASES) {
    try {
      return await run(basePath);
    } catch (error) {
      const typedError = error as { response?: { status?: number } };
      lastError = error;
      if (typedError.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const postFinancial = async <T>(suffix: string, payload: unknown): Promise<T> => {
  return withFinancialEndpointFallback(async (basePath) => {
    const response = await apiClient.post<T>(`${basePath}${suffix}`, payload);
    return response.data;
  });
};

export const getFinancial = async <T>(suffix: string): Promise<T> => {
  return withFinancialEndpointFallback(async (basePath) => {
    const response = await apiClient.get<T>(`${basePath}${suffix}`);
    return response.data;
  });
};
