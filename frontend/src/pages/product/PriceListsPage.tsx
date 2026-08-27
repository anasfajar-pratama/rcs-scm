import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useMasterQuery, useListQuery } from '../../hooks/useMaster';
import type { PriceList, PriceListLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

export default function PriceListsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, setSearch } = useMasterQuery<PriceList>('price-lists');
  const products = useListQuery<{ id: number; name: string; sku: string; sale_price: number }>('products');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [form, setForm] = useState({ name: '', type: 'default', is_active: true });
  const [lines, setLines] = useState<PriceListLine[]>([]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<PriceList>('price-lists').update(editing.id, payload);
      return crudApi<PriceList>('price-lists').create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'default', is_active: true });
    setLines([]);
    setOpen(true);
  };

  const openEdit = (pl: PriceList) => {
    setEditing(pl);
    setForm({ name: pl.name, type: pl.type, is_active: pl.is_active });
    setLines(pl.lines ?? []);
    setOpen(true);
  };

  const submit = () => save.mutate({ ...form, lines });

  const addLine = () => {
    const product = products.data?.[0];
    setLines((l) => [...l, { product_id: product?.id ?? 0, price: Number(product?.sale_price ?? 0) }]);
  };
  const setLine = (i: number, k: keyof PriceListLine, v: unknown) =>
    setLines((l) => l.map((line, idx) => (idx === i ? { ...line, [k]: v } : line)));
  const delLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const productOptions = (products.data ?? []).map((p) => ({
    label: `${p.sku} — ${p.name}`,
    value: p.id,
  }));

  return (
    <div>
      <PageHeader title="Price List" subtitle="Daftar harga per kelompok" action={<Button onClick={openCreate}>+ Tambah</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari price list..."
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
              { key: 'name', label: 'Nama' },
              { key: 'type', label: 'Tipe' },
              { key: 'lines', label: 'Item' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const pl = row as PriceList;
              return (
                <tr key={pl.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{pl.name}</td>
                  <td className="py-3 px-4">{pl.type}</td>
                  <td className="py-3 px-4">{pl.lines?.length ?? 0} item</td>
                  <td className="py-3 px-4">
                    {pl.is_active ? <Badge color="green">Aktif</Badge> : <Badge color="red">Nonaktif</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(pl)} className="text-brand-600 hover:text-brand-800 text-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Price List' : 'Tambah Price List'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nama *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <Select
            label="Tipe"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={[
              { label: 'Default', value: 'default' },
              { label: 'Customer Group', value: 'customer_group' },
              { label: 'Retail', value: 'retail' },
              { label: 'Wholesale', value: 'wholesale' },
            ]}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Item / Baris Harga</label>
            <Button variant="ghost" onClick={addLine}>
              + Tambah Item
            </Button>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada item.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={line.product_id}
                    onChange={(v) => setLine(i, 'product_id', Number(v))}
                    options={productOptions}
                    placeholder="Pilih produk"
                  />
                  <Input label="" type="number" value={line.price} onChange={(v) => setLine(i, 'price', Number(v))} />
                  <button onClick={() => delLine(i)} className="text-red-500 hover:text-red-700 text-sm px-2">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
