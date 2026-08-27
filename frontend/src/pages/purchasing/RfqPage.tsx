import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = { draft: 'gray', sent: 'blue', closed: 'green' };

export default function RfqPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('rfqs');
  const products = useListQuery<{ id: number; name: string; sku: string }>('products');
  const suppliers = useListQuery<{ id: number; name: string }>('suppliers');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ deadline: '', notes: '' });
  const [lines, setLines] = useState<any[]>([{ product_id: 0, qty: 1, target_price: 0 }]);
  const [supplierIds, setSupplierIds] = useState<number[]>([]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rfqs'] });

  const create = useMutation({
    mutationFn: () => crudApi<any>('rfqs').create({ ...form, lines, supplier_ids: supplierIds }),
    onSuccess: () => { invalidate(); setOpen(false); setLines([{ product_id: 0, qty: 1, target_price: 0 }]); setSupplierIds([]); },
  });

  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));
  const supplierOptions = (suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id }));

  return (
    <div>
      <PageHeader title="RFQ" subtitle="Request for Quotation" action={<Button onClick={() => setOpen(true)}>+ Buat RFQ</Button>} />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }]} data={data?.data ?? []} renderRow={(row) => {
            const rfq = row as any;
            return <tr key={rfq.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{rfq.rfq_no}</td>
              <td className="py-3 px-4">{rfq.deadline ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={statusColor[rfq.status] ?? 'gray'}>{rfq.status}</Badge></td>
            </tr>;
          }} />
        )}
        {meta && <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
          <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
        </div>}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Buat RFQ" size="lg" footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
      </>}>
        <Input label="Deadline" type="date" value={form.deadline} onChange={(v) => setForm((f) => ({ ...f, deadline: v }))} />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier (multi-select)</label>
          <div className="space-y-1 max-h-40 overflow-auto border border-gray-200 rounded p-2">
            {supplierOptions.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={supplierIds.includes(s.value as number)} onChange={(e) => setSupplierIds((ids) => e.target.checked ? [...ids, s.value as number] : ids.filter((id) => id !== s.value))} />
                {s.label}
              </label>
            ))}
          </div>
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
          <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, target_price: 0 }])}>+ Tambah Item</Button>
        </div>
      </Modal>
    </div>
  );
}
