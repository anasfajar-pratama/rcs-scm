import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crudApi } from '../../api/crud';
import { quotationAccept, quotationConvertToSo, quotationReject, quotationSend } from '../../api/crm';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { SalesQuotation, SalesQuotationLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  converted: 'green',
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<SalesQuotation>('sales-quotations');
  const customers = useListQuery<{ id: number; name: string }>('customers');
  const products = useListQuery<{ id: number; name: string; sale_price: number }>('products');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesQuotation | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<SalesQuotationLine[]>([{ product_id: 0, qty: 1, unit_price: 0 }]);

  const [soTarget, setSoTarget] = useState<SalesQuotation | null>(null);
  const [soWarehouse, setSoWarehouse] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-quotations'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<SalesQuotation>('sales-quotations').update(editing.id, payload);
      return crudApi<SalesQuotation>('sales-quotations').create(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
    },
  });

  const send = useMutation({ mutationFn: (id: number) => quotationSend(id), onSuccess: invalidate });
  const accept = useMutation({ mutationFn: (id: number) => quotationAccept(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id: number) => quotationReject(id), onSuccess: invalidate });

  const convert = useMutation({
    mutationFn: () => quotationConvertToSo(soTarget!.id, { warehouse_id: Number(soWarehouse) }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      setSoTarget(null);
      setSoWarehouse('');
      navigate('/crm/sales-orders');
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<SalesQuotation>('sales-quotations').destroy(id),
    onSuccess: invalidate,
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ customer_id: '', quotation_date: '', valid_until: '', currency: 'IDR', notes: '' });
    setLines([{ product_id: 0, qty: 1, unit_price: 0 }]);
    setOpen(true);
  };

  const openEdit = (q: SalesQuotation) => {
    setEditing(q);
    setForm({ ...q, customer_id: q.customer_id, quotation_date: q.quotation_date ?? '', valid_until: q.valid_until ?? '' });
    setLines(q.lines ?? [{ product_id: 0, qty: 1, unit_price: 0 }]);
    setOpen(true);
  };

  const submit = () => {
    save.mutate({
      customer_id: Number(form.customer_id),
      quotation_date: form.quotation_date || null,
      valid_until: form.valid_until || null,
      currency: form.currency,
      notes: form.notes,
      lines: lines.map((l) => ({
        product_id: Number(l.product_id),
        qty: Number(l.qty),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent ?? 0),
      })),
    });
  };

  const totalOf = (q: SalesQuotation) =>
    (q.lines ?? []).reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);

  return (
    <div>
      <PageHeader title="Sales Quotations" subtitle="Penawaran harga ke customer" action={<Button onClick={openCreate}>+ Tambah Quotation</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari quotation..."
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
              { key: 'date', label: 'Tanggal' },
              { key: 'total', label: 'Total' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const q = row as SalesQuotation;
              return (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{q.quotation_no}</td>
                  <td className="py-3 px-4">{q.customer_name ?? `Customer #${q.customer_id}`}</td>
                  <td className="py-3 px-4 text-sm">{q.quotation_date ?? '—'}</td>
                  <td className="py-3 px-4 text-sm font-semibold">Rp {totalOf(q).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[q.status] ?? 'gray'}>{q.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {q.status === 'draft' && (
                      <>
                        <button onClick={() => send.mutate(q.id)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                          Kirim
                        </button>
                        <button onClick={() => openEdit(q)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                          Edit
                        </button>
                        <button onClick={() => remove.mutate(q.id)} className="text-red-500 hover:text-red-700 text-sm">
                          Hapus
                        </button>
                      </>
                    )}
                    {q.status === 'sent' && (
                      <>
                        <button onClick={() => accept.mutate(q.id)} className="text-green-600 hover:text-green-800 text-sm mr-3">
                          Terima
                        </button>
                        <button onClick={() => reject.mutate(q.id)} className="text-red-500 hover:text-red-700 text-sm mr-3">
                          Tolak
                        </button>
                      </>
                    )}
                    {q.status === 'accepted' && (
                      <button
                        onClick={() => {
                          setSoTarget(q);
                          setSoWarehouse('');
                        }}
                        className="text-brand-600 hover:text-brand-800 text-sm"
                      >
                        Buat SO
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
        title={editing ? 'Edit Sales Quotation' : 'Tambah Sales Quotation'}
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
          <Input label="Tanggal" type="date" value={String(form.quotation_date ?? '')} onChange={(v) => set('quotation_date', v)} />
          <Input label="Berlaku Sampai" type="date" value={String(form.valid_until ?? '')} onChange={(v) => set('valid_until', v)} />
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
        open={Boolean(soTarget)}
        onClose={() => setSoTarget(null)}
        title={`Buat SO dari ${soTarget?.quotation_no ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSoTarget(null)}>
              Batal
            </Button>
            <Button onClick={() => convert.mutate()} disabled={convert.isPending || !soWarehouse}>
              {convert.isPending ? 'Membuat...' : 'Buat Sales Order'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Customer: <span className="font-medium">{soTarget?.customer_name ?? `#${soTarget?.customer_id}`}</span>
          </p>
          <Select
            label="Gudang Pemenuhan *"
            value={soWarehouse}
            onChange={setSoWarehouse}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Pilih gudang"
          />
        </div>
      </Modal>
    </div>
  );
}
