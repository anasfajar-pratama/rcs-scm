import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { activityDone } from '../../api/crm';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Activity } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../../components/ui';

const statusColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  open: 'yellow',
  done: 'green',
  cancelled: 'gray',
};

const priorityColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
};

const typeOptions = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Task', value: 'task' },
  { label: 'Follow-up', value: 'follow_up' },
];

const statusFilterOptions = [
  { label: 'Semua', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Done', value: 'done' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<Activity>('activities', {
    status: statusFilter || undefined,
  });
  const leads = useListQuery<{ id: number; name: string }>('leads');
  const customers = useListQuery<{ id: number; name: string }>('customers');
  const opportunities = useListQuery<{ id: number; title: string }>('opportunities');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activities'] });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<Activity>('activities').update(editing.id, payload);
      return crudApi<Activity>('activities').create(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
    },
  });

  const done = useMutation({
    mutationFn: (id: number) => activityDone(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<Activity>('activities').destroy(id),
    onSuccess: invalidate,
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ subject: '', type: 'task', priority: 'medium', due_date: '', status: 'open', related_type: '', related_id: '', notes: '' });
    setOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({ ...a, related_type: a.related_type ?? '', related_id: a.related_id ?? '' });
    setOpen(true);
  };

  const relatedType = String(form.related_type ?? '');

  const relatedOptions = () => {
    if (relatedType === 'lead') return (leads.data ?? []).map((x) => ({ label: x.name, value: x.id }));
    if (relatedType === 'customer') return (customers.data ?? []).map((x) => ({ label: x.name, value: x.id }));
    if (relatedType === 'opportunity') return (opportunities.data ?? []).map((x) => ({ label: x.title, value: x.id }));
    return [];
  };

  const submit = () => {
    const related_id = form.related_id ? Number(form.related_id) : null;
    save.mutate({ ...form, related_id, related_type: relatedType || null });
  };

  return (
    <div>
      <PageHeader title="Activities" subtitle="Tugas & follow-up" action={<Button onClick={openCreate}>+ Tambah Activity</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari activity..."
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
            {statusFilterOptions.map((o) => (
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
              { key: 'subject', label: 'Subjek' },
              { key: 'type', label: 'Tipe' },
              { key: 'related', label: 'Terkait' },
              { key: 'due', label: 'Jatuh Tempo' },
              { key: 'priority', label: 'Prioritas' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const a = row as Activity;
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{a.subject}</td>
                  <td className="py-3 px-4 text-sm">{a.type}</td>
                  <td className="py-3 px-4 text-sm">
                    {a.related_type ? (
                      <span>
                        {a.related_type} #{a.related_id}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">{a.due_date ?? '—'}</td>
                  <td className="py-3 px-4">
                    <Badge color={priorityColor[a.priority] ?? 'gray'}>{a.priority}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge color={statusColor[a.status] ?? 'gray'}>{a.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {a.status === 'open' && (
                      <button onClick={() => done.mutate(a.id)} className="text-green-600 hover:text-green-800 text-sm mr-3">
                        Selesai
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Edit
                    </button>
                    <button onClick={() => remove.mutate(a.id)} className="text-red-500 hover:text-red-700 text-sm">
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
        title={editing ? 'Edit Activity' : 'Tambah Activity'}
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
          <Input label="Subjek *" value={String(form.subject ?? '')} onChange={(v) => set('subject', v)} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipe" value={String(form.type ?? 'task')} onChange={(v) => set('type', v)} options={typeOptions} />
            <Select
              label="Prioritas"
              value={String(form.priority ?? 'medium')}
              onChange={(v) => set('priority', v)}
              options={[
                { label: 'Rendah', value: 'low' },
                { label: 'Sedang', value: 'medium' },
                { label: 'Tinggi', value: 'high' },
              ]}
            />
          </div>
          <Input label="Jatuh Tempo" type="date" value={String(form.due_date ?? '')} onChange={(v) => set('due_date', v)} />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Terkait Dengan"
              value={relatedType}
              onChange={(v) => set('related_type', v)}
              options={[
                { label: 'Tidak ada', value: '' },
                { label: 'Lead', value: 'lead' },
                { label: 'Customer', value: 'customer' },
                { label: 'Opportunity', value: 'opportunity' },
              ]}
            />
            <Select
              label="Item Terkait"
              value={String(form.related_id ?? '')}
              onChange={(v) => set('related_id', v)}
              options={relatedOptions()}
              placeholder={relatedType ? 'Pilih item' : 'Pilih tipe dulu'}
            />
          </div>
          <Textarea label="Catatan" value={String(form.notes ?? '')} onChange={(v) => set('notes', v)} />
        </div>
      </Modal>
    </div>
  );
}
