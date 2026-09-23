# DIREZ — Website Terhubung database.json

Website DIREZ kini menggunakan server Node.js Express dan terhubung ke `database.json`. Semua data slot, harga, pesanan, dan pesanan admin tersimpan secara persisten di file `database.json`.

## Cara Menjalankan

1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   npm start
   ```
3. Buka browser di `http://localhost:3000`.

## Admin tanpa login

Tekan kotak kuning **?** di kanan atas **5 kali** (jeda tiap klik kurang dari 1,8 detik). Panel admin langsung terbuka. Atur sisa slot dan harga, baca semua isian pesanan, unduh lampiran, ubah status, atau buka tautan WhatsApp.

## Pengaturan config.js

- `INITIAL_SLOTS: 10`: slot awal (jika database.json belum ada).
- `INITIAL_PRICE: 30000`: harga awal Rp30.000.
- `ADMIN_REQUIRE_LOGIN: true`: tampilkan login demo.
- Email demo: `direz@demo.com`.
- Password demo: `direz213z`.

## Penyimpanan Database (`database.json`)

Slot, harga, seluruh isian pesanan, status, dan lampiran tersimpan secara terpusat di `database.json`. Data tersinkronisasi untuk semua pengunjung dan admin.

## File utama

- `server.js`: server Express & API endpoint `database.json`.
- `database.json`: file penyimpanan database JSON.
- `index.html`: halaman publik, formulir, admin.
- `style.css`: tampilan game pixel biru responsif.
- `app.js`: logika antarmuka yang terhubung ke server API.
- `config.js`: nilai awal dan opsi login demo.
