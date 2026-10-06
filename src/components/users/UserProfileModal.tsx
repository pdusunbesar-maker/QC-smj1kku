import React, { useState, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Building2, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { label: 'Dokter Pria', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80' },
  { label: 'Dokter Wanita', url: 'https://images.unsplash.com/photo-1594824813572-132d733737b3?w=150&auto=format&fit=crop&q=80' },
  { label: 'Petugas ATLM Pria', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80' },
  { label: 'Petugas ATLM Wanita', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser, updateUser, roles } = useAuth();
  
  const [form, setForm] = useState<UserType>({ ...currentUser });
  const [password, setPassword] = useState(currentUser.password || 'password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setForm({ ...currentUser });
      setPassword(currentUser.password || 'password123');
      setIsSuccess(false);
      setErrorMsg('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const currentRoleObj = roles.find(r => r.id === currentUser.role);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto terlalu besar. Maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setForm(prev => ({ ...prev, avatar: evt.target!.result as string }));
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const updatedUser: UserType = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      password: password,
      nip: (form.nip || '').trim(),
      department: (form.department || '').trim(),
    };

    const res = updateUser(updatedUser);
    if (!res.success) {
      setErrorMsg(res.message || 'Gagal memperbarui profil.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-6">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Profil Pengguna & Foto</h3>
              <p className="text-xs text-slate-300">Kelola foto profil, NIP, kata sandi, dan data akun Anda</p>
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          
          {isSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-emerald-800 font-bold animate-pulse">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Foto profil dan data akun Anda berhasil disimpan!</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-300 p-3 text-rose-800 font-semibold">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FOTO PROFIL SECTION */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-center">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Foto Profil Pengguna
            </label>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                {form.avatar ? (
                  <img
                    src={form.avatar}
                    alt={form.name}
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-600 shadow-md"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-slate-900 text-white font-black text-2xl flex items-center justify-center border-2 border-slate-800 shadow-md">
                    {form.name.charAt(0)}
                  </div>
                )}
                
                <label 
                  htmlFor="profile-photo-input" 
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-md hover:bg-emerald-800 cursor-pointer transition-transform group-hover:scale-110"
                  title="Unggah Foto Baru"
                >
                  <Camera className="h-3.5 w-3.5" />
                </label>
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Upload Controls & URL */}
              <div className="space-y-2 text-left flex-1 w-full">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unggah File Foto atau Masukkan URL:
                  </label>
                  <input
                    type="text"
                    value={form.avatar || ''}
                    onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                    placeholder="URL gambar foto profil..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="profile-photo-input"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Pilih Foto dari Komputer / HP</span>
                  </label>
                  
                  {form.avatar && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar: '' })}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold"
                      title="Hapus foto profil"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-[10px] text-slate-500 font-medium block mb-1.5">
                Atau pilih dari foto sampel siap pakai:
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {PRESET_AVATARS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm({ ...form, avatar: p.url })}
                    className={`flex items-center gap-1.5 p-1 rounded-lg border transition-all ${
                      form.avatar === p.url 
                        ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20' 
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="h-6 w-6 rounded-md object-cover" />
                    <span className="text-[10px] text-slate-700 font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* INFORMASI AKUN & PERAN */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIP Pegawai
                </label>
                <input
                  type="text"
                  value={form.nip || ''}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  placeholder="19800512 200801 1 008"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Peran / Role Pengguna (Otorisasi System)
                </label>
                <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold uppercase font-mono text-[11px]">
                  {currentRoleObj?.name || form.role}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Departemen / Unit
                </label>
                <input
                  type="text"
                  value={form.department || ''}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Instalasi Patologi Klinik"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* KATA SANDI */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1">
                Ubah Kata Sandi Akun
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-10 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
              <span>Simpan Foto & Profil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
