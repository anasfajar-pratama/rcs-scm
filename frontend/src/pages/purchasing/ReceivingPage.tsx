import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

interface ReceivingLine {
  po_line_id: number;
  product_id: number;
  product_name?: string;
  product_expiry_required?: boolean;
  qty_received: string;
  lot_no: string;
  mfg_date: string;
  expiry_date: string;
}

export default function ReceivingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('receivings');
  const pos = useListQuery<any>('pos', { status: 'approved,partially_received' });
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ po_id: '', warehouse_id: '', received_date: '' });
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [poDetail, setPoDetail] = useState<any | null>(null);
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['receivings'] });

  const create = useMutation({
    mutationFn: () =>
      crudApi<any>('receivings').create({
        ...form,
        lines: lines
          .filter((l) => Number(l.qty_received) > 0)
          .map((l) => ({
            po_line_id: l.po_line_id,
            product_id: l.product_id,
            qty_received: Number(l.qty_received),
            lot_no: l.lot_no || null,
            mfg_date: l.mfg_date || null,
            expiry_date: l.expiry_date || null,
          })),
      }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      setOpen(false);
      setLines([]);
      setPoDetail(null);
      toast('Receiving dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const post = useMutation({
    mutationFn: (id: number) => api.post(`/receivings/${id}/post`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast('Receiving diposting.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const poOptions = (pos.data ?? []).map((p: any) => ({ label: p.po_no, value: p.id }));
  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));

  const openCreate = async () => {
    setForm({ po_id: '', warehouse_id: '', received_date: '' });
    setLines([]);
    setPoDetail(null);
    setOpen(true);
  };

  const pickPo = async (poId: string) => {
    setForm((f) => ({ ...f, po_id: poId }));
    setLines([]);
    setPoDetail(null);
    if (!poId) return;
    try {
      const po = await crudApi<any>('pos').get(Number(poId));
      setPoDetail(po);
      setLines(
        (po.lines ?? []).map((l: any) => ({
          po_line_id: l.id,
          product_id: l.product_id,
          product_name: l.product?.name ?? `#${l.product_id}`,
          product_expiry_required: Boolean(l.product?.expiry_required),
          qty_received: '',
          lot_no: '',
          mfg_date: '',
          expiry_date: '',
        })),
      );
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  };

  const setLine = (i: number, patch: Partial<ReceivingLine>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const remainingOf = (l: ReceivingLine): number => {
    if (!poDetail) return 0;
    const pl = (poDetail.lines ?? []).find((x: any) => x.id === l.po_line_id);
    if (!pl) return 0;
    return (Number(pl.qty) || 0) - (Number(pl.qty_received) || 0);
  };

  const canSubmit = lines.some((l) => Number(l.qty_received) > 0) && form.po_id && form.warehouse_id;

  return (
    <div>
      <PageHeader title="Receiving" subtitle="Penerimaan barang dari PO" action={<Button onClick={openCreate}>+ Buat Receiving</Button>} />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'po', label: 'PO' }, { key: 'warehouse', label: 'Gudang' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const r = row as any;
            return <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{r.receiving_no}</td>
              <td className="py-3 px-4">{r.po?.po_no ?? '—'}</td>
              <td className="py-3 px-4">{r.warehouse?.name ?? '—'}</td>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Buat Receiving" size="lg" footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
          {create.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </>}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="PO *" value={form.po_id} onChange={pickPo} options={poOptions} placeholder="Pilih PO" />
          <Select label="Gudang *" value={form.warehouse_id} onChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))} options={whOptions} placeholder="Pilih" />
          <Input label="Tanggal Terima" type="date" value={form.received_date} onChange={(v) => setForm((f) => ({ ...f, received_date: v }))} />
        </div>

        {form.po_id && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Item Penerimaan</label>
              <span className="text-xs text-gray-400">{(lines ?? []).filter((l) => Number(l.qty_received) > 0).length} baris terisi</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Isi jumlah yang diterima per item (maksimal sisa PO). Untuk produk yang wajib expiry, isi juga Lot No, MFG
              (tanggal produksi) dan Expiry (tanggal kedaluwarsa) — dipakai untuk pembuatan batch & penilaian FEFO.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Sisa PO</th>
                    <th className="py-2 px-3">Diterima</th>
                    <th className="py-2 px-3">Lot No</th>
                    <th className="py-2 px-3">MFG</th>
                    <th className="py-2 px-3">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={6} className="py-4 px-3 text-sm text-gray-400">Pilih PO untuk memuat item.</td></tr>
                  ) : (lines ?? []).map((l, i) => {
                    const remaining = remainingOf(l);
                    const over = Number(l.qty_received) > remaining;
                    return (
                      <tr key={l.po_line_id} className="border-t border-gray-100">
                        <td className="py-2 px-3">
                          {l.product_name ?? `#${l.product_id}`}
                          {l.product_expiry_required && (
                            <span className="ml-1 inline-block text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 rounded px-1 py-0.5">wajib expiry</span>
                          )}
                        </td>
                        <td className="py-2 px-3">{remaining}</td>
                        <td className="py-2 px-3 w-24">
                          <Input
                            label=""
                            type="number"
                            value={l.qty_received}
                            onChange={(v) => setLine(i, { qty_received: v })}
                            placeholder="0"
                          />
                          {over && <p className="text-xs text-red-500 mt-1">Melebihi sisa ({remaining})</p>}
                        </td>
                        <td className="py-2 px-3 w-32">
                          <Input label="" value={l.lot_no} onChange={(v) => setLine(i, { lot_no: v })} placeholder="cth: LOT-20260901" />
                        </td>
                        <td className="py-2 px-3 w-36">
                          <Input label="" type="date" value={l.mfg_date} onChange={(v) => setLine(i, { mfg_date: v })} />
                        </td>
                        <td className="py-2 px-3 w-36">
                          <Input label="" type="date" value={l.expiry_date} onChange={(v) => setLine(i, { expiry_date: v })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              MFG = tanggal produksi, Expiry = tanggal kedaluwarsa. Kosongkan jika produk tidak memerlukannya.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.receiving_no ?? ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Tutup
            </Button>
            <Button
              onClick={() =>
                detail &&
                navigate(`/purchasing/return?receiving_id=${detail.id}&supplier_id=${detail.po?.supplier_id ?? ''}`)
              }
            >
              Buat Return
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Penerimaan</div>
                <div className="font-medium">{detail.receiving_no}</div>
                <div className="text-gray-400 text-xs">{formatDate(detail.received_date)}</div>
                <div className="mt-1"><Badge color={detail.status === 'posted' ? 'green' : 'yellow'}>{detail.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">PO & Supplier</div>
                <div className="font-medium">{detail.po?.po_no ?? '—'}</div>
                <div className="text-gray-400 text-xs">{detail.po?.supplier?.name ?? ''}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Gudang</div>
                <div className="font-medium">{detail.warehouse?.name ?? '—'}</div>
                {detail.notes && <div className="text-gray-400 text-xs mt-1">{detail.notes}</div>}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 text-xs uppercase tracking-wide">
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">Lot No</th>
                    <th className="py-2 px-3">Qty Diterima</th>
                    <th className="py-2 px-3">MFG</th>
                    <th className="py-2 px-3">Expiry</th>
                    <th className="py-2 px-3">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).length === 0 ? (
                    <tr><td colSpan={6} className="py-4 px-3 text-sm text-gray-400">Tidak ada item.</td></tr>
                  ) : (detail.lines ?? []).map((l: any, i: number) => (
                    <tr key={l.id ?? i} className="border-t border-gray-100">
                      <td className="py-2 px-3">{l.product?.name ?? `#${l.product_id}`}</td>
                      <td className="py-2 px-3 font-mono text-xs">{l.lot_no ?? '—'}</td>
                      <td className="py-2 px-3">{Number(l.qty_received || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-xs">{l.mfg_date ? formatDate(l.mfg_date) : '—'}</td>
                      <td className="py-2 px-3 text-xs">{l.expiry_date ? formatDate(l.expiry_date) : '—'}</td>
                      <td className="py-2 px-3 font-mono text-xs">{l.batch?.lot_no ?? '—'}</td>
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