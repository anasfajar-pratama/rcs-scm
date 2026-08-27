import { useMasterQuery } from '../../hooks/useMaster';
import type { StockMovement } from '../../types';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/ui';

const typeLabels: Record<string, string> = {
  receiving: 'Penerimaan',
  issue: 'Pengeluaran',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  adjustment: 'Penyesuaian',
  reservation: 'Reservasi',
  release: 'Rilis',
  consumption: 'Konsumsi',
};

export default function StockMovementsPage() {
  const { data, isLoading, meta, setPage } = useMasterQuery<StockMovement>('stock-movements');

  return (
    <div>
      <PageHeader title="Mutasi Stok" subtitle="Riwayat pergerakan stok (ledger)" />

      <Card>
        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'product', label: 'Produk' },
              { key: 'wh', label: 'Gudang' },
              { key: 'type', label: 'Tipe' },
              { key: 'qty', label: 'Qty' },
              { key: 'ref', label: 'Referensi' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const m = row as StockMovement;
              const isIn = Number(m.quantity) > 0;
              return (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{m.product_name ?? m.product_id}</td>
                  <td className="py-3 px-4">{m.warehouse_name ?? '—'}</td>
                  <td className="py-3 px-4"><Badge color={isIn ? 'green' : 'red'}>{typeLabels[m.type] ?? m.type}</Badge></td>
                  <td className={`py-3 px-4 font-semibold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                    {isIn ? '+' : ''}{m.quantity}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{m.reference_no ?? '—'}</td>
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
    </div>
  );
}
