# 02 — PRODUCT REQUIREMENT DOCUMENT (PRD)

**Project:** RCS SCM
**Version:** 1.0
**Status:** 🟡 DRAFT
**Base on:** 01-BRD.md
**Date:** 2026-08-27

> **Sign-off (Approval)**
> | Peran | Nama | Tanggal | Tanda Tangan |
> |---|---|---|---|
> | Produk Pemilik | | | |
> | Developer | | | |

---

## 1. Tujuan Dokumen

Dokumen ini menjabarkan **spesifikasi fungsional** setiap modul + **skema data (ERD)** + **business rules detail**, sebagai kontrak antara user dan developer. Menjadi dasar implementasi di [04-System-Architecture.md](04-System-Architecture.md).

---

## 2. Spesifikasi Fungsional per Modul

### 2.1 SYSTEM

#### Users, Roles, Permissions
- **Users**: email unik, password (hash), status `active/inactive`, assign 1+ roles.
- **Roles**: nama, guard, deskripsi; assign banyak permissions.
- **Permissions**: point (modul.aksi), di-seed.
- UI: CRUD user, role, permission; role berinteraksi via permission-picker; prevent lockout super admin.
- **API:** `GET/POST/PUT/DELETE /api/users`, `/api/roles`, `/api/permissions`.

#### Approval Workflow
- Konfigurable multi-level. Tipe approval MVP: **Purchase Order**, **Stock Adjustment**.
- Struktur: dokumen → level approver → keputusan `approve/reject/return`.
- Status dokumen: `Draft → Pending Approval → Approved / Rejected`.
- API: `POST /api/approvals/{doc}/submit`, `approve`, `reject`.
- Auditor: siapkan `approval_steps` (sequence, min role, order), `approval_logs`.

#### Audit Log
- Catat: actor, action, model, model_id, old/new data, ip, user_agent, created_at.
- Implementasi: Model Observer / event listener; API `GET /api/audits` + filter.

#### Settings
- Company profile (nama, alamat, logo), currency, timezone, format nomor dokumen per tipe, reorder/expiry parameters.

---

### 2.2 PRODUCT

#### Product
- Fields: `sku` (unique), `barcode`, `name`, `type` (`raw_material` | `finished_good`), `category_id`, `brand_id`, `unit_id`, `base_unit`, `cost`, `sale_price`, `is_active`, `track_batch` (bool), `shelf_life_days`, `expiry_required` (bool), `reorder_point`, `reorder_quantity`, `safety_stock`, `image`, `description`, `ingredients` (JSON).
- **BOM** (untuk finished_good): list komponen (raw_material) + quantity per unit output.
- API CRUD; import/export Excel.

#### Category / Unit / Brand
- Simple master data CRUD; `is_active`.

#### Price List / Price List Lines
- `price_list` (nama, type e.g. `default` | `customer_group`), lines per product: `price`.
- Sales mengambil harga dari price list terpilih; fallback ke `sale_price`.

#### Batch/Lot Setting
- Per produk: `expiry_required`, `shelf_life_days`. Saat produksi/receiving, batch dibuat dengan `mfg_date`, `expiry_date` (dihitung otomatis = mfg + shelf_life bila tidak diisi), `lot_no`, `batch_status`.

---

### 2.3 INVENTORY

#### Warehouse / Location
- `warehouse`: name, code, address, `is_active`. `location`: warehouse_id, name, code, is_active.

#### Stock
- Struktur stok per **Warehouse + Product + Batch**: `qty_on_hand`, `qty_reserved`, `qty_available` (on_hand − reserved).
- Tidak disimpan sebagai jumlah mentah tunggal; dihitung dari movements (materialized / trigger).

#### Stock Movement
- `type`: `receiving`, `issue`, `transfer_in`, `transfer_out`, `adjustment`, `production_output`, `production_issue`, `consumption`, `opname`.
- Fields: product, batch, warehouse, qty (signed), reference (doc type+id), cost, notes, created_by.
- **Immutable** — penghapusan hanya via reverse/adjustment.

#### Transfer
- Header: `from_warehouse`, `to_warehouse`, status di-approve → `Pending → Approved → In Transit → Received`.
- Lines: product, batch, qty. Saat terkirim → debit dari, sahat diterima → kredit ke.

#### Adjustment
- Header: `type` (gain/loss), alasan/category, tanggal, status approval (approval wajib).
- Lines: product, batch, warehouse, qty_diff, reason. Saat approved → movement + stock update.

#### Reservation
- Dibuat otomatis dari **Sales Order** approved. Lines: product, batch (FEFO), warehouse, qty.
- Status: `reserved`, `partially_shipped`, `released`. Pembatalan SO → release reservation.
- FisikFEFO: pilih batch dengan expiry terdekat (First Expired First Out).

