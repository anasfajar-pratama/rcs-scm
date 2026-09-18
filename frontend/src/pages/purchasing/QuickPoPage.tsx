import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../../api/client';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Product } from '../../types';
import { Button, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

interface PriceRow {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  product_id: number;
  product_name?: string;
  sku?: string;
  type?: string;
  unit_name?: string;
  price: number;
  moq: number | null;
  is_active: boolean;
}

const TYPE_OPTIONS = [
  { label: 'Bahan Baku', value: 'raw_material' },
  { label: 'Produk Jadi', value: 'finished_good' },
];

export default function QuickPoPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterType, setFilterType] = useState('');
  const { data, isLoading, meta, setSearch, setPage } = useMasterQuery<PriceRow>('supplier-prices', {
    supplier_id: filterSupplier,
    type: filterType,
  });

  const suppliers = useListQuery<{ id: number; name: string }>('suppliers');
  const products = useListQuery<Product>('products', { type: 'raw_material' });

  const [form, setForm] = useState({ supplier_id: '', product_id: '', price: '', moq: '' });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [qtyById, setQtyById] = useState<Record<number, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [poForm, setPoForm] = useState({ payment_term: '', expected_date: '' });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier-prices'] });
    queryClient.invalidateQueries({ queryKey: ['pos'] });
  };

  const add = useMutation({
    mutationFn: () =>
      crudApi<PriceRow>('supplier-prices').create({
        supplier_id: Number(form.supplier_id),
        product_id: Number(form.product_id),
        price: Number(form.price),
        moq: form.moq === '' ? null : Number(form.moq),
      }),
    onSuccess: () => {
      toast('Harga supplier ditambahkan.');
      setForm({ supplier_id: '', product_id: '', price: '', moq: '' });
      invalidateAll();
    },
    onError: (err) => toast(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<PriceRow>('supplier-prices').destroy(id),
    onSuccess: () => {
      toast('Harga supplier dihapus.');
      invalidateAll();
    },
    onError: (err) => toast(getErrorMessage(err)),
  });

  const createPos = useMutation({
    mutationFn: () =>
      api.post('/quick-pos', {
        items: selectedRows.map((r) => ({ id: r.id, qty: qtyOf(r) })),
        payment_term: poForm.payment_term || undefined,
        expected_date: poForm.expected_date || undefined,
      }),
    onSuccess: (res) => {
      const count = res.data?.data?.pos?.length ?? 0;
      toast(`Berhasil membuat ${count} PO.`);
      setModalOpen(false);
      setSelected(new Set());
      setQtyById({});
      invalidateAll();
    },
    onError: (err) => toast(getErrorMessage(err)),
  });

  const supplierOptions = (suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id }));
  const productOptions = (products.data ?? []).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }));

  const selectedRows = (data?.data ?? []).filter((r) => selected.has(r.id));

  const qtyOf = (r: PriceRow): number => {
    const v = Number(qtyById[r.id]);
    if (v > 0) return v;
    return r.moq && r.moq > 0 ? r.moq : 1;
  };

  const belowMoq = selectedRows.filter((r) => r.moq && qtyOf(r) < r.moq);
  const total = selectedRows.reduce((s, r) => s + r.price * qtyOf(r), 0);

  const groups = useMemo(() => {
    const map = new Map<string, PriceRow[]>();
    for (const r of selectedRows) {
      const key = r.supplier_name ?? `Supplier #${r.supplier_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()];
  }, [selectedRows, qtyById]); // eslint-disable-line react-hooks/exhaustive-deps

  const canAdd = form.supplier_id && form.product_id && form.price !== '';

  return (
    <div>
      <PageHeader title="Quick PO" subtitle="Harga & MOQ supplier — bypass RFQ/Quotation" />

      <Card className="p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Input Harga & MOQ Supplier</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Supplier *"
            value={form.supplier_id}
            onChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}
            options={supplierOptions}
            placeholder="Pilih supplier"
          />
          <Select
            label="Produk *"
            value={form.product_id}
            onChange={(v) => setForm((f) => ({ ...f, product_id: v }))}
            options={productOptions}
            placeholder="Pilih produk"
          />
          <Input
            label="Nominal (Harga) *"
            type="number"
            value={form.price}
            onChange={(v) => setForm((f) => ({ ...f, price: v }))}
            placeholder="cth: 25000"
          />
          <Input
            label="MOQ (Min. Order)"
            type="number"
            value={form.moq}
            onChange={(v) => setForm((f) => ({ ...f, moq: v }))}
            placeholder="cth: 10"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-400">
            Harga & MOQ tersimpan sebagai master. Baris yang dicentang di tabel langsung bisa dibuatkan PO.
          </p>
          <Button onClick={() => add.mutate()} disabled={!canAdd || add.isPending}>
            {add.isPending ? 'Menyimpan...' : '+ Tambah'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari supplier / produk / SKU..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="w-48">
            <Select
              value={filterSupplier}
              onChange={setFilterSupplier}
              options={supplierOptions}
              placeholder="Semua supplier"
            />
          </div>
          <div className="w-44">
            <Select value={filterType} onChange={setFilterType} options={TYPE_OPTIONS} placeholder="Semua tipe" />
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'select', label: '' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'product', label: 'Produk' },
              { key: 'unit', label: 'Satuan' },
              { key: 'price', label: 'Nominal' },
              { key: 'moq', label: 'MOQ' },
              { key: 'qty', label: 'Qty' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const r = row as PriceRow;
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Checkbox
                      label=""
                      checked={selected.has(r.id)}
                      onChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(r.id);
                          else next.delete(r.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="truncate max-w-[10rem] block">{r.supplier_name ?? '—'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="leading-tight">
                      <div className="truncate max-w-[14rem]">{r.product_name ?? '—'}</div>
                      <div className="text-xs text-gray-400">{r.sku ?? ''}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{r.unit_name ?? '—'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">Rp {Number(r.price).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4">{r.moq === null ? '—' : Number(r.moq).toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 w-24">
                    <Input
                      label=""
                      type="number"
                      value={qtyById[r.id] ?? ''}
                      onChange={(v) => setQtyById((q) => ({ ...q, [r.id]: v }))}
                      placeholder={String(r.moq ?? 1)}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => remove.mutate(r.id)} className="text-red-500 hover:text-red-700 text-sm">
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            }}
          />
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-gray-600">
            {selected.size} dipilih · total <span className="font-semibold">Rp {total.toLocaleString('id-ID')}</span>
          </span>
          <div className="flex items-center gap-2">
            {meta && (
              <>
                <Button variant="secondary" disabled={meta.pagination.current_page <= 1} onClick={() => setPage(1)}>
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={meta.pagination.current_page >= meta.pagination.last_page}
                  onClick={() => setPage(meta.pagination.current_page + 1)}
                >
                  Berikutnya
                </Button>
              </>
            )}
            <Button onClick={() => setModalOpen(true)} disabled={selected.size === 0}>
              Buat PO ({selected.size})
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat PO dari Baris Terpilih"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => createPos.mutate()} disabled={createPos.isPending || belowMoq.length > 0}>
              {createPos.isPending ? 'Membuat...' : `Buat ${groups.length} PO`}
            </Button>
          </>
        }
      >
        {belowMoq.length > 0 && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {belowMoq.length} baris di bawah MOQ (qty minimal): {belowMoq.map((r) => r.product_name).join(', ')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input
            label="Termin Pembayaran"
            value={poForm.payment_term}
            onChange={(v) => setPoForm((f) => ({ ...f, payment_term: v }))}
            placeholder="cth: 30 hari"
          />
          <Input
            label="Tanggal Diharapkan"
            type="date"
            value={poForm.expected_date}
            onChange={(v) => setPoForm((f) => ({ ...f, expected_date: v }))}
          />
        </div>

        <div className="space-y-4 max-h-80 overflow-auto">
          {groups.map(([supplierName, rows]) => {
            const groupTotal = rows.reduce((s, r) => s + r.price * qtyOf(r), 0);
            return (
              <div key={supplierName} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg text-sm font-semibold text-gray-700">
                  <span>{supplierName}</span>
                  <span>Rp {groupTotal.toLocaleString('id-ID')}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-3">
                          <div className="leading-tight">
                            <div className="truncate max-w-[16rem]">{r.product_name}</div>
                            <div className="text-xs text-gray-400">{r.sku}</div>
                          </div>
                        </td>
                        <td className="py-2 px-3">{qtyOf(r)} × Rp {Number(r.price).toLocaleString('id-ID')}</td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          Rp {(r.price * qtyOf(r)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}