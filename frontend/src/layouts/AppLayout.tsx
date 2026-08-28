import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  children?: { to: string; label: string }[];
}

const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  {
    to: '/product',
    label: 'Product',
    icon: '◧',
    children: [
      { to: '/product', label: 'Produk' },
      { to: '/product/categories', label: 'Kategori' },
      { to: '/product/units', label: 'Satuan' },
      { to: '/product/brands', label: 'Brand' },
      { to: '/product/price-lists', label: 'Price List' },
    ],
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: '▤',
    children: [
      { to: '/inventory', label: 'Stok' },
      { to: '/inventory/warehouses', label: 'Gudang' },
      { to: '/inventory/transfers', label: 'Transfer' },
      { to: '/inventory/adjustments', label: 'Adjustment' },
      { to: '/inventory/movements', label: 'Mutasi' },
      { to: '/inventory/opname', label: 'Stock Opname' },
    ],
  },
  {
    to: '/purchasing',
    label: 'Purchasing',
    icon: '◈',
    children: [
      { to: '/purchasing/suppliers', label: 'Supplier' },
      { to: '/purchasing/pr', label: 'PR' },
      { to: '/purchasing/rfq', label: 'RFQ' },
      { to: '/purchasing/quotation', label: 'Quotation' },
      { to: '/purchasing/po', label: 'PO' },
      { to: '/purchasing/receiving', label: 'Receiving' },
      { to: '/purchasing/return', label: 'Purchase Return' },
    ],
  },
  {
    to: '/crm',
    label: 'CRM',
    icon: '◉',
    children: [
      { to: '/crm', label: 'Pipeline' },
      { to: '/crm/leads', label: 'Leads' },
      { to: '/crm/opportunities', label: 'Opportunities' },
      { to: '/crm/activities', label: 'Activities' },
      { to: '/crm/quotations', label: 'Quotations' },
      { to: '/crm/sales-orders', label: 'Sales Orders' },
      { to: '/crm/customers', label: 'Customers' },
    ],
  },
  { to: '/production', label: 'Production', icon: '⚙' },
  { to: '/reports', label: 'Reports', icon: '▥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

function SidebarLink({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const isActive = (path: string) =>
    typeof window !== 'undefined' && window.location.pathname.startsWith(path);

  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive: a }) =>
          `flex items-center gap-3 px-5 py-2.5 text-sm text-white/80 hover:bg-white/10 transition ${
            a ? 'bg-white/15 text-white font-semibold' : ''
          }`
        }
      >
        <span>{item.icon}</span>
        {item.label}
      </NavLink>
    );
  }

  const expanded = open || isActive(item.to);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-5 py-2.5 text-sm text-white/80 hover:bg-white/10 transition ${
          isActive(item.to) ? 'bg-white/15 text-white' : ''
        }`}
      >
        <span className="flex items-center gap-3">
          <span>{item.icon}</span>
          {item.label}
        </span>
        <span className={`text-xs transition ${expanded ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {expanded && (
        <div className="bg-black/10">
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive: a }) =>
                `block pl-12 pr-5 py-2 text-sm text-white/70 hover:bg-white/10 transition ${
                  a ? 'text-white bg-white/15 font-semibold' : ''
                }`
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 shrink-0 bg-brand-800 text-white flex flex-col">
        <div className="px-5 py-5 font-bold text-lg border-b border-white/10">RCS SCM</div>
        <nav className="flex-1 py-4 overflow-auto">
          {nav.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-sm">
          <div className="font-semibold">{user?.name}</div>
          <div className="text-white/60 text-xs">{(user?.roles ?? []).join(', ')}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6">
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-2">
            <span>Keluar</span>
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
