import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { crudApi } from '../../api/crud';
import { quotationAccept, quotationConvertToSo, quotationReject } from '../../api/crm';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Paginated, SalesQuotation, SalesQuotationLine, Stock } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  converted: 'green',
};

// Format "Senin, 2026-09-09" — menerima date-only ("2026-09-09") maupun datetime penuh ("2026-09-09T00:00:00.000000Z").
const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const datePart = d.slice(0, 10);
  const [y, m, day] = datePart.split('-').map(Number);
  if (!y || !m || !day) return d;
  const weekday = new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('id-ID', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `${weekday}, ${datePart}`;
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<SalesQuotation>('sales-quotations');
  const customers = useListQuery<{ id: number; name: string }>('customers');
  const products = useListQuery<{ id: number; name: string; sale_price: number; cost?: number }>('products', {
    type: 'finished_good',
  });
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalesQuotation | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<SalesQuotationLine[]>([{ product_id: 0, qty: 1, unit_price: 0 }]);

  const [detail, setDetail] = useState<SalesQuotation | null>(null);

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
      toast(editing ? 'Quotation diperbarui.' : 'Quotation dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const accept = useMutation({
    mutationFn: (id: number) => quotationAccept(id),
    onSuccess: () => {
      invalidate();
      toast('Quotation diterima.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });
  const reject = useMutation({
    mutationFn: (id: number) => quotationReject(id),
    onSuccess: () => {
      invalidate();
      toast('Quotation ditolak.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const convert = useMutation({
    mutationFn: () => quotationConvertToSo(soTarget!.id, { warehouse_id: Number(soWarehouse) }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      setSoTarget(null);
      setSoWarehouse('');
      toast('Sales order dibuat dari quotation.');
      navigate('/crm/sales-orders');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const stockCheck = useQuery({
    queryKey: ['so-stock-check', soTarget?.id, soWarehouse],
    queryFn: async () => {
      if (!soWarehouse) return [];
      const { data } = await api.get<Paginated<Stock>>('/stocks', {
        params: { warehouse_id: soWarehouse, per_page: 200 },
      });
      return data.data;
    },
    enabled: !!soTarget && !!soWarehouse,
  });

  // Ketersediaan per produk = total qty_available seluruh batch di gudang terpilih.
  const availability = new Map<number, number>();
  for (const s of stockCheck.data ?? []) {
    availability.set(s.product_id, (availability.get(s.product_id) ?? 0) + Number(s.qty_available ?? 0));
  }
  const shortage = soTarget
    ? (soTarget.lines ?? []).filter((l) => (availability.get(l.product_id) ?? 0) < (Number(l.qty) || 0))
    : [];

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<SalesQuotation>('sales-quotations').destroy(id),
    onSuccess: () => {
      invalidate();
      toast('Quotation dihapus.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
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

  const lineTotal = (l: SalesQuotationLine) => {
    const qty = Number(l.qty) || 0;
    const price = Number(l.unit_price) || 0;
    const disc = Math.min(Number(l.discount_percent) || 0, 100);
    return qty * price * (1 - disc / 100);
  };

  const totalOf = (q: SalesQuotation) =>
    (q.lines ?? []).reduce((sum, l) => sum + lineTotal(l), 0);

  const printQuotation = (q: SalesQuotation) => {
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    const rows = (q.lines ?? [])
      .map((l, i) => {
        const price = Number(l.unit_price) || 0;
        const disc = Math.min(Number(l.discount_percent) || 0, 100);
        return `<tr>
          <td>${i + 1}</td>
          <td>${l.product_name ?? l.product?.name ?? `#${l.product_id}`}</td>
          <td class="num">${Number(l.qty) || 0}</td>
          <td class="num">Rp ${price.toLocaleString('id-ID')}</td>
          <td class="num">${disc}%</td>
          <td class="num">Rp ${lineTotal(l).toLocaleString('id-ID')}</td>
        </tr>`;
      })
      .join('');
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${q.quotation_no}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 40px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .muted { color: #6b7280; font-size: 12px; }
    .head { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { background: #f9fafb; }
    .num { text-align: right; white-space: nowrap; }
    .total { text-align: right; font-weight: bold; font-size: 15px; margin-top: 16px; }
    .notes { margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>Sales Quotation</h1>
      <div class="muted">${q.quotation_no} · ${q.quotation_date ? formatDate(q.quotation_date) : ''}</div>
    </div>
    <div class="muted">Status: ${q.status}</div>
  </div>
  <div class="grid">
    <div><b>Customer</b><br />${q.customer_name ?? `#${q.customer_id}`}</div>
    <div>
      ${q.customer?.phone ? `<div class="muted">Telp: ${q.customer.phone}</div>` : ''}
      ${q.customer?.email ? `<div class="muted">Email: ${q.customer.email}</div>` : ''}
      ${q.valid_until ? `<div class="muted">Berlaku s/d ${formatDate(q.valid_until)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Produk</th><th class="num">Qty</th><th class="num">Harga</th><th class="num">Diskon</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: Rp ${totalOf(q).toLocaleString('id-ID')}</div>
  ${q.notes ? `<div class="notes">Catatan: ${q.notes}</div>` : ''}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    w.document.close();
    w.focus();
  };

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
              { key: 'date', label: 'Tanggal Buat' },
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
                  <td className="py-3 px-4 text-sm">{formatDate(q.created_at)}</td>
                  <td className="py-3 px-4 text-sm font-semibold">Rp {totalOf(q).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[q.status] ?? 'gray'}>{q.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => setDetail(q)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Detail
                    </button>
                    {q.status === 'draft' && (
                      <>
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, unit_price: 0, discount_percent: 0 }])}>
              + Tambah Baris
            </Button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Tambahkan produk yang ditawarkan. Harga terisi otomatis dari harga jual produk — boleh disesuaikan. HPP hanya
            sebagai acuan margin, tidak dikirim ke customer.
          </p>
          <div className="grid grid-cols-12 gap-2 items-center text-xs text-gray-400 uppercase tracking-wide mb-1">
            <div className="col-span-4">Produk</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-3">Harga</div>
            <div className="col-span-2">Diskon %</div>
            <div className="col-span-1 text-right">Aksi</div>
          </div>
          {lines.map((line, i) => {
            const cost = line.cost ?? 0;
            const margin = line.unit_price - cost;
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-start mb-3">
                <div className="col-span-4">
                  <Select
                    label=""
                    value={line.product_id}
                    onChange={(v) =>
                      setLines((l) =>
                        l.map((x, idx) => {
                          if (idx !== i) return x;
                          const p = (products.data ?? []).find((pr) => pr.id === Number(v));
                          return { ...x, product_id: Number(v), unit_price: p?.sale_price ?? x.unit_price, cost: p?.cost };
                        }),
                      )
                    }
                    options={(products.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
                    placeholder="Pilih produk"
                  />
                  {cost > 0 && (
                    <p className="text-xs text-gray-400 mt-1">HPP Rp {Number(cost).toLocaleString('id-ID')}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Input
                    label=""
                    type="number"
                    value={line.qty}
                    placeholder="Qty"
                    onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label=""
                    type="number"
                    value={line.unit_price}
                    placeholder="Harga"
                    onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, unit_price: Number(v) } : x)))}
                  />
                  {cost > 0 && (
                    <p className={`text-xs mt-1 ${margin < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {margin < 0 ? '⚠ Margin negatif! ' : ''}Margin Rp {Number(margin).toLocaleString('id-ID')}/unit
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <Input
                    label=""
                    type="number"
                    value={line.discount_percent ?? 0}
                    placeholder="0"
                    onChange={(v) =>
                      setLines((l) => l.map((x, idx) => (idx === i ? { ...x, discount_percent: Number(v) } : x)))
                    }
                  />
                </div>
                <div className="col-span-1 flex justify-end pt-2">
                  <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.quotation_no ?? ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Tutup
            </Button>
            <Button onClick={() => detail && printQuotation(detail)}>Cetak</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Customer</div>
                <div className="font-medium">{detail.customer_name ?? `#${detail.customer_id}`}</div>
                {detail.customer?.phone && <div className="text-gray-400 text-xs">{detail.customer.phone}</div>}
                {detail.customer?.email && <div className="text-gray-400 text-xs">{detail.customer.email}</div>}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-400 mb-1">Quotation</span>
                  <Badge color={statusColor[detail.status] ?? 'gray'}>{detail.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tanggal</span>
                  <span>{formatDate(detail.quotation_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Berlaku s/d</span>
                  <span>{formatDate(detail.valid_until)}</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Harga</th>
                    <th className="py-2 px-3">Diskon</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).map((l, i) => (
                    <tr key={l.id ?? i} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        {l.product_name ?? l.product?.name ?? `#${l.product_id}`}
                        {l.product?.sku && <span className="text-xs text-gray-400 ml-1">({l.product.sku})</span>}
                      </td>
                      <td className="py-2 px-3">{Number(l.qty) || 0}</td>
                      <td className="py-2 px-3">Rp {Number(l.unit_price || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">{Number(l.discount_percent || 0)}%</td>
                      <td className="py-2 px-3 text-right font-medium">Rp {lineTotal(l).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">Grand Total</span>
              <span className="text-base font-bold">Rp {totalOf(detail).toLocaleString('id-ID')}</span>
            </div>

            {detail.notes && <p className="text-sm text-gray-600">Catatan: {detail.notes}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(soTarget)}
        onClose={() => setSoTarget(null)}
        title={`Buat SO dari ${soTarget?.quotation_no ?? ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSoTarget(null)}>
              Batal
            </Button>
            <Button
              onClick={() => convert.mutate()}
              disabled={convert.isPending || !soWarehouse || shortage.length > 0}
            >
              {convert.isPending ? 'Membuat...' : 'Buat Sales Order'}
            </Button>
          </>
        }
      >
        {soTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Sales Quotation</div>
                <div className="font-medium">{soTarget.quotation_no}</div>
                <div className="text-gray-400 text-xs">{formatDate(soTarget.quotation_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Customer</div>
                <div className="font-medium">{soTarget.customer_name ?? `#${soTarget.customer_id}`}</div>
                {soTarget.customer?.phone && <div className="text-gray-400 text-xs">{soTarget.customer.phone}</div>}
              </div>
            </div>

            <Select
              label="Gudang Pemenuhan *"
              value={soWarehouse}
              onChange={setSoWarehouse}
              options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
              placeholder="Pilih gudang"
            />

            {soWarehouse ? (
              stockCheck.isLoading ? (
                <Spinner />
              ) : (
                <>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                          <th className="py-2 px-3">Produk</th>
                          <th className="py-2 px-3">Qty SQ</th>
                          <th className="py-2 px-3">Tersedia</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(soTarget.lines ?? []).map((l, i) => {
                          const avail = availability.get(l.product_id) ?? 0;
                          const need = Number(l.qty) || 0;
                          const ok = avail >= need;
                          return (
                            <tr key={l.id ?? i} className="border-t border-gray-100">
                              <td className="py-2 px-3">
                                {l.product_name ?? l.product?.name ?? `#${l.product_id}`}
                                {l.product?.sku && <span className="text-xs text-gray-400 ml-1">({l.product.sku})</span>}
                              </td>
                              <td className="py-2 px-3">{need}</td>
                              <td className="py-2 px-3">{Number(avail).toLocaleString('id-ID')}</td>
                              <td className="py-2 px-3">
                                {ok ? (
                                  <Badge color="green">Cukup</Badge>
                                ) : (
                                  <Badge color="red">Kurang {Number(need - avail).toLocaleString('id-ID')}</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {shortage.length > 0 && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      ⚠ Stok di gudang ini tidak mencukupi untuk: {shortage.map((l) => l.product_name ?? `#${l.product_id}`).join(', ')}. Pilih gudang lain atau perbarui SQ.
                    </div>
                  )}
                </>
              )
            ) : (
              <p className="text-sm text-gray-400">Pilih gudang untuk melihat ketersediaan stok.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
