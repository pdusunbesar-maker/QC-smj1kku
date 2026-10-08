import React, { useState } from 'react';
import { 
  Zap, 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  Wrench, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Info, 
  RefreshCw,
  Plus,
  Flame,
  Gauge
} from 'lucide-react';
import { EarlyTrendFinding } from '../../../services/runningAverageAlertService';
import { StorageService } from '../../../services/storage';

interface ProactiveRecommendationsPanelProps {
  earlyWarnings: EarlyTrendFinding[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

export const ProactiveRecommendationsPanel: React.FC<ProactiveRecommendationsPanelProps> = ({
  earlyWarnings,
  onNavigateToTab,
  onRefreshData,
}) => {
  // States to keep track of simulated actions on the client-side
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [successActionMsg, setSuccessActionMsg] = useState<{ [key: string]: string }>({});

  const activeWarnings = earlyWarnings.filter(w => w.status === 'warning' || w.status === 'critical');

  const handleSimulatedAction = (findingId: string, actionType: 'recalibrate' | 'replace_reagent', paramCode: string, instName: string) => {
    setExecutingActionId(`${findingId}-${actionType}`);
    
    setTimeout(() => {
      // Add log in Audit Trail
      const actionName = actionType === 'recalibrate' ? 'RE-KALIBRASI' : 'GANTI REAGEN';
      const detailMsg = actionType === 'recalibrate' 
        ? `Re-kalibrasi instrumen otomatis di-request untuk parameter ${paramCode} pada alat ${instName} via Dashboard Rekomendasi Proaktif.`
        : `Penggantian reagen harian dicatat untuk parameter ${paramCode} pada alat ${instName} via Dashboard Rekomendasi Proaktif.`;
      
      try {
        StorageService.logAudit(
          'UPDATE_MASTER_DATA',
          `[PROAKTIF] ${detailMsg}`
        );
      } catch (e) {
        console.error('Failed to log proactive action:', e);
      }

      setSuccessActionMsg(prev => ({
        ...prev,
        [`${findingId}-${actionType}`]: actionType === 'recalibrate' 
          ? `✓ Re-kalibrasi untuk ${paramCode} berhasil di-request!` 
          : `✓ Penggantian reagen ${paramCode} berhasil dicatat!`
      }));
      setExecutingActionId(null);
      
      if (onRefreshData) {
        onRefreshData();
      }
    }, 1200);
  };

  if (activeWarnings.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-150 bg-[#F4FBF7] p-5 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
              Rekomendasi Mutu Proaktif: Sistem Normal & Stabil
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Algoritma pemantauan real-time tidak mendeteksi adanya tren pergeseran (shift) atau drift linear pada alat analitik.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header with warning state */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5 animate-pulse">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                Notifikasi & Rekomendasi Tindakan Proaktif (Early Warning)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <Flame className="h-3 w-3 text-amber-600" />
                {activeWarnings.length} Potensi Pergeseran
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Algoritma mendeteksi kecenderungan pergeseran analitis (shift) atau drift linear bertahap sebelum pelanggaran aturan penolakan Westgard terjadi.
            </p>
          </div>
        </div>
      </div>

      {/* Warning Cards and Recommendations */}
      <div className="grid grid-cols-1 gap-4">
        {activeWarnings.map((warning, idx) => {
          const findingId = `${warning.parameter.id}-${warning.controlLevel}`;
          const isShift = warning.activeShiftStreak >= 6;
          const isTrend = warning.activeTrendStreak >= 6;
          const isRegression = !isShift && !isTrend && Math.abs(warning.correlation) >= 0.70;
          const isHigh = warning.shiftDirection === 'above' || warning.slope > 0;

          return (
            <div 
              key={findingId}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition-all hover:border-amber-300 hover:bg-slate-50"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                
                {/* Left side: Information and Analysis */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {warning.parameter.name}
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {warning.parameter.code}
                    </span>
                    <span className="text-xs text-slate-500">
                      · {warning.instrument?.name || 'Alat Lab'}
                    </span>
                    <span className="text-xs font-bold text-[#0B5FA5] bg-blue-50 px-2 py-0.5 rounded">
                      {warning.controlLevel}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {warning.statusLabel}
                    </span>
                  </div>

                  {/* Math/Stat indicators */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                    {warning.activeShiftStreak > 0 && (
                      <span>Shift: <strong>{warning.activeShiftStreak}x</strong> berurutan ({warning.shiftDirection === 'above' ? 'Di Atas Mean' : 'Di Bawah Mean'})</span>
                    )}
                    {warning.activeTrendStreak > 0 && (
                      <span>Trend: <strong>{warning.activeTrendStreak}x</strong> berurutan ({warning.trendDirection === 'increasing' ? 'Naik' : 'Turun'})</span>
                    )}
                    {warning.slope !== 0 && (
                      <span>Slope: <strong>{warning.slope > 0 ? '+' : ''}{warning.slope.toFixed(4)} SD/run</strong></span>
                    )}
                  </div>

                  {/* Diagnostic reason */}
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                    <strong className="text-slate-800 font-bold">Analisis Diagnostik: </strong>
                    {warning.reason}
                  </p>

                  {/* Recommendation block */}
                  <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100 text-xs text-slate-700 space-y-1">
                    <strong className="text-blue-900 font-bold flex items-center gap-1 uppercase text-[10px] tracking-wider font-mono">
                      <Info className="h-3.5 w-3.5 text-blue-600" />
                      Rekomendasi Tindakan Korektif Instan:
                    </strong>
                    <p className="leading-relaxed font-sans">{warning.recommendation}</p>
                  </div>
                </div>

                {/* Right side: Instant Corrective Actions (Functional Buttons) */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-48 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block lg:text-right">
                    Tindakan Perbaikan Instan
                  </span>

                  {/* Re-calibration action button */}
                  {successActionMsg[`${findingId}-recalibrate`] ? (
                    <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 text-center">
                      {successActionMsg[`${findingId}-recalibrate`]}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={executingActionId !== null}
                      onClick={() => handleSimulatedAction(findingId, 'recalibrate', warning.parameter.code, warning.instrument?.name || 'Alat Lab')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs"
                    >
                      {executingActionId === `${findingId}-recalibrate` ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="h-3.5 w-3.5 text-[#0B5FA5]" />
                          <span>Request Re-Kalibrasi</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Reagent replacement action button */}
                  {successActionMsg[`${findingId}-replace_reagent`] ? (
                    <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 text-center">
                      {successActionMsg[`${findingId}-replace_reagent`]}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={executingActionId !== null}
                      onClick={() => handleSimulatedAction(findingId, 'replace_reagent', warning.parameter.code, warning.instrument?.name || 'Alat Lab')}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs"
                    >
                      {executingActionId === `${findingId}-replace_reagent` ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Penggantian Reagen</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Evaluate on LJ */}
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('levey-jennings', { parameterId: warning.parameter.id })}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Evaluasi LJ Chart</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {/* Escalate to CAPA */}
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('capa', { 
                      parameterId: warning.parameter.id, 
                      parameterName: warning.parameter.name,
                      prefill: {
                        source: 'Non-Conformity',
                        department: warning.instrument?.location || 'Laboratorium',
                        pic: 'Supervisor On-Duty',
                        problemStatement: `Potensi pergeseran analitis (early warning) pada parameter ${warning.parameter.name} (${warning.parameter.code}) di alat ${warning.instrument?.name || 'Alat Lab'}.`,
                        nonConformityDescription: `Terdeteksi pergeseran/tren proaktif: ${warning.reason}. Hal ini memerlukan rencana tindakan pencegahan untuk mencegah pelanggaran Westgard dan menjamin mutu analitis harian.`,
                      }
                    })}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Terbitkan CAPA</span>
                  </button>

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
