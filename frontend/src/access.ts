import type { User } from './types';

// Cek akses modul berdasarkan permission Spatie ber-prefix modul,
// mis. permission "products.view-any" memberi akses modul "products".
export function canAccessModule(user: User | null | undefined, module: string): boolean {
  const perms = user?.permissions;
  if (!perms || perms.length === 0) return false;
  if (perms.includes('*')) return true;
  return perms.some((p) => p.startsWith(`${module}.`));
}

// Urutan tab laporan di halaman Reports (harus sama dengan kunci TABS di ReportsPage).
export const REPORT_TAB_KEYS: string[] = [
  'inventory',
  'stock-movements',
  'purchasing',
  'sales',
  'production',
  'customers',
  'pipeline',
  'expiry',
];

// Role di daftar ini hanya melihat tab laporan yang relevan dengan pekerjaannya.
// Role yang tidak tercantum mendapat semua tab (akses penuh / default).
const REPORT_TABS_RESTRICTED: Record<string, string[]> = {
  sales: ['sales', 'customers', 'pipeline'],
  purchasing: ['purchasing', 'inventory', 'expiry'],
};

export function allowedReportTabs(roles?: string[]): string[] {
  const list = roles ?? [];
  if (list.length === 0) return [...REPORT_TAB_KEYS];

  const restricted = list.filter((r) => Object.prototype.hasOwnProperty.call(REPORT_TABS_RESTRICTED, r));
  // Jika ada role tanpa pembatasan (mis. supervisor/admin), beri semua tab.
  if (restricted.length !== list.length) return [...REPORT_TAB_KEYS];

  const set = new Set(restricted.flatMap((r) => REPORT_TABS_RESTRICTED[r]));
  return REPORT_TAB_KEYS.filter((k) => set.has(k));
}
