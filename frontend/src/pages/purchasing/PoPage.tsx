import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = { draft: 'gray', pending: 'yellow', approved: 'blue', partially_received: 'blue', received: 'green', cancelled: 'red' };

export default function PoPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('pos');

  const action = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => fetch(`/api/v1/pos/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos'] }),
  });

  return (
    <div>
      <PageHeader title="Purchase Order" subtitle="Order pembelian ke supplier" />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'action', label: '' }]} data={data?.data ?? []} renderRow={(row) => {
            const po = row as any;
            return <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{po.po_no}</td>
              <td className="py-3 px-4">{po.supplier?.name ?? '—'}</td>
              <td className="py-3 px-4"><Badge color={statusColor[po.status] ?? 'gray'}>{po.status}</Badge></td>
              <td className="py-3 px-4 text-right whitespace-nowrap">
                {po.status === 'pending' && <><button onClick={() => action.mutate({ id: po.id, action: 'approve' })} className="text-brand-600 text-sm mr-3">Setujui</button><button onClick={() => action.mutate({ id: po.id, action: 'reject' })} className="text-red-600 text-sm">Tolak</button></>}
              </td>
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
