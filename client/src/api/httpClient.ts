import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const AUTH_ERROR_CODES = ['AUTH_TOKEN_REQUIRED', 'AUTH_TOKEN_INVALID', 'REFRESH_TOKEN_MISSING', 'REFRESH_TOKEN_INVALID', 'REFRESH_TOKEN_EXPIRED', 'REFRESH_TOKEN_REVOKED', 'REFRESH_FAILED', 'USER_NOT_FOUND'];

const isAuthError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number; data?: { code?: string } } };
  return err.response?.status === 401 || AUTH_ERROR_CODES.includes(err.response?.data?.code || '');
};

const handleAuthFailure = () => {
  useAuthStore.getState().logout();
  window.location.href = '/login';
};

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

const readCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

apiClient.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) {
      config.headers['x-csrf-token'] = csrf;
    }
  }
  const token = readCookie('access_token');
  if (token) {
    config.headers['x-access-token'] = token;
  }
  return config;
});

let isRefreshing = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (isAuthError(error) && !(original as any)._retry) {
      if (isRefreshing) {
        return Promise.reject(error);
      }
      (original as any)._retry = true;
      isRefreshing = true;
      try {
        await apiClient.post('/auth/refresh');
        isRefreshing = false;
        return apiClient(original);
      } catch (refreshErr) {
        isRefreshing = false;
        handleAuthFailure();
        return Promise.reject(refreshErr);
      }
    }
    if (isAuthError(error)) {
      handleAuthFailure();
    }
    return Promise.reject(error);
  }
);

export const extractApiErrorMessage = (error: unknown): string => {
  const payload = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return payload.response?.data?.message || payload.response?.data?.error || payload.message || 'Request failed';
};
