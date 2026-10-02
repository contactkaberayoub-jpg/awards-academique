import apiClient from '../api/client';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '../types';

export const authApi = {
  login(payload: LoginRequest) {
    return apiClient.post<AuthResponse>('/auth/login', payload);
  },
  register(payload: RegisterRequest) {
    return apiClient.post<AuthResponse>('/auth/register', payload);
  },
  me() {
    return apiClient.get<AuthResponse>('/auth/me');
  },
  verifyEmail(token: string) {
    return apiClient.post<AuthResponse>('/auth/verify-email', { token });
  },
  resendVerification(email: string) {
    return apiClient.post<Record<string, string>>(
      '/auth/resend-verification',
      { email }
    );
  },
  forgotPassword(email: string) {
    return apiClient.post<Record<string, string>>(
      '/auth/forgot-password',
      { email }
    );
  },
  resetPassword(token: string, newPassword: string) {
    return apiClient.post<Record<string, string>>(
      '/auth/reset-password',
      { token, newPassword, confirmPassword: newPassword }
    );
  },
  exchangeGoogleCode(code: string) {
    return apiClient.post<AuthResponse>('/auth/google/exchange', { code });
  },
};
