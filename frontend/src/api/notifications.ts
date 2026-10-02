import apiClient from './client';

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  fetchMine(): Promise<NotificationResponse[]> {
    return apiClient.get<NotificationResponse[]>('/notifications/mine').then((response) => response.data);
  },
  unreadCount(): Promise<number> {
    return apiClient.get<number>('/notifications/unread-count').then((response) => Number(response.data));
  },
  markRead(id: string): Promise<NotificationResponse> {
    return apiClient.patch<NotificationResponse>(`/notifications/${id}/read`).then((response) => response.data);
  },
  markAllRead(): Promise<void> {
    return apiClient.patch('/notifications/read-all').then(() => undefined);
  },
};