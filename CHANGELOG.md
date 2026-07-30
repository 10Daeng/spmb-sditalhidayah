# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Halaman admin Pengaturan Umum (`/admin/pengaturan/umum`) untuk mengelola identitas sekolah, SEO, dan fitur toggle
- Sitemap.xml dinamis untuk SEO
- Robots.txt untuk crawler
- SEO Meta Tags dinamis di semua halaman publik
- Loading state & skeleton screen pada form pendaftaran
- Multi-step form validation per step dengan indikator progress
- Notifikasi real-time untuk admin saat ada pendaftaran baru
- Dark mode toggle untuk kenyamanan admin
- Export data lengkap (PDF per siswa, Excel dengan data orang tua & kesehatan)

### Changed
- **Rebrand PPDB → SPMB** (Sistem Pendaftaran Murid Baru)
- **Rebrand Pendaftaran Peserta Didik Baru → Indent Pendaftaran Murid Baru**
- **Rebrand SIST v2.0 → SISTER 1.0** (Sistem Informasi Sekolah Terpadu)
- Rename route `/ppdb` → `/spmb`
- Rename database table `ppdb_settings` → `spmb_settings`
- Rename API endpoint `/api/admin/ppdb-settings` → `/api/admin/spmb-settings`
- Rename component `PpdbForm.jsx` → `SpmbForm.jsx`
- Switch Astro adapter dari Netlify ke Vercel

### Fixed
- Export Excel: fix error `Cannot read properties of undefined (reading 'write')` dengan mengubah import xlsx
- Fix policy error `42710` di migration site_settings dengan menambahkan `DROP POLICY IF EXISTS`
- Fix migration numbering conflict (008_site_settings vs 008_registration_type → 009_registration_type)

## [1.0.0] - 2026-05-04

### Added
- Sistem SPMB Online SDIT Al-Hidayah Sumenep
- Formulir pendaftaran multi-step (5 langkah)
- Dashboard admin dengan sidebar navigation
- Verifikasi pendaftaran oleh admin
- Manajemen pembayaran (pendaftaran & daftar ulang)
- Manajemen berita/artikel
- Manajemen FAQ
- Manajemen banner
- Broadcast pengumuman via WhatsApp/Email
- Audit trail (riwayat aktivitas)
- Export data pendaftaran (Excel/CSV)
- Kartu ujian digital (PDF)
- Halaman dashboard orang tua (cek status pendaftaran)
- Halaman lengkapi data siswa
- Manajemen kelas & jadwal pelajaran
- Manajemen guru & pegawai
- Sistem autentikasi dengan role-based access control (RBAC)
- Row Level Security (RLS) di Supabase
- Rate limiting untuk form pendaftaran
- Upload dokumen pendukung (KK, Akta, Foto, Rapor)
- Konfirmasi pendaftaran otomatis via WhatsApp & Email
- Pengaturan SPMB (jadwal, biaya, kuota, persyaratan)

### Tech Stack
- Astro 5.x (framework)
- React 19.x (komponen interaktif)
- Tailwind CSS 4.x (styling)
- Supabase (database & auth)
- Vercel (hosting)
