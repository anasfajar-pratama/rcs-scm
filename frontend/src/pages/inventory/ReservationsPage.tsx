import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { reservationRelease } from '../../api/inventory';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Reservation } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  reserved: 'blue',
  partially_shipped: 'yellow',
  released: 'green',
  cancelled: 'red',
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<Reservation>('reservations');
  const products = useListQuery<{ id: number; name: string }>('products');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<{ product_id: number; quantity: number }[]>([{ product_id: 0, quantity: 1 }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reservations'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => crudApi<Reservation>('reservations').create(payload),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setOpen(false);
      toast('Reservasi dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const release = useMutation({
    mutationFn: (id: number) => reservationRelease(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('Reservasi dilepas.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ warehouse_id: '' });
    setLines([{ product_id: 0, quantity: 1 }]);
    setOpen(true);
  };

  const submit = () => {
    save.mutate({
      warehouse_id: Number(form.warehouse_id),
      lines: lines.map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
      })),
    });
  };

  return (
    <div>
      <PageHeader title="Reservations" subtitle="Reservasi stok (FEFO)" action={<Button onClick={openCreate}>+ Reservasi Manual</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari reservasi..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No.' },
              { key: 'warehouse', label: 'Gudang' },
              { key: 'date', label: 'Tanggal' },
              { key: 'items', label: 'Item' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const r = row as Reservation;
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{r.reservation_no}</td>
                  <td className="py-3 px-4">{r.warehouse_name ?? `#${r.warehouse_id}`}</td>
                  <td className="py-3 px-4 text-sm">{r.reserved_date ?? '—'}</td>
                  <td className="py-3 px-4 text-sm">{(r.lines ?? []).length} item</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[r.status] ?? 'gray'}>{r.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {(r.status === 'reserved' || r.status === 'partially_shipped') && (
                      <button onClick={() => release.mutate(r.id)} className="text-red-500 hover:text-red-700 text-sm">
                        Lepas
                      </button>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}

        {meta && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Total {meta.pagination.total} · Hal {meta.pagination.current_page}/{meta.pagination.last_page}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                disabled={meta.pagination.current_page >= meta.pagination.last_page}
                onClick={() => setPage(meta.pagination.current_page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reservasi Manual"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Gudang *"
            value={String(form.warehouse_id ?? '')}
            onChange={(v) => set('warehouse_id', v)}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Pilih gudang"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Item</label>
              <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, quantity: 1 }])}>
                + Tambah Baris
              </Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
                <div className="col-span-8">
                  <Select
                    label=""
                    value={line.product_id}
                    onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))}
                    options={(products.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
                    placeholder="Pilih produk"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label=""
                    type="number"
                    value={line.quantity}
                    onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, quantity: Number(v) } : x)))}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
