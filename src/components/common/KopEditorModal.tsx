import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  FileText, 
  Image, 
  Upload, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { LaboratoryInfo } from '../../types';
import { StorageService } from '../../services/storage';

interface KopEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  labInfo: LaboratoryInfo;
  onSaved?: (updatedLab: LaboratoryInfo) => void;
}

export const KopEditorModal: React.FC<KopEditorModalProps> = ({
  isOpen,
  onClose,
  labInfo,
  onSaved,
}) => {
  const [form, setForm] = useState<LaboratoryInfo>({ ...labInfo });
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...labInfo });
      setIsSavedSuccess(false);
    }
  }, [isOpen, labInfo]);

  if (!isOpen) return null;

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo terlalu besar. Gunakan file gambar di bawah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setForm(prev => ({ ...prev, logoUrl: evt.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LaboratoryInfo = {
      ...form,
      name: form.name.trim(),
      hospitalName: form.hospitalName.trim(),
      regency: form.regency.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      accreditation: form.accreditation.trim(),
      headOfLab: form.headOfLab.trim(),
      headNip: form.headNip.trim(),
      headOfQuality: (form.headOfQuality || '').trim(),
      qualityNip: (form.qualityNip || '').trim(),
      logoUrl: form.logoUrl || '/logo_kayong_utara.png',
    };

    StorageService.updateLabInfo(updated);
    if (onSaved) {
      onSaved(updated);
    }

    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit KOP Surat Laporan & Penanggung Jawab</h3>
              <p className="text-xs text-slate-300">Sesuaikan header surat resmi, logo, alamat, dan pejabat bertandatangan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {isSavedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-emerald-800 font-bold animate-pulse">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Data KOP Surat & Penanggung Jawab Berhasil Diperbarui & Disimpan!</span>
            </div>
          )}

          {/* PRATINJAU KOP SURAT */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Pratinjau Hasil KOP Surat Laporan Resmi:
            </span>
            <div className="rounded-lg bg-white p-4 border border-slate-300 border-b-4 border-double border-b-slate-900 flex items-center justify-between gap-3 text-center">
              <img
                src={form.logoUrl || '/Lambang_Daerah_Kab._Kayong_Utara.png'}
                alt="Logo KOP Kiri"
                className="h-16 w-auto object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Lambang_Daerah_Kab._Kayong_Utara.png';
                }}
              />
              <div className="flex-1 px-2 space-y-0.5">
                <h4 className="text-[10px] font-bold uppercase text-slate-700 leading-tight">{form.regency || 'PEMERINTAH KABUPATEN KAYONG UTARA'}</h4>
                <h4 className="text-[10px] font-extrabold uppercase text-slate-800 leading-tight">{form.healthService || 'DINAS KESEHATAN DAN KELUARGA BERENCANA'}</h4>
                <h3 className="text-xs sm:text-sm font-black uppercase text-slate-950 leading-tight">{form.hospitalName || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'}</h3>
                <h5 className="text-[11px] font-bold uppercase text-emerald-950 leading-tight">{form.name || 'INSTALASI PATOLOGI KLINIK & LABORATORIUM TERPADU'}</h5>
                <p className="text-[9px] text-slate-600 mt-0.5">{form.address}</p>
                <p className="text-[9px] text-slate-500 font-mono">Telp: {form.phone} · Surel: {form.email} · Akreditasi: {form.accreditation}</p>
              </div>
              <div className="w-12 hidden sm:block shrink-0">
                {form.logoRightUrl ? (
                  <img src={form.logoRightUrl} alt="Logo Kanan" className="h-16 w-auto object-contain" />
                ) : (
                  <div className="w-12" />
                )}
              </div>
            </div>
          </div>

          {/* BAGIAN 1: KOP HEADER INFORMASI */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
              <Building2 className="h-4 w-4 text-emerald-700" />
              <span>1. Informasi Identitas KOP Surat Laporan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Pemerintah / Instansi Atas (Baris 1):
                </label>
                <input
                  type="text"
                  required
                  value={form.regency}
                  onChange={(e) => setForm({ ...form, regency: e.target.value })}
                  placeholder="Contoh: PEMERINTAH KABUPATEN KAYONG UTARA"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dinas / Lembaga Kesehatan (Baris 2):
                </label>
                <input
                  type="text"
                  value={form.healthService || ''}
                  onChange={(e) => setForm({ ...form, healthService: e.target.value })}
                  placeholder="Contoh: DINAS KESEHATAN DAN KELUARGA BERENCANA"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Rumah Sakit / Faskes Utama (Baris 3):
                </label>
                <input
                  type="text"
                  required
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  placeholder="Contoh: RSUD SULTAN MUHAMMAD JAMALUDIN I"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Unit / Instalasi Laboratorium (Baris 4):
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: INSTALASI PATOLOGI KLINIK & LABORATORIUM TERPADU"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Status Akreditasi / Sertifikasi:
                </label>
                <input
                  type="text"
                  value={form.accreditation}
                  onChange={(e) => setForm({ ...form, accreditation: e.target.value })}
                  placeholder="Contoh: KARS Paripurna Bintang 5"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Rumah Sakit / Laboratorium:
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Contoh: Jl. Provinsi Sukadana - Teluk Batang KM. 3, Sukadana, Kayong Utara 78852"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Telepon / Extension:
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contoh: (0534) 770123 / Ext. 108"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Surel / Email Resmi:
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Contoh: lab.patklin@rsud.go.id"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* LOGO SELECTION & UPLOAD */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Logo Instansi KOP Surat:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="URL Logo atau upload file gambar dari komputer/HP"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
                
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer shrink-0 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Unggah Gambar Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Format: PNG/JPG/SVG. Klik "Unggah Gambar Logo" untuk memilih gambar logo instansi Anda sendiri.
              </p>
            </div>
          </div>

          {/* BAGIAN 2: PEJABAT BERTANDATANGAN */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-100 pb-2">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              <span>2. Penanggung Jawab Bertandatangan Pada Lembar Dokumen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Penanggung Jawab Mutu */}
              <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 space-y-2">
                <span className="font-bold text-emerald-800 block text-[11px]">Penanggung Jawab Mutu (Kanan)</span>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar:</label>
                  <input
                    type="text"
                    required
                    value={form.headOfQuality}
                    onChange={(e) => setForm({ ...form, headOfQuality: e.target.value })}
                    placeholder="Contoh: Siti Rahmawati, S.Tr.Kes"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP:</label>
                  <input
                    type="text"
                    required
                    value={form.qualityNip}
                    onChange={(e) => setForm({ ...form, qualityNip: e.target.value })}
                    placeholder="Contoh: 19850914 201001 2 015"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Penanggung Jawab Laboratorium */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">Penanggung Jawab Laboratorium / Pimpinan (Kiri)</span>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar:</label>
                  <input
                    type="text"
                    required
                    value={form.headOfLab}
                    onChange={(e) => setForm({ ...form, headOfLab: e.target.value })}
                    placeholder="Contoh: dr. Hendra Wijaya, Sp.PK"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP:</label>
                  <input
                    type="text"
                    required
                    value={form.headNip}
                    onChange={(e) => setForm({ ...form, headNip: e.target.value })}
                    placeholder="Contoh: 19800512 200801 1 008"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Simpan KOP Surat & Tanda Tangan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
