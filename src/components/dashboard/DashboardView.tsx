import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  LineChart, 
  SlidersHorizontal, 
  UserCheck, 
  FileText, 
  Check, 
  ExternalLink,
  CalendarDays,
  Camera,
  X,
  Sparkles
} from 'lucide-react';
import { QCResult, CAPA, NonConformity, Instrument, Parameter, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { SummaryCardsPanel } from './panels/SummaryCardsPanel';
import { CriticalAlertsPanel } from './panels/CriticalAlertsPanel';
import { MonthlyQCVolumeChartPanel } from './panels/MonthlyQCVolumeChartPanel';

interface DashboardViewProps {
  qcResults: QCResult[];
  capas: CAPA[];
  nonConformities: NonConformity[];
  instruments: Instrument[];
  parameters: Parameter[];
  auditLogs?: AuditLog[];
  initialData?: any;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  qcResults,
  capas,
  nonConformities,
  instruments,
  parameters,
  auditLogs: propAuditLogs,
  initialData,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [selectedPreviewParamId, setSelectedPreviewParamId] = useState<string>(parameters[0]?.id || '');
  const [savedNotification, setSavedNotification] = useState<any>(() => initialData?.qcSaved ? initialData : null);

  useEffect(() => {
    if (initialData?.qcSaved) {
      setSavedNotification(initialData);
      const timer = setTimeout(() => {
        setSavedNotification(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [initialData]);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    value: number;
    sdPosition: string;
    status: string;
    x: number;
    y: number;
  } | null>(null);

  // Retrieve actual audit logs
  const logs = propAuditLogs || StorageService.getAuditLogs();

  // Helper date calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date().getTime();

  const getDateNDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const sevenDaysAgoStr = getDateNDaysAgo(7);
  const thirtyDaysAgoStr = getDateNDaysAgo(30);

  // Filter QC Results by selected period
  const filteredResults = useMemo(() => {
    if (selectedPeriod === 'today') {
      const todayOnly = qcResults.filter(r => r.date === todayStr);
      // Fallback: if today is empty, show all to prevent empty command center
      return todayOnly.length > 0 ? todayOnly : qcResults;
    }
    if (selectedPeriod === '7d') {
      return qcResults.filter(r => r.date >= sevenDaysAgoStr);
    }
    if (selectedPeriod === '30d') {
      return qcResults.filter(r => r.date >= thirtyDaysAgoStr);
    }
    return qcResults;
  }, [qcResults, selectedPeriod, todayStr, sevenDaysAgoStr, thirtyDaysAgoStr]);

  // Key KPI numbers
  const filteredPass = filteredResults.filter(r => r.status === 'pass').length;
  const filteredWarning = filteredResults.filter(r => r.status === 'warning').length;
  const filteredReject = filteredResults.filter(r => r.status === 'reject').length;
  const passRate = filteredResults.length > 0 
    ? Math.round((filteredPass / filteredResults.length) * 100) 
    : 100;

  // Real CAPA & Review states
  const pendingReviews = useMemo(() => {
    return qcResults.filter(r => r.reviewStatus === 'pending');
  }, [qcResults]);

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

  // Action Center Items (Requires Attention)
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'reject' | 'capa' | 'review';
      title: string;
      subtitle: string;
      tag: string;
      dueDate?: string;
      actionText: string;
      tab: string;
      payload?: any;
    }> = [];

    // 1. Rejected QC Results
    const recentRejects = qcResults.filter(r => r.status === 'reject').slice(0, 3);
    recentRejects.forEach(r => {
      items.push({
        id: `reject-${r.id}`,
        type: 'reject',
        title: `${r.parameterName} (${r.controlLevel})`,
        subtitle: `Nilai: ${r.value} ${r.unit} (${r.sdPosition}) · ${r.instrumentName}`,
        tag: 'Out of Control',
        actionText: 'Review QC',
        tab: 'qc-review',
        payload: { resultId: r.id },
      });
    });

    // 2. Overdue CAPA
    const overdueCapas = capas.filter(c => new Date(c.overallDueDate).getTime() < todayMs && c.status !== 'closed').slice(0, 2);
    overdueCapas.forEach(c => {
      items.push({
        id: `capa-${c.id}`,
        type: 'capa',
        title: `CAPA: ${c.problemStatement.slice(0, 45)}...`,
        subtitle: `PIC: ${c.pic} · Target: ${c.overallDueDate}`,
        tag: 'CAPA Overdue',
        dueDate: c.overallDueDate,
        actionText: 'Buka CAPA',
        tab: 'capa',
        payload: { capaId: c.id },
      });
    });

    // 3. Pending Review
    if (pendingReviews.length > 0 && items.length < 5) {
      const p = pendingReviews[0];
      items.push({
        id: `pending-${p.id}`,
        type: 'review',
        title: `Verifikasi Hasil: ${p.parameterName}`,
        subtitle: `Oleh: ${p.operatorName} (${p.date} ${p.time})`,
        tag: 'Pending Approval',
        actionText: 'Validasi',
        tab: 'qc-review',
        payload: { resultId: p.id },
      });
    }

    return items;
  }, [qcResults, capas, pendingReviews, todayMs]);

  // Parameter Evaluation distribution
  const failStatsByParam = useMemo(() => {
    const map = new Map<string, { param: Parameter; total: number; fails: number; warnings: number; passes: number }>();
    parameters.forEach(p => {
      map.set(p.id, { param: p, total: 0, fails: 0, warnings: 0, passes: 0 });
    });

    qcResults.forEach(r => {
      const entry = map.get(r.parameterId);
      if (entry) {
        entry.total++;
        if (r.status === 'reject') entry.fails++;
        else if (r.status === 'warning') entry.warnings++;
        else entry.passes++;
      }
    });

    return Array.from(map.values())
      .filter(item => item.total > 0)
      .sort((a, b) => b.fails - a.fails || b.warnings - a.warnings)
      .slice(0, 5);
  }, [parameters, qcResults]);

  // Selected parameter for Control Chart Preview
  const previewParam = useMemo(() => {
    return parameters.find(p => p.id === selectedPreviewParamId) || parameters[0];
  }, [parameters, selectedPreviewParamId]);

  // QC points for the preview chart (1 plot per date)
  const previewPoints = useMemo(() => {
    if (!previewParam) return [];
    const filtered = qcResults.filter(r => r.parameterId === previewParam.id);
    
    // Group by date (1 plot point per date)
    const dateMap = new Map<string, QCResult[]>();
    filtered.forEach(r => {
      const list = dateMap.get(r.date) || [];
      list.push(r);
      dateMap.set(r.date, list);
    });

    const points: Array<QCResult & { allRunsCount: number }> = [];
    dateMap.forEach((dayRuns) => {
      const latest = dayRuns[dayRuns.length - 1];
      const hasReject = dayRuns.some(d => d.status === 'reject');
      const hasWarning = dayRuns.some(d => d.status === 'warning');
      const status = hasReject ? 'reject' : (hasWarning ? 'warning' : 'pass');

      points.push({
        ...latest,
        status,
        allRunsCount: dayRuns.length
      });
    });

    return points.sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [qcResults, previewParam]);

  // Recent 6 QC Results for Table
  const recentQCResults = useMemo(() => {
    return qcResults.slice(0, 6);
  }, [qcResults]);

  // Format relative time helper
  const formatTimeAgo = (tsString: string) => {
    try {
      const diffSec = Math.floor((new Date().getTime() - new Date(tsString).getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      return `${Math.floor(diffSec / 86400)} hari lalu`;
    } catch {
      return tsString;
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Auto-Redirect / Anti-Double Input Success Banner */}
      {savedNotification && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-sm text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Input Berhasil & Tersimpan
                </span>
                <span className="text-xs text-emerald-800 font-medium bg-white/70 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  Dialihkan Otomatis ke Menu Awal (Anti Double-Input)
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-950">
                {savedNotification.message || 'Hasil QC berhasil disimpan ke database.'}
              </p>
              {savedNotification.parameterCode && (
                <div className="flex items-center gap-3 text-xs text-emerald-900 pt-0.5 font-mono">
                  <span>Parameter: <strong>{savedNotification.parameterCode}</strong></span>
                  <span>Nilai: <strong>{savedNotification.value} {savedNotification.unit}</strong></span>
                  {savedNotification.sdPosition && <span>SDI: <strong>{savedNotification.sdPosition}</strong></span>}
                  <span className={`px-2 py-0.2 rounded font-bold uppercase text-[10px] ${
                    savedNotification.status === 'reject' ? 'bg-rose-100 text-rose-800' :
                    savedNotification.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {savedNotification.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {savedNotification.parameterId && (
              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings', { parameterId: savedNotification.parameterId })}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Lihat di Levey-Jennings</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSavedNotification(null)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-colors cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* ========================================================================= */}
      {/* 1. COMMAND CENTER HEADER & WELCOME AREA                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
              Dashboard
            </h1>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0B5FA5] font-semibold border border-blue-200">
              Command Center
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Selamat datang kembali, <strong className="text-slate-800">{user.name}</strong> · Ringkasan kontrol mutu laboratorium hari ini.
          </p>
        </div>

        {/* Period Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Functional Period Filter */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-white p-0.5 shadow-2xs text-xs font-medium">
            <button
              type="button"
              onClick={() => setSelectedPeriod('today')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedPeriod === 'today'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('7d')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedPeriod === '7d'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('30d')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedPeriod === '30d'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                selectedPeriod === 'all'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('qc-scan')}
              className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold text-[#0B5FA5] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>Scan QC Baru</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('qc-input')}
              className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold text-white bg-[#0B5FA5] hover:bg-[#084B83] rounded-lg shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Input QC</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROW 1: 4 CORE KPI CARDS (Real Data Only)                               */}
      {/* ========================================================================= */}
      <SummaryCardsPanel 
        total={filteredResults.length} 
        pass={filteredPass} 
        warning={filteredWarning} 
        reject={filteredReject} 
        violationCount={attentionItems.length} 
        openCapa={capaMetrics.open}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <CriticalAlertsPanel alerts={attentionItems.filter(i => i.type === 'reject')} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW 2: QC PERFORMANCE OVERVIEW + REQUIRES ATTENTION                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): QC Performance by Parameter */}
        <div className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                  QC Performance Overview
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Distribusi kualitas per parameter uji (Pass, Warning, Reject)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings')}
                className="text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua Grafik</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {failStatsByParam.map(({ param, total, passes, warnings, fails }) => {
                const passPct = total > 0 ? Math.round((passes / total) * 100) : 100;
                const warnPct = total > 0 ? Math.round((warnings / total) * 100) : 0;
                const failPct = total > 0 ? Math.round((fails / total) * 100) : 0;

                return (
                  <div
                    key={param.id}
                    onClick={() => onNavigateToTab('levey-jennings', { parameterId: param.id })}
                    className="p-3 rounded-lg border border-slate-200/90 hover:border-[#0B5FA5]/50 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#172033]">
                          {param.name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                          {param.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-700 font-bold">{passes} OK</span>
                        {warnings > 0 && <span className="text-amber-600 font-bold">{warnings} Warn</span>}
                        {fails > 0 && <span className="text-rose-600 font-bold">{fails} Rej</span>}
                      </div>
                    </div>

                    {/* Progress Bar Distribution */}
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${passPct}%` }}
                        title={`Pass: ${passPct}%`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${warnPct}%` }}
                        title={`Warning: ${warnPct}%`}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all"
                        style={{ width: `${failPct}%` }}
                        title={`Reject: ${failPct}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Target Mean: {param.targetMean} {param.unit} (SD: {param.targetSD})</span>
                      <span>Total: {total} Run</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Requires Attention (Action Center) */}
        <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                  Requires Attention
                </h3>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {attentionItems.length} Item
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border text-xs transition-all flex items-start justify-between gap-3 ${
                      item.type === 'reject'
                        ? 'border-rose-200 bg-rose-50/70'
                        : item.type === 'capa'
                        ? 'border-amber-200 bg-amber-50/70'
                        : 'border-blue-200 bg-blue-50/70'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${
                          item.type === 'reject'
                            ? 'bg-rose-600 text-white'
                            : item.type === 'capa'
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {item.tag}
                        </span>
                        <p className="font-bold text-slate-900 truncate">
                          {item.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateToTab(item.tab, item.payload)}
                      className="shrink-0 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:border-slate-400 font-semibold text-slate-800 text-[11px] shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {item.actionText}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-emerald-900 text-sm">
                    All QC parameters are within control
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Semua parameter kontrol mutu laboratorium saat ini berada dalam batas yang diharapkan (±2SD).
                  </p>
                </div>
              )}
            </div>
          </div>

          {attentionItems.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Prioritaskan item dengan tag Out of Control</span>
              <button
                type="button"
                onClick={() => onNavigateToTab('qc-review')}
                className="text-[#0B5FA5] font-semibold hover:underline"
              >
                Buka Menu Review
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3.5. ROW 2.5: VISUALISASI TREN PEMERIKSAAN QC BULANAN (GRAFIK BATANG)     */}
      {/* ========================================================================= */}
      <MonthlyQCVolumeChartPanel
        qcResults={qcResults}
        instruments={instruments}
        onNavigateToTab={onNavigateToTab}
      />

      {/* ========================================================================= */}
      {/* 4. ROW 3: INTERACTIVE CONTROL CHART PREVIEW + RECENT ACTIVITY             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Control Chart (Levey-Jennings Preview Widget) */}
        <div className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-[#0B5FA5]" />
              <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                Control Chart (Levey-Jennings)
              </h3>
            </div>

            {/* Parameter Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="preview-param-select" className="text-xs text-slate-500 font-medium hidden sm:inline">
                Parameter:
              </label>
              <select
                id="preview-param-select"
                value={selectedPreviewParamId}
                onChange={(e) => setSelectedPreviewParamId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0B5FA5]"
              >
                {parameters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.code}]
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings', { parameterId: selectedPreviewParamId })}
                className="p-1 rounded-md text-slate-400 hover:text-[#0B5FA5] hover:bg-slate-100"
                title="Buka Grafik Penuh"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clean Real SVG Levey-Jennings Chart */}
          <div className="relative w-full h-56 bg-slate-50/60 rounded-xl border border-slate-200 p-3 flex flex-col justify-between overflow-hidden">
            {previewParam ? (
              <>
                <svg className="w-full h-44 overflow-visible" viewBox="0 0 500 160">
                  <defs>
                    <linearGradient id="chartWaveGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0B5FA5" />
                      <stop offset="100%" stopColor="#0F8B8D" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline: +3SD (Red) */}
                  <line x1="40" y1="15" x2="480" y2="15" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                  <text x="35" y="18" textAnchor="end" fontSize="9" fill="#EF4444" fontFamily="monospace">+3SD</text>

                  {/* Horizontal Guideline: +2SD (Amber) */}
                  <line x1="40" y1="40" x2="480" y2="40" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                  <text x="35" y="43" textAnchor="end" fontSize="9" fill="#D97706" fontFamily="monospace">+2SD</text>

                  {/* Horizontal Guideline: Target Mean Line (Cyan/Teal) */}
                  <line x1="40" y1="80" x2="480" y2="80" stroke="#0F8B8D" strokeWidth="1.5" />
                  <text x="35" y="83" textAnchor="end" fontSize="9" fontWeight="bold" fill="#0F8B8D" fontFamily="monospace">MEAN</text>

                  {/* Horizontal Guideline: -2SD (Amber) */}
                  <line x1="40" y1="120" x2="480" y2="120" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                  <text x="35" y="123" textAnchor="end" fontSize="9" fill="#D97706" fontFamily="monospace">-2SD</text>

                  {/* Horizontal Guideline: -3SD (Red) */}
                  <line x1="40" y1="145" x2="480" y2="145" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                  <text x="35" y="148" textAnchor="end" fontSize="9" fill="#EF4444" fontFamily="monospace">-3SD</text>

                  {/* Plot Real Data Line & Points */}
                  {previewPoints.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="url(#chartWaveGrad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={previewPoints.map((pt, i) => {
                        const x = 50 + (i * ((470 - 50) / Math.max(1, previewPoints.length - 1)));
                        // compute y position based on targetMean & targetSD
                        const z = previewParam.targetSD > 0 
                          ? (pt.value - previewParam.targetMean) / previewParam.targetSD 
                          : 0;
                        // clamp z to -3.5 to +3.5
                        const clampedZ = Math.max(-3.5, Math.min(3.5, z));
                        const y = 80 - (clampedZ * 21.5);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  )}

                  {/* Plot Nodes */}
                  {previewPoints.map((pt, i) => {
                    const x = 50 + (i * ((470 - 50) / Math.max(1, previewPoints.length - 1)));
                    const z = previewParam.targetSD > 0 
                      ? (pt.value - previewParam.targetMean) / previewParam.targetSD 
                      : 0;
                    const clampedZ = Math.max(-3.5, Math.min(3.5, z));
                    const y = 80 - (clampedZ * 21.5);
                    const isOut = pt.status === 'reject';
                    const isWarn = pt.status === 'warning';

                    return (
                      <g 
                        key={pt.id} 
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredPoint({
                          date: pt.date,
                          value: pt.value,
                          sdPosition: pt.sdPosition,
                          status: pt.status,
                          x,
                          y
                        })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r={isOut ? 5 : isWarn ? 4 : 3.5}
                          fill={isOut ? '#EF4444' : isWarn ? '#F59E0B' : '#0B5FA5'}
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Real-time Hover Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-slate-900/90 text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none font-mono z-30"
                    style={{
                      left: `${Math.min(380, Math.max(10, hoveredPoint.x - 30))}px`,
                      top: `${Math.max(5, hoveredPoint.y - 45)}px`
                    }}
                  >
                    <p className="font-bold">{hoveredPoint.date}</p>
                    <p>Hasil: {hoveredPoint.value} {previewParam.unit} ({hoveredPoint.sdPosition})</p>
                    <p className="capitalize">Status: {hoveredPoint.status}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                  <span>Target: {previewParam.targetMean} {previewParam.unit} (SD: ±{previewParam.targetSD})</span>
                  <span className="text-[#0B5FA5] font-semibold">{previewPoints.length} Data Terbaru</span>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Belum ada data QC untuk parameter ini.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Recent Activity (Audit Log stream) */}
        <div className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0B5FA5]" />
                <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                  Recent Activity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTab('audit-trail')}
                className="text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] cursor-pointer"
              >
                Audit Trail
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600">
                    <Activity className="h-3 w-3" />
                  </div>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-slate-800 font-semibold truncate leading-tight">
                      {log.details || log.action}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-slate-600 font-medium">{log.userName}</span>
                      <span>•</span>
                      <span className="font-mono">{formatTimeAgo(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-center">
            <button
              type="button"
              onClick={() => onNavigateToTab('audit-trail')}
              className="text-xs font-semibold text-slate-600 hover:text-[#0B5FA5] transition-colors"
            >
              Lihat Riwayat Log Lengkap ({logs.length} catatan)
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. ROW 4: RECENT QC RESULTS TABLE + EQUIPMENT STATUS                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Recent QC Results Table */}
        <div className="lg:col-span-8 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                Hasil Pemeriksaan QC Terbaru
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pemeriksaan kontrol analitik terakhir yang dicatat oleh petugas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('qc-review')}
              className="text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3">Parameter</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Hasil Uji</th>
                  <th className="py-2.5 px-3">Deviasi SD</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {recentQCResults.map((r) => (
                  <tr 
                    key={r.id} 
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    onClick={() => onNavigateToTab('qc-review', { resultId: r.id })}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <div>{r.parameterName}</div>
                      <span className="text-[10px] font-mono text-slate-400">{r.parameterCode}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {r.controlLevel}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.value} <span className="text-[10px] text-slate-400 font-normal">{r.unit}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold whitespace-nowrap">
                      <span className={r.status === 'reject' ? 'text-rose-600' : r.status === 'warning' ? 'text-amber-600' : 'text-emerald-700'}>
                        {r.sdPosition}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                        r.status === 'reject'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : r.status === 'warning'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          r.status === 'reject' ? 'bg-rose-500' : r.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[120px]">
                      {r.operatorName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {r.date} {r.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Equipment Status */}
        <div className="lg:col-span-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#0B5FA5]" />
              <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                Equipment Status
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('master-data')}
              className="text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] cursor-pointer"
            >
              Master Alat
            </button>
          </div>

          <div className="space-y-3">
            {instruments.map((inst) => (
              <div
                key={inst.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{inst.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    inst.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inst.status === 'maintenance'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {inst.status === 'active' ? 'Aktif' : inst.status === 'maintenance' ? 'Maintenance' : 'Non-Aktif'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                  <p>SN: {inst.serialNumber} · {inst.location}</p>
                  <p>Kalibrasi: <strong className="text-slate-800">{inst.nextCalibrationDate}</strong></p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-[#0B5FA5] flex items-center justify-between">
              <span className="font-semibold">Kalibrasi Sesuai Jadwal</span>
              <span className="text-[10px] font-mono font-bold text-emerald-700">100% Siap</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
