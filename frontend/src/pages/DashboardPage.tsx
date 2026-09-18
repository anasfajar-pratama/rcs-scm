import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { getDashboardSummary } from '../api/reports';
import { Badge, Card, Spinner } from '../components/ui';

const fmt = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const kpi = data?.kpi;

  const cards = [
    { label: 'Item Stok', value: kpi ? String(kpi.stock_items) : '—', hint: 'Produk dengan stok' },
    { label: 'Nilai Stok', value: kpi ? fmt(kpi.stock_value) : '—', hint: 'Berdasarkan HPP' },
    { label: 'PO Terbuka', value: kpi ? String(kpi.po_open) : '—', hint: 'Purchase order' },
    { label: 'SO Terbuka', value: kpi ? String(kpi.so_open) : '—', hint: 'Sales order' },
    { label: 'Customers', value: kpi ? String(kpi.customers) : '—', hint: 'Pelanggan aktif' },
    { label: 'Suppliers', value: kpi ? String(kpi.suppliers) : '—', hint: 'Pemasok' },
    { label: 'Pipeline Value', value: kpi ? fmt(kpi.pipeline_value) : '—', hint: 'Opportunity aktif' },
    { label: 'Opportunities', value: kpi ? String(kpi.opportunities) : '—', hint: 'Sedang berjalan' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Selamat datang, {user?.name}. Ringkasan KPI terbaru.</p>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-sm text-gray-500">{c.label}</div>
                <div className="text-2xl font-bold text-gray-800 mt-2">{c.value}</div>
                <div className="text-xs text-gray-400 mt-1">{c.hint}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Expiry Terdekat</h3>
              {(data?.alerts.expiring ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Tidak ada batch mendekati expiry.</p>
              ) : (
                <ul className="space-y-2">
                  {data?.alerts.expiring.map((e) => (
                    <li key={e.lot_no} className="flex items-center justify-between text-sm">
                      <span>
                        {e.product} <span className="text-gray-400 text-xs">({e.lot_no})</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-gray-500">{e.expiry_date}</span>
                        <Badge color={e.expiry_date < new Date().toISOString().slice(0, 10) ? 'red' : 'yellow'}>
                          {Number(e.qty).toLocaleString('id-ID')} pcs
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Reorder Point Alert</h3>
              {(data?.alerts.reorder ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Semua stok di atas reorder point.</p>
              ) : (
                <ul className="space-y-2">
                  {data?.alerts.reorder.map((r) => (
                    <li key={r.sku} className="flex items-center justify-between text-sm">
                      <span>
                        {r.product} <span className="text-gray-400 text-xs">({r.sku})</span>
                      </span>
                      <Badge color="red">
                        {Number(r.current).toLocaleString('id-ID')} / reorder {Number(r.reorder_point).toLocaleString('id-ID')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
