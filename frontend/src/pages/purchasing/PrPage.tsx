import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Product } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

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

export default function PrPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('pr');
  const products = useListQuery<Product>('products', { type: 'raw_material' });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ department: '', needed_date: '', notes: '' });
  const [lines, setLines] = useState<any[]>([
    { product_id: 0, qty: 1, estimated_price: 0, note: '' },
  ]);
  const [detail, setDetail] = useState<any | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pr'] });

  const create = useMutation({
    mutationFn: () => crudApi<any>('pr').create({ ...form, lines }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setLines([{ product_id: 0, qty: 1, estimated_price: 0, note: '' }]);
      toast('PR dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => crudApi<any>('pr').update(id, { status: action }),
    onSuccess: (_res, vars) => {
      invalidate();
      toast(vars.action === 'approve' ? 'PR disetujui.' : 'PR ditolak.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));

  const submit = () => create.mutate();

  return (
    <div>
      <PageHeader title="Purchase Requisition" subtitle="Permintaan pembelian" action={<Button onClick={() => setOpen(true)}>+ Buat PR</Button>} />

      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table
            columns={[{ key: 'no', label: 'No' }, { key: 'dept', label: 'Dept' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const pr = row as any;
              return (
                <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{pr.pr_no}</td>
                  <td className="py-3 px-4">{pr.department ?? '—'}</td>
                  <td className="py-3 px-4"><Badge color={statusColor[pr.status] ?? 'gray'}>{pr.status}</Badge></td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => setDetail(pr)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Detail</button>
                    {pr.status === 'pending' && (
                      <>
                        <button onClick={() => action.mutate({ id: pr.id, action: 'approve' })} disabled={action.isPending} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Setujui</button>
                        <button onClick={() => action.mutate({ id: pr.id, action: 'reject' })} disabled={action.isPending} className="text-red-600 hover:text-red-800 text-sm">Tolak</button>
                      </>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Buat PR" size="lg" footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
        <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
      </>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Departemen" value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} />
          <Input label="Tanggal Dibutuhkan" type="date" value={form.needed_date} onChange={(v) => setForm((f) => ({ ...f, needed_date: v }))} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Item</label>
            <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, estimated_price: 0, note: '' }])}>+ Tambah Item</Button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Hanya produk bahan baku yang tersedia. Isi estimasi harga satuan & catatan per item bila diperlukan.
          </p>
          <div className="grid grid-cols-12 gap-2 items-center text-xs text-gray-400 uppercase tracking-wide mb-1">
            <div className="col-span-4">Produk</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Estimasi Harga Satuan</div>
            <div className="col-span-3">Catatan</div>
            <div className="col-span-1 text-right">Aksi</div>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
              <div className="col-span-4">
                <Select value={line.product_id} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))} options={productOptions} placeholder="Produk" />
              </div>
              <div className="col-span-2">
                <Input label="" type="number" value={line.qty} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))} placeholder="1" />
              </div>
              <div className="col-span-2">
                <Input label="" type="number" value={line.estimated_price} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, estimated_price: Number(v) } : x)))} placeholder="0" />
              </div>
              <div className="col-span-3">
                <Input label="" value={line.note ?? ''} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, note: v } : x)))} placeholder="opsional" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm px-2">×</button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.pr_no ?? ''}`}
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
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Purchase Requisition</div>
                <div className="font-medium">{detail.pr_no}</div>
                <div className="text-gray-400 text-xs">Dibuat oleh {detail.requestedBy?.name ?? '—'}</div>
                <div className="mt-1"><Badge color={statusColor[detail.status] ?? 'gray'}>{detail.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Departemen & Kebutuhan</div>
                <div className="font-medium">{detail.department ?? '—'}</div>
                <div className="text-gray-400 text-xs">Dibutuhkan: {formatDate(detail.needed_date)}</div>
              </div>
              <div className="sm:col-span-1">
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Catatan</div>
                <div className="text-gray-600">{detail.notes ?? '—'}</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Estimasi Harga Satuan</th>
                    <th className="py-2 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="py-4 px-3 text-sm text-gray-400">Tidak ada item.</td></tr>
                  ) : (detail.lines ?? []).map((l: any, i: number) => (
                    <tr key={l.id ?? i} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        {l.product?.name ?? `#${l.product_id}`}
                        {l.product?.sku && <span className="text-xs text-gray-400 ml-1">({l.product.sku})</span>}
                      </td>
                      <td className="py-2 px-3">{Number(l.qty || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">
                        {l.estimated_price ? `Rp ${Number(l.estimated_price).toLocaleString('id-ID')}` : '—'}
                      </td>
                      <td className="py-2 px-3">{l.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
