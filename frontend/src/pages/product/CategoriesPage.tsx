import SimpleMasterPage from '../SimpleMasterPage';

export default function CategoriesPage() {
  return (
    <SimpleMasterPage
      resource="categories"
      title="Kategori"
      subtitle="Klasifikasi produk"
      searchPlaceholder="Cari kategori..."
      columns={[{ key: 'name', label: 'Nama' }, { key: 'slug', label: 'Slug' }, { key: 'is_active', label: 'Status' }]}
      fields={[
        { key: 'name', label: 'Nama', required: true },
      ]}
    />
  );
}
