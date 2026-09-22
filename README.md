# DIREZ — Demo tanpa database

Langsung buka `index.html`. Tidak perlu Supabase, akun, API, npm, atau instalasi. Bisa diunggah ke GitHub Pages dan Vercel sebagai website statis.

## Admin tanpa login

Tekan kotak kuning **?** di kanan atas **5 kali** (jeda tiap klik kurang dari 1,8 detik). Panel admin langsung terbuka. Atur sisa slot dan harga, baca semua isian pesanan, unduh lampiran, ubah status, atau buka tautan WhatsApp.

## Pengaturan config.js

- `INITIAL_SLOTS: 10`: slot awal.
- `INITIAL_PRICE: 30000`: harga awal Rp30.000.
- `ADMIN_REQUIRE_LOGIN: false`: langsung masuk admin, tanpa email/password.
- Jika ingin simulasi login, ubah menjadi `true`.
- Email demo: `admin@direz.demo`.
- Password demo: `direz12345`.
- Ubah email/password langsung di `config.js`.

Pengaturan awal dipakai saat browser belum menyimpan data. Setelah ada data, ubah slot/harga melalui admin. Untuk mengulang demo dari awal, hapus data situs di pengaturan browser. Ini juga menghapus semua pesanan dan lampiran demo. Login dalam config.js hanya simulasi dan bukan pengamanan data.

## Penyimpanan demo

Slot, harga, seluruh isian, status, dan lampiran disimpan di localStorage browser. Data tetap ada saat refresh atau browser ditutup selama data situs tidak dihapus. Browser/perangkat/domain lain memiliki data masing-masing; pesanan tidak tersinkron ke perangkat admin lain. Mode privat dapat menghapus data saat ditutup. Membuka lewat file lokal dapat menghasilkan penyimpanan berbeda antarbrowser; untuk URL konsisten gunakan GitHub Pages atau Vercel.

Setiap pesanan mengurangi satu slot dan menyimpan harga saat memesan. Harga awal Rp30.000. Setelah submit muncul pesan bayar besok sesuai harga saat pemesanan. WhatsApp dan pembayaran hanya simulasi/manual, tidak ada pengiriman pesan atau pembayaran otomatis.

Semua isian wajib kecuali request dan lampiran. Referensi desain wajib diisi “Tidak ada” jika tidak ada. Lampiran maksimal 4 file, masing-masing 1 MB (JPG, PNG, WebP, PDF). Kapasitas total mengikuti kuota localStorage browser; bila penuh, aplikasi menampilkan kesalahan tanpa mengurangi slot atau mengklaim pesanan berhasil. Gunakan file kecil untuk demo.

## Upload GitHub Pages

1. Ekstrak ZIP, unggah **isi folder** `direz-portfolio` ke repository. `index.html` harus ada di root.
2. Settings → Pages → Deploy from a branch.
3. Pilih `main`, `/ (root)`, Save.
4. Buka URL Pages setelah deployment selesai.

## Upload Vercel

1. Import repository GitHub.
2. Framework: Other. Root: folder berisi `index.html`.
3. Build/Install Command tidak diperlukan; Output Directory `.`.
4. Deploy. `vercel.json` sudah disertakan.

Tidak ada konfigurasi layanan lain yang perlu diisi.

## File utama

- index.html: halaman publik, formulir, admin.
- style.css: tampilan game pixel biru responsif.
- app.js: logika demo dan penyimpanan lokal.
- config.js: nilai awal dan opsi login demo.
- vercel.json, .nojekyll: konfigurasi hosting.
