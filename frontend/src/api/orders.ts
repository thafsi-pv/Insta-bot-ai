import { apiClient } from './client';
import type { OrderStatus } from '../types';

export const ordersApi = {
  getAll: async (params?: { status?: OrderStatus; search?: string }) => {
    const res: any = await apiClient.get('/orders', { params });
    return res.data || res;
  },

  getById: async (id: string) => {
    const res: any = await apiClient.get(`/orders/${id}`);
    return res.data || res;
  },

  approve: async (id: string) => {
    const res: any = await apiClient.post(`/orders/${id}/approve`);
    return res.data || res;
  },

  reject: async (id: string, reason?: string) => {
    const res: any = await apiClient.post(`/orders/${id}/reject`, { reason });
    return res.data || res;
  },
};
