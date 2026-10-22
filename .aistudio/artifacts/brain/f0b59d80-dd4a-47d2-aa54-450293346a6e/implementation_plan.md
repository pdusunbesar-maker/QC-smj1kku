# Rencana Implementasi: Akurasi Westgard Levey-Jennings & Navigasi Notifikasi Lonceng

## 1. Akurasi Pembacaan Pelanggaran Westgard pada Grafik Levey-Jennings
- [x] **Koreksi Seleksi Titik Plot Harian (`single_per_date`)**:
  - Mengatasi inkonsistensi saat satu tanggal memiliki lebih dari 1 pengujian (misal: Run 1 gagal 1:3s di +3.15 SD, Run 2 re-run lolos di +0.06 SD).
  - Sistem memprioritaskan titik pelanggaran (Reject/Warning) sebagai titik perwakilan tanggal tersebut sehingga koordinat nilai, Z-score, dan status warna merah/kuning sesuai dengan aturan Westgard yang dilaporkan.
- [x] **Penempatan Titik Sumbu Y (`getPointY`) Berdasarkan Z-Score & Garis SD**:
  - Mengaitkan koordinat Y langsung ke `targetMean + zScore * targetSD` sehingga titik pelanggaran +3.15 SD secara presisi digambar di atas garis batas kritis +3SD, tanpa risiko deviasi visual lintas level kontrol.
- [x] **Tooltip & Rincian Multi-Run**:
  - Menampilkan ringkasan seluruh pengujian harian pada tooltip jika terdapat lebih dari satu pengujian.
  - Menyediakan tombol pintas langsung ke Verifikasi QC, Lapor NC, dan Terbitkan CAPA.
- [x] **Tabel Pelanggaran Westgard yang Interaktif**:
  - Mendeteksi seluruh kejadian peringatan (1:2s) dan penolakan (1:3s, 2:2s, R:4s, 4:1s, 10x) dengan tombol aksi cepat per baris.

## 2. Navigasi Notifikasi Lonceng Terarah
- [x] **Pusat Notifikasi (`NotificationDrawer.tsx`)**:
  - Setiap kartu notifikasi menampilkan label destinasi yang jelas (*"Arahkan ke: Verifikasi & Review QC"*, *"Arahkan ke: Grafik Levey-Jennings"*, dll.).
  - Saat diklik, notifikasi langsung ditandai terbaca, laci ditutup, dan payload ID dikirim ke tampilan target.
- [x] **Pengarahan Tepat Sasaran di `App.tsx`**:
  - `handleNavigateToTab` mendeteksi ID pemeriksaan QC dan secara otomatis mengaktifkan instrumen dan parameter yang bersangkutan pada grafik Levey-Jennings.
- [x] **Auto-Open di Halaman Target**:
  - `QCReviewView`: Menerima `initialData` dan otomatis membuka modal verifikasi hasil QC yang dimaksud.
  - `CAPAView`: Otomatis membuka dokumen CAPA yang dituju.
  - `NonConformityView`: Otomatis membuka modal detail ketidaksesuaian yang dituju.
