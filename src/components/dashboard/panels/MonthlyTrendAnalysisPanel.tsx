import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  BarChart2, 
  ShieldCheck, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { QCResult, Instrument, Parameter } from '../../../types';

interface MonthlyTrendAnalysisPanelProps {
  qcResults: QCResult[];
  instruments: Instrument[];
  parameters: Parameter[];
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

const INDONESIAN_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MonthlyTrendAnalysisPanel: React.FC<MonthlyTrendAnalysisPanelProps> = ({
  qcResults,
  instruments,
  parameters,
  onNavigateToTab,
}) => {
  // Violation metric selection: 'reject_only' (Reject / >3SD) or 'reject_and_warning' (Reject + Warning / >2SD)
  const [violationMode, setViolationMode] = useState<'reject_and_warning' | 'reject_only'>('reject_and_warning');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('all');

  // Filter QC Results by selected instrument
  const filteredResults = useMemo(() => {
    if (selectedInstrumentId === 'all') return qcResults;
    return qcResults.filter(r => r.instrumentId === selectedInstrumentId);
  }, [qcResults, selectedInstrumentId]);

  // Determine Current Month and Last Month
  const trendPeriod = useMemo(() => {
    const now = new Date();
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get all unique months available in data, sorted descending
    const availableMonths = Array.from(new Set(filteredResults.map(r => r.date.substring(0, 7))))
      .filter(m => m.length === 7)
      .sort()
      .reverse();

    let thisMonthKey = availableMonths.includes(currentYYYYMM) ? currentYYYYMM : (availableMonths[0] || currentYYYYMM);
    
    // Determine last month key
    let lastMonthKey = '';
    if (availableMonths.length > 1) {
      const thisIdx = availableMonths.indexOf(thisMonthKey);
      if (thisIdx !== -1 && thisIdx + 1 < availableMonths.length) {
        lastMonthKey = availableMonths[thisIdx + 1];
      } else {
        lastMonthKey = availableMonths[1];
      }
    } else {
      // Fallback: calculate prior calendar month
      const [y, m] = thisMonthKey.split('-').map(Number);
      const priorDate = new Date(y, m - 2, 1);
      lastMonthKey = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const formatMonthLabel = (ym: string) => {
      if (!ym || ym.length < 7) return '-';
      const [y, m] = ym.split('-').map(Number);
      if (isNaN(y) || isNaN(m)) return ym;
      return `${INDONESIAN_MONTHS_FULL[m - 1]} ${y}`;
    };

    return {
      thisMonthKey,
      lastMonthKey,
      thisMonthLabel: formatMonthLabel(thisMonthKey),
      lastMonthLabel: formatMonthLabel(lastMonthKey),
    };
  }, [filteredResults]);

  // Monthly aggregated statistics
  const monthlyStats = useMemo(() => {
    const isViolation = (r: QCResult) => {
      if (violationMode === 'reject_only') {
        return r.status === 'reject';
      }
      return r.status === 'reject' || r.status === 'warning';
    };

    const thisMonthRuns = filteredResults.filter(r => r.date.startsWith(trendPeriod.thisMonthKey));
    const lastMonthRuns = filteredResults.filter(r => r.date.startsWith(trendPeriod.lastMonthKey));

    // Current Month Counts
    const thisMonthTotal = thisMonthRuns.length;
    const thisMonthViolations = thisMonthRuns.filter(isViolation).length;
    const thisMonthRejects = thisMonthRuns.filter(r => r.status === 'reject').length;
    const thisMonthWarnings = thisMonthRuns.filter(r => r.status === 'warning').length;
    const thisMonthPasses = thisMonthRuns.filter(r => r.status === 'pass').length;
    const thisMonthViolationRate = thisMonthTotal > 0 ? (thisMonthViolations / thisMonthTotal) * 100 : 0;

    // Last Month Counts
    const lastMonthTotal = lastMonthRuns.length;
    const lastMonthViolations = lastMonthRuns.filter(isViolation).length;
    const lastMonthRejects = lastMonthRuns.filter(r => r.status === 'reject').length;
    const lastMonthWarnings = lastMonthRuns.filter(r => r.status === 'warning').length;
    const lastMonthPasses = lastMonthRuns.filter(r => r.status === 'pass').length;
    const lastMonthViolationRate = lastMonthTotal > 0 ? (lastMonthViolations / lastMonthTotal) * 100 : 0;

    // Deltas
    const deltaRate = thisMonthViolationRate - lastMonthViolationRate; // percentage points
    const relChangePercent = lastMonthViolationRate > 0 
      ? ((thisMonthViolationRate - lastMonthViolationRate) / lastMonthViolationRate) * 100 
      : 0;

    return {
      thisMonthTotal,
      thisMonthViolations,
      thisMonthRejects,
      thisMonthWarnings,
      thisMonthPasses,
      thisMonthViolationRate,

      lastMonthTotal,
      lastMonthViolations,
      lastMonthRejects,
      lastMonthWarnings,
      lastMonthPasses,
      lastMonthViolationRate,

      deltaRate,
      relChangePercent,
    };
  }, [filteredResults, trendPeriod, violationMode]);

  // Per-parameter trend breakdown
  const paramBreakdown = useMemo(() => {
    const isViolation = (r: QCResult) => {
      if (violationMode === 'reject_only') return r.status === 'reject';
      return r.status === 'reject' || r.status === 'warning';
    };

    return parameters.map(param => {
      const thisRuns = filteredResults.filter(r => r.parameterId === param.id && r.date.startsWith(trendPeriod.thisMonthKey));
      const lastRuns = filteredResults.filter(r => r.parameterId === param.id && r.date.startsWith(trendPeriod.lastMonthKey));

      const thisTotal = thisRuns.length;
      const thisViolations = thisRuns.filter(isViolation).length;
      const thisRate = thisTotal > 0 ? (thisViolations / thisTotal) * 100 : 0;

      const lastTotal = lastRuns.length;
      const lastViolations = lastRuns.filter(isViolation).length;
      const lastRate = lastTotal > 0 ? (lastViolations / lastTotal) * 100 : 0;

      const diff = thisRate - lastRate;

      return {
        param,
        thisTotal,
        thisViolations,
        thisRate,
        lastTotal,
        lastViolations,
        lastRate,
        diff,
      };
    }).filter(item => item.thisTotal > 0 || item.lastTotal > 0)
      .sort((a, b) => b.thisRate - a.thisRate);
  }, [parameters, filteredResults, trendPeriod, violationMode]);

  // Status interpretation helper
  const isImproved = monthlyStats.deltaRate < 0;
  const isWorsened = monthlyStats.deltaRate > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 text-[#0B5FA5] flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Analisis Tren Out of Range (Bulan Ini vs Bulan Lalu)
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B5FA5] border border-blue-200 font-mono">
              Quality Delta Index
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Monitoring perubahan tingkat deviasi / pelanggaran QC untuk evaluasi stabilitas analitik laboratorium secara cepat.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Violation Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViolationMode('reject_and_warning')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                violationMode === 'reject_and_warning'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Range (Reject & Warn)
            </button>
            <button
              type="button"
              onClick={() => setViolationMode('reject_only')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                violationMode === 'reject_only'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hanya Reject (&gt;3SD)
            </button>
          </div>

          {/* Instrument Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Alat Lab</option>
              {instruments.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metric Cards Comparison Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Last Month */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
            <span>Bulan Lalu ({trendPeriod.lastMonthLabel})</span>
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {monthlyStats.lastMonthViolationRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              pelanggaran QC
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/80">
            <div className="flex justify-between font-mono">
              <span>Total Uji:</span>
              <strong className="text-slate-800">{monthlyStats.lastMonthTotal} run</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>Total Violation:</span>
              <strong className="text-rose-600">{monthlyStats.lastMonthViolations} hasil ({monthlyStats.lastMonthRejects} Reject, {monthlyStats.lastMonthWarnings} Warn)</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>Hasil Lolos (Pass):</span>
              <strong className="text-emerald-700">{monthlyStats.lastMonthPasses} ({(100 - monthlyStats.lastMonthViolationRate).toFixed(1)}%)</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Current Month */}
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-[#0B5FA5] uppercase tracking-wider font-mono">
            <span>Bulan Ini ({trendPeriod.thisMonthLabel})</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold">
              Aktif
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0B5FA5] font-mono">
              {monthlyStats.thisMonthViolationRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-600 font-medium">
              pelanggaran QC
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-blue-200/80">
            <div className="flex justify-between font-mono">
              <span>Total Uji:</span>
              <strong className="text-slate-900">{monthlyStats.thisMonthTotal} run</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>Total Violation:</span>
              <strong className="text-rose-600">{monthlyStats.thisMonthViolations} hasil ({monthlyStats.thisMonthRejects} Reject, {monthlyStats.thisMonthWarnings} Warn)</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>Hasil Lolos (Pass):</span>
              <strong className="text-emerald-700">{monthlyStats.thisMonthPasses} ({(100 - monthlyStats.thisMonthViolationRate).toFixed(1)}%)</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Delta & Trend Direction */}
        <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 relative overflow-hidden ${
          isImproved 
            ? 'bg-emerald-50/60 border-emerald-200' 
            : isWorsened 
            ? 'bg-rose-50/60 border-rose-200' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider font-mono">
            <span className={isImproved ? 'text-emerald-800' : isWorsened ? 'text-rose-800' : 'text-slate-600'}>
              Perubahan Stabilitas (Delta)
            </span>
            {isImproved ? (
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            ) : isWorsened ? (
              <TrendingUp className="h-5 w-5 text-rose-600" />
            ) : (
              <Minus className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${
              isImproved ? 'text-emerald-700' : isWorsened ? 'text-rose-700' : 'text-slate-800'
            }`}>
              {monthlyStats.deltaRate > 0 ? `+${monthlyStats.deltaRate.toFixed(1)}%` : `${monthlyStats.deltaRate.toFixed(1)}%`}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              poin persentase
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {isImproved ? (
                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Stabilitas Membaik (Tingkat Eror Turun)
                </span>
              ) : isWorsened ? (
                <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Peningkatan Pelanggaran / Deviat
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Kualitas Stabil / Sama
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              {isImproved ? (
                <>Persentase pelanggaran QC bulan ini <strong>turun {Math.abs(monthlyStats.deltaRate).toFixed(1)}%</strong> dibanding bulan lalu, menandakan peningkatan presisi analitik alat.</>
              ) : isWorsened ? (
                <>Persentase pelanggaran QC bulan ini <strong>naik {monthlyStats.deltaRate.toFixed(1)}%</strong> dibanding bulan lalu, memerlukan evaluasi kalibrasi & Reagen.</>
              ) : (
                <>Tingkat error QC konsisten antara bulan ini dan bulan lalu.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Per-Parameter Trend Analysis Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0B5FA5]" />
            <span>Rincian Tren Stabilitas per Parameter Pemeriksaan</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            {paramBreakdown.length} Parameter Aktif
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold font-mono text-[11px]">
                <th className="py-2.5 px-3">Parameter & Kode</th>
                <th className="py-2.5 px-3 text-center">Bulan Lalu ({trendPeriod.lastMonthLabel})</th>
                <th className="py-2.5 px-3 text-center">Bulan Ini ({trendPeriod.thisMonthLabel})</th>
                <th className="py-2.5 px-3 text-center">Selisih (Delta Rate)</th>
                <th className="py-2.5 px-3 text-center">Arah Stabilitas</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paramBreakdown.map(({ param, thisTotal, thisViolations, thisRate, lastTotal, lastViolations, lastRate, diff }) => {
                const paramImproved = diff < 0;
                const paramWorsened = diff > 0;

                return (
                  <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{param.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {param.code} · Target: {param.targetMean} {param.unit}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <div className="font-bold text-slate-800">{lastRate.toFixed(1)}%</div>
                      <div className="text-[10px] text-slate-400">{lastViolations}/{lastTotal} run</div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      <div className={`font-bold ${thisRate > 15 ? 'text-rose-600' : thisRate > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {thisRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400">{thisViolations}/{thisTotal} run</div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        paramImproved 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : paramWorsened 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {paramImproved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <ArrowDownRight className="h-4 w-4 text-emerald-600" /> Membaik
                        </span>
                      ) : paramWorsened ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                          <ArrowUpRight className="h-4 w-4 text-rose-600" /> Meningkat (Perlu Cek)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Minus className="h-4 w-4 text-slate-400" /> Konstan
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('levey-jennings', { parameterId: param.id })}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#0B5FA5] hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Grafik LJ</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
