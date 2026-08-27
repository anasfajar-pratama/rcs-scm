import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { ProductForm } from './ProductForm';
import { useMasterQuery } from '../../hooks/useMaster';
import { useOptions } from '../../hooks/useMaster';
import type { Product } from '../../types';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Spinner, Table } from '../../components/ui';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setSearch, setPage } = useMasterQuery<Product>('products');
  const rawMaterials = useOptions<{
    id: number;
    name: string;
    sku: string;
  }>('products');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDel, setConfirmDel] = useState<Product | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => crudApi<Product>('products').destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setConfirmDel(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  const rawOptions = (rawMaterials.data ?? []).map((r) => ({ label: `${r.sku} — ${r.name}`, value: r.id }));

  return (
    <div>
      <PageHeader
        title="Produk"
        subtitle="Master data produk (bahan baku & produk jadi)"
        action={<Button onClick={openCreate}>+ Tambah Produk</Button>}
      />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            value={''}
            onChange={() => {}}
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            defaultValue=""
            placeholder="Cari nama / SKU..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'sku', label: 'SKU' },
              { key: 'name', label: 'Nama' },
              { key: 'type', label: 'Tipe' },
              { key: 'category', label: 'Kategori' },
              { key: 'unit', label: 'Unit' },
              { key: 'price', label: 'Harga Jual' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const p = row as Product;
              const price = Number(p.sale_price).toLocaleString('id-ID');
              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                  <td className="py-3 px-4">{p.name}</td>
                  <td className="py-3 px-4">
                    {p.type === 'finished_good' ? (
                      <Badge color="blue">Produk Jadi</Badge>
                    ) : (
                      <Badge color="gray">Bahan Baku</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">{p.category_name ?? '—'}</td>
                  <td className="py-3 px-4">{p.unit_name ?? '—'}</td>
                  <td className="py-3 px-4">Rp {price}</td>
                  <td className="py-3 px-4">
                    {p.is_active ? <Badge color="green">Aktif</Badge> : <Badge color="red">Nonaktif</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDel(p)} className="text-red-500 hover:text-red-700 text-sm">
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            }}
          />
        )}

        {meta && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Total {meta.pagination.total} · Hal {meta.pagination.current_page}/{meta.pagination.last_page}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={meta.pagination.current_page <= 1}
                onClick={() => setPage(meta.pagination.current_page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                disabled={meta.pagination.current_page >= meta.pagination.last_page}
                onClick={() => setPage(meta.pagination.current_page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {open && (
        <ProductForm editing={editing} rawMaterialOptions={rawOptions} onClose={() => setOpen(false)} />
      )}

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Hapus Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => confirmDel && del.mutate(confirmDel.id)}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Yakin ingin menghapus <span className="font-semibold">{confirmDel?.name}</span>? Tindakan ini tercatat di audit log.
        </p>
      </Modal>
    </div>
  );
}
