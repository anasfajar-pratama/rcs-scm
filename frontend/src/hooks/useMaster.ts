import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../api/crud';
import type { Paginated } from '../types';

export function useMasterQuery<T>(resource: string, extraParams: Record<string, unknown> = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useQuery({
    queryKey: [resource, search, page, perPage, extraParams, refreshKey],
    queryFn: async (): Promise<Paginated<T>> => {
      return crudApi<T>(resource).index({ search, page, per_page: perPage, ...extraParams });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    meta: query.data?.meta,
    search,
    setSearch,
    page,
    setPage,
    refresh: () => setRefreshKey((k) => k + 1),
    invalidate: query.refetch,
  };
}

export function useListQuery<T>(resource: string, params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: async (): Promise<T[]> => {
      return crudApi<T>(resource).list({ list: true, ...params });
    },
  });
}

export function useOptions<T>(resource: string) {
  const q = useListQuery<T>(resource);
  return { data: q.data ?? [], isLoading: q.isLoading };
}
