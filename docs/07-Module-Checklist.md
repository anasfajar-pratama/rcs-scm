# 07 — MODULE STATUS & FEATURE CHECKLIST

**Project:** RCS SCM
**Version:** 1.0 · **Date:** 2026-08-28
**Status keseluruhan:** ✅ MVP COMPLETE (Sprint 0–7) + fitur tambahan

> Legend: ✅ Selesai · ⚠️ Sebagian · ❌ Belum ada · (B) Backend API · (F) Frontend UI

---

## Ringkasan Modul

| # | Modul | Status | Sprint | Keterangan |
|---|---|---|---|---|
| 1 | Auth & RBAC | ✅ | S0 | Sanctum login/logout/me, Spatie roles & permissions |
| 2 | Master Data | ✅ | S1 | Product+BOM, Category, Unit, Brand, Price List, Customer, Supplier, Warehouse, Location, Settings |
| 3 | Inventory | ✅ | S2 | Stock engine, Movement, Reservation, Transfer, Adjustment, Opname, Alert |
| 4 | Purchasing | ✅ | S3 | PR, RFQ, Quotation, Comparison, PO, Receiving, Return |
| 5 | CRM | ✅ | S4 | Lead, Customer, Opportunity/Pipeline, Activity, Sales Quotation, Sales Order |
| 6 | Production | ✅ | S5 | Production Order (BOM), Batch/Traceability, Filling & Packing ❌ |
| 7 | Reports & Dashboard | ✅ | S6 | 8 KPI + 8 laporan + export CSV |
| 8 | System | ⚠️ | S7 | Users ✅, Roles (view) ✅, Approval workflow generic ❌, Audit Log ✅, Settings ✅ |

---

## 1. Auth & RBAC (Sprint 0) — ✅

| Fitur | Status | Endpoint / Lokasi |
|---|---|---|
| Login (email + password) | ✅ | POST `/api/v1/auth/login` |
| Logout | ✅ | POST `/api/v1/auth/logout` |
| Me (profil + roles + permissions) | ✅ | GET `/api/v1/auth/me` |
| Token Sanctum | ✅ | personal access token |
| RBAC Spatie (roles, permissions) | ✅ | seeder `RoleAndPermissionSeeder` |
| Role: super-admin, admin, supervisor, sales, warehouse, purchasing, production | ✅ | seeder |
| Audit log (observer) | ✅ | `AuditObserver` — User, master data, CRM, Production Order |
| API response & exception handler | ✅ | `ApiResponse` trait, `ForceJsonResponse` |

---

## 2. Master Data (Sprint 1) — ✅

### Produk
| Fitur | Status | Endpoint |
|---|---|---|
| CRUD Produk | ✅ | `/api/v1/products` |
| Tipe raw material / finished good | ✅ | |
| SKU unik | ✅ | |
| BOM / Formula (komponen + qty) | ✅ | via produk |
| Import Excel | ❌ | (tidak masuk MVP akhir) |
| Batch setting (expiry_required, shelf_life_days) | ✅ | |

### Referensi & Partner
| Fitur | Status | Endpoint |
|---|---|---|
| CRUD Category / Unit / Brand | ✅ | `/categories`, `/units`, `/brands` |
| CRUD Price List + lines | ✅ | `/price-lists` |
| CRUD Customer + Contacts | ✅ | `/customers` |
| CRUD Supplier | ✅ | `/suppliers` |
| CRUD Warehouse / Location | ✅ | `/warehouses`, `/locations` |
| Settings (company, doc prefix, reorder/expiry) | ✅ | `/settings` |

---

## 3. Inventory (Sprint 2) — ✅

| Fitur | Status | Endpoint |
|---|---|---|
| Stock per warehouse + batch | ✅ | GET `/stocks` |
| Summary stok | ✅ | GET `/stocks/summary` |
| Alert expiry & reorder | ✅ | GET `/stocks/alerts` |
| Stock Movement (immutable ledger) | ✅ | GET `/stock-movements` |
| Reserve stok (FEFO) | ✅ | POST `/reservations` |
| Reservation polymorphic (SO) | ✅ | `reservable` → SalesOrder |
| Manual reservation + release | ✅ | POST `/reservations/{id}/release` |
| UI halaman Reservations | ✅ | `/inventory/reservations` |
| Transfer antar gudang (approve → transit → receive) | ✅ | `/transfers/*` |
| Adjustment (gain/loss + approval) | ✅ | `/adjustments/*` |
| Stock Opname (count → post) | ✅ | `/stock-opnames/*` |
| Reorder point & expiry alert | ✅ | dashboard + `/stocks/alerts` |

---

## 4. Purchasing (Sprint 3) — ✅

| Fitur | Status | Endpoint |
|---|---|---|
| PR (manual + auto-suggest reorder) | ✅ | `/pr`, `/pr/suggestions` |
| PR approve/reject | ✅ | `/pr/{pr}/approve` `/reject` |
| RFQ + assign supplier | ✅ | `/rfqs`, `/rfqs/{rfq}/suppliers` |
| RFQ close | ✅ | `/rfqs/{rfq}/close` |
| Supplier Quotation | ✅ | `/supplier-quotations` |
| Quotation accept/reject | ✅ | `/accept` `/reject` |
| **Quotation Comparison** | ✅ | POST `/quotations/compare` + UI modal di RFQ |
| PO + approval workflow | ✅ | `/pos` + `/approve` `/reject` `/cancel` |
| Convert quotation → PO | ✅ | `/quotations/{q}/convert-to-po` |
| Receiving (partial, batch, mfg/expiry → stock) | ✅ | `/receivings` + `/post` |
| Purchase Return | ✅ | `/purchase-returns` + `/post` |

---

## 5. CRM (Sprint 4) — ✅

