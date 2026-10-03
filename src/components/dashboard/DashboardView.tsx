import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  FolderGit2, 
  TrendingUp, 
  Activity, 
  Plus, 
  ArrowRight,
  Clock,
  Wrench,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { QCResult, CAPA, NonConformity, Instrument, Parameter } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  qcResults: QCResult[];
  capas: CAPA[];
  nonConformities: NonConformity[];
  instruments: Instrument[];
  parameters: Parameter[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  qcResults,
  capas,
  nonConformities,
  instruments,
  parameters,
  onNavigateToTab,
}) => {
  const { user } = useAuth();

  // Metrics computation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayResults = useMemo(() => {
    return qcResults.filter(r => r.date === todayStr);
  }, [qcResults, todayStr]);

  const todayPass = todayResults.filter(r => r.status === 'pass').length;
  const todayWarning = todayResults.filter(r => r.status === 'warning').length;
  const todayReject = todayResults.filter(r => r.status === 'reject').length;

  const totalViolations = useMemo(() => {
    return qcResults.reduce((acc, r) => acc + (r.violations?.length || 0), 0);
  }, [qcResults]);

  const todayMs = new Date().getTime();
  const capaMetrics = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let closed = 0;

    capas.forEach(c => {
      const isOverdue = new Date(c.overallDueDate).getTime() < todayMs && c.status !== 'closed';
      if (c.status === 'closed') closed++;
      else if (isOverdue) overdue++;
      else open++;
    });

    return { open, overdue, closed };
  }, [capas, todayMs]);

  // Parameters with highest QC fails (30 days)
  const failStatsByParam = useMemo(() => {
    const map = new Map<string, { param: Parameter; total: number; fails: number; warnings: number }>();
    parameters.forEach(p => {
      map.set(p.id, { param: p, total: 0, fails: 0, warnings: 0 });
    });

    qcResults.forEach(r => {
      const entry = map.get(r.parameterId);
      if (entry) {
        entry.total++;
        if (r.status === 'reject') entry.fails++;
        else if (r.status === 'warning') entry.warnings++;
      }
    });

    return Array.from(map.values())
      .filter(item => item.total > 0)
      .sort((a, b) => b.fails - a.fails || b.warnings - a.warnings)
      .slice(0, 4);
  }, [parameters, qcResults]);

  // Pending supervisor reviews
  const pendingReviews = useMemo(() => {
    return qcResults.filter(r => r.reviewStatus === 'pending');
  }, [qcResults]);

  // Instruments maintenance approaching in 30 days
  const upcomingMaintenance = useMemo(() => {
    return instruments.filter(i => {
      const diffDays = Math.ceil((new Date(i.nextMaintenanceDate).getTime() - todayMs) / (1000 * 3600 * 24));
      return diffDays <= 30;
    });
  }, [instruments, todayMs]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Mutu Patologi Klinik
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              KARS Paripurna
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            RSUD Sultan Muhammad Jamaludin I · Sukadana, Kabupaten Kayong Utara
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onNavigateToTab('qc-input')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Input QC Hari Ini</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('qc-review')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Review ({pendingReviews.length})</span>
          </button>
        </div>
      </div>

      {/* Critical Status Alerts Banner */}
      {(todayReject > 0 || capaMetrics.overdue > 0 || pendingReviews.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {todayReject > 0 && (
            <div 
              onClick={() => onNavigateToTab('qc-review')}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-200 bg-rose-50/80 cursor-pointer hover:bg-rose-100/70 transition-colors"
            >
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-rose-900">{todayReject} Pemeriksaan QC Reject Hari Ini</p>
                <p className="text-rose-700 mt-0.5">Melebihi batas ±3SD atau Westgard. Klik untuk review.</p>
              </div>
            </div>
          )}

          {capaMetrics.overdue > 0 && (
            <div 
              onClick={() => onNavigateToTab('capa')}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 cursor-pointer hover:bg-amber-100/70 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">{capaMetrics.overdue} Dokumen CAPA Overdue</p>
                <p className="text-amber-700 mt-0.5">Melewati target penyelesaian. Perlu eskalasi segera.</p>
              </div>
            </div>
          )}

          {pendingReviews.length > 0 && (
            <div 
              onClick={() => onNavigateToTab('qc-review')}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 cursor-pointer hover:bg-blue-100/70 transition-colors"
            >
              <Clock className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-blue-900">{pendingReviews.length} Hasil QC Perlu Review</p>
                <p className="text-blue-700 mt-0.5">Menunggu verifikasi dan validasi Supervisor.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* QC Today */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">QC Hari Ini</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{todayResults.length}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Total run analitik</p>
        </div>

        {/* QC Pass */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">QC Pass</p>
          <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">{todayPass}</p>
          <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Memenuhi batas 1SD</p>
        </div>

        {/* QC Warning */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700">QC Warning</p>
          <p className="text-2xl font-bold font-mono text-amber-800 mt-1">{todayWarning}</p>
          <p className="text-[10px] text-amber-600 font-mono mt-0.5">Deviasi ±2SD</p>
        </div>

        {/* QC Reject */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-700">QC Reject</p>
          <p className="text-2xl font-bold font-mono text-rose-800 mt-1">{todayReject}</p>
          <p className="text-[10px] text-rose-600 font-mono mt-0.5">Out of control (3SD)</p>
        </div>

        {/* Westgard Violations */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Westgard Event</p>
          <p className="text-2xl font-bold font-mono text-purple-900 mt-1">{totalViolations}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Semua parameter</p>
        </div>

        {/* CAPA Open */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">CAPA Open</p>
          <p className="text-2xl font-bold font-mono text-indigo-900 mt-1">{capaMetrics.open}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Dalam investigasi</p>
        </div>

        {/* CAPA Overdue */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-700">CAPA Overdue</p>
          <p className="text-2xl font-bold font-mono text-rose-800 mt-1">{capaMetrics.overdue}</p>
          <p className="text-[10px] text-rose-600 font-mono mt-0.5">Lewat batas waktu</p>
        </div>

        {/* CAPA Closed */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">CAPA Closed</p>
          <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">{capaMetrics.closed}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Verifikasi efektif</p>
        </div>
      </div>

      {/* Main Split Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Monitoring & Failure Rates (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Evaluasi Parameter Kontrol Analitik
                </h3>
                <p className="text-xs text-slate-500">
                  Parameter dengan frekuensi penyimpangan dan deviasi SD tertinggi
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Buka Grafik Levey-Jennings</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {failStatsByParam.map(({ param, total, fails, warnings }) => {
                const failPercent = Math.round((fails / total) * 100);
                const passPercent = Math.max(0, 100 - failPercent - Math.round((warnings / total) * 100));

                return (
                  <div
                    key={param.id}
                    onClick={() => onNavigateToTab('levey-jennings', { parameterId: param.id })}
                    className="p-3 rounded-lg border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{param.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold">
                          {param.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-emerald-700 font-semibold">{total - fails - warnings} OK</span>
                        {warnings > 0 && <span className="text-amber-600 font-semibold">{warnings} Warn</span>}
                        {fails > 0 && <span className="text-rose-600 font-bold">{fails} Reject</span>}
                      </div>
                    </div>

                    {/* Progress distribution bar */}
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${passPercent}%` }}
                        title={`Pass: ${passPercent}%`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${Math.round((warnings / total) * 100)}%` }}
                        title={`Warning: ${Math.round((warnings / total) * 100)}%`}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all"
                        style={{ width: `${failPercent}%` }}
                        title={`Reject: ${failPercent}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Target Mean: {param.targetMean} {param.unit} (SD: {param.targetSD})</span>
                      <span>Total Run: {total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Non-Conformity Incidents */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Penyimpangan Mutu Terbaru (Non-Conformities)
              </h3>
              <button
                type="button"
                onClick={() => onNavigateToTab('non-conformity')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {nonConformities.slice(0, 3).map((nc) => (
                <div key={nc.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{nc.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        nc.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {nc.severity}
                      </span>
                      <span className="font-semibold text-slate-800">{nc.parameterName}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-1">{nc.description}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap ml-4">
                    {nc.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Instrument Status & Calibration Vigilance (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Instruments Status & Maintenance */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Status Instrumen & Kalibrasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('master-data')}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Master Data Alat
              </button>
            </div>

            <div className="space-y-3">
              {instruments.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{inst.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {inst.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                    <p>SN: {inst.serialNumber} · Lokasi: {inst.location}</p>
                    <p>Kalibrasi Berikutnya: <strong className="text-slate-700">{inst.nextCalibrationDate}</strong></p>
                    <p>Maintenance Rutin: <strong className="text-slate-700">{inst.nextMaintenanceDate}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Laboratory Quality Goals & Westgard Reference Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">
              Pedoman Westgard Multirule SOP Lab
            </h3>
            <div className="space-y-2 text-[11px] text-slate-600">
              <div className="p-2 rounded bg-amber-50 border border-amber-200/80">
                <p className="font-bold text-amber-900">1:2s (Warning Rule)</p>
                <p>1 kontrol &gt; ±2SD. Periksa kondisi reagen & instrumen sebelum rilis hasil pasien.</p>
              </div>
              <div className="p-2 rounded bg-rose-50 border border-rose-200/80">
                <p className="font-bold text-rose-900">1:3s / 2:2s / R:4s / 4:1s (Reject Rule)</p>
                <p>Pelanggaran berat. Wajib stop run, lakukan tindakan korektif, dan catat pada form CAPA.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
