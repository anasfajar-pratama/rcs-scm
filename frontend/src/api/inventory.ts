import { api } from './client';
import type { StockAlert } from '../types';

export async function getStockAlerts(): Promise<StockAlert> {
  const { data } = await api.get<{ data: StockAlert }>('/stocks/alerts');
  return data.data;
}

export async function getStockSummary(): Promise<{ products: number; in_stock: number; reserved: number }> {
  const { data } = await api.get<{ data: { products: number; in_stock: number; reserved: number } }>('/stocks/summary');
  return data.data;
}

export async function transferAction(id: number, action: 'approve' | 'transit' | 'receive'): Promise<void> {
  await api.post(`/transfers/${id}/${action}`);
}

export async function adjustmentAction(id: number, action: 'approve' | 'reject'): Promise<void> {
  await api.post(`/adjustments/${id}/${action}`);
}

export async function opnamePost(id: number): Promise<void> {
  await api.post(`/stock-opnames/${id}/post`);
}
