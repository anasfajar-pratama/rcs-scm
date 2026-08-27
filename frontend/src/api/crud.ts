import { api } from './client';
import type { Paginated } from '../types';

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  list?: boolean;
  type?: string;
  [key: string]: unknown;
}

export function crudApi<T>(resource: string) {
  return {
    list: async (params: ListParams = {}): Promise<T[]> => {
      const res = await api.get<{ data: T[] }>(resource, { params });
      return res.data.data;
    },
    index: async (params: ListParams = {}): Promise<Paginated<T>> => {
      const res = await api.get<Paginated<T>>(resource, { params });
      return res.data;
    },
    get: async (id: number | string): Promise<T> => {
      const res = await api.get<{ data: T }>(`${resource}/${id}`);
      return res.data.data;
    },
    create: async (payload: unknown): Promise<T> => {
      const res = await api.post<{ data: T }>(resource, payload);
      return res.data.data;
    },
    update: async (id: number | string, payload: unknown): Promise<T> => {
      const res = await api.put<{ data: T }>(`${resource}/${id}`, payload);
      return res.data.data;
    },
    destroy: async (id: number | string): Promise<void> => {
      await api.delete(`${resource}/${id}`);
    },
  };
}
