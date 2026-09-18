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
│   ├── 01..06-*.md
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

## Status (Sprint 7 — MVP Complete)

- [x] Sprint 0 — Setup, auth, RBAC, audit log, frontend shell
- [x] Sprint 1 — Master data (product+BOM, category/unit/brand, price list, customer, supplier, warehouse, settings)
- [x] Sprint 2 — Inventory core (stock engine, reservasi FEFO, transfer, adjustment, opname, alert)
- [x] Sprint 3 — Purchasing (PR → RFQ → Quotation → PO → Receiving → Return)
- [x] Sprint 4 — CRM (leads, pipeline kanban, activities, sales quotation → SO + reservasi)
- [x] Sprint 5 — Production (production order dari BOM, issue material FEFO, output batch, traceability)
- [x] Sprint 6 — Reports & Dashboard (8 KPI + 8 laporan + export CSV)
- [x] Sprint 7 — Polishing, seed demo, toast feedback, dokumentasi user & deploy

Lihat `docs/03-Roadmap-Timeline.md` untuk detail sprint, `docs/05-User-Manual.md` untuk panduan penggunaan, dan `docs/06-Deployment-Hostinger.md` untuk deploy.
