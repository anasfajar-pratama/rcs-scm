# 01 — BUSINESS REQUIREMENT DOCUMENT (BRD)

**Project:** RCS SCM — Integrated Inventory, Purchasing & CRM System
**Company:** Perusahaan Produksi Skincare
**Version:** 1.0
**Status:** 🟡 DRAFT — Menunggu Review & Approval
**Date:** 2026-08-27

> **Sign-off (Approval)**
> | Peran | Nama | Tanggal | Tanda Tangan |
> |---|---|---|---|
> | Produk Pemilik | | | |
> | Tim Operasional (Gudang) | | | |
> | Tim Sales (CRM) | | | |
> | Tim Purchasing | | | |
> | Tim Produksi | | | |
> | Kepala/Spv | | | |

---

## 1. Ringkasan Eksekutif

PT **[Nama Perusahaan]** adalah perusahaan yang **memproduksi produk skincare secara mandiri** dan menjualnya kepada pelanggan (B2B — distributor/retail/affiliate). Saat ini proses pendataan produk, stok, pembelian, dan pelanggan masih manual/terpisah sehingga sering terjadi:

- **Kesalahan & selisih stok** karena tidak ada pencatatan stok per gudang dan per batch.
- **Produk melewati tanggal kadaluarsa** tidak terdeteksi karena tidak ada pelacakan batch & expiry.
- **Data pelanggan & pipeline sales tersebar** (Excel/catatan pribadi), sulit diperkirakan penjualan & metankan follow-up.
- **Proses pembelian lambat** — permintaan → penawaran → PO dilakukan lintas email/chat tanpa alur approval yang jelas.
- **Perencanaan produksi tidak terhubung** dengan stok & penjualan (mudah over/under stock).

RCS SCM adalah sebuah sistem terintegrasi (CRM + Inventory + Purchasing + Production) yang menyatukan seluruh aluran data dari **penjualan → produksi → stok → pengadaan** dalam satu aplikasi berbasis web, sehingga setiap fungsi (Sales, Gudang, Purchasing, Produksi, Keuangan) melihat data yang sama dan dapat dipertanggungjawabkan.

**Tujuan utama:**
1. Memiliki **sumber data tunggal** (single source of truth) untuk produk, stok, batch, pelanggan, dan pemasok.
2. Mengurangi **selisih stok** dan **penurunan mutu produk** melalui pelacakan batch + tanggal kadaluarsa.
3. **Menutup loop penjualan** dari lead sampai sales order, dengan reservasi stok otomatis.
4. **Mempercepat & mengontrol pengadaan** dengan alur PR → RFQ → Quotation → PO → Receiving.
5. **Mendukung keputusan** lewat dashboard & laporan terintegrasi.
6. **Prinsipe ekspor-produk (BPOM/Kementerian)** siap melalui data batch & komposisi yang terstruktur.

---

## 2. Konteks Bisnis & Isu Saat Ini

| Area | Kondisi Saat Ini | Masalah |
|---|---|---|
| Produk | Katalog tercatat di spreadsheet terpisah | Tidak ada pembedaan raw material vs finished good, tidak ada formula (BOM) |
| Stok | Dihitung manual / estimasi | Selisih sering, tidak tahu stok per batch & yang hampir expiry |
| Produksi | Berdasarkan feeling permintaan | Tidak terhubung ke stok & sales, kekurangan bahan baku sering |
| Penjualan | Data customer & follow-up di Excel/WA | Pipeline tidak terlihat, kualitas follow-up tidak konsisten |
| Pembelian | Permintaan via chat, approval via email | Lambat, tanpa audit trail, tidak ada komparasi penawaran |
| Pelaporan | Manual recount | No. reorder-point & data kadaluarsa-prediksi tidak otomatis |

---

## 3. Business Flow (Alur Bisnis End-to-End)

