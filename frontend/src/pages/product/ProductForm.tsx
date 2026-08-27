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

  const addBom = () => setBom((b) => [...b, { component_id: 0, quantity: 1 }]);
  const setBomLine = (i: number, k: keyof BomLine, v: unknown) =>
    setBom((b) => b.map((line, idx) => (idx === i ? { ...line, [k]: v } : line)));
  const delBom = (i: number) => setBom((b) => b.filter((_, idx) => idx !== i));

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
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="SKU *" value={form.sku} onChange={(v) => set('sku', v)} required />
        <Input label="Nama Produk *" value={form.name} onChange={(v) => set('name', v)} required />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Tipe *</label>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="finished_good">Produk Jadi</option>
            <option value="raw_material">Bahan Baku</option>
          </select>
        </div>
        <Input label="Barcode" value={form.barcode} onChange={(v) => set('barcode', v)} />
        <Select
          label="Kategori"
          value={form.category_id}
          onChange={(v) => set('category_id', v)}
          options={(categories.data ?? []).map((c) => ({ label: c.name, value: c.id }))}
          placeholder="Pilih kategori"
        />
        <Select
          label="Brand"
          value={form.brand_id}
          onChange={(v) => set('brand_id', v)}
          options={(brands.data ?? []).map((b) => ({ label: b.name, value: b.id }))}
          placeholder="Pilih brand"
        />
        <Select
          label="Unit"
          value={form.unit_id}
          onChange={(v) => set('unit_id', v)}
          options={(units.data ?? []).map((u) => ({ label: u.name, value: u.id }))}
          placeholder="Pilih unit"
        />
        <Input label="HPP (cost)" type="number" value={form.cost} onChange={(v) => set('cost', Number(v))} />
        <Input label="Harga Jual" type="number" value={form.sale_price} onChange={(v) => set('sale_price', Number(v))} />
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg grid gap-3">
        <label className="text-sm font-medium text-gray-700">Batch & Kadaluarsa (MFG / Expiry / Shelf life)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Shelf Life (hari)"
            type="number"
            value={form.shelf_life_days}
            onChange={(v) => set('shelf_life_days', v)}
            placeholder="cth 540"
          />
          <div className="grid grid-cols-2 gap-3">
            <Checkbox label="Track Batch" checked={form.track_batch} onChange={(v) => set('track_batch', v)} />
            <Checkbox label="Wajib Expiry" checked={form.expiry_required} onChange={(v) => set('expiry_required', v)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Reorder Point" type="number" value={form.reorder_point} onChange={(v) => set('reorder_point', v)} />
        <Input label="Reorder Qty" type="number" value={form.reorder_quantity} onChange={(v) => set('reorder_quantity', v)} />
        <Input label="Safety Stock" type="number" value={form.safety_stock} onChange={(v) => set('safety_stock', v)} />
      </div>

      <div className="mt-4">
        <Textarea
          label="Bahan (ingredients) — pisahkan koma"
          value={ingredientText}
          onChange={setIngredientText}
        />
      </div>

      {form.type === 'finished_good' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Bill of Materials (BOM)</label>
            <Button variant="ghost" onClick={addBom}>
              + Tambah Komponen
            </Button>
          </div>
          {bom.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada komponen bahan baku.</p>
          ) : (
            <div className="space-y-2">
              {bom.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={line.component_id}
                    onChange={(v) => setBomLine(i, 'component_id', Number(v))}
                    options={rawMaterialOptions}
                    placeholder="Pilih bahan baku"
                  />
                  <Input label="" type="number" value={line.quantity} onChange={(v) => setBomLine(i, 'quantity', Number(v))} />
                  <button onClick={() => delBom(i)} className="text-red-500 hover:text-red-700 text-sm px-2">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Bom hanya valid untuk produk jadi. Rahasia formula Anda tersimpan di BOM.</p>
        </div>
      )}

      <div className="mt-4">
        <Checkbox label="Produk aktif" checked={form.is_active} onChange={(v) => set('is_active', v)} />
      </div>
    </Modal>
  );
}
