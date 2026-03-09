import { useCallback, useMemo } from 'react';
import type { AxiosRequestConfig, Method } from 'axios';
import { api } from '../utils/api';

const toHeadersRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
};

const normalizeEndpoint = (endpoint: string): string => endpoint.replace(/^\/api/, '');

interface ApiRequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
}

export function useApi() {
  const request = useCallback(async (endpoint: string, options: ApiRequestOptions = {}) => {
    const method = (options.method ?? 'GET').toUpperCase() as Method;
    const headers = toHeadersRecord(options.headers);
    let body: unknown = options.body;

    if (typeof body === 'string' && body.length > 0) {
      try {
        body = JSON.parse(body);
      } catch {
        // Leave non-JSON strings untouched (e.g. text/plain payloads).
      }
    }

    const config: AxiosRequestConfig = {
      url: normalizeEndpoint(endpoint),
      method,
      data: body,
      headers: {
        ...headers,
        ...(body instanceof FormData ? {} : { 'Content-Type': headers['Content-Type'] ?? 'application/json' })
      }
    };

    try {
      const response = await api.request(config);
      return response.status === 204 ? null : response.data;
    } catch (error: unknown) {
      const errorData = (error as { response?: { data?: { message?: string; error?: string } }; message?: string });
      const message = errorData.response?.data?.message || errorData.response?.data?.error || errorData.message || 'Request failed';
      throw new Error(message);
    }
  }, []);

  const get = useCallback((endpoint: string) => request(endpoint, { method: 'GET' }), [request]);
  const post = useCallback((endpoint: string, body: unknown) => request(endpoint, { method: 'POST', body }), [request]);
  const postForm = useCallback((endpoint: string, formData: FormData) => request(endpoint, { method: 'POST', body: formData }), [request]);
  const patch = useCallback((endpoint: string, body?: unknown) => request(endpoint, { method: 'PATCH', ...(body !== undefined && { body }) }), [request]);
  const put = useCallback((endpoint: string, body: unknown) => request(endpoint, { method: 'PUT', body }), [request]);
  const del = useCallback((endpoint: string) => request(endpoint, { method: 'DELETE' }), [request]);

  // Keep object identity stable so effects that depend on `api` do not refire endlessly.
  return useMemo(
    () => ({ get, post, postForm, patch, put, delete: del, request }),
    [get, post, postForm, patch, put, del, request]
  );
}
