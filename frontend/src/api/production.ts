import { api } from './client';

export async function productionStart(id: number): Promise<void> {
  await api.post(`/production-orders/${id}/start`);
}

export async function productionComplete(id: number, payload: Record<string, unknown>): Promise<void> {
  await api.post(`/production-orders/${id}/complete`, payload);
}

export async function productionCancel(id: number): Promise<void> {
  await api.post(`/production-orders/${id}/cancel`);
}
