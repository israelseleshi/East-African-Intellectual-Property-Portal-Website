import axios from 'axios';

const API_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const extractApiErrorMessage = (error: unknown): string => {
  const payload = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return payload.response?.data?.message || payload.response?.data?.error || payload.message || 'Request failed';
};
