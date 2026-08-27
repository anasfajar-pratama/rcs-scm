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
        { key: 'email', label: 'Email' },
        { key: 'payment_terms', label: 'Termin' },
      ]}
      fields={[
        { key: 'code', label: 'Kode', required: true },
        { key: 'name', label: 'Nama', required: true },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Telepon' },
        { key: 'tax_id', label: 'NPWP' },
        { key: 'payment_terms', label: 'Termin (cth: 30 hari)' },
        { key: 'address', label: 'Alamat', placeholder: 'Alamat lengkap' },
      ]}
    />
  );
}
