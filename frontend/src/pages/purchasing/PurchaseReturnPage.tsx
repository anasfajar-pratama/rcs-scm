import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Product } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

interface ReturnLine {
  product_id: number;
  product_name?: string;
  batch_id: number | null;
  lot_no?: string;
  qty: string;
  reason: string;
}

export default function PurchaseReturnPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('purchase-returns');
  const suppliers = useListQuery<{ id: number; name: string }>('suppliers');
  const receivings = useListQuery<any>('receivings', { status: 'posted' });
  const products = useListQuery<Product>('products', { type: 'raw_material' });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', receiving_id: '', reason: '' });
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [detail, setDetail] = useState<any | null>(null);

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });

  const post = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-returns/${id}/post`),
    onSuccess: () => {
      invalidate();
      toast('Return diposting.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const create = useMutation({
    mutationFn: () =>
      crudApi<any>('purchase-returns').create({
        supplier_id: Number(form.supplier_id),
        receiving_id: form.receiving_id ? Number(form.receiving_id) : null,
        reason: form.reason || null,
        lines: lines
          .filter((l) => Number(l.qty) > 0 && l.product_id)
          .map((l) => ({
            product_id: l.product_id,
            batch_id: l.batch_id ?? null,
            qty: Number(l.qty),
            reason: l.reason || null,
          })),
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setLines([]);
      toast('Return dibuat (draft).');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const pickReceiving = async (id: string) => {
    setForm((f) => ({ ...f, receiving_id: id }));
    setLines([]);
    if (!id) return;
    try {
      const rec = await crudApi<any>('receivings').get(Number(id));
      const rl = (rec.lines ?? []).filter((l: any) => Number(l.qty_received) > 0);
      setLines(
        rl.map((l: any) => ({
          product_id: l.product_id,
          product_name: l.product?.name ?? `#${l.product_id}`,
          batch_id: l.batch_id ?? l.batch?.id ?? null,
          lot_no: l.lot_no ?? l.batch?.lot_no,
          qty: '',
          reason: '',
        })),
      );
      if (!form.supplier_id && rec.po?.supplier_id) {
        setForm((f) => ({ ...f, supplier_id: String(rec.po.supplier_id) }));
      }
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  };

  // Prefill dari tombol "Buat Return" di modal Detail Receiving (?receiving_id=&supplier_id=)
  useEffect(() => {
    const receivingId = searchParams.get('receiving_id');
    const supplierId = searchParams.get('supplier_id');
    if (receivingId || supplierId) {
      setForm((f) => ({
        ...f,
        receiving_id: receivingId ?? f.receiving_id,
        supplier_id: supplierId ?? f.supplier_id,
      }));
      if (receivingId) pickReceiving(receivingId);
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplierOptions = (suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id }));
  const receivingOptions = (receivings.data ?? []).map((r: any) => ({
    label: `${r.receiving_no}${r.po ? ` — ${r.po.po_no}` : ''}`,
    value: r.id,
  }));
  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));

  const setLine = (i: number, patch: Partial<ReturnLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const canSubmit = form.supplier_id && lines.some((l) => Number(l.qty) > 0 && l.product_id);

  return (
    <div>
      <PageHeader title="Purchase Return" subtitle="Retur pembelian ke supplier" action={<Button onClick={() => setOpen(true)}>+ Tambah Return</Button>} />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const r = row as any;
            return <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{r.return_no}</td>
              <td className="py-3 px-4">{r.supplier?.name ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={r.status === 'posted' ? 'green' : 'yellow'}>{r.status}</Badge></td>
              <td className="py-3 px-4 text-right whitespace-nowrap">
                <button onClick={() => setDetail(r)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Detail</button>
                {r.status === 'draft' && <button onClick={() => post.mutate(r.id)} disabled={post.isPending} className="text-brand-600 hover:text-brand-800 text-sm">Posting</button>}
              </td>
            </tr>;
          }} />
        )}
        {meta && <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
          <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
        </div>}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Purchase Return"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
              {create.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="Supplier *" value={form.supplier_id} onChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))} options={supplierOptions} placeholder="Pilih supplier" />
          <Select label="Dari Receiving" value={form.receiving_id} onChange={pickReceiving} options={receivingOptions} placeholder="Pilih receiving (opsional)" />
          <Input label="Alasan" value={form.reason} onChange={(v) => setForm((f) => ({ ...f, reason: v }))} placeholder="cth: Barang rusak / tidak sesuai" />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Item Retur</label>
            {!form.receiving_id && (
              <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, batch_id: null, qty: '', reason: '' }])}>
                + Tambah Item
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {form.receiving_id
              ? 'Item otomatis dari receiving terpilih — isi qty yang diretur. Batch ikut tercatat.'
              : 'Pilih produk bahan baku yang diretur dan isi qty-nya.'}
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                  <th className="py-2 px-3">Produk</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Qty Retur</th>
                  <th className="py-2 px-3">Alasan</th>
                  {!form.receiving_id && <th className="py-2 px-3"></th>}
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={form.receiving_id ? 4 : 5} className="py-4 px-3 text-sm text-gray-400">
                    {form.receiving_id ? 'Memuat item receiving…' : 'Belum ada item. Klik "+ Tambah Item".'}
                  </td></tr>
                ) : lines.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 px-3">
                      {form.receiving_id ? (
                        l.product_name ?? `#${l.product_id}`
                      ) : (
                        <Select
                          label=""
                          value={l.product_id}
                          onChange={(v) => setLine(i, { product_id: Number(v), product_name: undefined })}
                          options={productOptions}
                          placeholder="Pilih produk"
                        />
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{l.lot_no ?? '—'}</td>
                    <td className="py-2 px-3 w-28">
                      <Input label="" type="number" value={l.qty} onChange={(v) => setLine(i, { qty: v })} placeholder="0" />
                    </td>
                    <td className="py-2 px-3">
                      <Input label="" value={l.reason} onChange={(v) => setLine(i, { reason: v })} placeholder="opsional" />
                    </td>
                    {!form.receiving_id && (
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">×</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.return_no ?? ''}`}
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
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Purchase Return</div>
                <div className="font-medium">{detail.return_no}</div>
                <div className="text-gray-400 text-xs">{formatDate(detail.created_at)}</div>
                <div className="mt-1">
                  <Badge color={detail.status === 'posted' ? 'green' : 'yellow'}>{detail.status}</Badge>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Supplier</div>
                <div className="font-medium">{detail.supplier?.name ?? '—'}</div>
                {detail.supplier?.phone && <div className="text-gray-400 text-xs">{detail.supplier.phone}</div>}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Asal Receiving</div>
                <div className="font-medium">{detail.receiving?.receiving_no ?? '—'}</div>
                {detail.receiving?.po && <div className="text-gray-400 text-xs">PO {detail.receiving.po.po_no}</div>}
                {detail.receiving?.warehouse && <div className="text-gray-400 text-xs">{detail.receiving.warehouse.name}</div>}
                {detail.reason && <div className="text-gray-600 text-xs mt-1">Alasan: {detail.reason}</div>}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Batch / Lot</th>
                    <th className="py-2 px-3">Qty Retur</th>
                    <th className="py-2 px-3">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).length === 0 ? (
                    <tr><td colSpan={4} className="py-4 px-3 text-sm text-gray-400">Tidak ada item.</td></tr>
                  ) : (detail.lines ?? []).map((l: any, i: number) => (
                    <tr key={l.id ?? i} className="border-t border-gray-100">
                      <td className="py-2 px-3">{l.product?.name ?? `#${l.product_id}`}</td>
                      <td className="py-2 px-3 font-mono text-xs">{l.batch?.lot_no ?? '—'}</td>
                      <td className="py-2 px-3">{Number(l.qty || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">{l.reason ?? '—'}</td>
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