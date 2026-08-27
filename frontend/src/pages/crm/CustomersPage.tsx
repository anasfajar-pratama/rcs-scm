import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Contact, Customer } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table } from '../../components/ui';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, setSearch, setPage, meta } = useMasterQuery<Customer>('customers');
  const priceLists = useListQuery<{ id: number; name: string }>('price-lists');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (editing) return crudApi<Customer>('customers').update(editing.id, payload);
      return crudApi<Customer>('customers').create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      setEditing(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: '',
      name: '',
      type: 'b2b',
      default_price_list_id: '',
      email: '',
      phone: '',
      tax_id: '',
      credit_limit: 0,
      billing_address: '',
      shipping_address: '',
      is_active: true,
    });
    setContacts([]);
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ ...c, default_price_list_id: c.default_price_list_id ?? '' });
    setContacts(c.contacts ?? []);
    setOpen(true);
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => save.mutate({ ...form, contacts });

  return (
    <div>
      <PageHeader title="Customers" subtitle="Pelanggan / partner penjualan" action={<Button onClick={openCreate}>+ Tambah</Button>} />

      <Card>
        <div className="p-4 border-b border-gray-100">
          <input
            onKeyUp={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Cari customer..."
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
              { key: 'code', label: 'Kode' },
              { key: 'name', label: 'Nama' },
              { key: 'type', label: 'Tipe' },
              { key: 'email', label: 'Email' },
              { key: 'price_list', label: 'Price List' },
              { key: 'status', label: 'Status' },
              { key: 'action', label: '' },
            ]}
            data={data?.data ?? []}
            renderRow={(row) => {
              const c = row as Customer;
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs">{c.code}</td>
                  <td className="py-3 px-4">{c.name}</td>
                  <td className="py-3 px-4">{c.type}</td>
                  <td className="py-3 px-4">{c.email ?? '—'}</td>
                  <td className="py-3 px-4">{c.default_price_list ?? '—'}</td>
                  <td className="py-3 px-4">
                    {c.is_active ? <Badge color="green">Aktif</Badge> : <Badge color="red">Nonaktif</Badge>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(c)} className="text-brand-600 hover:text-brand-800 text-sm">
                      Edit
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
        title={editing ? 'Edit Customer' : 'Tambah Customer'}
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
          <Input label="Kode *" value={String(form.code ?? '')} onChange={(v) => set('code', v)} required />
          <Input label="Nama *" value={String(form.name ?? '')} onChange={(v) => set('name', v)} required />
          <Select
            label="Tipe"
            value={String(form.type ?? 'b2b')}
            onChange={(v) => set('type', v)}
            options={[
              { label: 'B2B', value: 'b2b' },
              { label: 'Distributor', value: 'distributor' },
              { label: 'Retail', value: 'retail' },
              { label: 'Affiliate', value: 'affiliate' },
            ]}
          />
          <Select
            label="Default Price List"
            value={String(form.default_price_list_id ?? '')}
            onChange={(v) => set('default_price_list_id', v)}
            options={(priceLists.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
            placeholder="Pilih price list"
          />
          <Input label="Email" value={String(form.email ?? '')} onChange={(v) => set('email', v)} />
          <Input label="Telepon" value={String(form.phone ?? '')} onChange={(v) => set('phone', v)} />
          <Input label="NPWP" value={String(form.tax_id ?? '')} onChange={(v) => set('tax_id', v)} />
          <Input label="Credit Limit" type="number" value={String(form.credit_limit ?? 0)} onChange={(v) => set('credit_limit', Number(v))} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Kontak</label>
            <Button variant="ghost" onClick={() => setContacts((c) => [...c, { name: '', is_primary: false }])}>
              + Tambah Kontak
            </Button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada kontak.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <Input label="" value={contact.name} onChange={(v) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, name: v } : x)))} placeholder="Nama" />
                  <Input label="" value={contact.phone ?? ''} onChange={(v) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, phone: v } : x)))} placeholder="Telepon" />
                  <Input label="" value={contact.position ?? ''} onChange={(v) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, position: v } : x)))} placeholder="Jabatan" />
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={Boolean(contact.is_primary)}
                        onChange={(e) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, is_primary: e.target.checked } : x)))}
                      />
                      Utama
                    </label>
                    <button onClick={() => setContacts((c) => c.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
