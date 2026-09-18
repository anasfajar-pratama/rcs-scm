import { api } from './client';
import type { DashboardSummary, ReportData } from '../types';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<{ data: DashboardSummary }>('/dashboard/summary');
  return data.data;
}

export async function getReport(report: string, params: Record<string, unknown> = {}): Promise<ReportData> {
  const { data } = await api.get<{ data: ReportData }>(`/reports/${report}`, { params });
  return data.data;
}
