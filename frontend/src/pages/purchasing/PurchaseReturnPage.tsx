import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/ui';

export default function PurchaseReturnPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('purchase-returns');

  const post = useMutation({
    mutationFn: (id: number) => fetch(`/api/v1/purchase-returns/${id}/post`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-returns'] }),
  });

  return (
    <div>
      <PageHeader title="Purchase Return" subtitle="Retur pembelian ke supplier" />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const r = row as any;
            return <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{r.return_no}</td>
              <td className="py-3 px-4">{r.supplier?.name ?? '—'}</td>
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
    </div>
  );
}
