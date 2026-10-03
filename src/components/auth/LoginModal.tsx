import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LaboratoryInfo } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  labInfo: LaboratoryInfo;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  labInfo,
}) => {
  if (!isOpen) return null;

  const { user: currentUser, isAuthenticated, loginWithCredentials, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = loginWithCredentials(identifier, password);
    if (!res.success) {
      setErrorMsg(res.message || 'Gagal masuk. Periksa kembali username atau NIP Anda.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white my-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-black/40 hover:text-white transition-colors"
          title="Tutup menu login"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 1. Dark Teal Hospital Header Section */}
        <div className="bg-gradient-to-b from-[#082b27] via-[#0b3530] to-[#062421] px-6 pt-7 pb-6 text-center text-white relative">
          {/* Official Emblem Container: White Squircle Badge */}
          <div className="flex justify-center mb-3">
            <div className="w-24 h-24 aspect-square rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center mx-auto">
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

          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
            PEMERINTAH KABUPATEN KAYONG UTARA
          </p>

          <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 uppercase">
            {labInfo.hospitalName || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 mt-0.5">
            Laboratorium Patologi Klinik
          </p>
        </div>

        {/* 2. White Form Body Section */}
        <div className="p-6 sm:p-8 space-y-5 bg-white">
          <div className="text-center space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Masuk ke Sistem Kendali Mutu (QC)
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Gunakan akun resmi Ahli Teknologi Laboratorium Medik (ATLM) atau dokter penanggung jawab laboratorium
            </p>
          </div>

          {/* Current status if already logged in */}
          {isAuthenticated && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-emerald-950">Sedang aktif: </span>
                  <span className="text-emerald-800">{currentUser.name} ({currentUser.role})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#008f75] hover:bg-[#007a64] active:bg-[#006e5a] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Masuk ke Aplikasi QC</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
