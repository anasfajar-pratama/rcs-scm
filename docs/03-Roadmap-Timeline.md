# 03 — ROADMAP & TIMELINE PEMBUATAN APLIKASI

**Project:** RCS SCM
**Version:** 1.0
**Date:** 2026-08-27
**Developer:** Solo
**Deployment:** Hostinger (Laravel API + MySQL + React static build)

> Estimasi total: **≈ 4–5 bulan (≈ 18–22 minggu)** untuk seluruh MVP (Master Data, Inventory, Purchasing, CRM, Production, Reports, Dashboard, RBAC, Approval).

---

## 1. Prinsip Pelaksanaan

- **Backend (Laravel API) & Frontend (React) dikembangkan paralel** per sprint (mobile-first untuk frontend). 
- Setiap sprint berakhir dengan **produk yang bisa diuji** (incremental).
- Urutan disusun agar **modul hulu (master data) selesai lebih dulu**, karena modul lain bergantung padanya.
- **Production/BOM + Batch** dimasukkan sejak sprint master data (karena menyentuh struktur product & stock).

---

## 2. Sprint Plan

### Sprint 0 — Setup & Fondasi (± 1 minggu)
- Setup monorepo: `backend/` (Laravel 11) + `frontend/` (Vite + React + TS).
- Environment Local (Docker/Laragon), MySQL.
- Auth **Laravel Sanctum** (register/login/logout/me/refresh), RBAC **Spatie** (roles, permissions, middleware), seed super admin.
- Audit Log observer + global exception/response handler.
- CORS, API versioning, pagination & filter helper.
- Struktur folder & coding standard, CI config (deploy).

### Sprint 1 — Master Data (± 2 minggu)
- **Product**: CRUD, tipe raw/finished, batch setting (expiry_required, shelf_life_days), SKU unik, import Excel.
- **Category / Unit / Brand** CRUD.
- **Price List** + lines.
- **BOM/Formula** builder (finished good → komponen raw material + qty).
- **Customer** CRUD (+ Contacts).
- **Supplier** CRUD.
- **Warehouse / Location** CRUD.
- **Settings** (company, currency, format nomor, parameter reorder/expiry).
- Frontend: module UI + list + form + import.

### Sprint 2 — Inventory Core (± 3 minggu)
- **Stock** (per warehouse + batch) & **Stock Movement** (engine transaksional, immutable, reversal).
- **Reservation** engine (FEFO) + integrasi otomatis dari Sales Order.
- **Transfer** antar gudang (approval + in-transit + received).
- **Adjustment** (gain/loss) + approval workflow.
- **Stock Opname** (count → post → adjustment).
- **Reorder point & expiry alert** (+ queue notification).
- Frontend: item stok matrix, movemen ledger, transfer/adjust/opname UI.

### Sprint 3 — Purchasing (± 3 minggu)
- **PR** (manual + auto-suggest dari reorder).
- **RFQ** → **Supplier Quotation** → **Quotation Comparison**.
- **PO** + **approval workflow**.
- **Receiving** (partial, per batch, input mfg/expiry → update stock).
- **Purchase Return**.
- Frontend: alur wizard PR→RFQ→PO, receiving UI, approval inbox.

### Sprint 4 — CRM (± 3 minggu)
- **Leads** (kualifikasi, convert → Customer).
- **Opportunities** + **Sales Pipeline** (kanban stages).
- **Activities** (tugas/follow-up).
- **Quotation (sales)** → **Sales Order**.
- Integrasi: SO approved → **Reservation** (Sprint 2 sudah disiapkan).
- Frontend: pipeline kanban, form percakapan, dashboard sales.

### Sprint 5 — Production (± 2–3 minggu)
- **Production Order** (dari BOM, make-to-stock).
- Issue raw material (movement keluar) + output finished good **batch baru** (MFG/Expiry/Shelf life).
- **Filling & Packing** (opsional).
- **Batch/Traceability** view (rekap batch & status expiry).
- Frontend: production order form + batch timeline.

### Sprint 6 — Reports & Dashboard (± 2 minggu)
- Dashboard: KPI (stok, pipeline value, PO outstanding, produksi, reorder & expiry alerts).
- Laporan: Inventory (stock card, per batch, expiry report), Purchasing, Supplier, Customer, Sales, Production.
- Export **Excel/CSV**.
- Frontend: chart (Recharts) + laporan + filter.

### Sprint 7 — Polishing, UAT & Deploy (± 1–2 minggu)
- UI/UX polish, loading/empty/error states, RBAC fine-tune.
- Seed data demo, UAT bersama user, bugfix & feedback.
- Deploy **Hostinger**: build frontend → static upload; deploy API; setup subdomain & CORS; backup & monitoring.
- Dokumentasi pengguna + admin.

---

## 3. Timeline Kalender (Estimasi)

| Minggu | Sprint | Fokus |
|---|---|---|
| 1 | S0 | Setup, auth, RBAC |
| 2–3 | S1 | Master data |
| 4–6 | S2 | Inventory core |
| 7–9 | S3 | Purchasing |
| 10–12 | S4 | CRM |
| 13–14 | S5 | Production |
| 15–16 | S6 | Reports & Dashboard |
| 17–18 | S7 | Polishing, UAT, Deploy |

> Catatan: minggu bisa bergeser tergantung feedback & revisi approval. disarankan jadwalkan **1 minggu buffer** di akhir.

---

## 4. Deliverable per Fase

| Fase | Deliverable |
|---|---|
| S0 | Repo, auth, RBAC, CI, struktur |
| S1 | Master data lengkap + BOM + batch setting |
| S2 | Engine stok + reservasi + transfer/adjust/opname + alert |
| S3 | Alur purchasing penuh (PR→PO→Receiving) |
| S4 | CRM penuh + pipeline + SO→reservasi |
| S5 | Production order + batch + traceability |
| S6 | Dashboard + semua laporan |
| S7 | Release production di Hostinger + dokumen user |

---

## 5. Dependensi & Risiko

| Tipe | Item | Mitigasi |
|---|---|---|
| Kritis | Engine stok & reservasi (S2) | Bangun engine movement transaksional & test-in-depth lebih awal |
| Kritis | BOM & batch menyentuh produk/stok | Masukkan desain batch sejak S1, bukan retrofit Saat produksi |
| Risiko | Approval workflow fleksibel | Gunakan struktur generic `approval_steps`; seed workflow default |
| Risiko | User feedback lambat | Milestone demo tiap 2 minggu |
| Produksi | Hostinger shared hosting vs scheduler | Gunakan cron yg tersedia (scheduler via `crontab`) untuk queue/jobs |

---

**Status: 🟡 DRAFT** — Referensi utama: [01-BRD.md](01-BRD.md), [02-PRD.md](02-PRD.md), [04-System-Architecture.md](04-System-Architecture.md).
