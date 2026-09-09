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
  const products = useListQuery<{ id: number; name: string; sale_price: number }>('products', {
    type: 'finished_good',
  });
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<SalesOrderLine[]>([{ product_id: 0, qty: 1, unit_price: 0 }]);
  const [detail, setDetail] = useState<SalesOrder | null>(null);

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
    (so.lines ?? []).reduce((sum, l) => {
      const qty = Number(l.qty) || 0;
      const price = Number(l.unit_price) || 0;
      const disc = Math.min(Number(l.discount_percent) || 0, 100);
      return sum + qty * price * (1 - disc / 100);
    }, 0);

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
                    <button onClick={() => setDetail(so)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Detail
                    </button>
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

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.so_no ?? ''}`}
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
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Sales Order</div>
                <div className="font-medium">{detail.so_no}</div>
                <div className="text-gray-400 text-xs">{formatDate(detail.order_date)}</div>
                <div className="mt-1"><Badge color={statusColor[detail.status] ?? 'gray'}>{detail.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Customer</div>
                <div className="font-medium">{detail.customer_name ?? `#${detail.customer_id}`}</div>
                {detail.customer?.phone && <div className="text-gray-400 text-xs">{detail.customer.phone}</div>}
                {detail.customer?.email && <div className="text-gray-400 text-xs">{detail.customer.email}</div>}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Pemenuhan</div>
                <div className="font-medium">{detail.warehouse_name ?? `#${detail.warehouse_id}`}</div>
                {detail.notes && <div className="text-gray-400 text-xs mt-1">{detail.notes}</div>}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Harga</th>
                    <th className="py-2 px-3">Diskon</th>
                    <th className="py-2 px-3">Dikirim</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).length === 0 ? (
                    <tr><td colSpan={6} className="py-4 px-3 text-sm text-gray-400">Tidak ada item.</td></tr>
                  ) : (detail.lines ?? []).map((l, i) => {
                    const qty = Number(l.qty) || 0;
                    const price = Number(l.unit_price) || 0;
                    const disc = Math.min(Number(l.discount_percent) || 0, 100);
                    return (
                      <tr key={l.id ?? i} className="border-t border-gray-100">
                        <td className="py-2 px-3">{l.product_name ?? l.product?.name ?? `#${l.product_id}`}</td>
                        <td className="py-2 px-3">{qty}</td>
                        <td className="py-2 px-3">Rp {price.toLocaleString('id-ID')}</td>
                        <td className="py-2 px-3">{disc}%</td>
                        <td className="py-2 px-3">{Number(l.qty_shipped ?? 0).toLocaleString('id-ID')}</td>
                        <td className="py-2 px-3 text-right font-medium">Rp {(qty * price * (1 - disc / 100)).toLocaleString('id-ID')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">Grand Total</span>
              <span className="text-base font-bold">Rp {totalOf(detail).toLocaleString('id-ID')}</span>
            </div>

            {(detail.reservations ?? []).length > 0 && (
              <div className="text-sm text-gray-600">
                <span className="text-gray-400">Reservasi:</span>{' '}
                {(detail.reservations ?? []).map((r) => `${r.reservation_no} (${r.status})`).join(', ')}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
