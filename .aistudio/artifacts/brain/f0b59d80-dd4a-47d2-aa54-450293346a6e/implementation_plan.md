# Perbaikan Persistensi Data Parameter Pemeriksaan ke Database Supabase & Local Cache

Memperbaiki kegagalan penyimpanan parameter pemeriksaan (*test parameters*) ke database Supabase dan mencegah data hilang saat menu atau halaman dimuat ulang (*refresh*).

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan penting berdasarkan klarifikasi pengguna:
> - **Konfirmasi Penyimpanan**: Menampilkan status notifikasi tersimpan secara transparan (status sinkronisasi Supabase dan *cache* lokal).
> - **Penanganan Data Saat Supabase Kosong**: Data parameter lokal yang telah diinput pengguna dipertahankan sepenuhnya dan otomatis diunggah (*push sync*) ke Supabase, sehingga data tidak akan terhapus menjadi kosong saat *refresh*.

- **Confirmed Decision 1**: Koreksi *casing property* (`targetSD` / `targetCV`) pada mapper database Supabase (`mapParamToDb` dan `mapDbToParam`) agar PostgreSQL tidak menerima `NaN`/`null` yang menyebabkan penolakan penyimpanan.
- **Confirmed Decision 2**: Proteksi *hydration* pada `syncFromSupabase()`: jika tabel `test_parameters` di Supabase kosong, sistem tidak menimpa data parameter lokal dengan array kosong `[]`, melainkan mempertahankan data lokal dan melakukan sinkronisasi otomatis ke Supabase.

---

## 1. Overview & Core Concept

- **Problem Statement**: Ketika pengguna menambahkan atau mengedit parameter pemeriksaan (seperti Glukosa, Hemoglobin, SGOT, SGPT, Kreatinin, dll.) di menu **Master Data**, data tersebut sempat tampil di antarmuka namun gagal disimpan ke database Supabase. Saat halaman di-*refresh*, fungsi sinkronisasi mengambil data dari Supabase (yang belum tersimpan) dan menimpa *cache* lokal, menyebabkan data parameter yang baru diinput hilang seketika.
- **Root Causes**:
  1. *Property Casing Mismatch*: `mapParamToDb` mengakses `p.targetSd` dan `p.targetCv` (huruf kecil), sedangkan interface `Parameter` dan form input menggunakan `p.targetSD` dan `p.targetCV` (huruf kapital). Akibatnya, `Number(undefined)` menghasilkan `NaN`, dan Supabase menolak operasi `upsert` karena kolom `target_sd` dan `target_cv` bertipe `NUMERIC NOT NULL`.
  2. *Destructive Sync Override*: Saat `syncFromSupabase()` berjalan ketika refresh, jika Supabase mengembalikan data kosong atau gagal menemukan record baru, `this.parameters` ditimpa dengan array kosong atau data lama.
  3. *Missing Return Status in UI*: Fungsi `StorageService.saveParameter()` bersifat `void` tanpa meneruskan status `success`/`error` ke form modal di `MasterDataView.tsx`, sehingga kesalahan database tidak terdeteksi oleh pengguna.
- **Target Persona**: Analis Laboratorium (ATLM), Penanggung Jawab Teknis, dan Administrator Laboratorium Patologi Klinik.

---

## 2. User Experience & Visual Design

- **Alur Interaksi Simpan Parameter**:
  1. Pengguna membuka tab **Master Data** > sub-tab **Parameter**.
  2. Klik tombol **Tambah Parameter Pemeriksaan** atau ikon **Edit** pada parameter yang sudah ada.
  3. Mengisi nama parameter, kode, satuan, metode, instrumen, bahan kontrol, target mean, SD, CV%, serta batas toleransi LCL/UCL.
  4. Klik tombol **Simpan Parameter**:
     - Sistem menampilkan tombol berstatus *loading* / *saving* dengan indikator visual halus.
     - Menyimpan secara instan ke *memory* dan *local cache* (`lqcms_cache_parameters_v2`).
     - Mengirimkan operasi `upsert` aman ke tabel Supabase `test_parameters`.
     - Menampilkan notifikasi sukses yang jelas: *"Parameter [Nama] berhasil disimpan ke database cloud Supabase & cache lokal"*.
     - Jika terjadi kendala jaringan, data tetap tersimpan di lokal dan diberi keterangan status *offline-ready*.
