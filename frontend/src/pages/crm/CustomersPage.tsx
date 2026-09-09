import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { useListQuery, useMasterQuery } from '../../hooks/useMaster';
import type { Contact, Customer } from '../../types';
import { Badge, Button, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../../components/ui';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {hint && <p className="text-xs text-gray-500 mt-1 mb-3">{hint}</p>}
      {children}
    </div>
  );
}

const typeOptions = [
  { label: 'B2B — Perusahaan', value: 'b2b' },
  { label: 'Distributor', value: 'distributor' },
  { label: 'Retail — Eceran', value: 'retail' },
  { label: 'Affiliate — Mitra', value: 'affiliate' },
];

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

  // Validasi minimum: kode, nama, dan tipe customer wajib diisi.
  const canSave = Boolean(form.code && form.name && form.type);

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
            <Button onClick={submit} disabled={save.isPending || !canSave}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </>
        }
      >
        <Section
          title="Informasi Umum"
          hint="Data dasar pelanggan. Kode, nama dan tipe customer wajib diisi."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kode *"
              value={String(form.code ?? '')}
              onChange={(v) => set('code', v)}
              required
              placeholder="cth: CUS-001"
            />
            <Input
              label="Nama *"
              value={String(form.name ?? '')}
              onChange={(v) => set('name', v)}
              required
              placeholder="cth: PT Karya Utama"
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Tipe Customer *</label>
              <Select
                value={String(form.type ?? 'b2b')}
                onChange={(v) => set('type', v)}
                options={typeOptions}
                placeholder="Pilih tipe customer"
              />
              <p className="text-xs text-gray-400">Menentukan segmen & harga default penjualan.</p>
            </div>
            <Select
              label="Default Price List"
              value={String(form.default_price_list_id ?? '')}
              onChange={(v) => set('default_price_list_id', v)}
              options={(priceLists.data ?? []).map((p) => ({ label: p.name, value: p.id }))}
              placeholder="Pilih price list (opsional)"
            />
            <Input
              label="Email"
              value={String(form.email ?? '')}
              onChange={(v) => set('email', v)}
              placeholder="cth: admin@perusahaan.com"
            />
            <Input
              label="Telepon"
              value={String(form.phone ?? '')}
              onChange={(v) => set('phone', v)}
              placeholder="cth: 0812-3456-7890"
            />
          </div>
        </Section>

        <Section title="Informasi Keuangan" hint="Batas kredit & identitas pajak — isi bila relevan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="NPWP"
              value={String(form.tax_id ?? '')}
              onChange={(v) => set('tax_id', v)}
              placeholder="cth: 01.234.567.8-901.000"
            />
            <Input
              label="Credit Limit (Rp)"
              type="number"
              value={String(form.credit_limit ?? 0)}
              onChange={(v) => set('credit_limit', Number(v))}
              placeholder="0"
            />
          </div>
        </Section>

        <Section title="Alamat" hint="Alamat penagihan & pengiriman — bisa diisi nanti bila belum tersedia.">
          <div className="grid grid-cols-1 gap-4">
            <Textarea
              label="Alamat Penagihan (Billing)"
              value={String(form.billing_address ?? '')}
              onChange={(v) => set('billing_address', v)}
              placeholder="Jalan, kelurahan, kecamatan, kota, kode pos..."
            />
            <Textarea
              label="Alamat Pengiriman (Shipping)"
              value={String(form.shipping_address ?? '')}
              onChange={(v) => set('shipping_address', v)}
              placeholder="Kosongkan jika sama dengan alamat penagihan"
            />
          </div>
        </Section>

        <Section
          title="Kontak"
          hint="Orang yang bisa dihubungi terkait customer ini. Centang 'Utama' untuk kontak pertama."
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Kontak PIC / divisi di pihak customer.</span>
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
                  <Input label="" value={contact.name} onChange={(v) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, name: v } : x)))} placeholder="Nama kontak" />
                  <Input label="" value={contact.phone ?? ''} onChange={(v) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, phone: v } : x)))} placeholder="Telepon / WA" />
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
        </Section>

        <div className="mt-4 flex items-center justify-between">
          <Checkbox label="Customer aktif" checked={Boolean(form.is_active)} onChange={(v) => set('is_active', v)} />
          <p className="text-xs text-gray-400">Field bertanda * wajib diisi.</p>
        </div>
      </Modal>
    </div>
  );
}
