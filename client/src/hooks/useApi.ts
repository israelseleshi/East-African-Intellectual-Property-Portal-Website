import { useCallback } from 'react';

const API_BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function useApi() {
  const getAuthToken = () => localStorage.getItem('token');

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // Return null for 204 No Content
    if (response.status === 204) return null;

    return response.json();
  }, []);

  const get = useCallback((endpoint: string) => request(endpoint, { method: 'GET' }), [request]);
  const post = useCallback((endpoint: string, body: unknown) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }), [request]);
  const postForm = useCallback((endpoint: string, formData: FormData) => request(endpoint, { method: 'POST', body: formData }), [request]);
  const patch = useCallback((endpoint: string, body?: unknown) => request(endpoint, { method: 'PATCH', ...(body !== undefined && { body: JSON.stringify(body) }) }), [request]);
  const put = useCallback((endpoint: string, body: unknown) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }), [request]);
  const del = useCallback((endpoint: string) => request(endpoint, { method: 'DELETE' }), [request]);

  return { get, post, postForm, patch, put, delete: del, request };
}
