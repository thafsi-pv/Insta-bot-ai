import { apiClient } from './client';

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  allowCod?: boolean;
  allowPrepayment?: boolean;
  active?: boolean;
  variants?: {
    sku?: string;
    size?: string;
    color?: string;
    priceOverride?: number;
    stock?: number;
    active?: boolean;
  }[];
  media?: {
    imageUrl: string;
    type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    instagramMediaId?: string;
  }[];
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface UploadedMediaItem {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'IMAGE' | 'VIDEO';
  format?: string;
  duration?: number;
}

export const productsApi = {
  getAll: async (params?: { search?: string; active?: boolean }) => {
    const res: any = await apiClient.get('/products', { params });
    return res.data || res;
  },

  getById: async (id: string) => {
    const res: any = await apiClient.get(`/products/${id}`);
    return res.data || res;
  },

  uploadMedia: async (formData: FormData): Promise<UploadedMediaItem[]> => {
    const res: any = await apiClient.post('/products/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data || res;
  },

  create: async (data: CreateProductInput) => {
    const res: any = await apiClient.post('/products', data);
    return res.data || res;
  },

  update: async (id: string, data: UpdateProductInput) => {
    const res: any = await apiClient.put(`/products/${id}`, data);
    return res.data || res;
  },

  delete: async (id: string) => {
    const res: any = await apiClient.delete(`/products/${id}`);
    return res.data || res;
  },

  generateCaption: async (data: { name: string; price: number; description?: string }) => {
    const res: any = await apiClient.post('/products/generate-caption', data);
    return res.data || res;
  },

  linkInstagramMedia: async (
    id: string,
    data: {
      instagramMediaId: string;
      mediaUrl?: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    },
  ) => {
    const res: any = await apiClient.post(`/products/${id}/link-instagram-media`, data);
    return res.data || res;
  },

  unlinkInstagramMedia: async (id: string, instagramMediaId: string) => {
    const res: any = await apiClient.post(`/products/${id}/unlink-instagram-media`, {
      instagramMediaId,
    });
    return res.data || res;
  },

  publishToInstagram: async (
    id: string,
    data: {
      caption: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REELS';
      mediaUrls?: string[];
      imageUrl?: string;
    },
  ) => {
    const res: any = await apiClient.post(`/products/${id}/publish-instagram`, data);
    return res.data || res;
  },
};
