import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../api/auth';
import { canAccessModule } from '../access';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  perm?: string;
  children?: { to: string; label: string; perm: string }[];
}

const nav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '▦', perm: 'dashboard' },
  {
    to: '/product',
    label: 'Product',
    icon: '◧',
    children: [
      { to: '/product', label: 'Produk', perm: 'products' },
      { to: '/product/categories', label: 'Kategori', perm: 'categories' },
      { to: '/product/units', label: 'Satuan', perm: 'units' },
      { to: '/product/brands', label: 'Brand', perm: 'brands' },
      { to: '/product/price-lists', label: 'Price List', perm: 'price-lists' },
    ],
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: '▤',
    children: [
      { to: '/inventory', label: 'Stok', perm: 'stocks' },
      { to: '/inventory/warehouses', label: 'Gudang', perm: 'warehouses' },
      { to: '/inventory/transfers', label: 'Transfer', perm: 'transfers' },
      { to: '/inventory/adjustments', label: 'Adjustment', perm: 'adjustments' },
      { to: '/inventory/movements', label: 'Mutasi', perm: 'stock-movements' },
      { to: '/inventory/opname', label: 'Stock Opname', perm: 'stock-opnames' },
      { to: '/inventory/reservations', label: 'Reservasi', perm: 'reservations' },
    ],
  },
  {
    to: '/purchasing',
    label: 'Purchasing',
    icon: '◈',
    children: [
      { to: '/purchasing/suppliers', label: 'Supplier', perm: 'suppliers' },
      { to: '/purchasing/pr', label: 'Purchase Requisition', perm: 'pr' },
      // { to: '/purchasing/rfq', label: 'RFQ', perm: 'rfq' },
      // { to: '/purchasing/quotation', label: 'Quotation', perm: 'quotations' },
      { to: '/purchasing/quick-po', label: 'Quick PO', perm: 'pos' },
      { to: '/purchasing/po', label: 'PO', perm: 'pos' },
      { to: '/purchasing/receiving', label: 'Receiving', perm: 'receivings' },
      { to: '/purchasing/return', label: 'Purchase Return', perm: 'purchase-returns' },
    ],
  },
  {
    to: '/crm',
    label: 'CRM',
    icon: '◉',
    children: [
      { to: '/crm', label: 'Pipeline', perm: 'opportunities' },
      { to: '/crm/leads', label: 'Leads', perm: 'leads' },
      { to: '/crm/opportunities', label: 'Opportunities', perm: 'opportunities' },
      { to: '/crm/activities', label: 'Activities', perm: 'activities' },
      { to: '/crm/quotations', label: 'Quotations', perm: 'quotations-sales' },
      { to: '/crm/sales-orders', label: 'Sales Orders', perm: 'sales-orders' },
      { to: '/crm/customers', label: 'Customers', perm: 'customers' },
    ],
  },
  {
    to: '/production',
    label: 'Production',
    icon: '⚙',
    children: [
      { to: '/production/orders', label: 'Production Orders', perm: 'production-orders' },
      { to: '/production/batches', label: 'Batch / Traceability', perm: 'batches' },
    ],
  },
  { to: '/reports', label: 'Reports', icon: '▥', perm: 'reports' },
  { to: '/settings', label: 'Settings', icon: '⚙', perm: 'settings' },
  { to: '/users', label: 'Users', icon: '👤', perm: 'users' },
];

function SidebarLink({ item, open, onToggle }: { item: NavItem; open: boolean; onToggle: () => void }) {
  const location = useLocation();
  // Cocokkan per-segmen: "/product" tidak boleh match "/production" (prefix-collision).
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

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

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-2.5 text-sm text-white/80 hover:bg-white/10 transition ${
          isActive(item.to) ? 'bg-white/15 text-white' : ''
        }`}
      >
        <span className="flex items-center gap-3">
          <span>{item.icon}</span>
          {item.label}
        </span>
        <span className={`text-xs transition ${open ? 'rotate-90' : ''}`}>▸</span>
      </button>
      {open && (
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
  const location = useLocation();
  const { user, clear } = useAuthStore();

  // Menu yang tampil disesuaikan dengan permission role user saat login:
  // group hanya tampil jika masih ada child yang diizinkan, leaf tampil jika modulnya diizinkan.
  const visibleNav = useMemo(() => {
    const visible: NavItem[] = [];
    for (const item of nav) {
      if (item.children) {
        const children = item.children.filter((c) => canAccessModule(user, c.perm));
        if (children.length > 0) visible.push({ ...item, children });
      } else if (canAccessModule(user, item.perm ?? '')) {
        visible.push(item);
      }
    }
    return visible;
  }, [user]);

  // Accordion: hanya satu section yang terbuka; section berisi route aktif terbuka saat inisialisasi.
  const [openSection, setOpenSection] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const active = visibleNav.find((item) => {
      if (!item.children) return false;
      const p = window.location.pathname;
      return p === item.to || p.startsWith(item.to + '/');
    });
    return active?.to ?? null;
  });

  // Saat berpindah route, buka section milik route baru tersebut (menutup section lain).
  useEffect(() => {
    const active = visibleNav.find((item) => {
      if (!item.children) return false;
      return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    });
    if (active) setOpenSection(active.to);
  }, [location.pathname, visibleNav]);

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
          {visibleNav.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              open={openSection === item.to}
              onToggle={() => setOpenSection((cur) => (cur === item.to ? null : item.to))}
            />
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
