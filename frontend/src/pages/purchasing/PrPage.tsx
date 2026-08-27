import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Product } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

export default function PrPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('pr');
  const products = useListQuery<Product>('products');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ department: '', needed_date: '', notes: '' });
  const [lines, setLines] = useState<any[]>([{ product_id: 0, qty: 1, preferred_supplier_id: null, estimated_price: 0 }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pr'] });

  const create = useMutation({
    mutationFn: () => crudApi<any>('pr').create({ ...form, lines }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setLines([{ product_id: 0, qty: 1, preferred_supplier_id: null, estimated_price: 0 }]);
    },
  });

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => crudApi<any>('pr').update(id, { status: action }),
    onSuccess: invalidate,
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
                    {pr.status === 'pending' && (
                      <>
                        <button onClick={() => action.mutate({ id: pr.id, action: 'approve' })} className="text-brand-600 text-sm mr-3">Setujui</button>
                        <button onClick={() => action.mutate({ id: pr.id, action: 'reject' })} className="text-red-600 text-sm">Tolak</button>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <div className="col-span-2"><Select value={line.product_id} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))} options={productOptions} placeholder="Produk" /></div>
              <Input label="" type="number" value={line.qty} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))} placeholder="Qty" />
              <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm px-2">×</button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1 }])}>+ Tambah Item</Button>
        </div>
      </Modal>
    </div>
  );
}
