import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { opnamePost } from '../../api/inventory';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Stock, StockOpname } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

// Format "Senin, 2026-09-09" — menerima date-only maupun datetime penuh.
const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const datePart = String(d).slice(0, 10);
  const [y, m, day] = datePart.split('-').map(Number);
  if (!y || !m || !day) return String(d);
  const weekday = new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('id-ID', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${weekday}, ${datePart}`;
};

// Tampilkan qty tanpa nol trailing & artefak float.
const formatQty = (v: unknown) => Number(Number(v).toFixed(4)).toLocaleString('id-ID');

export default function StockOpnamePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<StockOpname>('stock-opnames');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');
  const [stockType, setStockType] = useState('');
  const stocks = useMasterQuery<Stock>('stocks', { type: stockType });

  const [open, setOpen] = useState(false);
  const [whId, setWhId] = useState('');
  const [counted, setCounted] = useState<Record<number, number>>({});
  const [detail, setDetail] = useState<StockOpname | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
  };

  const create = useMutation({
    mutationFn: () => {
      const lines = (stocks.data?.data ?? []).map((s) => ({
        product_id: s.product_id,
        batch_id: s.batch_id,
        qty_count: counted[s.id] ?? Number(s.qty_on_hand),
      }));
      return crudApi<StockOpname>('stock-opnames').create({ warehouse_id: Number(whId), lines });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });

  const post = useMutation({
    mutationFn: (id: number) => opnamePost(id),
    onSuccess: invalidate,
  });

  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));

  const beginOpname = () => {
    setOpen(true);
    setCounted({});
  };

  return (
    <div>
      <PageHeader title="Stok Opname" subtitle="Hitung fisik & posting selisih" action={<Button onClick={beginOpname}>+ Mulai Opname</Button>} />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No' },
              { key: 'wh', label: 'Gudang' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const o = row as StockOpname;
              return (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{o.opname_no}</td>
                  <td className="py-3 px-4">{o.warehouse_name ?? '—'}</td>
                  <td className="py-3 px-4">
                    {o.status === 'counted' ? <Badge color="yellow">counted</Badge> : <Badge color="green">posted</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => setDetail(o)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Detail</button>
                    {o.status === 'counted' && (
                      <button onClick={() => post.mutate(o.id)} className="text-brand-600 hover:text-brand-800 text-sm">Posting</button>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
        {meta && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
            <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mulai Stok Opname"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !whId}>
              {create.isPending ? 'Menyimpan...' : 'Simpan Opname'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Gudang *" value={whId} onChange={setWhId} options={whOptions} placeholder="Pilih" />
          <Select
            label="Tipe Produk"
            value={stockType}
            onChange={(v) => {
              setStockType(v);
              setCounted({});
            }}
            options={[
              { label: 'Bahan Baku', value: 'raw_material' },
              { label: 'Produk Jadi', value: 'finished_good' },
            ]}
            placeholder="Semua tipe"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Hitung Fisik</label>
          <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 px-3 text-gray-600">Produk</th>
                  <th className="py-2 px-3 text-gray-600">Batch</th>
                  <th className="py-2 px-3 text-gray-600">Sistem</th>
                  <th className="py-2 px-3 text-gray-600">Hitung</th>
                </tr>
              </thead>
              <tbody>
                {(stocks.data?.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">{s.product?.name}</td>
                    <td className="py-2 px-3 font-mono text-xs">{s.lot_no ?? '—'}</td>
                    <td className="py-2 px-3">{s.qty_on_hand}</td>
                    <td className="py-2 px-3 w-24">
                      <Input label="" type="number" value={counted[s.id] ?? Number(s.qty_on_hand)} onChange={(v) => setCounted((c) => ({ ...c, [s.id]: Number(v) }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.opname_no ?? ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Tutup
          </Button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Stock Opname</div>
                <div className="font-medium">{detail.opname_no}</div>
                <div className="text-gray-400 text-xs">{formatDate(detail.opname_date)}</div>
                <div className="mt-1">
                  {detail.status === 'counted' ? <Badge color="yellow">counted</Badge> : <Badge color="green">posted</Badge>}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Gudang</div>
                <div className="font-medium">{detail.warehouse_name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Catatan</div>
                <div className="text-gray-600">{detail.notes ?? '—'}</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Batch / Lot</th>
                    <th className="py-2 px-3">Sistem</th>
                    <th className="py-2 px-3">Hitung</th>
                    <th className="py-2 px-3">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="py-4 px-3 text-sm text-gray-400">Tidak ada item.</td></tr>
                  ) : (detail.lines ?? []).map((l, i) => {
                    const diff = Number(l.qty_diff) || 0;
                    return (
                      <tr key={l.id ?? i} className="border-t border-gray-100">
                        <td className="py-2 px-3">
                          {l.product_name ?? `#${l.product_id}`}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">{l.lot_no ?? '—'}</td>
                        <td className="py-2 px-3">{formatQty(l.qty_system)}</td>
                        <td className="py-2 px-3">{formatQty(l.qty_count)}</td>
                        <td className={`py-2 px-3 font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {diff > 0 ? '+' : ''}{formatQty(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
