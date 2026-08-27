import { useAuthStore } from '../stores/authStore';

const cards = [
  { label: 'Stok (item)', value: '—', hint: 'Master data produk' },
  { label: 'Pipeline CRM', value: '—', hint: 'Opportunity aktif' },
  { label: 'PO Terbuka', value: '—', hint: 'Purchase order' },
  { label: 'Batch Kadaluarsa', value: '—', hint: 'Expiry terdekat' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">
        Selamat datang, {user?.name}. Modul KPI akan terhubung pada Sprint 6.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-3xl font-bold text-gray-800 mt-2">{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
