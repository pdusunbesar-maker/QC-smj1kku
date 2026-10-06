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
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LaboratoryInfo, User } from '../../types';
import { StorageService } from '../../services/storage';
import { MedicalTechVisual } from './MedicalTechVisual';

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAccountsGuide, setShowAccountsGuide] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Remember me state persisted in localStorage
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('lqcms_remember_me') === 'true';
  });

  // Extract clean username for quick selector
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

  // Hydrate users from Supabase / local storage & load remembered username
  useEffect(() => {
    StorageService.syncFromSupabase(() => {
      setAvailableUsers(StorageService.getUsers());
    });
    setAvailableUsers(StorageService.getUsers());

    const savedUsername = localStorage.getItem('lqcms_saved_username');
    if (savedUsername && localStorage.getItem('lqcms_remember_me') === 'true') {
      setIdentifier(savedUsername);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;

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
      if (res.success) {
        setIsSuccess(true);
        // Persist remember me preference
        if (rememberMe) {
          localStorage.setItem('lqcms_remember_me', 'true');
          localStorage.setItem('lqcms_saved_username', identifier.trim());
        } else {
          localStorage.removeItem('lqcms_remember_me');
          localStorage.removeItem('lqcms_saved_username');
        }
      } else {
        setIsLoading(false);
        setErrorMsg(res.message || 'Username atau password tidak sesuai.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Terjadi kesalahan saat otentikasi masuk.');
    }
  };

  const handleSelectAccount = (u: User) => {
    const uUsername = getUserUsername(u);
    setIdentifier(uUsername);
    setPassword('');
    setErrorMsg('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-[#F8FAFC] antialiased selection:bg-[#0B5FA5] selection:text-white md:h-screen md:overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. LEFT PANEL: MEDICAL TECHNOLOGY VISUAL (50% DESKTOP, 45% TABLET)        */}
      {/* ========================================================================= */}
      <div className="hidden md:flex md:w-[45%] lg:w-1/2 h-full shrink-0">
        <MedicalTechVisual labInfo={labInfo} />
      </div>

      {/* MOBILE HEADER BANNER (< 768px) */}
      <div className="md:hidden relative w-full bg-gradient-to-br from-[#061C31] via-[#082B49] to-[#0A385C] text-white px-6 py-8 overflow-hidden shrink-0">
        <div 
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#12A6A6]/20 blur-2xl pointer-events-none"
          aria-hidden="true" 
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white p-2 shadow-lg flex items-center justify-center shrink-0">
              <img
                src={labInfo.logoUrl || '/logo_kayong_utara.png'}
                alt="Logo RSUD SMJ I"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_kayong_utara.png';
                }}
              />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                RSUD SULTAN MUHAMMAD JAMALUDIN I
              </span>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                L-QCMS
              </h1>
              <p className="text-[11px] text-cyan-200/90 font-medium">
                Laboratorium Patologi Klinik
              </p>
            </div>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" title="Sistem Aktif" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT PANEL: ENTERPRISE HEALTHCARE LOGIN FORM                          */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full md:w-[55%] lg:w-1/2 h-full flex flex-col justify-between overflow-y-auto bg-white p-6 sm:p-10 lg:p-14">
        
        {/* Top Spacer / Brand anchor */}
        <div className="hidden md:flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-slate-500">Portal Keamanan Laboratorium</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">v2.5 Enterprise</span>
        </div>

        {/* Center Login Form Container (Max 420px, Perfectly Centered) */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6 sm:py-8 space-y-6">
          
          {/* Header Typography & Branding */}
          <div className="space-y-2">
            {/* Desktop Hospital Logo */}
            <div className="hidden md:flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 shadow-xs flex items-center justify-center shrink-0">
                <img
                  src={labInfo.logoUrl || '/logo_kayong_utara.png'}
                  alt="Lambang Daerah Kayong Utara"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_kayong_utara.png';
                  }}
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  RSUD S.M. JAMALUDIN I
                </p>
                <p className="text-xs font-semibold text-[#0B5FA5]">
                  Laboratorium Patologi Klinik
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
              <Sparkles className="h-3 w-3 text-[#0B5FA5]" />
              <span>Selamat Datang</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Masuk ke L-QCMS
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Silakan masuk untuk melanjutkan ke sistem Laboratory Quality Control Management System.
            </p>
          </div>

          {/* Inline Error Alert */}
          {errorMsg && (
            <div 
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 transition-all animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Autentikasi Gagal</p>
                <p className="text-rose-700 mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Username / Email */}
            <div>
              <label 
                htmlFor="login-identifier" 
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B5FA5] focus:ring-4 focus:ring-[#0B5FA5]/10 focus:outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="login-password" 
                  className="text-xs font-semibold text-slate-800"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B5FA5] focus:ring-4 focus:ring-[#0B5FA5]/10 focus:outline-none transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Remember Me & Security Badge */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B5FA5] focus:ring-[#0B5FA5]/20 cursor-pointer"
                />
                <span className="font-medium text-slate-700">Ingat saya</span>
              </label>

              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Terotentikasi Aman</span>
              </div>
            </div>

            {/* Registered Accounts Quick Profile Selector (Collapsible Drawer) */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => setShowAccountsGuide(!showAccountsGuide)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/70 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <KeyRound className="h-3.5 w-3.5 text-[#0B5FA5]" />
                  <span>Petunjuk Akun Terdaftar</span>
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span>{showAccountsGuide ? 'Tutup' : 'Lihat Profil'}</span>
                  {showAccountsGuide ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {showAccountsGuide && (
                <div className="p-3 pt-1 border-t border-slate-200/70 space-y-2 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    {(availableUsers.length > 0 ? availableUsers.slice(0, 4) : [
                      { id: 'u1', name: 'dr. Hendra Wijaya, Sp.PK', role: 'admin', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80' },
                      { id: 'u2', name: 'Siti Rahmawati, S.Tr.Kes', role: 'supervisor', avatar: 'https://images.unsplash.com/photo-1594824813572-132d733737b3?w=150&auto=format&fit=crop&q=80' },
                      { id: 'u3', name: 'Budi Pratama, A.Md.AK', role: 'analis', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80' },
                      { id: 'u4', name: 'Maya Andriani, S.Kep', role: 'viewer', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80' },
                    ]).map((u) => {
                      const uUsername = getUserUsername(u);
                      const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'supervisor' ? 'Supervisor' : u.role === 'analis' ? 'ATLM' : 'Viewer';
                      const isSelected = identifier.toLowerCase() === uUsername.toLowerCase() || identifier.toLowerCase() === u.role.toLowerCase();

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectAccount(u as User)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#0B5FA5] bg-blue-50/70 text-blue-950 shadow-2xs ring-1 ring-[#0B5FA5]/30' 
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="relative shrink-0">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full" />
                          </div>

                          <div className="flex-1 overflow-hidden min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-slate-900 text-xs truncate">
                                @{uUsername}
                              </span>
                              <span className="text-[9px] px-1 py-0.2 rounded font-semibold shrink-0 bg-slate-100 text-slate-600">
                                {roleLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate block mt-0.5 leading-tight">
                              {u.name.split(',')[0]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 leading-normal">
                    * Klik profil untuk mengisi Username otomatis. Kata sandi tidak ditampilkan demi keamanan akun.
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`w-full h-12 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-600'
                  : 'bg-[#0B5FA5] hover:bg-[#084e88] active:bg-[#063e6e] disabled:bg-[#0B5FA5]/60 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  <span>✓ Berhasil Masuk</span>
                </>
              ) : (
                <>
                  <span>Masuk ke L-QCMS</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info (Clean, subtle, medical enterprise) */}
        <div className="text-center pt-4 border-t border-slate-100 space-y-1">
          <p className="text-xs text-slate-500 font-medium">
            © RSUD Sultan Muhammad Jamaludin I
          </p>
          <p className="text-[11px] text-slate-400">
            Laboratorium Patologi Klinik · Kabupaten Kayong Utara
          </p>
        </div>
      </div>
    </div>
  );
};
