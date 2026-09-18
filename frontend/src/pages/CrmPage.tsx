import { Link } from 'react-router-dom';

const links = [
  { to: '/crm/leads', label: 'Leads', desc: 'Calon pelanggan & kualifikasi' },
  { to: '/crm/opportunities', label: 'Pipeline', desc: 'Opportunities per stage (kanban)' },
  { to: '/crm/activities', label: 'Activities', desc: 'Tugas & follow-up' },
  { to: '/crm/quotations', label: 'Quotations', desc: 'Penawaran harga ke customer' },
  { to: '/crm/sales-orders', label: 'Sales Orders', desc: 'Pesanan penjualan & reservasi stok' },
  { to: '/crm/customers', label: 'Customers', desc: 'Data pelanggan' },
];

export default function CrmPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">CRM</h1>
      <p className="text-gray-500 text-sm mb-6">Sales pipeline, leads, quotation & sales order.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
