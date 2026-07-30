# Checklist Testing - SISTER 1.0

## Cara Pakai:
- [ ] = Belum dicek
- [x] = Sudah dicek & BERHASIL
- [ ] ❌ = Gagal (catat error-nya)

---

## 1. LOGIN & AUTHENTICATION

- [ ] Buka halaman `/admin/login`
- [ ] Login dengan email admin
- [ ] Login berhasil & redirect ke Dashboard
- [ ] Logout berfungsi
- [ ] Session tidak expired terlalu cepat

---

## 2. DASHBOARD

- [ ] Halaman Dashboard muncul tanpa error
- [ ] Statistik jumlah pendaftar tampil
- [ ] Grafik/chart (kalau ada) berfungsi
- [ ] Notifikasi real-time muncul

---

## 3. SPMB - VERIFIKASI

- [ ] Buka menu Verifikasi
- [ ] Tabel data pendaftar muncul
- [ ] Bisa search/filter pendaftar
- [ ] Klik "Detail" → halaman detail pendaftar terbuka
- [ ] Bisa approve/verifikasi pendaftar
- [ ] Bisa reject/tolak pendaftar
- [ ] Bisa tambah catatan verifikasi

---

## 4. SPMB - DATA PENDAFTAR

- [ ] Buka menu Data Pendaftar
- [ ] Tabel siswa muncul lengkap
- [ ] Buka detail siswa
- [ ] Data lengkap: identitas, orang tua, kesehatan, dokumen

---

## 5. EXPORT DATA

- [ ] Klik tombol Export Excel
- [ ] File `.xlsx` terdownload
- [ ] File bisa dibuka di Microsoft Excel / Google Sheets
- [ ] Data lengkap: nama, orang tua, kesehatan

---

## 6. KEUANGAN - PEMBAYARAN

- [ ] Buka menu Konfirmasi Pembayaran
- [ ] Tabel pembayaran muncul
- [ ] Bisa buat tagihan baru untuk pendaftar
- [ ] Bisa verifikasi pembayaran
- [ ] Bisa lihat status lunas/belum lunas

---

## 7. KEUANGAN - BELUM LUNAS

- [ ] Buka menu Belum Lunas
- [ ] Tampil daftar yang belum bayar

---

## 8. AKADEMIK

- [ ] Buka menu Kelas → data kelas muncul
- [ ] Buka menu Jadwal Pelajaran → jadwal muncul
- [ ] Buka menu Guru & Pegawai → data guru muncul

---

## 9. KONTEN

- [ ] Buka menu Berita & Artikel
- [ ] Bisa tambah artikel baru
- [ ] Bisa edit artikel
- [ ] Bisa hapus artikel
- [ ] Buka menu Broadcast → bisa kirim broadcast
- [ ] Buka menu Kelola Halaman → bisa edit halaman
- [ ] Buka menu Banner → bisa upload banner
- [ ] Buka menu FAQ → bisa tambah/edit FAQ

---

## 10. LAPORAN

- [ ] Buka menu Audit Trail → riwayat aktivitas muncul
- [ ] Buka menu Export Data → export berhasil

---

## 11. SISTEM - PENGGATURAN

- [ ] Buka menu Pengaturan Umum
- [ ] Bisa edit nama sekolah, alamat, kontak
- [ ] Bisa toggle buka/tutup pendaftaran
- [ ] Bisa edit SEO meta title/description
- [ ] Buka menu Pengaturan SPMB
- [ ] Bisa edit jadwal, biaya, kuota
- [ ] Bisa edit persyaratan (HTML)

---

## 12. SISTEM - MANAJEMEN PENGGUNA

- [ ] Buka menu Manajemen Pengguna
- [ ] Bisa tambah user baru
- [ ] Bisa edit user
- [ ] Bisa hapus user
- [ ] Bisa ganti role user

---

## 13. FRONTEND (HALAMAN PUBLIK)

- [ ] Buka halaman beranda `/` → tampil normal
- [ ] Buka halaman SPMB `/spmb` → info SPMB muncul
- [ ] Buka halaman Formulir `/spmb/form`
- [ ] Bisa isi form pendaftaran (test kirim)
- [ ] Buka halaman Berita `/berita`
- [ ] Buka halaman Tentang Kami `/tentang-kami`

---

## 14. FORM PENDAFTARAN (SPMB)

- [ ] Form 5 langkah berfungsi
- [ ] Step 1 (Identitas Siswa) → bisa next
- [ ] Step 2 (Orang Tua) → bisa next
- [ ] Step 3 (Kesehatan) → bisa next
- [ ] Step 4 (Perkembangan) → bisa next
- [ ] Step 5 (Dokumen) → bisa submit
- [ ] Loading overlay muncul saat submit
- [ ] Setelah submit, muncul nomor registrasi

---

## 15. DASHBOARD ORANG TUA

- [ ] Buka `/dashboard/parent`
- [ ] Bisa cek status pendaftaran dengan nomor registrasi
- [ ] Status pendaftaran muncul (pending/verified/diterima/ditolak)

---

## 16. DARK MODE

- [ ] Klik tombol Dark Mode (bulan di topbar)
- [ ] Tampilan berubah jadi dark
- [ ] Klik lagi → kembali light mode

---

## Catatan Error (kalau ada):

**Fitur yang Gagal:**
1. 
2. 
3. 

**Pesan Error:**
- 
- 

**Screenshot:** (lampirkan kalau perlu)

---

Setelah testing selesai, laporkan ke developer:
- Semua berhasil ✅
- Ada yang gagal ❌ (sebutkan fitur dan error)
