import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RotateCcw, 
  X, 
  ExternalLink,
  ShieldCheck,
  CloudDownload,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  SUPABASE_SQL_SCHEMA 
} from '../../services/supabase';
import { StorageService } from '../../services/storage';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
}) => {
  if (!isOpen) return null;

  const currentConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveConfig = () => {
    saveStoredSupabaseConfig(supabaseUrl, supabaseAnonKey);
    handleTestConnection();
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await StorageService.syncFromSupabase();
    setSyncResult(res);
    setIsSyncing(false);
    if (res.success) {
      onResetData();
    }
  };

  const handlePushToSupabase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await StorageService.pushAllToSupabase();
    setSyncResult(res);
    setIsSyncing(false);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 shadow-2xl space-y-5 my-4 sm:my-8 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Konfigurasi Database Supabase & Sinkronisasi Real-Time
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Sinkronisasi Dua Arah & Real-Time Terintegrasi</p>
            <p className="mt-0.5 text-emerald-800">
              Setiap penambahan data QC, master instrumen, parameter, laporan ketidaksesuaian, CAPA, maupun penghapusan data akan langsung disinkronkan ke tabel database PostgreSQL Supabase secara <em>real-time</em>.
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
            >
              {isTesting ? 'Menguji...' : 'Simpan & Uji Koneksi'}
            </button>

            <button
              type="button"
              disabled={isSyncing || !supabaseUrl}
              onClick={handlePushToSupabase}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
              title="Unggah seluruh master data dan QC lokal ke database Supabase"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Unggah Data Lokal ke Supabase'}</span>
            </button>

            <button
              type="button"
              disabled={isSyncing || !supabaseUrl}
              onClick={handlePullFromSupabase}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
              title="Tarik seluruh data terbaru dari database Supabase"
            >
              <CloudDownload className="h-3.5 w-3.5" />
              <span>Tarik Data Terbaru Supabase</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              syncResult.success
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {syncResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* SQL Schema Preview & One-Click Copy */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-xs text-slate-800">
                Skrip SQL Schema Supabase (18+ Tabel & Relasi)
              </span>
              <p className="text-[11px] text-slate-400">
                Jalankan script ini di SQL Editor dashboard Supabase jika tabel database belum dibuat.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySQL}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              {copiedSQL ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Salin SQL Schema</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-40 overflow-y-auto font-mono text-[10px] text-emerald-400">
            <pre>{SUPABASE_SQL_SCHEMA}</pre>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={onResetData}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Data Standar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
