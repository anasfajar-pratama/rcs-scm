# 06 — DEPLOYMENT GUIDE (Hostinger)

**Project:** RCS SCM
**Target:** Hostinger shared hosting (PHP 8.2 + MySQL) + static frontend (Vite build)
**Date:** 2026-08-28

---

## 1. Persiapan

- Akun Hostinger dengan akses **hPanel**.
- Domain/subdomain, misal:
  - `api.rcsscm.test` → backend (Laravel)
  - `app.rcsscm.test` → frontend (static)
- SSH/FTP credentials (File Manager juga cukup).

---

## 2. Deploy Backend (Laravel API)

### 2.1 Upload

1. Build lokal: pastikan `.env` production benar lalu buat archive **tanpa folder** `vendor` dan `storage/*` cache.
2. Upload isi `backend/` ke folder `domains/api.rcsscm.test/public_html` (atau subfolder `laravel`).

### 2.2 Struktur folder (disarankan)

```
public_html/
├── index.php            (symlink ke laravel/public/index.php)
├── .htaccess
└── (isi dari backend/public)
```

Atau pasang Laravel di `public_html/laravel` dan arahkan DocumentRoot ke `laravel/public`.

### 2.3 Environment & Dependencies

```bash
cd laravel
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

`.env` produksi (sesuaikan):

```env
APP_NAME=RCS SCM
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.rcsscm.test

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_rcsscm
DB_USERNAME=u123456789_rcsscm
DB_PASSWORD=********

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

SANCTUM_STATEFUL_DOMAINS=app.rcsscm.test
```

### 2.4 Migrasi & Seed

> Untuk deploy awal (database kosong), gunakan `migrate:fresh` agar tidak bentrok dengan tabel lama.

```bash
php artisan migrate:fresh --force
php artisan db:seed --force        # role, user, master data, demo data
php artisan storage:link           # jika pakai upload
php artisan config:cache
php artisan route:cache
```

**Default Users (setelah seed):**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@rcsscm.test | password |
| Supervisor | supervisor@rcsscm.test | password123 |
| Sales | sales@rcsscm.test | password123 |
| Warehouse | warehouse@rcsscm.test | password123 |
| Purchasing | purchasing@rcsscm.test | password123 |
| Production | production@rcsscm.test | password123 |

### 2.5 Scheduler (untuk alert/queue)

Di hPanel → **Cron Jobs**, tambahkan (sesuaikan path):

```cron
* * * * * php /home/u123456789/domains/api.rcsscm.test/laravel/artisan schedule:run >> /dev/null 2>&1
```

> Jika `php` tidak dikenali, gunakan path penuh (misal `/usr/bin/php8.2`).

---

## 3. Deploy Frontend (React static)

### 3.1 Build

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=https://api.rcsscm.test/api/v1
npm ci
npm run build
```

### 3.2 Upload

1. Upload isi `frontend/dist/` ke `domains/app.rcsscm.test/public_html`.
2. Pastikan `.htaccess` SPA (fallback ke index.html):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 4. Konfigurasi CORS

`backend/config/cors.php` sudah `allowed_origins => ['*']` (sesuaikan untuk produksi):

```php
'allowed_origins' => ['https://app.rcsscm.test'],
'supports_credentials' => false,
```

Jangan lupa `php artisan config:cache` setelah perubahan.

---

## 5. Verifikasi Deploy

1. Buka `https://api.rcsscm.test/api/v1/auth/me` → harus 401 (bukan 500).
2. Login di `https://app.rcsscm.test` dengan `admin@rcsscm.test`.
3. Cek modul: Dashboard, Inventory, CRM, Production, Reports.
4. Cek log error di hPanel → **Logs** jika ada masalah.

---

## 6. Backup & Monitoring

- **Backup**: hPanel → **Backup** (mingguan) + backup manual `mysqldump`.
- **Monitoring**: aktifkan Uptime Monitor di hPanel untuk `app.*` dan `api.*`.
- **Update**: pull kode → `composer install --no-dev` → `php artisan migrate --force` → build ulang frontend.

---

## 7. Checklist Pra-Deploy

- [ ] `APP_DEBUG=false` dan `APP_ENV=production`
- [ ] MySQL dipakai (bukan SQLite)
- [ ] CORS diarahkan ke domain frontend
- [ ] Cron scheduler aktif
- [ ] `.htaccess` SPA terpasang di frontend
- [ ] Backup & monitoring aktif
- [ ] Password admin diganti
