import apiClient from './client';

export interface EarningsSummary {
  currency: string;
  grossRevenue: number;
  orderCount: number;
  commissionRatePercent: number;
  earningsAmount: number;
  paidOutAmount: number;
  pendingAmount: number;
  availableAmount: number;
}

export interface EarningsByCourse {
  courseId: string;
  title: string;
  currency: string;
  orderCount: number;
  grossRevenue: number;
  earningsAmount: number;
}

export type PayoutMethod = 'PAYPAL' | 'BANK';
export type PayoutStatus = 'PENDING' | 'PAID' | 'REJECTED';

export interface PayoutAccount {
  id?: string;
  fullName: string;
  country: string;
  method: PayoutMethod;
  paypalEmail?: string;
  bankName?: string;
  bankAccountName?: string;
  iban?: string;
  swift?: string;
  currency: string;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  instructorName: string;
  requestedAmount: number;
  currency: string;
  method: PayoutMethod;
  destinationRef?: string;
  status: PayoutStatus;
  rejectionReason?: string;
  providerRef?: string;
  notes?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
}

export interface RevenueSummary {
  currency: string;
  totalCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  failedCount: number;
}

export interface AdminInstructorEarnings {
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  currency: string;
  grossRevenue: number;
  orderCount: number;
  earningsAmount: number;
  paidOutAmount: number;
  pendingAmount: number;
  availableAmount: number;
}

// Instructor endpoints
export async function fetchInstructorEarnings(): Promise<EarningsSummary[]> {
  const { data } = await apiClient.get<EarningsSummary[]>('/instructor/earnings');
  return data;
}

export async function fetchInstructorCourseEarnings(): Promise<EarningsByCourse[]> {
  const { data } = await apiClient.get<EarningsByCourse[]>('/instructor/earnings/courses');
  return data;
}

export async function fetchInstructorPayoutAccount(): Promise<PayoutAccount | null> {
  try {
    const { data } = await apiClient.get<PayoutAccount>('/instructor/payout-account');
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function upsertInstructorPayoutAccount(req: PayoutAccount): Promise<PayoutAccount> {
  const { data } = await apiClient.put<PayoutAccount>('/instructor/payout-account', req);
  return data;
}

export async function fetchInstructorPayouts(): Promise<PayoutRequest[]> {
  const { data } = await apiClient.get<PayoutRequest[]>('/instructor/payouts');
  return data;
}

export async function requestPayout(req: { requestedAmount: number; currency: string; method?: PayoutMethod; notes?: string }): Promise<PayoutRequest> {
  const { data } = await apiClient.post<PayoutRequest>('/instructor/payouts', req);
  return data;
}

// Admin endpoints
export async function fetchAdminRevenue(): Promise<RevenueSummary[]> {
  const { data } = await apiClient.get<RevenueSummary[]>('/admin/revenue');
  return data;
}

export async function fetchAdminInstructorEarnings(): Promise<AdminInstructorEarnings[]> {
  const { data } = await apiClient.get<AdminInstructorEarnings[]>('/admin/instructor-earnings');
  return data;
}

export async function fetchAdminPayouts(): Promise<PayoutRequest[]> {
  const { data } = await apiClient.get<PayoutRequest[]>('/admin/payouts');
  return data;
}

export async function confirmPayout(id: string): Promise<PayoutRequest> {
  const { data } = await apiClient.post<PayoutRequest>(`/admin/payouts/${id}/confirm`);
  return data;
}

export async function rejectPayout(id: string, rejectionReason: string): Promise<PayoutRequest> {
  const { data } = await apiClient.post<PayoutRequest>(`/admin/payouts/${id}/reject`, { rejectionReason });
  return data;
}
