import React, { useState, useMemo } from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  ExternalLink, 
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  RefreshCw,
  Wrench,
  FlaskConical,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import { QCResult, Parameter, Instrument } from '../../../types';
import { 
  RunningAverageAlertService, 
  RunningAverageAlert, 
  DailyAveragePoint 
} from '../../../services/runningAverageAlertService';

interface AutomatedRunningAverageAlertsPanelProps {
  qcResults: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
  onNavigateToTab?: (tab: string, payload?: any) => void;
}

export const AutomatedRunningAverageAlertsPanel: React.FC<AutomatedRunningAverageAlertsPanelProps> = ({
  qcResults,
  parameters,
  instruments,
  onNavigateToTab,
}) => {
  // Threshold options
  const [thresholdSD, setThresholdSD] = useState<number>(1.0);
  const [consecutiveDays, setConsecutiveDays] = useState<number>(3);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean>(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => 
    RunningAverageAlertService.getAcknowledgedAlertIds()
  );

  // Selected alert for detailed modal
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<RunningAverageAlert | null>(null);

  // Calculate alerts dynamically
  const allAlerts = useMemo(() => {
    return RunningAverageAlertService.detectRunningAverageAlerts(
      qcResults,
      parameters,
      instruments,
      {
        thresholdSD,
        consecutiveDays,
      }
    );
  }, [qcResults, parameters, instruments, thresholdSD, consecutiveDays]);

  // Filtered alerts
  const displayedAlerts = useMemo(() => {
    if (activeOnlyFilter) {
      return allAlerts.filter(a => a.isActive);
    }
    return allAlerts;
  }, [allAlerts, activeOnlyFilter]);

  const activeAlertsCount = useMemo(() => {
    return allAlerts.filter(a => a.isActive).length;
  }, [allAlerts]);

  const handleAcknowledge = (alertId: string) => {
    if (acknowledgedIds.includes(alertId)) {
      RunningAverageAlertService.unacknowledgeAlert(alertId);
      setAcknowledgedIds(prev => prev.filter(id => id !== alertId));
    } else {
      RunningAverageAlertService.acknowledgeAlert(alertId);
      setAcknowledgedIds(prev => [...prev, alertId]);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5">
            <BellRing className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                Sistem Peringatan Otomatis: Pergeseran Running Average QC
              </h3>
              {activeAlertsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                  {activeAlertsCount} Parameter Kritis
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Semua Parameter Normal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendeteksi pergeseran analitik sistematis saat rata-rata berjalan (running average) melampaui ambang batas SD selama minimal {consecutiveDays} hari berturut-turut.
            </p>
          </div>
        </div>

        {/* Configuration Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Batas SD:</span>
            <select
              value={thresholdSD}
              onChange={(e) => setThresholdSD(parseFloat(e.target.value))}
              aria-label="Pilih ambang batas standar deviasi"
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value={1.0}>≥ 1.0 SD (Standar)</option>
              <option value={1.5}>≥ 1.5 SD (Ketat)</option>
              <option value={2.0}>≥ 2.0 SD (Kritis)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-600 font-medium">Durasi:</span>
            <select
              value={consecutiveDays}
              onChange={(e) => setConsecutiveDays(parseInt(e.target.value, 10))}
              aria-label="Pilih durasi hari berturut-turut"
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value={3}>3 Hari Berturut-turut</option>
              <option value={4}>4 Hari Berturut-turut</option>
              <option value={5}>5 Hari Berturut-turut</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setActiveOnlyFilter(!activeOnlyFilter)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors border ${
              activeOnlyFilter 
                ? 'bg-rose-50 text-rose-700 border-rose-300' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {activeOnlyFilter ? 'Hanya Aktif' : 'Semua'}
          </button>
        </div>
      </div>

      {/* Alert Cards List */}
      {displayedAlerts.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Pergeseran Running Average Terdeteksi</h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Semua parameter laboratorium berada dalam batas variasi acak yang diizinkan (&lt; {thresholdSD} SD) selama periode {consecutiveDays} hari berturut-turut.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {displayedAlerts.map(alert => {
            const isAck = acknowledgedIds.includes(alert.id);
            const isHigh = alert.direction === 'positive_shift';

            return (
              <div 
                key={alert.id}
                className={`rounded-xl border p-4 transition-all ${
                  alert.isActive
                    ? 'border-rose-300 bg-linear-to-r from-rose-50/70 via-white to-amber-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } ${isAck ? 'opacity-75' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  
                  {/* Left: Parameter Info & Direction */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {alert.parameterName}
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {alert.parameterCode} ({alert.unit})
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        · {alert.instrumentName}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {alert.controlLevel}
                      </span>

                      {/* Status Badges */}
                      {alert.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          Aktif ({alert.consecutiveDaysCount} Hari Berturut-turut)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Riwayat Lampau
                        </span>
                      )}

                      {isAck && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Ditinjau
                        </span>
                      )}
                    </div>

                    {/* Summary Statement */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                        isHigh ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        {isHigh ? <TrendingUp className="h-3.5 w-3.5 text-amber-700" /> : <TrendingDown className="h-3.5 w-3.5 text-blue-700" />}
                        <span>{isHigh ? 'Bias Positif (+ Shift)' : 'Bias Negatif (- Shift)'}</span>
                      </div>
                      <span className="text-slate-700 font-medium">
                        Running Avg Terakhir: <strong className="font-mono text-slate-900">{alert.latestRunningMean} {alert.unit}</strong> (
                        <strong className="font-mono text-rose-600">{alert.latestZScore > 0 ? `+${alert.latestZScore}` : alert.latestZScore} SD</strong>)
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500">
                        Target Mean: <span className="font-mono">{alert.targetMean}</span> ± SD: <span className="font-mono">{alert.targetSD}</span>
                      </span>
                    </div>

                    {/* 3-Day Stepper Timeline */}
                    <div className="pt-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Kronologi {alert.consecutiveDaysCount} Hari Berturut-turut:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {alert.dailyPoints.map((pt, idx) => (
                          <div 
                            key={pt.date} 
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                              <span>Hari ke-{idx + 1} ({formatDateIndo(pt.date)})</span>
                              <span className="font-mono text-rose-600 font-bold">
                                {pt.zScore > 0 ? `+${pt.zScore}` : pt.zScore} SD
                              </span>
                            </div>
                            <div className="mt-1 flex items-baseline justify-between font-mono">
                              <span className="text-[11px] text-slate-500">Avg Harian:</span>
                              <span className="font-bold text-slate-900">{pt.dailyMean}</span>
                            </div>
                            <div className="flex items-baseline justify-between font-mono text-[11px]">
                              <span className="text-slate-500">Running Avg:</span>
                              <span className="font-bold text-[#0B5FA5]">{pt.runningMean}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clinical significance note */}
                    <div className="mt-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800">Evaluasi Analitik: </span>
                      {alert.summary} {alert.clinicalSignificance}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedAlertForDetail(alert)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors w-full justify-center md:w-auto"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Detail Analisis</span>
                    </button>

                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('levey-jennings', { parameterId: alert.parameterId })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B5FA5] hover:bg-[#094c83] rounded-lg transition-colors w-full justify-center md:w-auto shadow-xs"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Levey-Jennings</span>
                      </button>
                    )}

                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('capa', { parameterId: alert.parameterId, parameterName: alert.parameterName })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors w-full justify-center md:w-auto"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Buat CAPA</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAcknowledge(alert.id)}
                      className={`text-[11px] font-medium transition-colors ${
                        isAck ? 'text-slate-400 hover:text-slate-600' : 'text-slate-600 hover:text-slate-900 underline'
                      }`}
                    >
                      {isAck ? 'Batal Tandai' : 'Tandai Ditinjau'}
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlertForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                    <ShieldAlert className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    Investigasi Pergeseran Sistematis QC (3-Day Shift Alert)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Parameter: <strong>{selectedAlertForDetail.parameterName}</strong> ({selectedAlertForDetail.parameterCode}) · {selectedAlertForDetail.instrumentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlertForDetail(null)}
                aria-label="Tutup jendela investigasi"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target & Deviation Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Target Mean</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {selectedAlertForDetail.targetMean} {selectedAlertForDetail.unit}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Target SD</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  ± {selectedAlertForDetail.targetSD}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Running Mean Akhir</span>
                <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                  {selectedAlertForDetail.latestRunningMean} {selectedAlertForDetail.unit}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Z-Score Akhir</span>
                <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">
                  {selectedAlertForDetail.latestZScore > 0 ? `+${selectedAlertForDetail.latestZScore}` : selectedAlertForDetail.latestZScore} SD
                </div>
              </div>
            </div>

            {/* Daily Breakdown Table */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-800">
                Tabel Rincian Hasil Pengujian Harian ({selectedAlertForDetail.consecutiveDaysCount} Hari Berturut-turut)
              </span>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Urutan & Tanggal</th>
                      <th className="px-3 py-2 text-right font-mono">Nilai Terukur</th>
                      <th className="px-3 py-2 text-right font-mono">Mean Harian</th>
                      <th className="px-3 py-2 text-right font-mono">Running Average</th>
                      <th className="px-3 py-2 text-right font-mono">Deviasi Z-Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {selectedAlertForDetail.dailyPoints.map((pt, i) => (
                      <tr key={pt.date} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">
                          Hari ke-{i + 1} ({formatDateIndo(pt.date)})
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {pt.values.join(', ')} {selectedAlertForDetail.unit}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                          {pt.dailyMean}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-[#0B5FA5]">
                          {pt.runningMean}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-rose-600">
                          {pt.zScore > 0 ? `+${pt.zScore}` : pt.zScore} SD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommended Protocol */}
            <div className="space-y-2 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Info className="h-4 w-4" />
                <span>Protokol Tindakan Korektif Standar Akreditasi (Permenkes 411/2010):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 ml-1">
                {selectedAlertForDetail.recommendedActions.map((act, idx) => (
                  <li key={idx} className="leading-relaxed">{act}</li>
                ))}
              </ul>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAlertForDetail(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Tutup
              </button>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => {
                    const pId = selectedAlertForDetail.parameterId;
                    setSelectedAlertForDetail(null);
                    onNavigateToTab('levey-jennings', { parameterId: pId });
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0B5FA5] hover:bg-[#094c83] text-xs font-semibold text-white shadow-xs"
                >
                  Buka Levey-Jennings Chart
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