#### Stock Opname
- Header: warehouse, tanggal, status. Lines: product, batch, `qty_system`, `qty_count`, `qty_diff`.
- Posting → membuat adjustment (gain/loss) & movement; approval opsional per konfigurasi.

#### Reorder / Expiry Alert
- Rule: stok available ≤ reorder_point → generate notifikasi + sarankan PR.
- Rule: batch dengan `expiry_date` dalam N hari (config) → status `expire_soon`; sudah lewat → `expired`.

---

### 2.4 PURCHASING

Flow: **PR → RFQ → Quotation → Comparison → PO → Receiving → (Return)**.

> Catatan relasi: PR bisa opsional; juga RFQ & Quotation bersifat opsional (flexible). PO & Receiving wajib.

#### Supplier
- Fields: name, code, tax_id, contact (email, phone), address, payment terms, currency, status aktif.

#### Purchase Requisition (PR)
- Header: `pr_no`, requested_by, department, tanggal needed, status (`draft/pending/approved/rejected`), catatan.
- Lines: product, qty, preferred_supplier (opsional), harga estimasi, note.
- Barang dari kebutuhan stok (reorder) atau permintaan manual.

#### RFQ (Request For Quotation)
- Header: `rfq_no`, PR ref (opsional), deadline, status. Lines: product, qty, target_price.
- Link ke beberapa supplier → masing-masing menerima untuk di-quote.

#### Supplier Quotation
- Per supplier: `quotation_no`, harga per line, min order, HPP, valid until, term. Menyimpan PDF/attachment opsional.
- API input manual (per supplier) atau diimpor.

#### Quotation Comparison
- Grid membandingkan penawaran per line (price, lead time, total). Menampilkan rekomendasi terbaik & selisih vs target price.
- Hasil memilih supplier → men-generate **PO** (draft).

#### Purchase Order (PO)
- Header: `po_no`, supplier_id, quotation ref (opsional), currency, status (`draft/pending/approved/partially_received/received`), inkoterm/keterangan, payment term.
- Lines: product, qty, price, tax, discount, expected date.
- **Approval wajib** sebelum bisa receiving.

#### Receiving
- Header: po id, warehouse, tanggal, status. Lines: po_item, product, qty_received, batch lot, mfg_date, expiry_date.
- Validasi: qty_received tidak boleh melebihi qty yg belum diterima (over-delivery bisa di-allow dengan config).
- Posting → movement type `receiving` + update stock (per batch). Mendukung partial receiving.

#### Purchase Return
- Header: receiving/supplier ref, reason, status. Lines: product, batch, qty, reason.
- Posting → movement keluar.

---

### 2.5 CRM

#### Leads
- Fields: name, company, contact info (email phone), source, status (`new/contacted/qualified/lost`), score, assigned_to, note.
- Convert Lead → Customer (opsional) &/atau create Opportunity.

#### Customers
- Fields: code, name, type (`b2b/distributor/retail`), default_price_list, contact info, billing/shipping address, credit limit, tax_id, active.

#### Contacts
- Per customer: name, email, phone, role/jabatan, is_primary.

#### Opportunities
- Fields: title, customer_id, value, stage (`prospecting/qualification/proposal/negotiation/closed_won/closed_lost`), probability, expected_close_date, assigned_to, note.
- Pipeline board (Kanban) berdasarkan stage.

#### Activities
- Fields: type (`call/meeting/email/task`), subject, due_date, status, related model (lead/customer/opportunity), assignee.

#### Quotation (Sales)
- Header: `quote_no`, customer_id, opportunity ref, price_list, valid_until, status (`draft/sent/approved/rejected`).
- Lines: product, qty, price, discount, tax.
- Convert approved Quotation → **Sales Order**.

#### Sales Order
- Header: `so_no`, customer, quote ref, order_date, status (`draft/approved/partially_delivered/delivered/cancelled`).
- Lines: product, qty, price, warehouse.
- Saat **approved** → create **Reservation** + kurangi available.
- Optionally trigger Production Order bila stok FG kurang (config MTS).

---

### 2.6 PRODUCTION

#### BOM / Formula
- Per finished_good product: version, output qty, lines (raw_material product, qty per line, note), `is_active`.

#### Production Order
- Header: `po_prod_no`, product (finished_good), qty, warehouse (barang jadi masuk), bill material ref, planned date, status (`draft/planned/in_progress/completed/cancelled`).
- Lines: output + komponen (autogenerated dari BOM, bisa di-override).

#### Batch/Lot & Traceability
- Saat **Completed**: sistem mengeluarkan issue raw material (movemen keluar) dan memasukkan finished good sebagai **batch baru**.
- Batch fields: `lot_no`, product_id, `mfg_date`, `expiry_date`, `shelf_life_days`, `qty`, warehouse, `batch_status`, note, `source_type` (`production` | `receiving`).
- **MFG date, Expiry date, Shelf life** wajib didokumentasikan & diisi; expiry dihitung otomatis bila kosong.