```
┌─────────────── CRM / SALES ───────────────┐
│ Lead → Customer → Opportunity → Quotation │
│                                            │
│              (out)  Quotation → Sales Order │
└───────────────────┬────────────────────────┘
                    │ Sales Order ter-approved
                    ▼
        ┌──Stok Finished Good cukup?──┐
        │ YES                         │ NO
        ▼                             ▼
   RESERVASI stok (per batch)    PICU Production Order (make-to-stock)
                                   │
                                   ▼
        ┌────────────── PRODUCTION ──────────────┐
        │ BOM/Formula: Raw Material → Kegunaan   │
        │ Issue Raw Material (stok keluar)       │
        │ Produksi batch baru → Finished Good    │
        │ Set MFG Date, Expiry, Shelf Life (PAO) │
        └──────────────┬─────────────────────────┘
                       │ stok FG + batch masuk
                       ▼
        ┌────────────── INVENTORY ──────────────┐
        │ Stock per Warehouse + Batch (FEFO)    │
        │ Movement / Transfer / Adjustment      │
        │ Stock Opname · Reorder Point          │
        └──────────────┬────────────────────────┘
                       │ stok < reorder point / bahan baku kurang
                       ▼
        ┌────────────── PURCHASING ─────────────┐
        │ PR → RFQ → Quotation → Komparasi → PO │
        │ Receiving (stok masuk per batch)      │
        │ Purchase Return                       │
        └───────────────────────────────────────┘
```

---

## 4. Scope

### 4.1 In-Scope (Termasuk dalam sistem)

| Modul | Cakupan |
|---|---|
| **Dashboard** | KPI, ringkasan stok, sales, purchasing, produksi, reorder & expiry alert |
| **CRM** | Leads, Customers, Contacts, Opportunities, Activities, Sales Pipeline, Quotation, Sales Order |
| **Product** | Products (raw material & finished good), Categories, Units, Brands, Price Lists, BOM/Formula |
| **Inventory** | Warehouses, Locations, Stock, Stock Movement, Transfer, Adjustment, Reservation, Stock Opname |
| **Purchasing** | Suppliers, Purchase Requisition (PR), RFQ, Supplier Quotation, Quotation Comparison, Purchase Order (PO), Receiving, Purchase Return |
| **Production** | BOM/Formula, Production Order, Batch/Lot (MFG date, Expiry date, Shelf life/PAO), Filling & Packing |
| **Report** | Inventory, Purchasing, Supplier, Customer, Sales, Production |
| **System** | Users, Roles, Permissions, Approval Workflow, Audit Log, Settings |

### 4.2 Out-of-Scope (di luar MVP pertama)

- Modul **Finance/Accounting** penuh (GL, jurnal, AR/AP) — hanya struktur data order yang dibutuhkan.
- **Integrasi e-commerce/online shop** otomatis.
- **Kalkulasi harga & costing otomatis penuh** (harga dihitung manual, display saja).
- **Produksi semi-otomatis dengan mesin IoT** (data produksi diinput manual).
- Pemrosesan **BPOM e-register** (sistem hanya menyiapkan data batch & komposisi).

---

## 5. User Roles (Actor)

| Role | Deskripsi | Modul Akses |
|---|---|---|
| **Super Admin** | Kelola user, role, permission, settings | Semua |
| **Spv/Supervisor** | Approval & oversight, lihat semua | Dashboard, Approval, Report, Audit |
| **Sales (CRM)** | Kelola lead, customer, opportunity, quotation, sales order | CRM, Product (baca), Inventory (baca stok) |
| **Gudang** | Terima SO/reservasi, transfer, adjustment, stock opname, receiving | Inventory, Purchasing (Receiving) |
| **Purchasing** | PR, RFQ, quotation, komparasi, PO | Purchasing, Product (baca), Inventory (baca) |
| **Produksi** | BOM, production order, laporan batch | Product, Production, Inventory (baca) |
| **Keuangan** | Review order & purchase untuk pembayaran | CRM, Purchasing, Report |

