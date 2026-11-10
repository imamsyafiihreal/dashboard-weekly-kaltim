# DASHBOARD MONITORING MBG PROVINSI KALIMANTAN TIMUR
**Badan Gizi Nasional (BGN)**

Dashboard ini dibuat murni menggunakan arsitektur web modern (**HTML, CSS Tailwind, Leaflet Geo-Map, Chart.js, Vanilla JS**) dan terhubung **langsung ke Google Spreadsheet tanpa memerlukan Google Apps Script**.

---

## 📁 Struktur File di Folder Ini
```text
DASHBOARD KALTIM/
├── index.html           # File utama tampilan Dashboard Web
├── sheets-api.js        # Modul pembaca Google Spreadsheet (GViz API)
├── Assets Image/        # Folder logo BGN, pattern, dan font
└── README.md            # Panduan panduan deployment
```

---

## 🚀 Langkah 1: Pengaturan Google Spreadsheet (Wajib)
Agar browser publik dapat membaca data dari Google Spreadsheet Anda:
1. Buka file Google Spreadsheet data MBG Kaltim Anda di browser.
2. Klik tombol **Bagikan (Share)** di pojok kanan atas.
3. Di bagian **Akses umum (General access)**, ubah dari *Dibatasi (Restricted)* menjadi:
   👉 **"Siapa saja yang memiliki link" (Anyone with the link)** dengan peran **"Pelihat" (Viewer)**.
4. Pastikan di dalam Spreadsheet terdapat 2 tab:
   - `REKAPITULASI`
   - `KALTIM`
5. Jika ID Spreadsheet Anda berbeda dari ID default, cukup buka file `index.html` baris 1242 dan ganti nilai variabel `SPREADSHEET_ID`.

---

## 🌐 Langkah 2: Upload ke GitHub & Aktifkan GitHub Pages

### Opsi A: Lewat Web GitHub (Paling Mudah)
1. Buka situs [GitHub](https://github.com) dan login ke akun Anda.
2. Buat repository baru (klik tanda **+** di kanan atas &rarr; **New repository**):
   - Beri nama repository, misalnya: `dashboard-kaltim`
   - Pilih **Public**
   - Klik **Create repository**
3. Di halaman repository yang baru dibuat, klik **Upload an existing file**.
4. Tarik (*drag & drop*) seluruh isi folder `DASHBOARD KALTIM` ini:
   - File `index.html`
   - File `sheets-api.js`
   - Folder `Assets Image/`
5. Klik tombol hijau **Commit changes**.

### Opsi B: Mengaktifkan GitHub Pages (Website Online)
1. Di repository GitHub Anda, klik menu **Settings** (ikon gerigi).
2. Di menu sebelah kiri, klik **Pages**.
3. Di bagian **Build and deployment > Branch**:
   - Ganti *None* menjadi **`main`** (atau `master`).
   - Folder biarkan tetap **`/ (root)`**.
   - Klik **Save**.
4. Tunggu sekitar 1–2 menit, refresh halaman. Link website Anda akan muncul di bagian atas:
   👉 `https://username-anda.github.io/dashboard-kaltim/`
   Dashboard Anda sudah online dan dapat dibuka oleh siapa saja!
