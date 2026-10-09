import { apiClient } from './client';

export interface OrganicInstagramMedia {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  linkedProduct: {
    id: string;
    name: string;
    price: number;
  } | null;
}

export const instagramApi = {
  getOrganicMedia: async (params?: { accountId?: string; limit?: number }): Promise<OrganicInstagramMedia[]> => {
    const res: any = await apiClient.get('/instagram/organic-media', { params });
    return res.data || res;
  },

  getAccounts: async () => {
    const res: any = await apiClient.get('/instagram/accounts');
    return res.data || res;
  },
};