---

## 6. Module Map & User Stories (Prioritas MoSCoW)

Legend: **M** = Must (MVP inti), **S** = Should, **C** = Could, **W** = Won't (MVP ini)

### 6.1 CRM
| Story | Prioritas |
|---|---|
| Sebagai Sales, saya bisa membuat & mengkualifikasi **Lead** | **M** |
| Sebagai Sales, saya bisa mengonversi Lead → **Customer** | **M** |
| Sebagai Sales, saya bisa mengelola beberapa **Contact** per Customer | **S** |
| Sebagai Sales, saya bisa membuat & menggerakkan **Opportunity** di pipeline (stages) | **M** |
| Sebagai Sales, saya bisa mencatat **Activity** (call, meeting, email, tugas) | **S** |
| Sebagai Sales, saya bisa membuat **Quotation** dari Opportunity | **M** |
| Sebagai Sales, saya bisa mengubah Quotation approved → **Sales Order** | **M** |
| Sebagai Sales, saya bisa melihat & menyaring **Sales Pipeline** (dashboards/stages) | **S** |
| Sebagai Sistem, SO approved memicu **Reservasi stok** otomatis | **M** |

### 6.2 Product
| Story | Prioritas |
|---|---|
| Sebagai Admin, saya bisa membuat **Product** bertipe **Raw Material** atau **Finished Good** | **M** |
| Sebagai Admin, saya bisa mengelola **Category, Unit, Brand** | **M** |
| Sebagai Admin, saya bisa membuat **Price List** per customer group | **S** |
| Sebagai Produksi, saya bisa membuat **BOM/Formula** (Finished Good dari Raw Material) | **M** |
| Sebagai Admin, saya bisa set **batch setting** per produk (shelf life, perlu expiry) | **M** |

### 6.3 Inventory
| Story | Prioritas |
|---|---|
| Sebagai Gudang, saya bisa melihat **Stock** per Warehouse + per **Batch** | **M** |
| Sebagai Gudang, saya bisa mencatat **Stock Movement** (masuk/keluar otomatis) | **M** |
| Sebagai Gudang, saya bisa melakukan **Transfer** antar gudang | **M** |
| Sebagai Gudang, saya bisa melakukan **Adjustment** stok (approval required) | **M** |
| Sebagai Sistem, **Reservation** stok dibuat dari Sales Order | **M** |
| Sebagai Gudang, saya bisa **Stock Opname** (hitung fisik) | **S** |
| Sebagai Sistem, saya memberi **notifikasi reorder point** & stok hampir **expiry** | **M** |

### 6.4 Purchasing
| Story | Prioritas |
|---|---|
| Sebagai User, saya bisa membuat **Purchase Requisition (PR)** | **M** |
| Sebagai Purchasing, saya bisa membuat **RFQ** ke beberapa supplier | **M** |
| Sebagai Supplier (ekspor) / Purchasing, saya bisa input **Supplier Quotation** | **M** |
| Sebagai Purchasing, saya bisa membandingkan penawaran (**Quotation Comparison**) | **M** |
| Sebagai Purchasing, saya bisa membuat **Purchase Order (PO)** — perlu **Approval** | **M** |
| Sebagai Gudang, saya bisa **Receiving** PO (stok masuk + batch + expiry) | **M** |
| Sebagai Purchasing, saya bisa **Purchase Return** | **S** |

### 6.5 Production
| Story | Prioritas |
|---|---|
| Sebagai Produksi, saya bisa membuat **Production Order** (Finished Good) | **M** |
| Sebagai Sistem, PO produksi melakukan **Issue raw material** (stok keluar) | **M** |
| Sebagai Sistem, produksi selesai menghasilkan **batch baru** finished good dengan MFG & Expiry date | **M** |
| Sebagai Produksi, saya bisa mencatat **Filling & Packing** (opname batch) | **S** |
| Sebagai Produksi, saya bisa melacak **batch** (traceability) | **S** |

