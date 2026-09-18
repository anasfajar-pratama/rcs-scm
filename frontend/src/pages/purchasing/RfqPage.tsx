import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { api } from '../../api/client';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = { draft: 'gray', sent: 'blue', closed: 'green' };

interface CompareItem {
  rfq_line_id: number;
  product: string;
  qty: number;
  target_price: number;
  quotations: {
    id: number;
    supplier: string;
    price: number;
    lead_time_days: number | null;
    valid_until: string | null;
    is_cheapest: boolean;
  }[];
}

export default function RfqPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('rfqs');
  const products = useListQuery<{ id: number; name: string; sku: string }>('products');
  const suppliers = useListQuery<{ id: number; name: string }>('suppliers');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ deadline: '', notes: '' });
  const [lines, setLines] = useState<any[]>([{ product_id: 0, qty: 1, target_price: 0 }]);
  const [supplierIds, setSupplierIds] = useState<number[]>([]);

  const [compareRfqId, setCompareRfqId] = useState<number | null>(null);
  const [compareData, setCompareData] = useState<CompareItem[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rfqs'] });

  const create = useMutation({
    mutationFn: () => crudApi<any>('rfqs').create({ ...form, lines, supplier_ids: supplierIds }),
    onSuccess: () => { invalidate(); setOpen(false); setLines([{ product_id: 0, qty: 1, target_price: 0 }]); setSupplierIds([]); toast('RFQ dibuat.'); },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const openCompare = async (rfqId: number) => {
    setCompareRfqId(rfqId);
    setCompareData(null);
    setCompareLoading(true);
    try {
      const res = await api.get<{ data: CompareItem[] }>('/quotations/compare', { params: { rfq_id: rfqId } });
      setCompareData(res.data.data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setCompareLoading(false);
    }
  };

  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));
  const supplierOptions = (suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id }));

  return (
    <div>
      <PageHeader title="RFQ" subtitle="Request for Quotation" action={<Button onClick={() => setOpen(true)}>+ Buat RFQ</Button>} />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'deadline', label: 'Deadline' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const rfq = row as any;
            return <tr key={rfq.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{rfq.rfq_no}</td>
              <td className="py-3 px-4">{rfq.deadline ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={statusColor[rfq.status] ?? 'gray'}>{rfq.status}</Badge></td>
              <td className="py-3 px-4 text-right">
                <button onClick={() => openCompare(rfq.id)} className="text-brand-600 hover:text-brand-800 text-sm">Bandingkan</button>
              </td>
            </tr>;
          }} />
        )}
        {meta && <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
          <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
        </div>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Buat RFQ" size="lg" footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
      </>}>
        <Input label="Deadline" type="date" value={form.deadline} onChange={(v) => setForm((f) => ({ ...f, deadline: v }))} />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier (multi-select)</label>
          <div className="space-y-1 max-h-40 overflow-auto border border-gray-200 rounded p-2">
            {supplierOptions.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={supplierIds.includes(s.value as number)} onChange={(e) => setSupplierIds((ids) => e.target.checked ? [...ids, s.value as number] : ids.filter((id) => id !== s.value))} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              <div className="col-span-2"><Select value={line.product_id} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, product_id: Number(v) } : x)))} options={productOptions} placeholder="Produk" /></div>
              <Input label="" type="number" value={line.qty} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))} placeholder="Qty" />
              <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm px-2">×</button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, target_price: 0 }])}>+ Tambah Item</Button>
        </div>
      </Modal>

      <Modal open={Boolean(compareRfqId)} onClose={() => setCompareRfqId(null)} title={`Perbandingan Quotation · RFQ #${compareRfqId ?? ''}`} size="lg">
        {compareLoading ? (
          <Spinner />
        ) : !compareData || compareData.length === 0 ? (
          <EmptyState message="Belum ada quotation untuk RFQ ini." />
        ) : (
          <div className="space-y-4">
            {compareData.map((item) => (
              <div key={item.rfq_line_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-800">{item.product}</div>
                  <div className="text-sm text-gray-500">
                    Qty {item.qty} · Target <span className="font-medium">Rp {Number(item.target_price).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                {item.quotations.length === 0 ? (
                  <p className="text-sm text-gray-400">Belum ada penawaran.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="py-2">Supplier</th>
                        <th className="py-2">Harga</th>
                        <th className="py-2">Lead Time</th>
                        <th className="py-2">Berlaku s/d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.quotations.map((q) => (
                        <tr key={q.id} className="border-b border-gray-100">
                          <td className="py-2">
                            {q.supplier}
                            {q.is_cheapest && <Badge color="green" >Termurah</Badge>}
                          </td>
                          <td className="py-2 font-medium">Rp {Number(q.price).toLocaleString('id-ID')}</td>
                          <td className="py-2">{q.lead_time_days ? `${q.lead_time_days} hari` : '—'}</td>
                          <td className="py-2">{q.valid_until ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
