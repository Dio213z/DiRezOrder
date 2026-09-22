# DIREZ — Info Slot Joki Portofolio

Website HTML, CSS, dan JavaScript biasa. Tidak perlu npm, build, server Node.js, atau start.sh. Desain biru bergaya game platformer pixel dengan blok misteri, aksen kuning, dan tampilan responsif.

## PENTING: satu kali pengaturan sebelum menerima pesanan

File website siap diunggah ke GitHub Pages / Vercel. Agar pesanan, slot, dan admin tersambung antarperangkat, Anda WAJIB menghubungkan project Supabase milik Anda. Belum ada akun/database aktif yang disertakan. Tanpa konfigurasi, website tetap tampil tetapi tombol pemesanan terkunci; tidak ada pesanan palsu yang hanya tersimpan di browser.

### 1. Siapkan database Supabase

1. Buat project di https://supabase.com/dashboard.
2. Buka SQL Editor → New query.
3. Salin semua isi `setup.sql`, lalu Run. Jalankan satu kali di project baru. Nilai awal: 10 slot dan Rp30.000.
4. Buka Authentication → Users → Add user. Buat akun email/password untuk admin dan aktifkan konfirmasi email (Auto Confirm) bila tersedia. Simpan password Anda sendiri.
5. Salin User UID akun admin tersebut. Jalankan SQL berikut dengan mengganti UID:

```sql
insert into public.direz_admins (user_id)
values ('GANTI-DENGAN-USER-UID-ADMIN');
```

6. Buka pengaturan API project, salin Project URL dan **anon public key** atau **publishable key**.
7. Edit `config.js`:

```js
window.DIREZ_CONFIG = {
  SUPABASE_URL: 'https://PROJECT-ANDA.supabase.co',
  SUPABASE_ANON_KEY: 'PUBLIC-KEY-ANDA'
};
```

Public key memang digunakan di browser. JANGAN pernah menaruh service_role/secret key, password database, atau password admin di file situs / GitHub. Data dilindungi oleh hak akses database, bukan oleh kerahasiaan public key. Tidak ada password admin bawaan.

### 2A. Deploy di GitHub Pages

1. Ekstrak ZIP.
2. Buat repository GitHub, unggah **isi** folder `direz-portfolio` agar `index.html` berada di root repository.
3. Pastikan `config.js` telah diisi. Sertakan `.nojekyll` jika mengunggah lewat Git.
4. Settings → Pages → Build and deployment → Deploy from a branch.
5. Pilih branch `main` dan folder `/ (root)`, lalu Save.
6. Tunggu deployment selesai, buka URL GitHub Pages.

Semua path aset relatif, sehingga mendukung URL seperti `username.github.io/nama-repo/`. Admin berupa panel halaman dalam situs yang sama, tanpa route server.

### 2B. Deploy di Vercel

1. Unggah isi folder ke repository GitHub seperti di atas.
2. Di Vercel, pilih Add New → Project, kemudian import repository tersebut.
3. Framework Preset: **Other**.
4. Root Directory: folder yang berisi `index.html` (root jika upload sudah benar).
5. Tidak perlu Build Command atau Install Command. Output Directory: `.`. Konfigurasi juga tersedia di `vercel.json`.
6. Klik Deploy.

Pilihan GitHub Pages dan Vercel menggunakan database yang sama jika `config.js` sama. Pengaturan environment variable Vercel tidak otomatis masuk ke file HTML statis; edit `config.js` menggunakan public key.

## Cara masuk admin

- Tekan ikon kotak kuning **?** di kanan atas **5 kali**. Jeda setiap klik tidak lebih dari 1,8 detik.
- Login dengan akun admin Supabase yang sudah diberi izin melalui `direz_admins`.
- Atur **sisa slot** dan **harga**, lalu Simpan.
- Sisa slot adalah angka slot yang masih tersedia, bukan total pesanan atau jumlah penambahan.
- Buka pesanan → Lihat detail untuk seluruh form, unduhan lampiran, tautan WhatsApp, dan status.
- Gunakan Muat ulang untuk mengambil pesanan baru. Daftar dimuat 25 pesanan per halaman.
- Status: Baru / Terkonfirmasi / Selesai. Mengganti status tidak menambah/mengurangi slot.
- Keluar akun setelah selesai. Sesi hanya berada di memori tab; muat ulang halaman akan meminta login lagi.
- Lupa password: kelola akun dari dashboard Supabase. Situs tidak menyediakan registrasi publik.

Ikon 5 klik hanya menyembunyikan pintu masuk. Login dan pemeriksaan izin dilakukan di database. Pengunjung tidak dapat membaca pesanan melalui API publik, bahkan jika mengetahui alamat database.

