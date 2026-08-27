import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { adjustmentAction } from '../../api/inventory';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Adjustment, AdjustmentLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useMasterQuery<Adjustment>('adjustments');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');
  const products = useListQuery<{ id: number; name: string; sku: string }>('products');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'gain', warehouse_id: '', notes: '' });
  const [lines, setLines] = useState<AdjustmentLine[]>([{ product_id: 0, qty_diff: 0, reason: '' }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['adjustments'] });

  const create = useMutation({
    mutationFn: () => crudApi<Adjustment>('adjustments').create({ ...form, lines }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setLines([{ product_id: 0, qty_diff: 0, reason: '' }]);
    },
  });

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) => adjustmentAction(id, action),
    onSuccess: invalidate,
  });

  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));
  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));

  const submit = () => create.mutate();

  return (
    <div>
      <PageHeader title="Penyesuaian Stok" subtitle="Adjustment (penambahan/pengurangan) dengan approval" action={<Button onClick={() => setOpen(true)}>+ Buat Adjustment</Button>} />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No' },
              { key: 'type', label: 'Tipe' },
              { key: 'wh', label: 'Gudang' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const a = row as Adjustment;
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{a.adjustment_no}</td>
                  <td className="py-3 px-4">
                    {a.type === 'gain' ? <Badge color="green">Gain</Badge> : <Badge color="red">Loss</Badge>}
                  </td>
                  <td className="py-3 px-4">{a.warehouse_name ?? '—'}</td>
                  <td className="py-3 px-4"><Badge color={statusColor[a.status] ?? 'gray'}>{a.status}</Badge></td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {a.status === 'pending' && (
                      <>
                        <button onClick={() => action.mutate({ id: a.id, action: 'approve' })} className="text-brand-600 text-sm mr-3">Setujui</button>
                        <button onClick={() => action.mutate({ id: a.id, action: 'reject' })} className="text-red-600 text-sm">Tolak</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Penyesuaian Stok"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipe *"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={[{ label: 'Gain (tambah)', value: 'gain' }, { label: 'Loss (kurang)', value: 'loss' }]}
          />
          <Select label="Gudang *" value={form.warehouse_id} onChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))} options={whOptions} placeholder="Pilih" />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Item (qty_diff ±)</label>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <div className="col-span-2">
                <Select value={line.product_id} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))} options={productOptions} placeholder="Produk" />
              </div>
              <Input label="" type="number" value={line.qty_diff} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty_diff: Number(v) } : x)))} placeholder="±Qty" />
              <div className="flex items-center">
                <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm px-2">×</button>
              </div>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty_diff: 0, reason: '' }])}>+ Tambah Item</Button>
        </div>
      </Modal>
    </div>
  );
}
