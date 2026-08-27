# RCS SCM — Sistem Terintegrasi Inventory · Purchasing · CRM

Sistem untuk perusahaan **produksi skincare**: CRM (penjualan), Inventory, Purchasing, dan Production (BOM + batch + expiry).

## Arsitektur

- **Backend:** Laravel 12 API (`backend/`) — `api/v1/*`, Laravel Sanctum auth, Spatie RBAC, Audit Log.
- **Frontend:** React 18 + TypeScript + Vite (`frontend/`) — React Query, React Router, Zustand, Tailwind CSS v4, Axios.
- **Deployment:** Hostinger (PHP 8.2 + MySQL + static frontend build).

## Struktur

```
rcs-scm/
├── modul.md                 # peta modul & keputusan MVP
├── docs/                    # dokumen untuk approval + PDF
│   ├── 01..04-*.md
│   └── pdf/RCS-SCM-Dokumen-Rencana-Proyek.pdf
├── backend/                 # Laravel 12 API
└── frontend/                # React SPA
```

## Setup Backend

```bash
cd backend
composer install
cp .env.example .env    # atau pakai .env yang sudah ada
php artisan key:generate
php artisan migrate --seed   # default SQLite (local)
php artisan serve --port=8000
```

Kredensial admin default (dari seeder):
- Email: `admin@rcsscm.test` · Password: `password`

## Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev            # http://127.0.0.1:5173
```

Set `VITE_API_URL` di `frontend/.env` sesuai URL backend.

## Build Production

```bash
cd frontend
npm run build          # hasil di frontend/dist
```

## Status (Sprint 0)
- [x] Backend API + Sanctum auth + RBAC (Spatie) + super admin seed
- [x] Audit Log (observer) + API response & exception handler
- [x] Frontend shell (sidebar, topbar, login, protected routes)
- [ ] Dashboard, CRM, Inventory, Purchasing, Production, Reports, Settings (sprint berikutnya)

Lihat `docs/03-Roadmap-Timeline.md` untuk detail sprint.