## Cara pemesanan

1. Pelanggan klik Ambil Slot Saya ketika slot tersedia.
2. Wajib mengisi nama, kelas, absen, WhatsApp, SD, SMP, SMK/SMA, 4 persentase kemampuan, tema, style, warna, dan referensi desain. Jika tidak ada referensi, tulis “Tidak ada”.
3. Request fitur, halaman, catatan, dan lampiran bersifat opsional.
4. Lampiran: maksimal 4 file, masing-masing 1 MB. Mendukung JPG, PNG, WebP, PDF. Foto/logo, sertifikat, referensi, dan foto project dapat diunggah bersama.
5. Pesanan berhasil langsung mengurangi satu slot. Harga saat memesan tersimpan dan tidak berubah ketika harga admin diperbarui.
6. Pesan berhasil: “Silakan bayar besok Rp30.000. Admin akan menghubungi Anda jika terkonfirmasi 👍”. Nominal mengikuti harga saat pesanan diterima.
7. Pelanggan menyimpan kode pesanan/screenshot. Pembayaran dan konfirmasi dilakukan manual oleh admin lewat WhatsApp; tidak ada payment gateway atau pesan WhatsApp otomatis.

## Perilaku teknis

- Transaksi database dan row lock mencegah slot terakhir diambil dua kali.
- Request UUID mencegah kirim ulang karena jaringan menggandakan pesanan dalam tab yang sama.
- Perubahan harga di server meminta pelanggan mengecek harga terbaru sebelum kirim ulang.
- Versi pengaturan mencegah admin menimpa perubahan slot dari pesanan yang baru masuk.
- Pembatasan nomor WhatsApp yang sama: satu pesanan per 10 menit. Ini pembatasan dasar, bukan perlindungan bot lengkap. Untuk trafik publik besar, tambahkan CAPTCHA yang diverifikasi server/rate limiting sebelum membuka promosi besar.
- Lampiran kecil disimpan privat dalam JSON database bersama pesanan sehingga pengiriman data + file atomik. Pendekatan ini cocok untuk volume kecil; pantau kuota database. Untuk volume besar, migrasikan lampiran ke penyimpanan objek privat.
- Pengaturan slot publik diperbarui tiap 30 detik selama tab aktif. Admin memuat daftar dengan tombol Muat ulang.
- Form tidak disimpan ke localStorage. Seluruh teks pelanggan ditampilkan sebagai teks, bukan HTML.
- `setup.sql` adalah skema pemasangan pertama, bukan migrasi berulang.
- File konfigurasi, SQL, dan README di hosting statis bukan rahasia. Jangan mengisi password atau secret key ke dalamnya.

## File

- `index.html`: struktur halaman publik dan panel admin.
- `style.css`: tema pixel biru, desktop/mobile, reduced motion.
- `app.js`: formulir, API, autentikasi, panel pesanan, lampiran.
- `config.js`: URL dan public key Supabase.
- `setup.sql`: tabel, validasi, izin akses, fungsi transaksi.
- `vercel.json`: konfigurasi hosting statis.
- `.nojekyll`: GitHub Pages.

## Preview lokal

Jalankan `python -m http.server 8080` dari folder situs, buka `http://localhost:8080`. Untuk pesanan nyata, isi konfigurasi terlebih dahulu. Koneksi database produksi belum diuji karena akun Supabase Anda belum diberikan; lakukan checklist berikut setelah konfigurasi:

- Admin login, simpan harga dan 2 slot.
- Pesan dari browser/perangkat lain; slot menjadi 1 dan data/lampiran muncul di admin.
- Pesan kedua; slot menjadi 0 dan tombol pemesanan terkunci.
- Pastikan akun non-admin tidak bisa membaca daftar/detail atau mengubah harga.
- Coba ubah harga saat form terbuka; kirim dengan harga lama harus ditolak, lalu harga terbaru ditampilkan.

## Pengujian paket

Lulus pemeriksaan sintaks JavaScript; skema dan fungsi SQL dieksekusi pada PostgreSQL tertanam (PGlite), meliputi validasi, izin publik/non-admin, retry, slot habis, konflik versi, harga berubah, dan lampiran tidak valid. Alur browser desktop serta lebar 390 px diuji dengan Chromium, API diarahkan ke database uji, dan login disimulasikan: kirim form/lampiran, hasil sukses, 5 klik ikon, baca detail, ubah harga/slot, dan logout. Tidak ditemukan overflow horizontal pada HP. Integrasi Auth/API Supabase nyata tetap perlu dicek setelah Anda memasang konfigurasi.

## Dokumentasi rujukan

- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Vercel static build settings: https://vercel.com/docs/builds/configure-a-build
