import SimpleMasterPage from '../SimpleMasterPage';

export default function UnitsPage() {
  return (
    <SimpleMasterPage
      resource="units"
      title="Satuan"
      subtitle="Unit pengukuran produk"
      searchPlaceholder="Cari satuan..."
      columns={[
        { key: 'name', label: 'Nama' },
        { key: 'code', label: 'Kode' },
        { key: 'is_active', label: 'Status' },
      ]}
      fields={[
        { key: 'name', label: 'Nama', required: true },
        { key: 'code', label: 'Kode', required: true },
      ]}
    />
  );
}
