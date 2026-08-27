SYSTEM
│
├── Dashboard
│
├── CRM
│   ├── Leads
│   ├── Customers
│   ├── Contacts
│   ├── Opportunities
│   ├── Activities
│   └── Sales Pipeline
│
├── PRODUCT
│   ├── Products
│   ├── Categories
│   ├── Units
│   ├── Brands
│   └── Price Lists
│
├── INVENTORY
│   ├── Warehouses
│   ├── Locations
│   ├── Stock
│   ├── Stock Movement
│   ├── Transfer
│   ├── Adjustment
│   ├── Reservation
│   └── Stock Opname
│
├── PRODUCTION  (baru - buat produk sendiri)
│   ├── Bill of Materials / Formula (BOM)
│   ├── Production Orders
│   ├── Batch / Lot  (MFG date, Expiry date, Shelf life / PAO)
│   ├── Filling & Packing
│   └── Traceability
│
├── PURCHASING
│   ├── Suppliers
│   ├── Purchase Requisition
│   ├── RFQ
│   ├── Supplier Quotation
│   ├── Quotation Comparison
│   ├── Purchase Order
│   ├── Receiving
│   └── Purchase Return
│
├── REPORT
│   ├── Inventory
│   ├── Purchasing
│   ├── Supplier
│   ├── Customer
│   └── Sales
│
└── SYSTEM
    ├── Users
    ├── Roles
    ├── Permissions
    ├── Approval Workflow
    ├── Audit Log
    └── Settings


MVP yang masuk akal
Prioritas pertama:

Master data produk, customer, supplier, gudang
Inventory masuk, keluar, transfer, dan adjustment
CRM customer, lead, quotation, dan sales order
Purchasing request, purchase order, dan goods receipt
Reservasi stok dari sales order
Notifikasi reorder point
Dashboard dan laporan dasar
Hak akses serta approval

> CATATAN GAP: karena produk diproduksi sendiri, sistem juga butuh modul PRODUCTION
> (BOM/formula, production order, batch/lot dengan MFG date, Expiry date, Shelf life/PAO).
> Stok dilacak per batch & barang keluar mengikuti FEFO (First Expired First Out).

> KEPUTUSAN MVP:
> - Tracking: batch + expiry saja dulu (MFG date, Expiry date, Shelf life tetap didokumentasikan).
> - Produksi: Make-to-Stock (MTS), bukan make-to-order.
> - Approval workflow wajib untuk: Purchase Order & Stock Adjustment.



01  BASELINE APPLICATION SPECIFICATION
    │
    ├── System Overview
    ├── Business Flow
    ├── Module Architecture
    ├── User Roles
    ├── Module Map
    ├── Screen Map
    └── UI Prototype
             │
             ▼
02  FEATURE SELECTION & REQUIREMENT CHECKLIST
    │
    ├── CRM
    │   ├── Customer
    │   ├── Lead
    │   ├── Opportunity
    │   └── Activity
    │
    ├── INVENTORY
    │   ├── Product
    │   ├── Stock
    │   ├── Warehouse
    │   ├── Transfer
    │   └── Stock Opname
    │
    └── PURCHASING
        ├── Supplier
        ├── PR
        ├── RFQ
        ├── Quotation
        ├── PO
        └── Receiving
             │
             ▼
03  USER REVIEW
    │
    ├── Include
    ├── Modify
    ├── Skip
    └── Discuss
             │
             ▼
04  FINAL BRD
             │
             ▼
05  FINAL PRD
             │
             ▼
06  UI/UX + TECHNICAL DESIGN
             │
             ▼
07  DEVELOPMENT