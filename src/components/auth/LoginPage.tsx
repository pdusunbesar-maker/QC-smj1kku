import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LaboratoryInfo } from '../../types';

interface LoginPageProps {
  labInfo: LaboratoryInfo;
}

export const LoginPage: React.FC<LoginPageProps> = ({ labInfo }) => {
  const { loginWithCredentials } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Instant synchronous authentication
    const res = loginWithCredentials(identifier, password);
    if (!res.success) {
      setErrorMsg(res.message || 'Username, NIP, atau kata sandi tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen bg-[#041a18] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      {/* Container Card matching official design */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white border border-emerald-950/30">
        
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
              Gunakan akun resmi Ahli Teknologi Laboratorium Medik (ATLM) atau dokter penanggung jawab laboratorium
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
                Username atau NIP
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan Username atau NIP"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all"
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
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-all"
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#008f75] hover:bg-[#007a64] active:bg-[#006e5a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-[0.99] mt-2"
            >
              <span>Masuk ke Aplikasi QC</span>
              <ArrowRight className="h-4 w-4" />
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
