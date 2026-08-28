import { Link } from 'react-router-dom';

const links = [
  { to: '/production/orders', label: 'Production Orders', desc: 'Buat & jalankan produksi dari BOM' },
  { to: '/production/batches', label: 'Batch / Traceability', desc: 'Rekap batch produksi & status expiry' },
];

export default function ProductionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Production</h1>
      <p className="text-gray-500 text-sm mb-6">Produksi batch, traceability, dan status expiry.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-sm transition"
          >
            <div className="font-semibold text-gray-800">{l.label}</div>
            <div className="text-sm text-gray-500 mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
