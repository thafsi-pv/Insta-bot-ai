import { apiClient } from './client';
import type { ConversationStatus } from '../types';

export const conversationsApi = {
  getAll: async (params?: { status?: ConversationStatus; search?: string }) => {
    const res: any = await apiClient.get('/conversations', { params });
    return res.data || res;
  },

  getById: async (id: string) => {
    const res: any = await apiClient.get(`/conversations/${id}`);
    return res.data || res;
  },

  updateStatus: async (id: string, status: ConversationStatus) => {
    const res: any = await apiClient.patch(`/conversations/${id}/status`, { status });
    return res.data || res;
  },

  sendReply: async (id: string, text: string) => {
    const res: any = await apiClient.post(`/conversations/${id}/reply`, { text });
    return res.data || res;
  },
};
