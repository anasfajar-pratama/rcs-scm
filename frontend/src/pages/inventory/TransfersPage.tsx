import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { transferAction } from '../../api/inventory';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Transfer, TransferLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  pending: 'yellow',
  approved: 'blue',
  in_transit: 'blue',
  received: 'green',
  cancelled: 'red',
};

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<Transfer>('transfers');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');
  const products = useListQuery<{ id: number; name: string; sku: string }>('products');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', notes: '' });
  const [lines, setLines] = useState<TransferLine[]>([{ product_id: 0, quantity: 1 }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['transfers'] });

  const create = useMutation({
    mutationFn: () => crudApi<Transfer>('transfers').create({ ...form, lines }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ from_warehouse_id: '', to_warehouse_id: '', notes: '' });
      setLines([{ product_id: 0, quantity: 1 }]);
    },
  });

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'transit' | 'receive' }) => transferAction(id, action),
    onSuccess: invalidate,
  });

  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));
  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));

  const submit = () => create.mutate();

  return (
    <div>
      <PageHeader title="Transfer Stok" subtitle="Pindah stok antar gudang" action={<Button onClick={() => setOpen(true)}>+ Buat Transfer</Button>} />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No' },
              { key: 'from', label: 'Dari' },
              { key: 'to', label: 'Ke' },
              { key: 'items', label: 'Item' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const t = row as Transfer;
              return (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{t.transfer_no}</td>
                  <td className="py-3 px-4">{t.from_warehouse ?? '—'}</td>
                  <td className="py-3 px-4">{t.to_warehouse ?? '—'}</td>
                  <td className="py-3 px-4">{t.lines?.length ?? 0}</td>
                  <td className="py-3 px-4"><Badge color={statusColor[t.status] ?? 'gray'}>{t.status}</Badge></td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {t.status === 'pending' && (
                      <button onClick={() => action.mutate({ id: t.id, action: 'approve' })} className="text-brand-600 text-sm mr-3">Setujui</button>
                    )}
                    {t.status === 'approved' && (
                      <button onClick={() => action.mutate({ id: t.id, action: 'transit' })} className="text-brand-600 text-sm mr-3">Kirim</button>
                    )}
                    {t.status === 'in_transit' && (
                      <button onClick={() => action.mutate({ id: t.id, action: 'receive' })} className="text-brand-600 text-sm mr-3">Terima</button>
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
        title="Buat Transfer Stok"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select label="Dari Gudang *" value={form.from_warehouse_id} onChange={(v) => setForm((f) => ({ ...f, from_warehouse_id: v }))} options={whOptions} placeholder="Pilih" />
          <Select label="Ke Gudang *" value={form.to_warehouse_id} onChange={(v) => setForm((f) => ({ ...f, to_warehouse_id: v }))} options={whOptions} placeholder="Pilih" />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <Select value={line.product_id} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))} options={productOptions} placeholder="Produk" />
              <Input label="" type="number" value={line.quantity} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, quantity: Number(v) } : x)))} />
              <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm px-2">×</button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, quantity: 1 }])}>+ Tambah Item</Button>
        </div>

        <div className="mt-4">
          <Input label="Catatan" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
        </div>
      </Modal>
    </div>
  );
}
