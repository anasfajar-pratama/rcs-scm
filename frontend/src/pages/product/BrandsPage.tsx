import SimpleMasterPage from '../SimpleMasterPage';

export default function BrandsPage() {
  return (
    <SimpleMasterPage
      resource="brands"
      title="Brand"
      subtitle="Merek produk"
      searchPlaceholder="Cari brand..."
      columns={[
        { key: 'name', label: 'Nama' },
        { key: 'code', label: 'Kode' },
        { key: 'is_active', label: 'Status' },
      ]}
      fields={[
        { key: 'name', label: 'Nama', required: true },
        { key: 'code', label: 'Kode' },
      ]}
    />
  );
}