### 6.6 System
| Story | Prioritas |
|---|---|
| Sebagai Admin, saya bisa mengelola **User, Role, Permission** | **M** |
| Sebagai Sistem, saya menyediakan **Approval Workflow** (PO, Stock Adjustment — approver multi-level) | **M** |
| Sebagai Sistem, saya mencatat **Audit Log** (siapa/apa/kapan/di mana) | **M** |
| Sebagai Admin, saya bisa mengelola **Settings** (perusahaan, terfakhid, dokumentasi) | **M** |

---

## 7. Business Rules (Aturan Bisnis Penting)

1. **Nomor Dokumen Otomatis** — setiap PR/RFQ/Quotation/PO/Production Order/Sales Order/Adjustment/Transfer punya format nomor unik & berurutan (mis. `PR-2026-00001`).
2. **Stok Batch & FEFO** — stok dilacak per **batch/lot**; barang keluar mengikuti **FEFO** (First Expired First Out). Expiry date wajib untuk produk yang memerlukan.
3. **MFG / Expiry / Shelf Life** — setiap batch memiliki **Manufacture Date**, **Expiry Date**, dan **Shelf Life (PAO)**. Sistem bisa menghitung expiry dari MFG date + shelf life dan menetapkan status `expire-soon`.
4. **Reservasi = pesan stok** — Sales Order yang approved mengunci (reserve) stok akhirat sampai SO dikirim/dibatalkan.
5. **Make-to-Stock (MTS)** — produksi dijalankan berdasarkan **kebutuhan stok** (reorder point / reorder level / safety stock), pertimbangkan juga permintaan dari sales order bila ada. (Keputusan MVP: **MTS**, bukan Make-to-Order.)
6. **Approval Wajib** — **PO** dan **Stock Adjustment** wajib melalui approval workflow (single/multi-level approver yang dapat dikonfigurasi).
7. **Inventory Movement otomatis** — setiap transaksi (receiving, issue, transfer, adjustment, reservasi/shipment, production) secara otomatis membuat movement & update stok, dan tidak boleh dihapus langsung (harus di-void/reversal).
8. **Reorder Point** — bila stok ≤ titik pesan, sistem menampilkan notifikasi / otomatis menyarankan PR.
9. **Tidak ada duplikat** — email customer & supplier unik/sebagian; SKU produk unik.
10. **Audit trail tidak dapat dihapus** — semua aksi tercatat di Audit Log.

---

## 8. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| Auth & Keamanan | Login JWT (Sanctum), hashing password, rate limiting, RBAC per permission, CSRF/CORS |
| Performance | Halaman utama < 2s; list dipaginate & di-sort server-side; batch insert untuk movement |
| Reliability | Audit log mutasi stok; reversibility (not delete); backup DB terjadwal |
| Usability | Bahasa Indonesia UI; responsive web; form import (template Excel) untuk master data |
| Maintainability | Clean architecture (Service + Repository + Form/Request + Resource), testable, API versioning | 
| Compliance | Data batch & komposisi disiapkan mendukung traceability (regulasi kosmetik/BPOM) |

---

## 9. Asumsi & Keterbatasan

- Sistem di-deploy di **Hostinger** (PHP 8.x + MySQL + static frontend), single API instance.
- **Solo developer**, fase build diperkirakan 4–5 bulan untuk seluruh MVP.
- Data awal dimasukkan via seed/import; tidak ada migrasi sistem lama.
- Harga & costing dihitung manual (diisi user), sistem hanya menampilkan.

---

## 10. Rencana Pengembangan (Oktaf)

- Step berikutnya: **02-PRD.md** (spesifikasi fungsional detail + skema data).
- Setelah approve → build sesuai **03-Roadmap-Timeline.md**.
- Detail arsitektur teknis: **04-System-Architecture.md**.

---

**Status: 🟡 DRAFT** — Mohon tinjau & berikan approval / revisi.
