import React, { useState, useEffect } from 'react';
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
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

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
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMsg(res.message || 'Username, NIP, atau kata sandi tidak sesuai.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Terjadi kesalahan saat otentikasi masuk.');
    }
  };

  const handleQuickFill = (u: User) => {
    const quickId = u.role === 'admin' ? 'admin' : u.role === 'supervisor' ? 'supervisor' : u.nip || u.email.split('@')[0] || u.name;
    setIdentifier(quickId);
    setPassword(u.password || 'password123');
    setErrorMsg('');
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
              Aplikasi ini dapat diakses oleh siapa saja dengan memilih atau memasukkan Username / NIP dan Kata Sandi terdaftar.
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
                  placeholder="Contoh: admin, supervisor, budi, 19800512..."
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
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Fill Account Selector Box */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Petunjuk Kredensial Akun Terdaftar:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Klik untuk isikan</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(availableUsers.length > 0 ? availableUsers.slice(0, 4) : [
                  { id: 'u1', name: 'dr. Hendra Wijaya, Sp.PK', role: 'admin', nip: '19800512 200801 1 008', password: 'password123' },
                  { id: 'u2', name: 'Siti Rahmawati, S.Tr.Kes', role: 'supervisor', nip: '19850914 201001 2 015', password: 'password123' },
                  { id: 'u3', name: 'Budi Santoso, A.Md.AK', role: 'analis', nip: '19920315 201502 1 004', password: 'password123' },
                  { id: 'u4', name: 'Maya Indriani, S.ST', role: 'viewer', nip: '19940720 201801 2 009', password: 'password123' },
                ]).map((u) => {
                  const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'supervisor' ? 'Supervisor' : u.role === 'analis' ? 'ATLM' : 'Viewer';
                  const isSelected = identifier.toLowerCase() === u.role || (u.nip && identifier.includes(u.nip.slice(0, 6)));
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickFill(u as User)}
                      className={`flex flex-col text-left p-2 rounded-lg border transition-all ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-semibold shadow-2xs' 
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] w-full">
                        <span className="font-bold text-slate-900 truncate">{u.name.split(',')[0]}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-100 font-mono text-slate-600 shrink-0">{roleLabel}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono truncate mt-0.5">
                        Pass: {u.password || 'password123'}
                      </span>
                    </button>
                  );
                })}
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
