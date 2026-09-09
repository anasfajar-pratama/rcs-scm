import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';
import { useMasterQuery } from '../../hooks/useMaster';
import type { SettingItem } from '../../types';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

interface PoLine {
  id: number;
  product_id: number;
  product?: { name: string; sku?: string; unit?: { name: string } };
  qty: number;
  qty_received: number;
  price: number;
  tax: number;
  discount: number;
  expected_date?: string;
}

interface PurchaseOrder {
  id: number;
  po_no: string;
  supplier_id: number;
  supplier?: { id: number; name: string; email?: string; phone?: string; address?: string; pic_name?: string };
  quotation_id?: number;
  currency: string;
  status: string;
  payment_term?: string;
  shipping_cost?: number;
  notes?: string;
  lines?: PoLine[];
  created_at?: string;
}

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'blue',
  partially_received: 'blue',
  received: 'green',
  cancelled: 'red',
};

// Format "Senin, 2026-09-09" — menerima date-only maupun datetime penuh.
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

const lineSubtotal = (l: PoLine) =>
  (Number(l.qty) || 0) * (Number(l.price) || 0) - (Number(l.discount) || 0) + (Number(l.tax) || 0);

const poTotal = (po: PurchaseOrder) => (po.lines ?? []).reduce((s, l) => s + lineSubtotal(l), 0);

const orderTotal = (po: PurchaseOrder) => poTotal(po) + (Number(po.shipping_cost) || 0);

