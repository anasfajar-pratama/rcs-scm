import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../api/crud';
import { useMasterQuery } from '../hooks/useMaster';
import { Button, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../components/ui';

export interface MasterColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

export interface MasterField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
}

interface Props {
  resource: string;
  title: string;
  subtitle?: string;
  columns: MasterColumn[];
  fields: MasterField[];
  idKey?: string;
  searchPlaceholder?: string;
}

export default function SimpleMasterPage({ resource, title, subtitle, columns, fields, idKey = 'id', searchPlaceholder }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, meta, setSearch, setPage } = useMasterQuery<Record<string, unknown>>(resource);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [confirmDel, setConfirmDel] = useState<Record<string, unknown> | null>(null);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi(resource).update(editing[idKey] as number, payload);
      return crudApi(resource).create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      setOpen(false);
      setEditing(null);
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => crudApi(resource).destroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      setConfirmDel(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    const init: Record<string, unknown> = {};
    fields.forEach((f) => {
      init[f.key] = f.type === 'checkbox' ? true : f.type === 'select' ? '' : '';
    });
    setForm(init);
    setOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    setForm(row);
    setOpen(true);
  };

  const submit = () => save.mutate(form);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} action={<Button onClick={openCreate}>+ Tambah</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder={searchPlaceholder ?? 'Cari...'}
            className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            columns={[...columns, { key: 'action', label: '' }]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const r = row as Record<string, unknown>;
              return (
                <tr key={String(r[idKey])} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="py-3 px-4">
                      {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Edit
                    </button>
                    <button onClick={() => setConfirmDel(r)} className="text-red-500 hover:text-red-700 text-sm">
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
        title={editing ? `Edit ${title}` : `Tambah ${title}`}
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
          {fields.map((f) => {
            const span = f.span === 2 ? 'sm:col-span-2' : '';
            if (f.type === 'checkbox') {
              return (
                <div key={f.key} className="sm:col-span-2">
                  <Checkbox label={f.label} checked={Boolean(form[f.key])} onChange={(v) => set(f.key, v)} />
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                </div>
              );
            }
            if (f.type === 'select') {
              return (
                <div key={f.key} className={span}>
                  <Select
                    label={f.label}
                    value={String(form[f.key] ?? '')}
                    onChange={(v) => set(f.key, v)}
                    options={f.options ?? []}
                    placeholder={f.placeholder}
                  />
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                </div>
              );
            }
            if (f.type === 'textarea') {
              return (
                <div key={f.key} className={span}>
                  <Textarea
                    label={(f.required ? f.label + ' *' : f.label) ?? ''}
                    value={String(form[f.key] ?? '')}
                    onChange={(v) => set(f.key, v)}
                    placeholder={f.placeholder}
                  />
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                </div>
              );
            }
            return (
              <div key={f.key} className={span}>
                <Input
                  label={(f.required ? f.label + ' *' : f.label) ?? ''}
                  type={f.type ?? 'text'}
                  value={String(form[f.key] ?? '')}
                  onChange={(v) => set(f.key, f.type === 'number' ? Number(v) : v)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
                {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Hapus"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => confirmDel && del.mutate(confirmDel[idKey] as number)}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Yakin ingin menghapus data ini?</p>
      </Modal>
    </div>
  );
}