- **Desain & Tipografi (Science & Lab Visual Discipline)**:
  - Angka analitik (Target Mean, SD, CV%, LCL, UCL) diformat dengan `font-mono tabular-nums` untuk keselarasan vertikal kolom.
  - Form modal dilengkapi tombol perhitungan otomatis *Auto (-3SD)* dan *Auto (+3SD)* dengan validasi desimal terstandarisasi.
  - Tidak ada *pill enclosures* berlebihan atau *pulsing dots* dekoratif; status data disajikan secara bersih sesuai standar laboratorium medis.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Casing Fallback pada Database Mapper**
  - *Chosen Approach*: `mapParamToDb` dan `mapDbToParam` mendukung pembacaan ganda: `p.targetSD ?? (p as any).targetSd ?? 0` dan `p.targetCV ?? (p as any).targetCv ?? 0`, dengan penanganan `isNaN` yang selalu menghasilkan angka valid (`0` jika kosong).
  - *Why*: Menghilangkan risiko error PostgreSQL `invalid input syntax for type numeric: "NaN"` dan menjamin kompatibilitas mundur dengan data lama.
- **Decision 2: Non-Destructive Bidirectional Sync on Refresh**
  - *Chosen Approach*: Pada `syncFromSupabase()`, jika Supabase mengembalikan array kosong (`data.length === 0`), sistem memeriksa apakah terdapat parameter di *local cache*. Jika ada, *local cache* dipertahankan dan otomatis diunggah (*push/upsert*) ke Supabase. Jika Supabase memiliki data, data tersebut digabungkan secara cerdas berdasarkan ID dan kode parameter.
  - *Why*: Menjamin data yang baru diinput pengguna tidak pernah terhapus saat koneksi lambat atau refresh cepat.
- **Decision 3: Status Konfirmasi Eksplisit pada Modal Form**
  - *Chosen Approach*: Mengubah `StorageService.saveParameter` untuk mengembalikan `{ success: boolean; message?: string }`. Modal di `MasterDataView.tsx` menunggu hasil penyimpanan dan menampilkan pesan konfirmasi atau peringatan bila gagal.

---

## 4. Technical Architecture & Data Strategy

### Diagram Alur Data & Sinkronisasi Parameter

```
┌─────────────────────────────────────────────────────────────┐
│                 MasterDataView (UI Form)                   │
│   Inputs: Name, Code, Target Mean, Target SD, Target CV%    │
└──────────────────────────────┬──────────────────────────────┘
                               │ handleSaveParameter()
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                StorageService.saveParameter()               │
│                                                             │
│  1. Normalisasi Property (targetSD, targetCV, min/max Acc)  │
│  2. Update Memory Array (`this.parameters`)                 │
│  3. Persistensi ke LocalStorage (`CACHE_KEYS.PARAMETERS`)   │
│  4. Dispatch CustomEvent ('lqcms_data_updated')             │
│  5. Upsert ke Supabase (`test_parameters` table)            │
│  6. Audit Log: 'UPDATE_MASTER_DATA'                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Local Cache       │             │   Supabase Postgres   │
│ `lqcms_cache_param_v2`│             │   `test_parameters`   │
│   (Instant / Offline) │             │     (Cloud Master)    │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            └──────────────────┬──────────────────┘
                               │ Saat Page Refresh / Mount:
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              StorageService.syncFromSupabase()              │
│                                                             │
│  - Jika Supabase mengembalikan data: perbarui cache & state │
│  - Jika Supabase kosong: pertahankan cache & auto-upload    │
│  - Cegah penimpaan destruktif ke array kosong []            │
└─────────────────────────────────────────────────────────────┘
```

### Rincian Perubahan Kode

1. **`src/services/storage.ts`**:
   - Perbaiki `mapParamToDb`: baca `p.targetSD` dan `p.targetCV` secara aman, cegah nilai `NaN`.
   - Perbaiki `mapDbToParam`: sediakan `targetSD`, `targetCV`, `targetSd`, dan `targetCv` untuk kompatibilitas menyeluruh.
   - Perbaiki `saveParameter`: jadikan mengembalikan `Promise<{ success: boolean; message?: string }>`.
   - Perbaiki `saveParameters` (bulk import CSV): tambahkan penanganan *upsert* aman.
   - Perbaiki `syncFromSupabase`: tambahkan proteksi agar data parameter lokal tidak terhapus jika Supabase kosong.
2. **`src/components/master/MasterDataView.tsx`**:
   - Di `handleSaveParameter`: tambahkan state *saving*, validasi ID yang unik (`param-${Date.now()}`), dan tampilkan notifikasi toast sukses/gagal.
   - Saat membuka modal edit: pastikan nilai `targetSD` dan `targetCV` terisi dengan benar di form.
3. **`src/components/master/ParameterCsvImportModal.tsx`**:
   - Tambahkan `await` pada panggilan `StorageService.saveParameters(paramsToSave)`.
