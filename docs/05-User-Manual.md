# 05 — USER MANUAL (RCS SCM)

**Version:** 1.0 · **Date:** 2026-08-28
**Aplikasi:** RCS SCM — Sistem Terintegrasi Inventory · Purchasing · CRM · Production

---

## 1. Login

1. Buka URL aplikasi (misal `https://app.rcsscm.test`).
2. Masukkan email & password, klik **Masuk**.
3. Akun default (dari seeder):
   - Email: `admin@rcsscm.test`
   - Password: `password`

> ⚠️ Segera ganti password setelah instalasi.

---

## 2. Navigasi

Sidebar kiri berisi modul:

| Menu | Isi |
|---|---|
| Dashboard | KPI: stok, nilai stok, PO/SO terbuka, pipeline, alert expiry & reorder |
| Product | Produk, Kategori, Satuan, Brand, Price List |
| Inventory | Stok, Gudang, Transfer, Adjustment, Mutasi, Stock Opname |
| Purchasing | Supplier, PR, RFQ, Quotation, PO, Receiving, Purchase Return |
| CRM | Pipeline, Leads, Opportunities, Activities, Quotations, Sales Orders, Customers |
| Production | Production Orders, Batch / Traceability |
| Reports | 8 laporan + export CSV |
| Settings | Pengaturan perusahaan, format nomor, parameter reorder/expiry |

---

## 3. Alur Utama

### 3.1 Purchasing (PR → RFQ → PO → Receiving)

1. **PR**: buat Purchase Requisition (produk, qty) → **Setujui**.
2. **RFQ**: buat dari PR, pilih supplier → **Tutup** setelah penawaran masuk.
3. **Quotation**: isi penawaran supplier → **Terima**.
4. **PO**: dari quotation terima, klik **Convert to PO** → **Setujui**.
5. **Receiving**: buat penerimaan (lot, expiry) → **Posting** — stok otomatis bertambah, batch dibuat.

### 3.2 CRM (Lead → Opportunity → Quotation → SO)

1. **Leads**: tambah lead → **Hubungi** → **Kualifikasi** → **Convert** (jadi Customer).
2. **Opportunities**: buat opportunity + line items; pindahkan stage di kanban dengan tombol **← / →**.
3. **Quotations**: buat penawaran → **Kirim** → customer terima → **Buat SO** (pilih gudang).
4. **Sales Orders**: **Setujui** SO → stok otomatis **direservasi** (FEFO). **Batalkan** → reservasi dilepas.

### 3.3 Production

1. **Production Orders**: pilih produk jadi + qty → material otomatis terisi dari BOM.
2. **Mulai**: material di-issue dari gudang (batch via FEFO).
3. **Selesai**: isi qty hasil + lot → batch finished good dibuat, stok bertambah.
4. **Batal**: material dikembalikan ke batch asal.

### 3.4 Inventory

- **Transfer**: pindah stok antar gudang (approve → transit → receive).
- **Adjustment**: koreksi stok (gain/loss) dengan approval.
- **Stock Opname**: hitung fisik → posting → otomatis adjustment.
- **Mutasi**: lihat seluruh riwayat pergerakan stok (immutable).

---

## 4. Laporan & Export

1. Buka menu **Reports**.
2. Pilih tab laporan (Inventory, Mutasi Stok, Purchasing, Sales, Production, Customers, Pipeline, Expiry).
3. Gunakan filter (misal per gudang).
4. Klik **Ekspor CSV** — file terbuka di Excel (format UTF-8).

---

## 5. Role & Hak Akses

| Role | Kemampuan utama |
|---|---|
| Super Admin / Admin | Semua modul |
| Supervisor | Lihat semua + approve |
| Sales | CRM penuh (leads, pipeline, quotation, SO) |
| Purchasing | Supplier, PR, RFQ, PO, Receiving, Return |
| Warehouse | Stok, transfer, adjustment, opname, receiving |
| Production | Produk, BOM, production order, batch |

---

## 6. Troubleshooting

| Masalah | Solusi |
|---|---|
| Login gagal | Pastikan email/password benar; seeder sudah dijalankan |
| SO approve gagal "Stok tidak cukup" | Cek stok di Inventory; buat PO/receiving atau production dulu |
| Production start gagal | Pastikan material (bahan baku) tersedia di gudang |
| Export CSV aneh di Excel | Gunakan "Import CSV" dengan delimiter koma; file sudah UTF-8 |
