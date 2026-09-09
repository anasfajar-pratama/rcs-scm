import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery } from '../../hooks/useMaster';
import type { BomLine, Product } from '../../types';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '../../components/ui';

interface Props {
  editing: Product | null;
  rawMaterialOptions: { label: string; value: string | number }[];
  onClose: () => void;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {hint && <p className="text-xs text-gray-500 mt-1 mb-3">{hint}</p>}
      {children}
    </div>
  );
}

export function ProductForm({ editing, rawMaterialOptions, onClose }: Props) {
  const queryClient = useQueryClient();
  const categories = useListQuery<{ id: number; name: string }>('categories');
  const units = useListQuery<{ id: number; name: string }>('units');
  const brands = useListQuery<{ id: number; name: string }>('brands');

  const [form, setForm] = useState({
    sku: editing?.sku ?? '',
    barcode: editing?.barcode ?? '',
    name: editing?.name ?? '',
    type: editing?.type ?? 'finished_good',
    category_id: editing?.category_id ?? '',
    brand_id: editing?.brand_id ?? '',
    unit_id: editing?.unit_id ?? '',
    cost: editing?.cost ?? 0,
    sale_price: editing?.sale_price ?? 0,
    is_active: editing?.is_active ?? true,
    track_batch: editing?.track_batch ?? true,
    expiry_required: editing?.expiry_required ?? false,
    shelf_life_days: editing?.shelf_life_days ?? '',
    reorder_point: editing?.reorder_point ?? '',
    reorder_quantity: editing?.reorder_quantity ?? '',
    safety_stock: editing?.safety_stock ?? '',
    description: editing?.description ?? '',
    ingredients: editing?.ingredients ?? [],
  });

  const [ingredientText, setIngredientText] = useState((editing?.ingredients ?? []).join(', '));
  const [bom, setBom] = useState<BomLine[]>(editing?.bom ?? []);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<Product>('products').update(editing.id, payload);
      return crudApi<Product>('products').create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const payload = {
      ...form,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      unit_id: form.unit_id || null,
      shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
      reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
      reorder_quantity: form.reorder_quantity ? Number(form.reorder_quantity) : null,
      safety_stock: form.safety_stock ? Number(form.safety_stock) : null,
      cost: Number(form.cost),
      sale_price: Number(form.sale_price),
      ingredients: ingredientText ? ingredientText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      bom: form.type === 'finished_good' ? bom : [],
    };
    save.mutate(payload);
  };

  // Tambah komponen BOM sambil menjaga posisi scroll modal (agar tidak lompat ke atas).
  const addBom = () => {
    const scroller = document.getElementById('rcs-modal-scroll');
    const prev = scroller?.scrollTop ?? 0;
    setBom((b) => [...b, { component_id: 0, quantity: 1 }]);
    requestAnimationFrame(() => {
      scroller?.scrollTo({ top: prev });
    });
  };
  const setBomLine = (i: number, k: keyof BomLine, v: unknown) =>
    setBom((b) => b.map((line, idx) => (idx === i ? { ...line, [k]: v } : line)));
  const delBom = (i: number) => setBom((b) => b.filter((_, idx) => idx !== i));

  // Validasi minimum: SKU, nama, kategori & unit wajib diisi.
  const canSave = Boolean(form.sku && form.name && form.category_id && form.unit_id);

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Produk' : 'Tambah Produk'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={submit} disabled={save.isPending || !canSave}>
            {save.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <Section
        title="Informasi Umum"
        hint="Data dasar produk. Kategori & unit wajib diisi agar produk bisa dicatat stoknya."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="SKU *" value={form.sku} onChange={(v) => set('sku', v)} required placeholder="cth: BB-0001" />
          <Input label="Nama Produk *" value={form.name} onChange={(v) => set('name', v)} required placeholder="cth: Candelilla Wax" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Tipe *</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="finished_good">Produk Jadi</option>
              <option value="raw_material">Bahan Baku</option>
            </select>
            <p className="text-xs text-gray-400">Pilih tipe dulu — form di bawah menyesuaikan.</p>
          </div>
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(v) => set('barcode', v)}
            placeholder="cth: 8999999123456 (opsional)"
          />
          <Select
            label="Kategori *"
            value={form.category_id}
            onChange={(v) => set('category_id', v)}
            options={(categories.data ?? []).map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Pilih kategori"
          />
          <Select
            label="Unit *"
            value={form.unit_id}
            onChange={(v) => set('unit_id', v)}
            options={(units.data ?? []).map((u) => ({ label: u.name, value: u.id }))}
            placeholder="Pilih unit"
          />
        </div>
      </Section>

      <Section title="Harga" hint="HPP adalah harga pokok per satuan — menjadi acuan margin saat membuat penawaran.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="HPP (cost)" type="number" value={form.cost} onChange={(v) => set('cost', Number(v))} placeholder="0" />
          <Input label="Harga Jual" type="number" value={form.sale_price} onChange={(v) => set('sale_price', Number(v))} placeholder="0" />
          <Select
            label="Brand"
            value={form.brand_id}
            onChange={(v) => set('brand_id', v)}
            options={(brands.data ?? []).map((b) => ({ label: b.name, value: b.id }))}
            placeholder="Pilih brand (opsional)"
          />
        </div>
      </Section>

      <Section
        title="Batch & Kadaluarsa"
        hint="Aktifkan bila produk memakai lot/ batch. Shelf life dihitung sejak tanggal produksi (MFG) sampai expiry."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Shelf Life (hari)"
            type="number"
            value={form.shelf_life_days}
            onChange={(v) => set('shelf_life_days', v)}
            placeholder="cth: 540"
          />
          <div className="flex items-end gap-6 pb-1">
            <Checkbox label="Track Batch" checked={form.track_batch} onChange={(v) => set('track_batch', v)} />
            <Checkbox label="Wajib Expiry" checked={form.expiry_required} onChange={(v) => set('expiry_required', v)} />
          </div>
        </div>
      </Section>

      <Section
        title="Pengelolaan Stok"
        hint="Peringatan stok minim & jumlah pemesanan ulang otomatis. Kosongkan jika tidak dipakai."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Reorder Point" type="number" value={form.reorder_point} onChange={(v) => set('reorder_point', v)} placeholder="cth: 10" />
          <Input label="Reorder Qty" type="number" value={form.reorder_quantity} onChange={(v) => set('reorder_quantity', v)} placeholder="cth: 50" />
          <Input label="Safety Stock" type="number" value={form.safety_stock} onChange={(v) => set('safety_stock', v)} placeholder="cth: 5" />
        </div>
      </Section>

      {form.type === 'finished_good' ? (
        <>
          <Section
            title="Bahan Penyusun"
            hint="Daftar bahan yang tertera pada kemasan, dipisahkan koma — mis. Candelilla Wax, Shea Butter, Vitamin E."
          >
            <Textarea
              label="Bahan (ingredients)"
              value={ingredientText}
              onChange={setIngredientText}
              placeholder="cth: Candelilla Wax, Shea Butter, Minyak Zaitun"
            />
          </Section>

          <Section
            title="Bill of Materials (BOM)"
            hint="Komposisi produksi: pilih bahan baku dan jumlah yang dibutuhkan untuk membuat 1 unit produk jadi."
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Jika produk ini dibuat dari bahan baku, tambahkan komposisinya di bawah.</span>
              <Button variant="ghost" onClick={addBom}>
                + Tambah Komponen
              </Button>
            </div>
            {bom.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada komponen bahan baku.</p>
            ) : (
              <div className="space-y-2">
                {bom.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-8">
                      <Select
                        value={line.component_id}
                        onChange={(v) => setBomLine(i, 'component_id', Number(v))}
                        options={rawMaterialOptions}
                        placeholder="Pilih bahan baku"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input label="" type="number" value={line.quantity} onChange={(v) => setBomLine(i, 'quantity', Number(v))} placeholder="Jumlah / unit" />
                    </div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => delBom(i)} className="text-red-500 hover:text-red-700 text-sm px-2">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <Section
          title="Catatan Bahan Baku"
          hint="Informasi tambahan bahan baku, mis. spesifikasi supplier, kemasan, atau catatan kualitas."
        >
          <Textarea
            label="Deskripsi / Catatan"
            value={form.description ?? ''}
            onChange={(v) => set('description', v)}
            placeholder="cth: Kemasan 25 kg, sertifikat halal tersedia"
          />
        </Section>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Checkbox label="Produk aktif" checked={form.is_active} onChange={(v) => set('is_active', v)} />
        <p className="text-xs text-gray-400">Field bertanda * wajib diisi.</p>
      </div>
    </Modal>
  );
}
