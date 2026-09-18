import { api } from './client';

export async function leadStatus(id: number, status: string): Promise<void> {
  await api.post(`/leads/${id}/status`, { status });
}

export async function leadConvert(id: number, payload: Record<string, unknown>): Promise<void> {
  await api.post(`/leads/${id}/convert`, payload);
}

export async function opportunityStage(id: number, stage: string): Promise<void> {
  await api.post(`/opportunities/${id}/stage`, { stage });
}

export async function activityDone(id: number): Promise<void> {
  await api.post(`/activities/${id}/done`);
}

export async function quotationSend(id: number): Promise<void> {
  await api.post(`/sales-quotations/${id}/send`);
}

export async function quotationAccept(id: number): Promise<void> {
  await api.post(`/sales-quotations/${id}/accept`);
}

export async function quotationReject(id: number): Promise<void> {
  await api.post(`/sales-quotations/${id}/reject`);
}

export async function quotationConvertToSo(id: number, payload: Record<string, unknown>): Promise<void> {
  await api.post(`/sales-quotations/${id}/convert-to-so`, payload);
}

export async function soApprove(id: number): Promise<void> {
  await api.post(`/sales-orders/${id}/approve`);
}

export async function soReject(id: number): Promise<void> {
  await api.post(`/sales-orders/${id}/reject`);
}

export async function soFulfill(id: number): Promise<void> {
  await api.post(`/sales-orders/${id}/fulfill`);
}

export async function soCancel(id: number): Promise<void> {
  await api.post(`/sales-orders/${id}/cancel`);
}
