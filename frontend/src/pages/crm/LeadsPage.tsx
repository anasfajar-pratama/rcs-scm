import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { crudApi } from '../../api/crud';
import { addLeadHistory, leadConvert, leadHistories, leadStatus } from '../../api/crm';
import { useMasterQuery } from '../../hooks/useMaster';
import type { Lead } from '../../types';
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '../../components/ui';
import { getErrorMessage, useToast } from '../../components/Toast';

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

const methodOptions = [
  { label: 'Telepon', value: 'call' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Kunjungan', value: 'visit' },
  { label: 'Lainnya', value: 'other' },
];
const methodLabel = Object.fromEntries(methodOptions.map((o) => [o.value, o.label]));

const outcomeOptions = [
  { label: 'Tertarik', value: 'interested' },
  { label: 'Perlu Follow-up', value: 'follow_up' },
  { label: 'Tidak Tertarik', value: 'not_interested' },
  { label: 'Tidak Diangkat', value: 'no_answer' },
  { label: 'Lainnya', value: 'other' },
];
const outcomeLabel = Object.fromEntries(outcomeOptions.map((o) => [o.value, o.label]));

const methodColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  call: 'blue',
  whatsapp: 'green',
  email: 'gray',
  meeting: 'yellow',
  visit: 'green',
  other: 'gray',
};

const outcomeColor: Record<string, 'green' | 'gray' | 'yellow' | 'blue' | 'red'> = {
  interested: 'green',
  follow_up: 'yellow',
  not_interested: 'red',
  no_answer: 'gray',
  other: 'gray',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

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
  const { toast } = useToast();
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
      toast(editing ? 'Lead diperbarui.' : 'Lead dibuat.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const statusAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => leadStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast('Status lead diperbarui.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const convert = useMutation({
    mutationFn: () => leadConvert(convertTarget!.id, convertForm),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setConvertTarget(null);
      setConvertForm({});
      toast('Lead dikonversi menjadi customer.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => crudApi<Lead>('leads').destroy(id),
    onSuccess: () => {
      invalidate();
      toast('Lead dihapus.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [historyForm, setHistoryForm] = useState({ contacted_at: '', method: 'call', outcome: 'follow_up', result: '' });

  const historiesQuery = useQuery({
    queryKey: ['lead-histories', historyLead?.id],
    queryFn: () => (historyLead ? leadHistories(historyLead.id) : Promise.resolve([])),
    enabled: !!historyLead,
  });

  const addHistory = useMutation({
    mutationFn: () => addLeadHistory(historyLead!.id, historyForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-histories', historyLead?.id] });
      invalidate();
      setHistoryForm((f) => ({ ...f, result: '', method: 'call', outcome: 'follow_up' }));
      toast('Riwayat kontak ditambahkan.');
    },
    onError: (e) => toast(getErrorMessage(e), 'error'),
  });

  const openHistory = (l: Lead) => {
    setHistoryLead(l);
    setHistoryForm({ contacted_at: new Date().toISOString().slice(0, 10), method: 'call', outcome: 'follow_up', result: '' });
    setHistoryOpen(true);
  };

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
                    <span className="inline-flex flex-col items-center mr-3 align-middle">
                      <button onClick={() => openHistory(l)} className="text-brand-600 hover:text-brand-800 text-sm">
                        Riwayat
                      </button>
                      <span className="text-[10px] text-gray-400 leading-tight">{(l.histories_count ?? 0)}× kontak</span>
                    </span>
                    {(l.status === 'new' || l.status === 'contacted') && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Nama *"
              value={String(form.name ?? '')}
              onChange={(v) => set('name', v)}
              required
              placeholder="cth: Budi Santoso"
            />
            <p className="text-xs text-gray-400 mt-1">Nama calon pelanggan (wajib diisi)</p>
          </div>
          <div>
            <Input
              label="Perusahaan"
              value={String(form.company ?? '')}
              onChange={(v) => set('company', v)}
              placeholder="cth: PT Karya Utama"
            />
            <p className="text-xs text-gray-400 mt-1">Opsional — nama perusahaan / instansi</p>
          </div>
          <div>
            <Select
              label="Sumber"
              value={String(form.source ?? 'walk_in')}
              onChange={(v) => set('source', v)}
              options={sourceOptions}
            />
            <p className="text-xs text-gray-400 mt-1">Dari mana lead berasal</p>
          </div>
          <div>
            <Input
              label="Email"
              value={String(form.email ?? '')}
              onChange={(v) => set('email', v)}
              placeholder="cth: budi@email.com"
            />
            <p className="text-xs text-gray-400 mt-1">Email aktif untuk pengiriman penawaran</p>
          </div>
          <div>
            <Input
              label="Telepon"
              value={String(form.phone ?? '')}
              onChange={(v) => set('phone', v)}
              placeholder="cth: 0812-3456-7890"
            />
            <p className="text-xs text-gray-400 mt-1">Nomor HP / WA yang bisa dihubungi</p>
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Catatan"
              value={String(form.notes ?? '')}
              onChange={(v) => set('notes', v)}
              placeholder="Kebutuhan produk, info tambahan, dll..."
            />
            <p className="text-xs text-gray-400 mt-1">Opsional — catatan kualifikasi awal</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Riwayat Kontak — ${historyLead?.name ?? ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHistoryOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => addHistory.mutate()} disabled={addHistory.isPending}>
              {addHistory.isPending ? 'Menyimpan...' : '+ Simpan Kontak'}
            </Button>
          </>
        }
      >
        <div className="max-h-56 overflow-auto border border-gray-200 rounded-lg">
          {historiesQuery.isLoading ? (
            <div className="p-4 text-sm text-gray-400">Memuat riwayat...</div>
          ) : (historiesQuery.data ?? []).length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Belum ada riwayat kontak untuk lead ini.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {historiesQuery.data?.map((h) => (
                <div key={h.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{formatDate(h.contacted_at)}</span>
                    <Badge color={methodColor[h.method] ?? 'gray'}>{methodLabel[h.method] ?? h.method}</Badge>
                    <Badge color={outcomeColor[h.outcome] ?? 'gray'}>{outcomeLabel[h.outcome] ?? h.outcome}</Badge>
                    {h.createdBy && <span className="text-xs text-gray-400">oleh {h.createdBy.name}</span>}
                  </div>
                  {h.result && <p className="text-sm text-gray-700 mt-1">{h.result}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Input Kontak Baru</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tanggal Kontak *"
              type="date"
              value={historyForm.contacted_at}
              onChange={(v) => setHistoryForm((f) => ({ ...f, contacted_at: v }))}
            />
            <Select
              label="Metode *"
              value={historyForm.method}
              onChange={(v) => setHistoryForm((f) => ({ ...f, method: v }))}
              options={methodOptions}
            />
            <Select
              label="Hasil *"
              value={historyForm.outcome}
              onChange={(v) => setHistoryForm((f) => ({ ...f, outcome: v }))}
              options={outcomeOptions}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Catatan Pembicaraan"
              value={historyForm.result}
              onChange={(v) => setHistoryForm((f) => ({ ...f, result: v }))}
              placeholder="cth: Tertarik dengan produk, minta penawaran harga minggu depan..."
            />
          </div>
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