export default function PoPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, meta, setPage } = useMasterQuery<PurchaseOrder>('pos');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingItem[]> => {
      const { data } = await api.get<{ data: SettingItem[] }>('/settings');
      return data.data;
    },
  });
  const settingOf = (key: string, fallback: string) =>
    String(settings?.find((s) => s.key === key)?.value ?? fallback);

  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [shippingInput, setShippingInput] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pos'] });

  const addShipping = useMutation({
    mutationFn: () => api.post(`/pos/${detail!.id}/shipping-cost`, { shipping_cost: Number(shippingInput) }),
    onSuccess: (res) => {
      setDetail((res.data?.data as PurchaseOrder) ?? null);
      setShippingInput('');
      invalidate();
      toast('Ongkos kirim ditambahkan.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => api.post(`/pos/${id}/${action}`),
    onSuccess: (_res, vars) => {
      invalidate();
      toast(vars.action === 'approve' ? 'PO disetujui.' : 'PO ditolak.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  // Format tanggal surat: "21 Agustus 2026"
const formatDateLong = (d?: string | null) => {
  if (!d) return '—';
  const datePart = d.slice(0, 10);
  const [y, m, day] = datePart.split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const loadLogo = async (): Promise<string> => {
    try {
      const res = await fetch('/logo-dokumen.png');
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  const printPo = async (po: PurchaseOrder) => {
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;

    const logo = await loadLogo();
    const senderName = settingOf('po.sender_name', 'Vevy Anjeli');
    const senderPhone = settingOf('po.sender_phone', '0813 3838 3737');

    const rows = (po.lines ?? [])
      .map((l, i) => {
        const price = Number(l.price) || 0;
        const unit = l.product?.unit?.name ?? '';
        return `<tr>
          <td class="no">${i + 1}.</td>
          <td>${l.product?.name ?? `#${l.product_id}`}</td>
          <td class="qty">${Number(l.qty) || 0}</td>
          <td>${unit}</td>
          <td class="num">Rp. ${price.toLocaleString('id-ID')}${unit ? '/ ' + unit : ''}</td>
        </tr>`;
      })
      .join('');

    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${po.po_no}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 50px 60px; font-size: 12px; line-height: 1.5; }
    .muted { color: #6b7280; font-size: 11px; }
    .kop { display: flex; align-items: center; gap: 14px; margin-bottom: 4px; }
    .kop img { width: 76px; height: auto; }
    .kop-text { flex: 1; text-align: center; }
    .kop-text h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: 1px; }
    .kop-text div { font-size: 11px; }
    hr { border: none; border-top: 3px double #1f2937; margin: 10px 0 20px; }
    h2 { font-size: 15px; text-align: center; letter-spacing: 3px; margin: 0 0 6px; }
    .meta { text-align: center; margin-bottom: 18px; }
    .meta div { font-size: 12px; }
    .to { margin-bottom: 14px; }
    .to .line { margin-left: 36px; }
    .intro { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 4px 8px; text-align: left; vertical-align: top; }
    th { border-bottom: 1px solid #1f2937; font-weight: bold; }
    td.num { text-align: right; white-space: nowrap; }
    td.qty, td.no { text-align: center; }
    .klausul { margin: 8px 0; }
    .pengiriman { margin-top: 12px; }
    .payment { margin-top: 4px; }
    .sign { margin-top: 44px; }
    .sign .name { font-weight: bold; margin-top: 52px; }
  </style>
</head>
<body>
  <div class="kop">
    ${logo ? `<img src="${logo}" alt="logo" />` : ''}
    <div class="kop-text">
      <h1>CV RINDANG CEMARA SUKSES</h1>
      <div>Cluster Bu Wati, Jl. Cibiru Beet, Rt.03 Rw.11 Desa/Kelurahan Cileunyi Wetan, Kec.Cileunyi, Kab. Bandung, Provinsi Jawa Barat</div>
      <div>Handphone : 0813 3838 3737 &nbsp;&nbsp; Email : rindangcemarasukses@gmail.com</div>
    </div>
  </div>
  <hr />
  <h2>PURCHASE ORDER (PO)</h2>
  <div class="meta">
    <div>No: ${po.po_no}</div>
    <div>Tanggal: ${formatDateLong(po.created_at)}</div>
  </div>
  <div class="to">
    <div>Kepada Yth:</div>
    <div class="line"><b>${po.supplier?.name ?? `#${po.supplier_id}`}</b></div>
    <div class="line">Attn: ${po.supplier?.pic_name ?? '—'}</div>
  </div>
  <div class="intro">Mohon diproses pesanan berikut:</div>
  <table>
    <thead>
      <tr><th>No.</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="klausul"><b>Mohon dilengkapi dokumen COA, Sertifikat Halal, Beserta Dokumen Pendukung Lainnya.</b></div>
  <div class="klausul">Harga mengikuti invoice dari supplier.</div>
  <div class="pengiriman"><b>Alamat Pengiriman:</b><br />
    Cluster Bu Wati, Jl. Cibiru Beet, RT 03 Rw 11. Desa/Kelurahan Cileunyi Wetan, Kec Cileunyi, Kab Bandung, Provinsi Jawa Barat. Kode Pos: 40622.<br />
    Tel: 0813 3838 3737
  </div>
  <div class="payment">Pembayaran dilakukan setelah invoice diterima.</div>
  <div class="sign">Hormat Kami,<br /><div class="name">${senderName}</div>${senderPhone}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
    w.document.close();
    w.focus();
  };

  return (
    <div>
      <PageHeader title="Purchase Order" subtitle="Order pembelian ke supplier" />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const po = row as PurchaseOrder;
            return <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{po.po_no}</td>
              <td className="py-3 px-4">{po.supplier?.name ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={statusColor[po.status] ?? 'gray'}>{po.status}</Badge></td>
              <td className="py-3 px-4 text-right whitespace-nowrap">
                <button onClick={() => setDetail(po)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Detail</button>
                {po.status === 'pending' && <>
                  <button onClick={() => action.mutate({ id: po.id, action: 'approve' })} disabled={action.isPending} className="text-brand-600 hover:text-brand-800 text-sm mr-3">Setujui</button>
                  <button onClick={() => action.mutate({ id: po.id, action: 'reject' })} disabled={action.isPending} className="text-red-500 hover:text-red-700 text-sm">Tolak</button>
                </>}
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
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Detail ${detail?.po_no ?? ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button>
            <Button onClick={() => detail && printPo(detail)}>Cetak PDF</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Supplier</div>
                <div className="font-medium">{detail.supplier?.name ?? `#${detail.supplier_id}`}</div>
                {detail.supplier?.address && <div className="text-gray-400 text-xs">{detail.supplier.address}</div>}
                {detail.supplier?.phone && <div className="text-gray-400 text-xs">{detail.supplier.phone}</div>}
                {detail.supplier?.email && <div className="text-gray-400 text-xs">{detail.supplier.email}</div>}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-400 mb-1">Purchase Order</span>
                  <Badge color={statusColor[detail.status] ?? 'gray'}>{detail.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tanggal</span>
                  <span>{formatDate(detail.created_at)}</span>
                </div>
                {detail.payment_term && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Termin</span>
                    <span>{detail.payment_term}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Total</span>
                  <span className="font-semibold">Rp {poTotal(detail).toLocaleString('id-ID')}</span>
                </div>
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
                    <th className="py-2 px-3">Pajak</th>
                    <th className="py-2 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines ?? []).map((l, i) => (
                    <tr key={l.id ?? i} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        {l.product?.name ?? `#${l.product_id}`}
                        {l.product?.sku && <span className="text-xs text-gray-400 ml-1">({l.product.sku})</span>}
                      </td>
                      <td className="py-2 px-3">{Number(l.qty) || 0}</td>
                      <td className="py-2 px-3">Rp {Number(l.price || 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3">{Number(l.discount || 0) ? `Rp ${Number(l.discount).toLocaleString('id-ID')}` : '—'}</td>
                      <td className="py-2 px-3">{Number(l.tax || 0) ? `Rp ${Number(l.tax).toLocaleString('id-ID')}` : '—'}</td>
                      <td className="py-2 px-3 text-right font-medium">Rp {lineSubtotal(l).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">Rp {poTotal(detail).toLocaleString('id-ID')}</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
              <span className="text-gray-500">Ongkos Kirim</span>
              <span className="font-medium">Rp {(Number(detail.shipping_cost) || 0).toLocaleString('id-ID')}</span>
              <input
                type="number"
                value={shippingInput}
                onChange={(e) => setShippingInput(e.target.value)}
                placeholder="0"
                className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button variant="secondary" onClick={() => addShipping.mutate()} disabled={addShipping.isPending || !shippingInput}>
                {addShipping.isPending ? 'Menyimpan...' : '+ Tambah Ongkos Kirim'}
              </Button>
            </div>

            <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">Grand Total</span>
              <span className="text-base font-bold">Rp {orderTotal(detail).toLocaleString('id-ID')}</span>
            </div>

            {detail.notes && <p className="text-sm text-gray-600">Catatan: {detail.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}