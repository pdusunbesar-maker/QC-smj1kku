import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { WestgardRuleConfig, QCResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

interface WestgardRulesViewProps {
  rules: WestgardRuleConfig[];
  onRulesUpdated: (updated: WestgardRuleConfig[]) => void;
  qcResults: QCResult[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const WestgardRulesView: React.FC<WestgardRulesViewProps> = ({
  rules,
  onRulesUpdated,
  qcResults,
  onNavigateToTab,
}) => {
  const { can, user } = useAuth();
  const canConfigure = can('manage_master') || user.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<'config' | 'log'>('config');

  const handleToggle = (key: string) => {
    if (!canConfigure) return;
    const updated = rules.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r);
    onRulesUpdated(updated);
    StorageService.saveWestgardRules(updated);
    StorageService.logAudit(
      'UPDATE_WESTGARD_CONFIG',
      `Konfigurasi Westgard rule ${key} diubah status aktifnya oleh ${user.name}`
    );
  };

  // Collect all violations from results
  const allViolations = qcResults
    .filter(r => r.violations && r.violations.length > 0)
    .flatMap(r => r.violations.map(v => ({ ...v, qcResult: r })))
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  // Count violations per rule
  const ruleCounts = rules.reduce((acc, r) => {
    acc[r.key] = allViolations.filter(v => v.rule === r.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Konfigurasi & Log Pelanggaran Westgard Rules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem evaluasi multirule otomatis untuk mendeteksi kesalahan acak (random error) dan pergeseran sistematik (systematic shift/drift).
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Konfigurasi SOP Aturan ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'log'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Riwayat Pelanggaran ({allViolations.length})
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Fleksibilitas Konfigurasi SOP Westgard Laboratorium
              </p>
              <p className="mt-0.5">
                Setiap laboratorium patologi klinik dapat menyesuaikan algoritma multirule sesuai pedoman mutu internal. Supervisor atau Penanggung Jawab dapat mengaktifkan atau menonaktifkan aturan di bawah. Aturan yang dinonaktifkan tidak akan memicu status Warning atau Reject.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => {
              const count = ruleCounts[rule.key] || 0;
              return (
                <div
                  key={rule.key}
                  className={`rounded-xl border p-4 transition-all bg-white shadow-xs ${
                    rule.enabled
                      ? rule.type === 'reject'
                        ? 'border-rose-200 hover:border-rose-300'
                        : 'border-amber-200 hover:border-amber-300'
                      : 'border-slate-200 opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-slate-900">
                      {rule.name}
                    </span>
                    <button
                      type="button"
                      disabled={!canConfigure}
                      onClick={() => handleToggle(rule.key)}
                      title={canConfigure ? 'Klik untuk toggle aktif/nonaktif' : 'Hanya supervisor/admin'}
                      className="cursor-pointer"
                    >
                      {rule.enabled ? (
                        <ToggleRight className={`h-6 w-6 ${rule.type === 'reject' ? 'text-rose-600' : 'text-amber-600'}`} />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-300" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.type === 'reject' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rule.type === 'reject' ? 'REJECT (TOLAK RUN)' : 'WARNING (PERINGATAN)'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {count}x terdeteksi
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {rule.shortDesc}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    {rule.description}
                  </p>

                  <div className="mt-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-[11px]">
                    <p className="font-semibold text-slate-700">Rekomendasi Tindakan:</p>
                    <p className="text-slate-600 mt-0.5">{rule.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Violation Log Table */
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900">
              Riwayat Kejadian Pelanggaran Aturan Westgard
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Total {allViolations.length} kejadian
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Waktu Kejadian</th>
                  <th className="px-4 py-3">Aturan Westgard</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Parameter & Alat</th>
                  <th className="px-4 py-3 text-right">Nilai Hasil</th>
                  <th className="px-4 py-3">Deskripsi Penyimpangan</th>
                  <th className="px-4 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {allViolations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada catatan pelanggaran Westgard.
                    </td>
                  </tr>
                ) : (
                  allViolations.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                        {v.qcResult.date} {v.qcResult.time}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.ruleName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.type === 'reject' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{v.qcResult.parameterName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{v.qcResult.instrumentName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.qcResult.value} {v.qcResult.unit} ({v.qcResult.sdPosition})
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs">
                        {v.description}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('capa', { fromQc: v.qcResult })}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          Eskalasi CAPA
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
