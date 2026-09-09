import SimpleMasterPage from '../SimpleMasterPage';

export default function SuppliersPage() {
  return (
    <SimpleMasterPage
      resource="suppliers"
      title="Supplier"
      subtitle="Pemasok bahan baku & kemasan"
      searchPlaceholder="Cari supplier..."
      columns={[
        { key: 'code', label: 'Kode' },
        { key: 'name', label: 'Nama' },
        {
          key: 'pic_name',
          label: 'PIC',
          render: (r) => (
            <div className="leading-tight">
              <div className="truncate max-w-[10rem]">{r.pic_name ? String(r.pic_name) : '—'}</div>
              {r.pic_phone ? <div className="text-xs text-gray-400">{String(r.pic_phone)}</div> : null}
            </div>
          ),
        },
        {
          key: 'email',
          label: 'Kontak',
          render: (r) => (
            <div className="leading-tight">
              <div className="truncate max-w-[12rem]">{r.email ? String(r.email) : '—'}</div>
              {r.phone ? <div className="text-xs text-gray-400">{String(r.phone)}</div> : null}
            </div>
          ),
        },
        { key: 'payment_terms', label: 'Termin' },
      ]}
      fields={[
        { key: 'code', label: 'Kode', required: true, placeholder: 'cth: SUP-001', hint: 'Kode unik supplier, tidak bisa sama dengan yang lain' },
        { key: 'name', label: 'Nama Supplier', required: true, span: 2, placeholder: 'cth: PT Maju Bersama Sejahtera', hint: 'Nama resmi pemasok' },
        { key: 'pic_name', label: 'Nama PIC', placeholder: 'Nama penanggung jawab', hint: 'Kontak yang menangani order di pihak supplier' },
        { key: 'pic_phone', label: 'No. HP PIC', placeholder: 'cth: 0812-3456-7890', hint: 'Nomor HP / WA yang aktif' },
        { key: 'email', label: 'Email Supplier', placeholder: 'cth: sales@supplier.com' },
        { key: 'phone', label: 'Telepon Kantor', placeholder: 'cth: 021-5555-1234' },
        { key: 'tax_id', label: 'NPWP', placeholder: 'cth: 01.234.567.8-901.000', hint: 'Opsional' },
        { key: 'payment_terms', label: 'Termin Pembayaran', placeholder: 'cth: 30 hari / NET30', hint: 'Jatuh tempo pembayaran ke supplier' },
        {
          key: 'currency',
          label: 'Mata Uang',
          type: 'select',
          options: [
            { label: 'IDR — Rupiah', value: 'IDR' },
            { label: 'USD — Dollar', value: 'USD' },
          ],
          placeholder: 'Pilih mata uang',
          hint: 'Mata uang yang dipakai dalam transaksi dengan supplier',
        },
        { key: 'address', label: 'Alamat', type: 'textarea', span: 2, placeholder: 'Jalan, nomor, kelurahan, kecamatan, kota, kode pos...', hint: 'Alamat lengkap untuk pengiriman & penagihan' },
      ]}
    />
  );
}
