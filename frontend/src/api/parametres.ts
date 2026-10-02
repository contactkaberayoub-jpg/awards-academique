import apiClient from './client';

export interface ParametreResponse {
  id: number;
  key: string;
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateParametreRequest {
  parametreValue: string;
  description?: string;
}

export interface UpdateRevenueSplitRequest {
  platformPercentage: number;
  instructorPercentage: number;
}

export async function fetchAdminParametres(): Promise<ParametreResponse[]> {
  const { data } = await apiClient.get<ParametreResponse[]>('/admin/parametres');
  return data;
}

export async function updateAdminParametre(key: string, request: UpdateParametreRequest): Promise<ParametreResponse> {
  const { data } = await apiClient.put<ParametreResponse>(`/admin/parametres/${key}`, request);
  return data;
}

export async function updateRevenueSplit(request: UpdateRevenueSplitRequest): Promise<ParametreResponse[]> {
  const { data } = await apiClient.put<ParametreResponse[]>('/admin/parametres/revenue-split', request);
  return data;
}