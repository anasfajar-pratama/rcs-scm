import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getReport } from '../api/reports';
import { useListQuery } from '../hooks/useMaster';
import type { ReportData } from '../types';
import { Badge, Button, Card, EmptyState, PageHeader, Select, Spinner, Table } from '../components/ui';

const REPORT_COLUMNS: Record<string, { key: string; label: string }[]> = {
  inventory: [
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Produk' },
    { key: 'warehouse', label: 'Gudang' },
    { key: 'lot_no', label: 'Lot' },
    { key: 'expiry_date', label: 'Expiry' },
    { key: 'qty_on_hand', label: 'Stok' },
    { key: 'qty_reserved', label: 'Reserved' },
    { key: 'qty_available', label: 'Tersedia' },
    { key: 'value', label: 'Nilai' },
  ],
  'stock-movements': [
    { key: 'date', label: 'Waktu' },
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Produk' },
    { key: 'warehouse', label: 'Gudang' },
    { key: 'type', label: 'Tipe' },
    { key: 'quantity', label: 'Qty' },
    { key: 'reference', label: 'Referensi' },
    { key: 'notes', label: 'Catatan' },
  ],
  purchasing: [
    { key: 'po_no', label: 'No. PO' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'date', label: 'Tanggal' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
  ],
  sales: [
    { key: 'so_no', label: 'No. SO' },
    { key: 'customer', label: 'Customer' },
    { key: 'date', label: 'Tanggal' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
  ],
  production: [
    { key: 'po_no', label: 'No. MO' },
    { key: 'product', label: 'Produk' },
    { key: 'warehouse', label: 'Gudang' },
    { key: 'date', label: 'Tanggal' },
    { key: 'planned_qty', label: 'Rencana' },
    { key: 'produced_qty', label: 'Hasil' },
    { key: 'status', label: 'Status' },
  ],
  customers: [
    { key: 'code', label: 'Kode' },
    { key: 'name', label: 'Nama' },
    { key: 'type', label: 'Tipe' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telepon' },
    { key: 'credit_limit', label: 'Credit Limit' },
    { key: 'contacts_count', label: 'Kontak' },
  ],
  pipeline: [
    { key: 'stage', label: 'Stage' },
    { key: 'count', label: 'Jumlah' },
    { key: 'value', label: 'Nilai' },
  ],
  expiry: [
    { key: 'sku', label: 'SKU' },
    { key: 'product', label: 'Produk' },
    { key: 'lot_no', label: 'Lot' },
    { key: 'expiry_date', label: 'Expiry' },
    { key: 'status', label: 'Status' },
    { key: 'qty', label: 'Qty' },
  ],
};

const TABS = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'stock-movements', label: 'Mutasi Stok' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'sales', label: 'Sales' },
  { key: 'production', label: 'Production' },
  { key: 'customers', label: 'Customers' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'expiry', label: 'Expiry' },
];

export default function ReportsPage() {
  const [report, setReport] = useState('inventory');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const params: Record<string, unknown> = {};
  if (report === 'inventory' && warehouseFilter) params.warehouse_id = Number(warehouseFilter);
  if (report === 'expiry') params.days = 90;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reports', report, params],
    queryFn: () => getReport(report, params),
  });

  const columns = REPORT_COLUMNS[report] ?? [];
  const rows = (data?.rows ?? []) as ReportData['rows'];

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = columns.map((c) => c.label).join(',');
    const lines = rows.map((r) =>
      columns.map((c) => {
        const v = r[c.key];
        const s = v === null || v === undefined ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(','),
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (v: string) =>
    ({
      pending: 'yellow',
      approved: 'blue',
      completed: 'green',
      in_progress: 'yellow',
      cancelled: 'red',
      rejected: 'red',
      received: 'green',
      available: 'green',
      expire_soon: 'yellow',
      expired: 'red',
    })[v] as 'green' | 'yellow' | 'blue' | 'red' | undefined;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Laporan & ekspor CSV" action={<Button onClick={exportCsv} disabled={rows.length === 0}>Ekspor CSV</Button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setReport(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              report === t.key ? 'bg-brand-700 text-white font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {report === 'inventory' && (
        <div className="mb-4 max-w-xs">
          <Select
            label=""
            value={warehouseFilter}
            onChange={setWarehouseFilter}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Semua gudang"
          />
        </div>
      )}

      <Card>
        {isLoading || isFetching ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState message="Belum ada data untuk laporan ini." />
        ) : (
          <>
            {data?.total_value !== undefined && (
              <div className="px-4 py-3 border-b border-gray-100 text-sm">
                Total nilai: <span className="font-semibold">Rp {Number(data.total_value).toLocaleString('id-ID')}</span>
              </div>
            )}
            <Table
              columns={columns}
              data={rows}
              renderRow={(row) => {
                const r = row as ReportData['rows'][number];
                return (
                  <tr key={String(r[columns[0]?.key ?? ''] ?? '') + Math.random()} className="border-b border-gray-100 hover:bg-gray-50">
                    {columns.map((c) => {
                      const v = r[c.key];
                      const isStatus = c.key === 'status';
                      const isMoney = ['value', 'total', 'credit_limit', 'unit_cost'].includes(c.key);
                      const display = v === null || v === undefined ? '—' : isMoney ? `Rp ${Number(v).toLocaleString('id-ID')}` : String(v);
                      return (
                        <td key={c.key} className="py-3 px-4 text-sm">
                          {isStatus && statusColor(String(v)) ? <Badge color={statusColor(String(v))}>{display}</Badge> : display}
                        </td>
                      );
                    })}
                  </tr>
                );
              }}
            />
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
              Total baris: {rows.length}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
