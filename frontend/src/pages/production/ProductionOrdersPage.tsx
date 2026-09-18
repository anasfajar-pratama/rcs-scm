import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { productionCancel, productionComplete, productionStart } from '../../api/production';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { ProductionOrder, ProductionOrderLine } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  draft: 'gray',
  in_progress: 'yellow',
  completed: 'green',
  cancelled: 'red',
};

export default function ProductionOrdersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<ProductionOrder>('production-orders');
  const finishedGoods = useListQuery<{ id: number; name: string; sku: string }>('products', { type: 'finished_good' });
  const rawMaterials = useListQuery<{ id: number; name: string; sku: string }>('products', { type: 'raw_material' });
  const warehouses = useListQuery<{ id: number; name: string }>('warehouses');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<ProductionOrderLine[]>([]);

  const [completeTarget, setCompleteTarget] = useState<ProductionOrder | null>(null);
  const [completeForm, setCompleteForm] = useState<Record<string, unknown>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['production-orders'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => crudApi<ProductionOrder>('production-orders').create(payload),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast('Production order dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const start = useMutation({
    mutationFn: (id: number) => productionStart(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('Produksi dimulai, material di-issue.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const complete = useMutation({
    mutationFn: () => productionComplete(completeTarget!.id, completeForm),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setCompleteTarget(null);
      setCompleteForm({});
      toast('Produksi selesai, batch dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => productionCancel(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('Production order dibatalkan, material dikembalikan.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({ product_id: '', planned_qty: 1, warehouse_id: '', order_date: '', due_date: '', notes: '' });
    setLines([]);
    setOpen(true);
  };

  const selectProduct = async (id: number) => {
    set('product_id', id);
    const qty = Number(form.planned_qty || 1);
    if (!id) {
      setLines([]);
      return;
    }
    try {
      const detail = await crudApi<{ id: number; bom?: { component_id: number; quantity: number }[] }>('products').get(id);
      const bom = detail.bom ?? [];
      setLines(
        bom.map((b) => ({
          component_id: b.component_id,
          planned_qty: Math.round(b.quantity * qty * 10000) / 10000,
          qty_per_unit: b.quantity,
        })),
      );
    } catch {
      setLines([]);
    }
  };

  const submit = () => {
    save.mutate({
      product_id: Number(form.product_id),
      planned_qty: Number(form.planned_qty),
      warehouse_id: Number(form.warehouse_id),
      order_date: form.order_date || null,
      due_date: form.due_date || null,
      notes: form.notes,
      lines: lines.map((l) => ({
        component_id: Number(l.component_id),
        planned_qty: Number(l.planned_qty),
        qty_per_unit: Number(l.qty_per_unit ?? 0),
      })),
    });
  };

  return (
    <div>
      <PageHeader title="Production Orders" subtitle="Produksi dari BOM: issue material → output batch" action={<Button onClick={openCreate}>+ Tambah MO</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari production order..."
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
              { key: 'no', label: 'No.' },
              { key: 'product', label: 'Produk' },
              { key: 'qty', label: 'Qty' },
              { key: 'warehouse', label: 'Gudang' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const o = row as ProductionOrder;
              return (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{o.po_no}</td>
                  <td className="py-3 px-4">{o.product_name ?? `#${o.product_id}`}</td>
                  <td className="py-3 px-4 text-sm">
                    {o.produced_qty ? `${o.produced_qty} / ${o.planned_qty}` : o.planned_qty}
                  </td>
                  <td className="py-3 px-4 text-sm">{o.warehouse_name ?? `#${o.warehouse_id}`}</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[o.status] ?? 'gray'}>{o.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {o.status === 'draft' && (
                      <>
                        <button onClick={() => start.mutate(o.id)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                          Mulai
                        </button>
                        <button
                          onClick={() => {
                            setCompleteTarget(o);
                            setCompleteForm({ produced_qty: Number(o.planned_qty), lot_no: '', mfg_date: '', expiry_date: '' });
                          }}
                          className="text-green-600 hover:text-green-800 text-sm mr-3"
                        >
                          Selesai
                        </button>
                        <button onClick={() => cancel.mutate(o.id)} className="text-red-500 hover:text-red-700 text-sm">
                          Batal
                        </button>
                      </>
                    )}
                    {o.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => {
                            setCompleteTarget(o);
                            setCompleteForm({ produced_qty: Number(o.planned_qty), lot_no: '', mfg_date: '', expiry_date: '' });
                          }}
                          className="text-green-600 hover:text-green-800 text-sm mr-3"
                        >
                          Selesai
                        </button>
                        <button onClick={() => cancel.mutate(o.id)} className="text-red-500 hover:text-red-700 text-sm">
                          Batal
                        </button>
                      </>
                    )}
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
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Production Order"
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
          <Select
            label="Produk Jadi *"
            value={String(form.product_id ?? '')}
            onChange={(v) => selectProduct(Number(v))}
            options={(finishedGoods.data ?? []).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
            placeholder="Pilih produk jadi"
          />
          <Input label="Qty Rencana *" type="number" value={String(form.planned_qty ?? 1)} onChange={(v) => set('planned_qty', v)} />
          <Select
            label="Gudang *"
            value={String(form.warehouse_id ?? '')}
            onChange={(v) => set('warehouse_id', v)}
            options={(warehouses.data ?? []).map((w) => ({ label: w.name, value: w.id }))}
            placeholder="Pilih gudang"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Tanggal" type="date" value={String(form.order_date ?? '')} onChange={(v) => set('order_date', v)} />
            <Input label="Due Date" type="date" value={String(form.due_date ?? '')} onChange={(v) => set('due_date', v)} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Catatan" value={String(form.notes ?? '')} onChange={(v) => set('notes', v)} />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Material (dari BOM)</label>
            <Button variant="ghost" onClick={() => setLines((l) => [...l, { component_id: 0, planned_qty: 0, qty_per_unit: 0 }])}>
              + Tambah Baris Manual
            </Button>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-gray-400">Pilih produk jadi untuk mengisi material dari BOM otomatis.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <Select
                      label=""
                      value={line.component_id}
                      onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, component_id: Number(v) } : x)))}
                      options={(rawMaterials.data ?? []).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
                      placeholder="Pilih bahan baku"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label=""
                      type="number"
                      value={line.planned_qty}
                      onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, planned_qty: Number(v) } : x)))}
                    />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        title={`Selesaikan ${completeTarget?.po_no ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>
              Batal
            </Button>
            <Button onClick={() => complete.mutate()} disabled={complete.isPending}>
              {complete.isPending ? 'Menyimpan...' : 'Selesaikan Produksi'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Qty Diproduksi *"
            type="number"
            value={String(completeForm.produced_qty ?? '')}
            onChange={(v) => setCompleteForm((f) => ({ ...f, produced_qty: Number(v) }))}
          />
          <Input label="Lot No (kosongkan = otomatis)" value={String(completeForm.lot_no ?? '')} onChange={(v) => setCompleteForm((f) => ({ ...f, lot_no: v }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="MFG Date" type="date" value={String(completeForm.mfg_date ?? '')} onChange={(v) => setCompleteForm((f) => ({ ...f, mfg_date: v }))} />
            <Input label="Expiry Date" type="date" value={String(completeForm.expiry_date ?? '')} onChange={(v) => setCompleteForm((f) => ({ ...f, expiry_date: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
