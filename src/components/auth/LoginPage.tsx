import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Users,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LaboratoryInfo, User } from '../../types';
import { StorageService } from '../../services/storage';

interface LoginPageProps {
  labInfo: LaboratoryInfo;
}

export const LoginPage: React.FC<LoginPageProps> = ({ labInfo }) => {
  const { loginWithCredentials } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract clean username for each user
  const getUserUsername = (u: { name: string; role: string; email?: string; nip?: string }) => {
    if (u.role === 'admin') return 'admin';
    if (u.role === 'supervisor') return 'supervisor';
    if (u.role === 'analis') {
      if (u.name.toLowerCase().includes('budi')) return 'budi';
      return 'analis';
    }
    if (u.role === 'viewer') {
      if (u.name.toLowerCase().includes('maya')) return 'maya';
      return 'viewer';
    }
    if (u.email) return u.email.split('@')[0];
    return u.role;
  };

  // Hydrate fresh user credentials from Supabase when opening Login Page on any device
  useEffect(() => {
    StorageService.syncFromSupabase(() => {
      setAvailableUsers(StorageService.getUsers());
    });
    setAvailableUsers(StorageService.getUsers());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Silakan pilih atau masukkan Username/NIP.');
      return;
    }

    if (!password || password.trim() === '') {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginWithCredentials(identifier.trim(), password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Username, NIP, atau kata sandi tidak sesuai.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Terjadi kesalahan saat otentikasi masuk.');
    }
  };

  const handleSelectAccount = (u: User) => {
    const uUsername = getUserUsername(u);
    setIdentifier(uUsername);
    setPassword(''); // Password dikosongkan agar diisi manual oleh petugas yang mau login
    setErrorMsg('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#041a18] flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      {/* Container Card matching official design */}
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white border border-emerald-950/30">
        
        {/* 1. Dark Teal Hospital Header Section */}
        <div className="bg-gradient-to-b from-[#082d29] via-[#0a3833] to-[#05211e] px-6 pt-7 pb-6 text-center text-white">
          
          {/* Logo container: White rounded squircle badge */}
          <div className="flex justify-center mb-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 aspect-square rounded-2xl bg-white shadow-xl flex items-center justify-center p-3 mx-auto shrink-0">
              <img
                src={labInfo.logoUrl || '/Lambang_Daerah_Kab._Kayong_Utara.png'}
                alt="Lambang Daerah Kabupaten Kayong Utara"
                className="max-h-full max-w-full w-auto h-auto object-contain block drop-shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Lambang_Daerah_Kab._Kayong_Utara.png';
                }}
              />
            </div>
          </div>

          {/* Subtitle in bright emerald/cyan */}
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
            PEMERINTAH KABUPATEN KAYONG UTARA
          </p>

          {/* Main Hospital Name */}
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 uppercase">
            {labInfo.hospitalName || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'}
          </h1>

          {/* Department Name */}
          <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 mt-0.5">
            Laboratorium Patologi Klinik
          </p>
        </div>

        {/* 2. White Form Section */}
        <div className="p-6 sm:p-8 space-y-5 bg-white">
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Masuk ke Sistem Kendali Mutu (QC)
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Silakan pilih profil akun atau ketik Username/NIP, lalu masukkan kata sandi Anda.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Field 1: Username atau NIP */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 text-xs">
                Username atau NIP Pengguna
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Pilih dari petunjuk di bawah atau ketik username..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Field 2: Kata Sandi */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 text-xs">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Petunjuk Kredensial Akun Terdaftar (Hanya Username & Foto Profil, Tanpa Password) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Petunjuk Kredensial Akun Terdaftar:</span>
                </span>
              </div>

              {/* Grid Akun Terdaftar: Foto Profil & Username Saja (Tanpa Password) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {(availableUsers.length > 0 ? availableUsers.slice(0, 4) : [
                  { id: 'u1', name: 'dr. Hendra Wijaya, Sp.PK', role: 'admin', nip: '19800512 200801 1 008', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80' },
                  { id: 'u2', name: 'Siti Rahmawati, S.Tr.Kes', role: 'supervisor', nip: '19850914 201001 2 015', avatar: 'https://images.unsplash.com/photo-1594824813572-132d733737b3?w=150&auto=format&fit=crop&q=80' },
                  { id: 'u3', name: 'Budi Pratama, A.Md.AK', role: 'analis', nip: '19930720 201802 1 003', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80' },
                  { id: 'u4', name: 'Maya Andriani, S.Kep', role: 'viewer', nip: '19950910 202001 2 005', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80' },
                ]).map((u) => {
                  const uUsername = getUserUsername(u);
                  const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'supervisor' ? 'Supervisor' : u.role === 'analis' ? 'ATLM' : 'Viewer';
                  const isSelected = identifier.toLowerCase() === uUsername.toLowerCase() || identifier.toLowerCase() === u.role.toLowerCase() || (u.nip && identifier.includes(u.nip.slice(0, 6)));

                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectAccount(u as User)}
                      className={`group flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-xs ring-1 ring-emerald-500' 
                          : 'border-slate-200 bg-white hover:bg-slate-100/90 hover:border-slate-300 text-slate-700'
                      }`}
                      title={`Pilih username @${uUsername}`}
                    >
                      {/* Poto Profil */}
                      <div className="relative shrink-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                      </div>

                      {/* Username Petugas (Hanya Username & Foto, Tanpa Password) */}
                      <div className="flex-1 overflow-hidden min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-slate-900 text-xs truncate">
                            @{uUsername}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold shrink-0 bg-slate-100 text-slate-600">
                            {roleLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block mt-0.5 leading-tight font-medium">
                          {u.name.split(',')[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Catatan Keamanan */}
              <div className="pt-2 border-t border-slate-200/70 flex items-start gap-1.5 text-[10px] text-slate-500 leading-normal">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Klik profil untuk mengisi <strong>Username</strong> otomatis. Password <strong>tidak ditampilkan</strong> demi keamanan akun.
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#008f75] hover:bg-[#007a64] active:bg-[#006e5a] disabled:bg-[#008f75]/60 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-[0.99] mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Aplikasi QC</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Instalasi Patologi Klinik & Laboratorium Terpadu<br />
              RSUD Sultan Muhammad Jamaludin I
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