| Fitur | Status | Endpoint |
|---|---|---|
| CRUD Lead | ✅ | `/leads` |
| Lead status (contacted/qualified/lost) | ✅ | `/leads/{lead}/status` |
| Lead convert → Customer | ✅ | `/leads/{lead}/convert` |
| CRUD Customer + Contacts | ✅ | `/customers` |
| CRUD Opportunity + line items | ✅ | `/opportunities` |
| Pipeline stage (kanban ←/→) | ✅ | `/opportunities/{id}/stage` |
| CRUD Activity (call/email/meeting/task) + done | ✅ | `/activities` + `/done` |
| CRUD Sales Quotation | ✅ | `/sales-quotations` |
| Quotation send/accept/reject | ✅ | `/send` `/accept` `/reject` |
| Quotation → SO (convert) | ✅ | `/convert-to-so` |
| CRUD Sales Order | ✅ | `/sales-orders` |
| SO approve → **reservasi stok FEFO otomatis** | ✅ | `/sales-orders/{so}/approve` |
| SO reject / cancel (release reservasi) | ✅ | `/reject` `/cancel` |
| **SO fulfill / ship (stok berkurang)** | ✅ | `/sales-orders/{so}/fulfill` |

---

## 6. Production (Sprint 5) — ✅ (kecuali Filling & Packing)

| Fitur | Status | Endpoint |
|---|---|---|
| Production Order dari BOM (auto material) | ✅ | `/production-orders` |
| Issue material (FEFO untuk produk ber-batch) | ✅ | `/start` |
| Complete → output batch finished good | ✅ | `/complete` |
| Cancel → kembalikan material ke batch asal | ✅ | `/cancel` |
| Batch / Traceability (MFG, Expiry, status) | ✅ | GET `/batches`, UI `/production/batches` |
| Batch source_type = production | ✅ | |
| Filling & Packing | ❌ | ditandai opsional di roadmap |

---

## 7. Reports & Dashboard (Sprint 6) — ✅

### Dashboard
| Fitur | Status |
|---|---|
| KPI: item stok, nilai stok (HPP) | ✅ |
| KPI: PO terbuka, SO terbuka | ✅ |
| KPI: customers, suppliers | ✅ |
| KPI: pipeline value, jumlah opportunity | ✅ |
| Alert expiry terdekat | ✅ |
| Alert reorder point | ✅ |

### Laporan (semua + Export CSV)
| Laporan | Status | Endpoint |
|---|---|---|
| Inventory (stok per batch + nilai) | ✅ | `/reports/inventory` |
| Mutasi Stok | ✅ | `/reports/stock-movements` |
| Purchasing | ✅ | `/reports/purchasing` |
| Sales | ✅ | `/reports/sales` |
| Production | ✅ | `/reports/production` |
| Customers | ✅ | `/reports/customers` |
| Pipeline (per stage) | ✅ | `/reports/pipeline` |
| Expiry (default 90 hari) | ✅ | `/reports/expiry` |

---

## 8. System (Sprint 7) — ⚠️

| Fitur | Status | Endpoint |
|---|---|---|
| CRUD User + role assignment | ✅ | `/users` |
| List roles + permissions | ✅ | `/roles`, `/permissions` |
| UI halaman Users | ✅ | `/users` |
| UI kelola Roles & Permissions (edit) | ❌ | hanya read-only via API |
| Audit Log | ✅ | observer + tabel `audit_logs` |
| UI lihat Audit Log | ❌ | API/data ada, belum ada halaman |
| Approval workflow generic (approval_steps) | ❌ | approval hardcoded per dokumen |
| Settings UI | ✅ | `/settings` |
| Seed demo data (UAT) | ✅ | `DemoSeeder` (bisa dimatikan `SEED_DEMO=false`) |
| Toast feedback UI | ✅ | `ToastProvider` |
| User manual | ✅ | `docs/05-User-Manual.md` |
| Panduan deploy Hostinger | ✅ | `docs/06-Deployment-Hostinger.md` |

---

## 9. Fitur Tambahan (di luar roadmap sprint)

| Fitur | Status |
|---|---|
| SO Shipment/fulfillment | ✅ |
| Reservations UI | ✅ |
| User & Role management | ✅ |
| Quotation Comparison UI | ✅ |
| Perbaikan bug: `allocateForShipment` tidak mengurangi `qty_reserved` | ✅ |

---

## 10. Pengujian Otomatis

| Test | Status | Jumlah |
|---|---|---|
| `MasterDataApiTest` | ✅ | 6 |
| `PurchasingFlowTest` | ✅ | 5 |
| `StockEngineTest` | ✅ | 6 |
| `SalesFlowTest` | ✅ | 7 |
| `ProductionFlowTest` | ✅ | 3 |
| `ReportsTest` | ✅ | 4 |
| **Total** | ✅ | **31 test / 179 assertions** (33 test per run terakhir) |

> Catatan: `php artisan test` terakhir mencatat **33 passed (179 assertions)**.

---

## 11. Pending / Rekomendasi Berikutnya

| Item | Prioritas | Catatan |
|---|---|---|
| UAT dengan user (data demo) | Tinggi | `php artisan db:seed --force`, login `admin@rcsscm.test` |
| Deploy Hostinger | Tinggi | ikuti `docs/06-Deployment-Hostinger.md` |
| Commit git semua pekerjaan | Tinggi | belum ada commit untuk Sprint 4–7 |
| UI Audit Log | Sedang | data sudah ada di tabel |
| UI Roles & Permissions edit | Sedang | backend read-only saat ini |
| Filling & Packing | Rendah | opsional, butuh spesifikasi |
| Import Excel | Rendah | opsional |
| Approval workflow generic | Rendah | perubahan arsitektur |
