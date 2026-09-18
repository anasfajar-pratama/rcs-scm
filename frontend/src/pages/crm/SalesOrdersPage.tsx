import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { soApprove, soCancel, soFulfill, soReject } from '../../api/crm';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { SalesOrder, SalesOrderLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'blue',
  rejected: 'red',
  fulfilled: 'green',
  cancelled: 'gray',
};

export default function SalesOrdersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<SalesOrder>('sales-orders');
  const customers = useListQuery<{ id: number; name: string }>('customers');
  const products = useListQuery<{ id: number; name: string; sale_price: number }>('products');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<SalesOrderLine[]>([{ product_id: 0, qty: 1, unit_price: 0 }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => crudApi<SalesOrder>('sales-orders').create(payload),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast('SO dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const approve = useMutation({
    mutationFn: (id: number) => soApprove(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast('SO disetujui, stok direservasi.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const reject = useMutation({
    mutationFn: (id: number) => soReject(id),
    onSuccess: () => {
      invalidate();
      toast('SO ditolak.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const fulfill = useMutation({
    mutationFn: (id: number) => soFulfill(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast('SO dikirim, stok berkurang.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => soCancel(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('SO dibatalkan, reservasi dilepas.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ customer_id: '', warehouse_id: '', order_date: '', notes: '' });
    setLines([{ product_id: 0, qty: 1, unit_price: 0 }]);
    setOpen(true);
  };

  const submit = () => {
    save.mutate({
      customer_id: Number(form.customer_id),
      warehouse_id: Number(form.warehouse_id),
      order_date: form.order_date || null,
      notes: form.notes,
      lines: lines.map((l) => ({
        product_id: Number(l.product_id),
        qty: Number(l.qty),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent ?? 0),
      })),
    });
  };

  const totalOf = (so: SalesOrder) =>
    (so.lines ?? []).reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);

  return (
    <div>
      <PageHeader title="Sales Orders" subtitle="Pesanan penjualan & reservasi stok" action={<Button onClick={openCreate}>+ Tambah SO</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari SO..."
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
              { key: 'customer', label: 'Customer' },
              { key: 'warehouse', label: 'Gudang' },
              { key: 'total', label: 'Total' },
              { key: 'reservation', label: 'Reservasi' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const so = row as SalesOrder;
              const reservation = (so.reservations ?? [])[0];
              return (
                <tr key={so.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{so.so_no}</td>
                  <td className="py-3 px-4">{so.customer_name ?? `Customer #${so.customer_id}`}</td>
                  <td className="py-3 px-4 text-sm">{so.warehouse_name ?? `#${so.warehouse_id}`}</td>
                  <td className="py-3 px-4 text-sm font-semibold">Rp {totalOf(so).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-sm">
                    {reservation ? (
                      <span className="text-gray-500">
                        {reservation.reservation_no} · {reservation.status}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[so.status] ?? 'gray'}>{so.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {so.status === 'pending' && (
                      <>
                        <button onClick={() => approve.mutate(so.id)} className="text-green-600 hover:text-green-800 text-sm mr-3">
                          Setujui
                        </button>
                        <button onClick={() => reject.mutate(so.id)} className="text-red-500 hover:text-red-700 text-sm mr-3">
                          Tolak
                        </button>
                      </>
                    )}
                    {so.status === 'approved' && (
                      <>
                        <button onClick={() => fulfill.mutate(so.id)} className="text-green-600 hover:text-green-800 text-sm mr-3">
                          Kirim
                        </button>
                        <button onClick={() => cancel.mutate(so.id)} className="text-red-500 hover:text-red-700 text-sm">
                          Batalkan
                        </button>
                      </>
                    )}
                    {(so.status === 'pending') && (
                      <button onClick={() => cancel.mutate(so.id)} className="text-red-500 hover:text-red-700 text-sm">
                        Batalkan
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
        title="Tambah Sales Order"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Customer *"
            value={String(form.customer_id ?? '')}
            onChange={(v) => set('customer_id', v)}
            options={(customers.data ?? []).map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Pilih customer"
          />
          <Select
            label="Gudang *"
            value={String(form.warehouse_id ?? '')}
            onChange={(v) => set('warehouse_id', v)}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Pilih gudang"
          />
          <Input label="Tanggal Pesanan" type="date" value={String(form.order_date ?? '')} onChange={(v) => set('order_date', v)} />
          <Input label="Catatan" value={String(form.notes ?? '')} onChange={(v) => set('notes', v)} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, unit_price: 0 }])}>
              + Tambah Baris
            </Button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
              <div className="col-span-5">
                <Select
                  label=""
                  value={line.product_id}
                  onChange={(v) =>
                    setLines((l) =>
                      l.map((x, idx) => {
                        if (idx !== i) return x;
                        const p = (products.data ?? []).find((pr) => pr.id === Number(v));
                        return { ...x, product_id: Number(v), unit_price: p?.sale_price ?? x.unit_price };
                      }),
                    )
                  }
                  options={(products.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
                  placeholder="Pilih produk"
                />
              </div>
              <div className="col-span-2">
                <Input label="" type="number" value={line.qty} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))} />
              </div>
              <div className="col-span-3">
                <Input
                  label=""
                  type="number"
                  value={line.unit_price}
                  onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, unit_price: Number(v) } : x)))}
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
      </Modal>
    </div>
  );
}
