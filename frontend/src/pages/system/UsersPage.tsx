import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useMasterQuery } from '../../hooks/useMaster';
import type { User } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Spinner, Table } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

interface RoleOption {
  id: number;
  name: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<User>('users');
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const loadRoles = async () => {
    try {
      const res = await crudApi<RoleOption>('roles').list();
      setRoles(res);
    } catch {
      // ignore
    }
  };

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<User>('users').update(editing.id, payload);
      return crudApi<User>('users').create(payload);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      toast(editing ? 'User diperbarui.' : 'User dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<User>('users').destroy(id),
    onSuccess: () => {
      invalidate();
      toast('User dihapus.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = async () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', is_active: true });
    setSelectedRoles([]);
    await loadRoles();
    setOpen(true);
  };

  const openEdit = async (u: User) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', is_active: u.is_active });
    setSelectedRoles(u.roles ?? []);
    await loadRoles();
    setOpen(true);
  };

  const submit = () => {
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      is_active: Boolean(form.is_active),
      roles: selectedRoles,
    };
    if (form.password) payload.password = form.password;
    save.mutate(payload);
  };

  return (
    <div>
      <PageHeader title="Users" subtitle="Kelola pengguna & role" action={<Button onClick={openCreate}>+ Tambah User</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari user..."
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
              { key: 'email', label: 'Email' },
              { key: 'roles', label: 'Roles' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const u = row as User;
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{u.name}</td>
                  <td className="py-3 px-4 text-sm">{u.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles ?? []).map((r) => (
                        <Badge key={r} color="blue">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {u.is_active ? <Badge color="green">Aktif</Badge> : <Badge color="red">Nonaktif</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(u)} className="text-brand-600 hover:text-brand-800 text-sm mr-3">
                      Edit
                    </button>
                    <button onClick={() => remove.mutate(u.id)} className="text-red-500 hover:text-red-700 text-sm">
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
        title={editing ? 'Edit User' : 'Tambah User'}
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
          <Input label="Email *" value={String(form.email ?? '')} onChange={(v) => set('email', v)} required />
          <Input
            label={editing ? 'Password (kosongkan jika tidak diganti)' : 'Password *'}
            type="password"
            value={String(form.password ?? '')}
            onChange={(v) => set('password', v)}
            required={!editing}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Roles</label>
            <div className="flex flex-wrap gap-3 pt-1">
              {(roles ?? []).map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.name)}
                    onChange={(e) =>
                      setSelectedRoles((prev) => (e.target.checked ? [...prev, r.name] : prev.filter((x) => x !== r.name)))
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => set('is_active', e.target.checked)} />
            Aktif
          </label>
        </div>
      </Modal>
    </div>
  );
}
