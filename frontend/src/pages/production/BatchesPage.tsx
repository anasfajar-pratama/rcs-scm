import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery } from '../../hooks/useMaster';
import type { Batch } from '../../types';
import { Badge, Card, EmptyState, PageHeader, Select, Spinner, Table } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  available: 'green',
  expire_soon: 'yellow',
  expired: 'red',
};

const sourceLabel: Record<string, string> = {
  production: 'Produksi',
  receiving: 'Penerimaan',
  opening: 'Opening',
};

export default function BatchesPage() {
  const [productFilter, setProductFilter] = useState('');
  const products = useListQuery<{ id: number; name: string; sku: string }>('products');

  const { data, isLoading } = useQuery({
    queryKey: ['batches', productFilter],
    queryFn: async () => {
      const res = await crudApi<{ data: Batch[]; meta: unknown }>('batches').index({
        per_page: 100,
        product_id: productFilter || undefined,
      });
      return res as unknown as { data: Batch[] };
    },
  });

  const batches = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Batch / Traceability" subtitle="Rekap batch produk & status expiry" />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <Select
            label=""
            value={productFilter}
            onChange={setProductFilter}
            options={(products.data ?? []).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            placeholder="Semua produk"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : batches.length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'lot', label: 'Lot No' },
              { key: 'product', label: 'Produk' },
              { key: 'source', label: 'Sumber' },
              { key: 'mfg', label: 'MFG' },
              { key: 'expiry', label: 'Expiry' },
              { key: 'status', label: 'Status' },
            ]}
            data={batches}
            renderRow={(row) => {
              const b = row as Batch & { product?: { name: string; sku: string } };
              return (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{b.lot_no}</td>
                  <td className="py-3 px-4">
                    {b.product?.name ?? `Produk #${b.product_id}`}
                    <span className="text-gray-400 text-xs ml-1">{b.product?.sku ?? ''}</span>
                  </td>
                  <td className="py-3 px-4 text-sm">{sourceLabel[b.source_type] ?? b.source_type}</td>
                  <td className="py-3 px-4 text-sm">{b.mfg_date ?? '—'}</td>
                  <td className="py-3 px-4 text-sm">{b.expiry_date ?? '—'}</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[b.status] ?? 'gray'}>{b.status}</Badge>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
