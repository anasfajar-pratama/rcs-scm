import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { opportunityStage } from '../../api/crm';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Opportunity, OpportunityLine, OpportunityStage as Stage } from '../../types';
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'prospecting', label: 'Prospecting' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
];

const stageIndex = (s: string) => STAGES.findIndex((x) => x.key === s);

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useMasterQuery<Opportunity>('opportunities');
  const customers = useListQuery<{ id: number; name: string }>('customers');
  const products = useListQuery<{ id: number; name: string; sale_price: number }>('products');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<OpportunityLine[]>([{ product_id: 0, qty: 1, unit_price: 0 }]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['opportunities'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<Opportunity>('opportunities').update(editing.id, payload);
      return crudApi<Opportunity>('opportunities').create(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
    },
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => opportunityStage(id, stage),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<Opportunity>('opportunities').destroy(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ customer_id: '', title: '', stage: 'prospecting', probability: 10, expected_close_date: '', notes: '' });
    setLines([{ product_id: 0, qty: 1, unit_price: 0 }]);
    setOpen(true);
  };

  const openEdit = (o: Opportunity) => {
    setEditing(o);
    setForm({ ...o, customer_id: o.customer_id, expected_close_date: o.expected_close_date ?? '' });
    setLines(o.lines ?? [{ product_id: 0, qty: 1, unit_price: 0 }]);
    setOpen(true);
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const payload = {
      customer_id: Number(form.customer_id),
      title: form.title,
      stage: form.stage,
      probability: Number(form.probability),
      expected_close_date: form.expected_close_date || null,
      notes: form.notes,
      lines: lines.map((l) => ({
        product_id: Number(l.product_id),
        qty: Number(l.qty),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent ?? 0),
      })),
    };
    save.mutate(payload);
  };

  const opportunities = (data?.data ?? []) as Opportunity[];
  const columns = STAGES.map((s) => ({
    ...s,
    items: opportunities.filter((o) => o.stage === s.key),
    total: opportunities.filter((o) => o.stage === s.key).reduce((sum, o) => sum + Number(o.expected_value), 0),
  }));

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Opportunities per stage"
        action={<Button onClick={openCreate}>+ Tambah Opportunity</Button>}
      />

      {isLoading ? (
        <Spinner />
      ) : opportunities.length === 0 ? (
        <Card>
          <EmptyState message="Belum ada opportunity. Klik + Tambah Opportunity untuk memulai." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="bg-gray-100 rounded-xl p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500">{col.items.length}</span>
              </div>

              <div className="space-y-2">
                {col.items.map((o) => (
                  <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{o.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{o.customer_name ?? `Customer #${o.customer_id}`}</div>
                      </div>
                      <button onClick={() => remove.mutate(o.id)} className="text-red-400 hover:text-red-600 text-sm leading-none">
                        ×
                      </button>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-brand-700">Rp {Number(o.expected_value).toLocaleString('id-ID')}</div>
                    <div className="mt-1 text-xs text-gray-500">Probabilitas {o.probability}%</div>
                    {o.expected_close_date && <div className="text-xs text-gray-400 mt-0.5">Tutup: {o.expected_close_date}</div>}

                    <div className="mt-2 flex items-center gap-1">
                      {stageIndex(o.stage) > 0 && (
                        <button
                          onClick={() => move.mutate({ id: o.id, stage: STAGES[stageIndex(o.stage) - 1].key })}
                          className="text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-50"
                          title="Mundur satu stage"
                        >
                          ←
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(o)}
                        className="text-xs border border-gray-300 rounded px-2 py-0.5 text-gray-500 hover:bg-gray-50 ml-auto"
                      >
                        Edit
                      </button>
                      {stageIndex(o.stage) < STAGES.length - 1 && (
                        <button
                          onClick={() => move.mutate({ id: o.id, stage: STAGES[stageIndex(o.stage) + 1].key })}
                          className="text-xs border border-gray-300 rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-50"
                          title="Maju satu stage"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && <div className="text-xs text-gray-400 text-center py-4">Kosong</div>}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                Total: <span className="font-semibold">Rp {col.total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Opportunity' : 'Tambah Opportunity'}
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
            label="Customer *"
            value={String(form.customer_id ?? '')}
            onChange={(v) => set('customer_id', v)}
            options={(customers.data ?? []).map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Pilih customer"
          />
          <Input label="Judul *" value={String(form.title ?? '')} onChange={(v) => set('title', v)} required />
          <Select
            label="Stage"
            value={String(form.stage ?? 'prospecting')}
            onChange={(v) => set('stage', v)}
            options={STAGES.map((s) => ({ label: s.label, value: s.key }))}
          />
          <Input label="Probabilitas (%)" type="number" value={String(form.probability ?? 10)} onChange={(v) => set('probability', v)} />
          <Input label="Target Tutup" type="date" value={String(form.expected_close_date ?? '')} onChange={(v) => set('expected_close_date', v)} />
          <Input label="Catatan" value={String(form.notes ?? '')} onChange={(v) => set('notes', v)} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            <Button variant="ghost" onClick={() => setLines((l) => [...l, { product_id: 0, qty: 1, unit_price: 0 }])}>
              + Tambah Baris
            </Button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center mb-2">
              <div className="col-span-5">
                <Select
                  label=""
                  value={line.product_id}
                  onChange={(v) =>
                    setLines((l) =>
                      l.map((x, idx) => {
                        if (idx !== i) return x;
                        const p = (products.data ?? []).find((pr) => pr.id === Number(v));
                        return { ...x, product_id: Number(v), unit_price: p?.sale_price ?? x.unit_price };
                      }),
                    )
                  }
                  options={(products.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
                  placeholder="Pilih produk"
                />
              </div>
              <div className="col-span-2">
                <Input label="" type="number" value={line.qty} onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, qty: Number(v) } : x)))} />
              </div>
              <div className="col-span-3">
                <Input
                  label=""
                  type="number"
                  value={line.unit_price}
                  onChange={(v) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, unit_price: Number(v) } : x)))}
                />
              </div>
              <div className="col-span-2 flex justify-end">
                <button onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">
                  ×
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1">
            Estimated value: Rp{' '}
            {lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0).toLocaleString('id-ID')}
          </p>
        </div>
      </Modal>
    </div>
  );
}
