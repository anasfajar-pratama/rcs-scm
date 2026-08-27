# 04 — SYSTEM ARCHITECTURE

**Project:** RCS SCM
**Version:** 1.0
**Date:** 2026-08-27
**Stack:** Laravel 11 API + MySQL + React (Vite, TS) SPA
**Deployment:** Hostinger shared hosting

---

## 1. Arsitektur Umum

```
┌────────────────────────────────────────────────────────┐
│                     BROWSER                            │
│  (React SPA - frontend.rcsscm.com)                     │
└─────────────────────────┬──────────────────────────────┘
                          │ HTTPS (JSON, Bearer Token)
                          ▼
┌────────────────────────────────────────────────────────┐
│                     LARAVEL API                        │
│  (api.rcsscm.com - PHP 8.2)                            │
│                                                         │
│  ┌──────────────┬──────────────┬────────────────────┐  │
│  │ Routing      │ Middleware   │ Controllers        │  │
│  │ (api/v1/*)   │ auth:api     │ (thin)             │  │
│  ├──────────────┼──────────────┼────────────────────┤  │
│  │ Services     │ Repositories │ FormRequests       │  │
│  │ (business    │ (data access)│ (validation)       │  │
│  │  logic)      │              │                    │  │
│  ├──────────────┼──────────────┼────────────────────┤  │
│  │ Eloquent     │ Observers    │ Queues/Jobs        │  │
│  │ (ORM)        │ (audit/stock)│ (notify, import)   │  │
│  │              │              │                    │  │
│  │ Policies/RBAC (Spatie)      │  Scheduler (cron)  │  │
│  └──────────────┴──────────────┴────────────────────┘  │
│                                                         │
│  Postgres──► MySQL (hostinger)   Storage (S3/Files)    │
└────────────────────────────────────────────────────────┘
```

**Komunikasi:** Frontend React memanggil REST API (`/api/v1/*`) dengan **Bearer token (Sanctum)**. Monorepo dengan dua folder terpisah (`backend/`, `frontend/`).

---

## 2. Tech Stack

### Backend
| Layer | Teknologi |
|---|---|
| Framework | Laravel 11 |
| Language | PHP 8.2 |
| DB | MySQL 8 |
| Auth | Laravel Sanctum (`auth:sanctum`) |
| RBAC | Spatie `laravel-permission` |
| Validation | FormRequest + Rule |
| API Docs | Scribe / L5-Swagger |
| Testing | Pest / PHPUnit |
| Queue | Database/Redis queue, scheduler cron (job reorder & expiry) |
| Export | PhpSpreadsheet (Excel/CSV) |

### Frontend
| Layer | Teknologi |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Data Fetching | TanStack Query (React Query) |
| Global State | Zustand |
| Routing | React Router |
| UI | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| HTTP | Axios (interceptor token/refresh/403) |

---

## 3. Struktur Folder (Monorepo)

```
rcs-scm/
├── modul.md
├── docs/
│   ├── 01-BRD.md
│   ├── 02-PRD.md
│   ├── 03-Roadmap-Timeline.md
│   └── 04-System-Architecture.md
├── backend/                  # Laravel 11 (API)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── Models/
│   │   ├── Services/        # business logic
│   │   ├── Repositories/    # data access
│   │   └── Policies/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   └── tests/
└── frontend/                 # React SPA
    ├── src/
    │   ├── api/             # axios + query hooks
    │   ├── components/      # reusable UI
    │   ├── features/        # per-modul (crm, inventory, ...)
    │   ├── layouts/
    │   ├── pages/
    │   ├── stores/          # zustand
    │   └── types/           # TS interfaces
    ├── package.json
    └── vite.config.ts
```

---

## 4. Backend Layer Pattern

- **Controller (thin):** menerima Request, memanggil Service, return JSON (Resource).
- **Service:** business rule (validasi transaksi stok, FEFO, approval, nomor dokumen, dll).
- **Repository:** query data (berpindah ke Eloquent model; jika kompleks gunakan query builder).
- **FormRequest:** validasi + authorize (policy).
- **Resource:** transformasi response (format konsisten).
- **Observer:** audit log + otomatis pembuatan stock movement (via service untuk transaksi penting).

---

## 5. Data Model Utama (Tabel Kunci)

Lihat detail di [02-PRD.md](02-PRD.md) §3. Berikut tabel utama:

```
users, roles, permissions,
companies/settings,
categories, brands, units, products, product_bom (pivot), batches,
price_lists, price_list_lines,
warehouses, locations,
stocks, stock_movements,
transfer_headers/lines, adjustment_headers/lines, reservations/lines,
stock_opname_headers/lines,
suppliers,
pr_headers/lines, rfq_headers/lines, supplier_quotations/lines,
po_headers/lines, receiving_headers/lines, purchase_return_headers/lines,
leads, customers, contacts, opportunities, activities,
quotations/lines, sales_orders/lines,
production_orders/lines,
approval_workflows, approval_steps, approval_logs,
audit_logs
```

### Catatan desain stok & batch
- `stocks` per `(warehouse_id, product_id, batch_id)`; quantity `qty_on_hand`, `qty_reserved`.
- `batches` menyimpan `lot_no`, `mfg_date`, `expiry_date`, `shelf_life_days`, `source_type`, `status`.
- Semua perubahan stok ditulis ke `stock_movements` (immutable, dengan `reference_type`+`reference_id`).

---

## 6. API Design (Contoh Endpoint)

```
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/products                 (filter, pagination, search)
POST   /api/v1/products
PUT    /api/v1/products/{id}
POST   /api/v1/products/import

GET    /api/v1/warehouses/{id}/stocks
GET    /api/v1/stock-movements

POST   /api/v1/transfers
POST   /api/v1/adjustments
POST   /api/v1/stock-opnames

POST   /api/v1/pr
POST   /api/v1/rfqs
POST   /api/v1/quotations            # procurement
GET    /api/v1/quotations/compare
POST   /api/v1/pos
POST   /api/v1/receivings
POST   /api/v1/purchase-returns

GET    /api/v1/leads
POST   /api/v1/leads/{id}/convert
GET    /api/v1/opportunities
GET    /api/v1/pipeline
POST   /api/v1/quotations             # sales
POST   /api/v1/sales-orders

POST   /api/v1/production-orders
POST   /api/v1/batches
GET    /api/v1/batches/trace/{lot_no}

POST   /api/v1/approvals/submit
POST   /api/v1/approvals/{id}/approve
POST   /api/v1/approvals/{id}/reject
GET    /api/v1/audits
```

### Response standar
```json
{
  "success": true,
  "data": { ... },
  "meta": { "pagination": { "total": 0, "page": 1 } }
}
```
Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "field": ["pesan"] }
}
```

---

## 7. Authentication & Authorization

- **Login**: `POST /api/v1/auth/login` → return token + user + permissions + roles.
- **Token storage**: client lewat Axios interceptor; auto-refresh bila 401.
- **RBAC**: middleware `permission:products.create`; policies di Model.
- **Frontend guard**: store permission list di Zustand; hide menu/route yang tidak diizinkan.

---

## 8. Deployment (Hostinger)

### Backend (Laravel API)
1. Upload `backend/` ke folder, mis. `api.rcsscm.com` (subdomain).
2. Root point ke `backend/public/` (atau symlink `public/`).
3. `.env` di production (DB, APP_URL, SANCTUM domain). `php artisan migrate --seed`.
4. `php artisan storage:link`; build cache `config:cache`, `route:cache`.
5. **Scheduler**: setup cron Hostinger untuk `php artisan schedule:run` (jobs reorder & expiry notifications).

### Frontend (React SPA)
1. `npm run build` → folder `dist/`.
2. Upload isi `dist/` ke `frontend.rcsscm.com` (static) atau ke `public_html`.
3. .htaccess rewrite → semua route ke `index.html` (SPA).
4. `.env` frontend → `VITE_API_URL=https://api.rcsscm.com/api/v1`.

### CORS & Domain
- Laravel `config/cors.php` allow origin frontend; `SANCTUM_STATEFUL_DOMAINS` (jika pakai cookie) — default pakai Bearer token, CORS sederhana.

### Backup & Monitoring
- Backup DB harian (cron `mysqldump` / job).
- Logging via Laravel + inspector/telescope bila ringan; monitoring uptime basic.

---

## 9. Security Checklist

- [ ] Password hashing (default).
- [ ] `auth:sanctum` pada semua route modul.
- [ ] Rate limiting di route auth.
- [ ] Policy/RBAC di setiap controller.
- [ ] Validasi & sanitasi input (FormRequest).
- [ ] CORS hanya origin frontend.
- [ ] `.env` tidak diupload; gunakan APP_KEY di server.
- [ ] Audit log untuk data sensitif.
- [ ] Backup terscheduled.

---

**Status: 🟡 DRAFT** — Menjadi referensi setup `Sprint 0`.