#### Filling & Packing
- Opsional: bagan output akhir per batch (dibagi) + label; dicatat sebagai movement.

---

## 3. ERD / Skema Data (Ringkas)

Legend: `1`↔`N`, `N`↔`M` (pivot). `FK` → foreign key.

```
users ─N─ roles ─N─ permissions (user_has_roles, role_has_permissions)
companies / settings

categories ─1─N─ products ─N─1─ brands, units
products ─1─N─ bom_lines     (komponen, pivot product_bom)
products ─1─N─ price_list_lines ─N─1─ price_lists
products ─1─N─ batches

warehouses ─1─N─ locations

products ─1─N─ stocks (warehouse_id + product_id + batch_id)
stocks ─1─N─ stock_movements
stock_movements ─N─1─ (reference docs: transfers, adjustments, receivings, productions, reservations)

transfer_headers ─1─N─ transfer_lines
adjustment_headers ─1─N─ adjustment_lines
reservations ─1─N─ reservation_lines
stock_opname_headers ─1─N─ stock_opname_lines

suppliers ─1─N─ pr_headers ─1─N─ pr_lines
rfq_headers ─1─N─ rfq_lines ─N─M─ suppliers
supplier_quotations ─1─N─ quotation_lines
po_headers ─1─N─ po_lines ─1─N─ receiving_headers ─1─N─ receiving_lines
purchase_return_headers ─1─N─ purchase_return_lines

leads ─1─1─ customers
customers ─1─N─ contacts
customers ─1─N─ opportunities ─1─N─ activities
customers ─1─N─ quotations ─1─N─ quotation_lines
quotations ─1─1─ sales_orders ─1─N─ sales_order_lines

products ─1─N─ production_orders ─1─N─ production_order_lines
batches ─1─N─ (melacak sumber produksi/receiving)

approval_workflows ─1─N─ approval_steps ─1─N─ approval_logs
audit_logs
```

---

## 4. Business Rules Detail (Field & Validasi)

1. **Produk**: `sku` dan `barcode` unik; `cost` ≥ 0; `shelf_life_days` wajib bila `expiry_required = true`.
2. **Batch**: `lot_no` unik per produk; `expiry_date` = `mfg_date + shelf_life_days` bila kosong; **expiry tidak boleh < mfg_date**.
3. **Stok**: `qty_available = qty_on_hand - qty_reserved`; **tidak pernah negative** (validasi pada saat reservasi/issue).
4. **Reservasi**: pilih batch FEFO (expiry terdekat); saat SO selesai/kirim → batch reservation di-release.
5. **SOCreation**: hanya dari `customer` aktif; total = sum(lines) − discount + tax.
6. **PR/PO**: qty > 0; harga ≥ 0; PO tidak bisa diedit setelah approved (kecuali via change order).
7. **Receiving**: qty_received ≤ remaining qty PO (kecuali over-delivery di-allow); mfg/expiry wajib untuk produk `track_batch`.
8. **Adjustment**: `qty_diff` ≠ 0; wajib alasan; wajib approval.
9. **Production Order**: output qty > 0; komponen wajib ada BOM; saat completed, isi stok finished good per batch & kurang stok raw material.
10. **Approval**: dokumen `draft` → `pending` → `approved`; reject otomatis menyimpan comment ke log; hanya approver yang berwenang pada step tersebut.

---

## 5. Status Lifecycle (Ringkasan)

| Dokumen | Lifecycle |
|---|---|
| PR | draft → pending approval → approved → (po_reference) |
| RFQ | draft → sent → closed |
| Quotation (procurement) | draft → sent → accepted |
| PO | draft → pending → approved → partially_received → received |
| Receiving | draft → posted |
| Quotation (sales) | draft → sent → approved → converted(SO) |
| Sales Order | draft → approved → partially_delivered → delivered → cancelled |
| Production Order | draft → planned → in_progress → completed → cancelled |
| Transfer | pending → approved → in_transit → received |
| Adjustment | draft → pending → approved |
| Stock Opname | draft → counted → posted |
| Reservation | reserved → released / shipped |

---

## 6. Non-Functional Requirements (Backend)

- **API**: REST JSON, akses via **Laravel Sanctum** (token/bearer), versioned `/api/v1/*`.
- **Validasi**: FormRequest + Rule; response error standar `{message, errors}`.
- **Auth/RBAC**: Spatie `laravel-permission`; middleware `role`/`permission`; policies per model.
- **Event/Queue**: movements, notification reorder & expiry via queue (jobs).
- **Audit**: model observers (created/updated/deleted) → `audit_logs`.
- **Dokumentasi API**: OpenAPI/Swagger (Laravel `L5-Swagger`/`scribe`).
- **Testing**: Pest/PHPUnit; feature test per modulus.

---

**Status: 🟡 DRAFT** — lanjut ke [03-Roadmap-Timeline.md](03-Roadmap-Timeline.md) setelah approve.
