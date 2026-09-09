import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getStockAlerts, getStockSummary } from '../../api/inventory';
import { useMasterQuery, useListQuery } from '../../hooks/useMaster';
import type { Stock } from '../../types';
import { Button, Card, EmptyState, PageHeader, Select, Spinner, Table } from '../../components/ui';

// Tampilkan qty tanpa nol trailing & tanpa artefak float (cth: 5, bukan 5.0000 / 4.999999999).
const formatQty = (v: unknown) => Number(Number(v).toFixed(4)).toLocaleString('id-ID');

export default function InventoryPage() {
  const [type, setType] = useState('');
  const { data: stocks, isLoading, meta, setSearch, setPage } = useMasterQuery<Stock>('stocks', { type });
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const summary = useQuery({
    queryKey: ['stocks-summary'],
    queryFn: getStockSummary,
  });
  const alerts = useQuery({
    queryKey: ['stocks-alerts'],
    queryFn: getStockAlerts,
  });

  const selectedWh = '';

  const kpis = [
    { label: 'Produk', value: summary.data?.products ?? '—' },
    { label: 'Stok On-Hand', value: Number(summary.data?.in_stock ?? 0).toLocaleString('id-ID') },
    { label: 'Direservasi', value: Number(summary.data?.reserved ?? 0).toLocaleString('id-ID') },
    { label: 'Expiry Alert', value: alerts.data?.expiring?.length ?? 0 },
  ];

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stok per gudang & batch, dengan peringatan expiry" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="text-sm text-gray-500">{k.label}</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{k.value}</div>
          </Card>
        ))}
      </div>

      {(alerts.data?.reorder?.length ?? 0) > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">⚠ Reorder Point</h3>
          <div className="space-y-2">
            {alerts.data?.reorder?.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <span>{r.product} <span className="text-gray-400">({r.sku})</span></span>
                <span className="text-red-600 font-medium">Stok {r.current} ≤ {r.reorder_point}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari produk / SKU..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="w-48">
            <Select
              value={type}
              onChange={setType}
              options={[
                { label: 'Bahan Baku', value: 'raw_material' },
                { label: 'Produk Jadi', value: 'finished_good' },
              ]}
              placeholder="Semua tipe"
            />
          </div>
          <Select
            value={selectedWh}
            onChange={() => {}}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Semua gudang"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (stocks?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'product', label: 'Produk' },
              { key: 'warehouse', label: 'Gudang' },
              { key: 'lot', label: 'Batch / Lot' },
              { key: 'expiry', label: 'Expiry' },
              { key: 'onhand', label: 'On-Hand' },
              { key: 'reserved', label: 'Reserved' },
              { key: 'available', label: 'Available' },
            ]}
            data={stocks?.data ?? []}
            renderRow={(row) => {
              const s = row as Stock;
              const expiry = s.expiry_date ? new Date(s.expiry_date).toDateString() : '—';
              return (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{s.product?.name ?? s.product_id}</td>
                  <td className="py-3 px-4">{s.warehouse_name ?? '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs">{s.lot_no ?? '—'}</td>
                  <td className="py-3 px-4">{expiry}</td>
                  <td className="py-3 px-4 font-semibold">{formatQty(s.qty_on_hand)}</td>
                  <td className="py-3 px-4">{formatQty(s.qty_reserved)}</td>
                  <td className="py-3 px-4">{formatQty(s.qty_available)}</td>
                </tr>
              );
            }}
          />
        )}

        {meta && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Total {meta.pagination.total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
              <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
