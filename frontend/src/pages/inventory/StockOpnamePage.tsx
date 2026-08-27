import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { opnamePost } from '../../api/inventory';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Stock, StockOpname } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

export default function StockOpnamePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<StockOpname>('stock-opnames');
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');
  const stocks = useMasterQuery<Stock>('stocks');

  const [open, setOpen] = useState(false);
  const [whId, setWhId] = useState('');
  const [counted, setCounted] = useState<Record<number, number>>({});

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
  };

  const create = useMutation({
    mutationFn: () => {
      const lines = (stocks.data?.data ?? []).map((s) => ({
        product_id: s.product_id,
        batch_id: s.batch_id,
        qty_count: counted[s.id] ?? Number(s.qty_on_hand),
      }));
      return crudApi<StockOpname>('stock-opnames').create({ warehouse_id: Number(whId), lines });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
  });

  const post = useMutation({
    mutationFn: (id: number) => opnamePost(id),
    onSuccess: invalidate,
  });

  const whOptions = (warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }));

  const beginOpname = () => {
    setOpen(true);
    setCounted({});
  };

  return (
    <div>
      <PageHeader title="Stok Opname" subtitle="Hitung fisik & posting selisih" action={<Button onClick={beginOpname}>+ Mulai Opname</Button>} />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'no', label: 'No' },
              { key: 'wh', label: 'Gudang' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const o = row as StockOpname;
              return (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{o.opname_no}</td>
                  <td className="py-3 px-4">{o.warehouse_name ?? '—'}</td>
                  <td className="py-3 px-4">
                    {o.status === 'counted' ? <Badge color="yellow">counted</Badge> : <Badge color="green">posted</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {o.status === 'counted' && (
                      <button onClick={() => post.mutate(o.id)} className="text-brand-600 text-sm">Posting</button>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        )}
        {meta && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>Sebelumnya</Button>
            <Button variant="secondary" disabled={meta.pagination.current_page >= meta.pagination.last_page} onClick={() => setPage(meta.pagination.current_page + 1)}>Berikutnya</Button>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mulai Stok Opname"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending || !whId}>
              {create.isPending ? 'Menyimpan...' : 'Simpan Opname'}
            </Button>
          </>
        }
      >
        <Select label="Gudang *" value={whId} onChange={setWhId} options={whOptions} placeholder="Pilih" />

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Hitung Fisik</label>
          <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 px-3 text-gray-600">Produk</th>
                  <th className="py-2 px-3 text-gray-600">Batch</th>
                  <th className="py-2 px-3 text-gray-600">Sistem</th>
                  <th className="py-2 px-3 text-gray-600">Hitung</th>
                </tr>
              </thead>
              <tbody>
                {(stocks.data?.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">{s.product?.name}</td>
                    <td className="py-2 px-3 font-mono text-xs">{s.lot_no ?? '—'}</td>
                    <td className="py-2 px-3">{s.qty_on_hand}</td>
                    <td className="py-2 px-3 w-24">
                      <Input label="" type="number" value={counted[s.id] ?? Number(s.qty_on_hand)} onChange={(v) => setCounted((c) => ({ ...c, [s.id]: Number(v) }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
