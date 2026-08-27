import SimpleMasterPage from '../SimpleMasterPage';

export default function WarehousesPage() {
  return (
    <SimpleMasterPage
      resource="warehouses"
      title="Gudang"
      subtitle="Lokasi penyimpanan stok"
      searchPlaceholder="Cari gudang..."
      columns={[
        { key: 'code', label: 'Kode' },
        { key: 'name', label: 'Nama' },
        { key: 'address', label: 'Alamat' },
      ]}
      fields={[
        { key: 'code', label: 'Kode', required: true },
        { key: 'name', label: 'Nama', required: true },
        { key: 'address', label: 'Alamat', type: 'textarea' },
      ]}
    />
  );
}
