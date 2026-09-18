import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { leadConvert, leadStatus } from '../../api/crm';
import { useMasterQuery } from '../../hooks/useMaster';
import type { Lead } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  new: 'blue',
  contacted: 'yellow',
  qualified: 'green',
  converted: 'green',
  lost: 'red',
};

const sourceOptions = [
  { label: 'Walk-in', value: 'walk_in' },
  { label: 'Referral', value: 'referral' },
  { label: 'Website', value: 'website' },
  { label: 'Sosial Media', value: 'social_media' },
  { label: 'Event', value: 'event' },
  { label: 'Lainnya', value: 'other' },
];

const statusOptions = [
  { label: 'Semua', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Converted', value: 'converted' },
  { label: 'Lost', value: 'lost' },
];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<Lead>('leads', {
    status: statusFilter || undefined,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [convertForm, setConvertForm] = useState<Record<string, unknown>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leads'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<Lead>('leads').update(editing.id, payload);
      return crudApi<Lead>('leads').create(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
    },
  });

  const statusAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => leadStatus(id, status),
    onSuccess: invalidate,
  });

  const convert = useMutation({
    mutationFn: () => leadConvert(convertTarget!.id, convertForm),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setConvertTarget(null);
      setConvertForm({});
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<Lead>('leads').destroy(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', company: '', email: '', phone: '', source: 'walk_in', notes: '' });
    setOpen(true);
  };

  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({ ...l });
    setOpen(true);
  };

  const openConvert = (l: Lead) => {
    setConvertTarget(l);
    setConvertForm({ name: l.name, email: l.email ?? '', phone: l.phone ?? '', type: 'b2b' });
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => save.mutate(form);

  return (
    <div>
      <PageHeader title="Leads" subtitle="Calon pelanggan & kualifikasi" action={<Button onClick={openCreate}>+ Tambah Lead</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari lead..."
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[
              { key: 'code', label: 'Kode' },
              { key: 'name', label: 'Nama' },
              { key: 'company', label: 'Perusahaan' },
              { key: 'contact', label: 'Kontak' },
              { key: 'source', label: 'Sumber' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const l = row as Lead;
              return (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{l.code}</td>
                  <td className="py-3 px-4">{l.name}</td>
                  <td className="py-3 px-4">{l.company ?? '—'}</td>
                  <td className="py-3 px-4 text-sm">
                    <div>{l.email ?? '—'}</div>
                    <div className="text-gray-400 text-xs">{l.phone ?? ''}</div>
                  </td>
                  <td className="py-3 px-4 text-sm">{l.source}</td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[l.status] ?? 'gray'}>{l.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {l.status === 'new' && (
                      <button onClick={() => statusAction.mutate({ id: l.id, status: 'contacted' })} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                        Hubungi
                      </button>
                    )}
                    {l.status === 'contacted' && (
                      <button onClick={() => statusAction.mutate({ id: l.id, status: 'qualified' })} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                        Kualifikasi
                      </button>
                    )}
                    {(l.status === 'new' || l.status === 'contacted') && (
                      <button onClick={() => statusAction.mutate({ id: l.id, status: 'lost' })} className="text-red-500 hover:text-red-700 text-sm mr-3">
                        Lost
                      </button>
                    )}
                    {l.status === 'qualified' && (
                      <button onClick={() => openConvert(l)} className="text-green-600 hover:text-green-800 text-sm mr-3">
                        Convert
                      </button>
                    )}
                    <button onClick={() => openEdit(l)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Edit
                    </button>
                    <button onClick={() => remove.mutate(l.id)} className="text-red-500 hover:text-red-700 text-sm">
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
        title={editing ? 'Edit Lead' : 'Tambah Lead'}
        size="md"
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
        <div className="space-y-4">
          <Input label="Nama *" value={String(form.name ?? '')} onChange={(v) => set('name', v)} required />
          <Input label="Perusahaan" value={String(form.company ?? '')} onChange={(v) => set('company', v)} />
          <Input label="Email" value={String(form.email ?? '')} onChange={(v) => set('email', v)} />
          <Input label="Telepon" value={String(form.phone ?? '')} onChange={(v) => set('phone', v)} />
          <Select
            label="Sumber"
            value={String(form.source ?? 'walk_in')}
            onChange={(v) => set('source', v)}
            options={sourceOptions}
          />
          <Textarea label="Catatan" value={String(form.notes ?? '')} onChange={(v) => set('notes', v)} />
        </div>
      </Modal>

      <Modal
        open={Boolean(convertTarget)}
        onClose={() => setConvertTarget(null)}
        title={`Convert "${convertTarget?.name}" ke Customer`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertTarget(null)}>
              Batal
            </Button>
            <Button onClick={() => convert.mutate()} disabled={convert.isPending}>
              {convert.isPending ? 'Mengonversi...' : 'Convert'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nama Customer" value={String(convertForm.name ?? '')} onChange={(v) => setConvertForm((f) => ({ ...f, name: v }))} required />
          <Select
            label="Tipe"
            value={String(convertForm.type ?? 'b2b')}
            onChange={(v) => setConvertForm((f) => ({ ...f, type: v }))}
            options={[
              { label: 'B2B', value: 'b2b' },
              { label: 'Distributor', value: 'distributor' },
              { label: 'Retail', value: 'retail' },
              { label: 'Affiliate', value: 'affiliate' },
            ]}
          />
          <Input label="Email" value={String(convertForm.email ?? '')} onChange={(v) => setConvertForm((f) => ({ ...f, email: v }))} />
          <Input label="Telepon" value={String(convertForm.phone ?? '')} onChange={(v) => setConvertForm((f) => ({ ...f, phone: v }))} />
        </div>
      </Modal>
    </div>
  );
}
