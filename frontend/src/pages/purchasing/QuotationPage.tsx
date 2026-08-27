import { useMasterQuery } from '../../hooks/useMaster';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = { draft: 'gray', accepted: 'green', rejected: 'red' };

export default function QuotationPage() {
  const { data, isLoading, meta, setPage } = useMasterQuery<any>('supplier-quotations');

  return (
    <div>
      <PageHeader title="Supplier Quotation" subtitle="Penawaran dari supplier" />
      <Card>
        {isLoading ? <Spinner /> : (data?.data ?? []).length === 0 ? <EmptyState /> : (
          <Table columns={[{ key: 'no', label: 'No' }, { key: 'supplier', label: 'Supplier' }, { key: 'price', label: 'Harga' }, { key: 'status', label: 'Status' }]} data={data?.data ?? []} renderRow={(row) => {
            const q = row as any;
            return <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono text-xs">{q.quotation_no}</td>
              <td className="py-3 px-4">{q.supplier?.name ?? '—'}</td>
              <td className="py-3 px-4">Rp {Number(q.price).toLocaleString('id-ID')}</td>
              <td className="py-3 px-4"><Badge color={statusColor[q.status] ?? 'gray'}>{q.status}</Badge></td>
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
