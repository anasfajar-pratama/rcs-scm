import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

export default function ReceivingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('receivings');
  const pos = useListQuery<any>('pos');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ po_id: '', warehouse_id: '', received_date: '' });
  const [lines] = useState<any[]>([{ po_line_id: 0, product_id: 0, qty_received: 1, lot_no: '' }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['receivings'] });

  const create = useMutation({
    mutationFn: () => crudApi<any>('receivings').create({ ...form, lines }),
    onSuccess: () => { invalidate(); setOpen(false); },
  });

  const post = useMutation({
    mutationFn: (id: number) => crudApi<any>('receivings').update(id, { status: 'posted' }),
    onSuccess: invalidate,
  });

  const poOptions = (pos.data ?? []).map((p: any) => ({ label: p.po_no, value: p.id }));
  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));

  return (
    <div>
      <PageHeader title="Receiving" subtitle="Penerimaan barang dari PO" action={<Button onClick={() => setOpen(true)}>+ Buat Receiving</Button>} />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'po', label: 'PO' }, { key: 'warehouse', label: 'Gudang' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const r = row as any;
            return <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{r.receiving_no}</td>
              <td className="py-3 px-4">{r.po?.po_no ?? '—'}</td>
              <td className="py-3 px-4">{r.warehouse?.name ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={r.status === 'posted' ? 'green' : 'yellow'}>{r.status}</Badge></td>
              <td className="py-3 px-4 text-right">{r.status === 'draft' && <button onClick={() => post.mutate(r.id)} className="text-brand-600 text-sm">Posting</button>}</td>
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
        <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
      </>}>
        <div className="grid grid-cols-2 gap-4">
          <Select label="PO *" value={form.po_id} onChange={(v) => setForm((f) => ({ ...f, po_id: v }))} options={poOptions} placeholder="Pilih PO" />
          <Select label="Gudang *" value={form.warehouse_id} onChange={(v) => setForm((f) => ({ ...f, warehouse_id: v }))} options={whOptions} placeholder="Pilih" />
          <Input label="Tanggal Terima" type="date" value={form.received_date} onChange={(v) => setForm((f) => ({ ...f, received_date: v }))} />
        </div>
      </Modal>
    </div>
  );
}
