import { apiClient } from '@/lib/http/apiClient';
import type { NotificationDTO, NotificationPage } from '../types';

const BASE = '/notifications';

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

const unwrap = <T,>(res: unknown): T => {
  const r = res as ApiEnvelope<T> | T;
  if (r && typeof r === 'object' && 'data' in (r as object)) {
    return (r as ApiEnvelope<T>).data as T;
  }
  return r as T;
};

export const notificationService = {
  /** Page-based list (default) */
  async list(page = 0, size = 20): Promise<NotificationPage> {
    const res = await apiClient.get(`${BASE}?page=${page}&size=${size}`);
    return unwrap<NotificationPage>(res);
  },

  /** Cursor-based: load older notifications */
  async listByCursor(cursor?: string, size = 20): Promise<NotificationDTO[]> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('size', String(size));
    const res = await apiClient.get(`${BASE}/cursor?${params.toString()}`);
    return unwrap<NotificationDTO[]>(res);
  },

  async unread(): Promise<NotificationDTO[]> {
    const res = await apiClient.get(`${BASE}/unread`);
    return unwrap<NotificationDTO[]>(res);
  },

  async unreadCount(): Promise<number> {
    const res = await apiClient.get(`${BASE}/unread/count`);
    const d = unwrap<{ count: number } | number>(res);
    if (typeof d === 'number') return d;
    return d?.count ?? 0;
  },

  async markAsRead(id: string): Promise<NotificationDTO> {
    const res = await apiClient.put(`${BASE}/${id}/read`, {});
    return unwrap<NotificationDTO>(res);
  },

  async markAllAsRead(): Promise<number> {
    const res = await apiClient.put(`${BASE}/read-all`, {});
    const d = unwrap<{ updated: number } | number>(res);
    if (typeof d === 'number') return d;
    return d?.updated ?? 0;
  },

  async updateAction(id: string, status: 'ACCEPTED' | 'REJECTED' | 'PENDING'): Promise<NotificationDTO> {
    const res = await apiClient.patch(`${BASE}/${id}/action`, { status });
    return unwrap<NotificationDTO>(res);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },
};
