import { api } from './client';

export interface ServerNotification {
  _id: string;
  type?: string;
  title: string;
  body: string;
  isRead?: boolean;
  createdAt?: string;
  data?: Record<string, any>;
}

export interface NotificationsResult {
  notifications: ServerNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  async list(page = 1, limit = 30): Promise<NotificationsResult> {
    const data = await api.get<any>('/notifications', { page, limit });
    // Backend returns { notifications, pagination, unreadCount } under data.
    const notifications: ServerNotification[] = Array.isArray(data)
      ? data
      : data?.notifications ?? [];
    const unreadCount: number = data?.unreadCount ?? notifications.filter((n) => !n.isRead).length;
    return { notifications, unreadCount };
  },
  unreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};
