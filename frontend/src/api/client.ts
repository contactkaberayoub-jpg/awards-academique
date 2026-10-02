import axios, { AxiosError, AxiosHeaders, type AxiosRequestHeaders } from 'axios';
import { authStorage } from '../auth/authStorage';

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the auth token
apiClient.interceptors.request.use(
  (config) => {
    // Skip token for login/register
    if (
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register')
    ) {
      return config;
    }
    const token = authStorage.getToken();
    if (token) {
      config.headers = (config.headers ?? new AxiosHeaders()) as AxiosRequestHeaders;
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Multipart uploads must not carry the global application/json Content-Type:
    // with that header set, axios silently serializes FormData to a JSON string,
    // which the multipart-only endpoints reject with HTTP 415.
    if (config.data instanceof FormData) {
      (config.headers as AxiosHeaders).delete('Content-Type');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Avoid infinite loops when already on login page
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/register')
    ) {
      authStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
