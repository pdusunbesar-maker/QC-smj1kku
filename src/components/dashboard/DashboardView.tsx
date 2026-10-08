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
  Sparkles,
  BellRing,
  Printer,
  FileDown
} from 'lucide-react';
import { QCResult, CAPA, NonConformity, Instrument, Parameter, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { SummaryCardsPanel } from './panels/SummaryCardsPanel';
import { CriticalAlertsPanel } from './panels/CriticalAlertsPanel';
import { MonthlyQCVolumeChartPanel } from './panels/MonthlyQCVolumeChartPanel';
import { AutomatedRunningAverageAlertsPanel } from './panels/AutomatedRunningAverageAlertsPanel';
import { MonthlyTrendAnalysisPanel } from './panels/MonthlyTrendAnalysisPanel';
import { DailyQCCoveragePanel } from './panels/DailyQCCoveragePanel';
import { RunningAverageAlertService } from '../../services/runningAverageAlertService';

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
  const labInfo = useMemo(() => StorageService.getLabInfo(), []);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d' | 'all'>('today');
  const [selectedPreviewParamId, setSelectedPreviewParamId] = useState<string>(parameters[0]?.id || '');
  const [savedNotification, setSavedNotification] = useState<any>(() => initialData?.qcSaved ? initialData : null);
  const [dismissedShiftNotification, setDismissedShiftNotification] = useState(false);

  // Dynamic evaluation of 3-consecutive-days running average shift alerts
  const runningAvgAlerts = useMemo(() => {
    return RunningAverageAlertService.detectRunningAverageAlerts(
      qcResults,
      parameters,
      instruments,
      { thresholdSD: 1.0, consecutiveDays: 3 }
    );
  }, [qcResults, parameters, instruments]);

  const activeShiftAlerts = useMemo(() => {
    return runningAvgAlerts.filter(a => a.isActive);
  }, [runningAvgAlerts]);

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

  // Compute coverage metrics for print preview
  const coverageData = useMemo(() => {
    const totalExpected = parameters.length;
    const todayResults = qcResults.filter(r => r.date === todayStr);

    const testedParamMap = new Map<string, QCResult[]>();
    todayResults.forEach(r => {
      const list = testedParamMap.get(r.parameterId) || [];
      list.push(r);
      testedParamMap.set(r.parameterId, list);
    });

    const testedParameters: Array<{
      parameter: Parameter;
      instrumentName: string;
      latestResult: QCResult;
      runCount: number;
    }> = [];

    const missedParameters: Array<{
      parameter: Parameter;
      instrumentName: string;
    }> = [];

    parameters.forEach(param => {
      const inst = instruments.find(i => i.id === param.instrumentId);
      const instName = inst ? inst.name : 'Alat Lab';
      const paramRuns = testedParamMap.get(param.id);

      if (paramRuns && paramRuns.length > 0) {
        const latest = paramRuns[paramRuns.length - 1];
        testedParameters.push({
          parameter: param,
          instrumentName: instName,
          latestResult: latest,
          runCount: paramRuns.length,
        });
      } else {
        missedParameters.push({
          parameter: param,
          instrumentName: instName,
        });
      }
    });

    const testedCount = testedParameters.length;
    const missedCount = missedParameters.length;
    const completionPercentage = totalExpected > 0 ? Math.round((testedCount / totalExpected) * 100) : 0;

    return {
      todayStr,
      totalExpected,
      testedCount,
      missedCount,
      completionPercentage,
      testedParameters,
      missedParameters,
      todayTotalRuns: todayResults.length,
    };
  }, [qcResults, parameters, instruments, todayStr]);

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

    // 0. Active 3-Day Running Average Shift Alerts (High Urgency)
    activeShiftAlerts.slice(0, 2).forEach(a => {
      items.push({
        id: `runavg-${a.id}`,
        type: 'reject',
        title: `🚨 ${a.parameterName} (${a.parameterCode})`,
        subtitle: `Running average (${a.latestRunningMean} ${a.unit}) > ${a.thresholdSD}SD (${a.latestZScore > 0 ? '+' : ''}${a.latestZScore}SD) selama ${a.consecutiveDaysCount} hari`,
        tag: '3-Day Shift Alert',
        actionText: 'Investigasi',
        tab: 'levey-jennings',
        payload: { parameterId: a.parameterId },
      });
    });

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
      
      {/* Automated 3-Day Running Average Shift Alert Notification Banner */}
      {activeShiftAlerts.length > 0 && !dismissedShiftNotification && (
        <div className="rounded-2xl border-2 border-rose-300 bg-linear-to-r from-rose-50 via-white to-amber-50/60 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-rose-950 text-sm sm:text-base">
                  🚨 Peringatan Otomatis: Pergeseran Running Average QC Terdeteksi!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-200 text-rose-900 border border-rose-300">
                  {activeShiftAlerts.length} Parameter Kritis
                </span>
              </div>
              <p className="text-xs text-rose-900/90 mt-1 leading-relaxed">
                Running average parameter <strong>{activeShiftAlerts.map(a => `${a.parameterName} (${a.parameterCode})`).join(', ')}</strong> telah melampaui ambang batas SD selama <strong>3 hari berturut-turut</strong>. Menandakan pergeseran analitik sistematis (Systematic Analytical Shift / Bias) yang memerlukan tindakan korektif segera.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('automated-running-avg-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lihat Rincian Analisis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDismissedShiftNotification(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
              title="Tutup Banner"
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
              onClick={() => setIsPrintPreviewOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Ekspor PDF Summary</span>
            </button>
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

      {/* ========================================================================= */}
      {/* 2.2. CAKUPAN PENGUJIAN QC HARI INI (TESTED VS EXPECTED / MISSED TESTS)    */}
      {/* ========================================================================= */}
      <DailyQCCoveragePanel
        qcResults={qcResults}
        parameters={parameters}
        instruments={instruments}
        onNavigateToTab={onNavigateToTab}
      />

      {/* ========================================================================= */}
      {/* 2.5. SISTEM PERINGATAN OTOMATIS: 3-DAY RUNNING AVERAGE SHIFT ALERTS       */}
      {/* ========================================================================= */}
      <div id="automated-running-avg-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <AutomatedRunningAverageAlertsPanel 
            qcResults={qcResults}
            parameters={parameters}
            instruments={instruments}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <CriticalAlertsPanel 
            alerts={attentionItems.filter(i => i.type === 'reject')} 
            onNavigateToTab={onNavigateToTab}
          />
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
      {/* 3.5. ROW 2.5: ANALISIS TREN STABILITAS KUALITAS (BULAN INI VS BULAN LALU) */}
      {/* ========================================================================= */}
      <MonthlyTrendAnalysisPanel
        qcResults={qcResults}
        instruments={instruments}
        parameters={parameters}
        onNavigateToTab={onNavigateToTab}
      />

      {/* ========================================================================= */}
      {/* 3.6. VISUALISASI TREN PEMERIKSAAN QC BULANAN (GRAFIK BATANG)              */}
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

      {/* 6. MODAL PRINT PREVIEW LAPORAN RESMI */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:relative">
          <div className="bg-slate-100 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:bg-white print:w-full print:rounded-none">
            {/* Modal Header (Hidden during printing) */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Pratinjau Laporan Resmi QC</h3>
                  <p className="text-xs text-slate-500">Gunakan dialog cetak browser untuk menyimpan sebagai PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 print:bg-white print:p-0 print:overflow-visible">
              
              {/* Paper Layout */}
              <div className="printable-report-area bg-white mx-auto p-8 sm:p-12 max-w-[210mm] min-h-[297mm] shadow-lg border border-slate-300/80 rounded-sm text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:max-w-none">
                
                {/* 1. KOP SURAT (Laboratory / Hospital Header) */}
                <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 text-center relative flex flex-row items-center justify-between">
                  {/* Left Logo Emblem */}
                  <div className="w-20 h-20 flex items-center justify-center shrink-0">
                    {labInfo.logoUrl ? (
                      <img src={labInfo.logoUrl} alt="Logo Left" className="max-w-full max-h-full object-contain" />
                    ) : (
                      /* Fallback professional clinical caduceus/emblem SVG */
                      <svg className="w-16 h-16 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a3.001 3.001 0 110 6 3.001 3.001 0 010-6z" />
                      </svg>
                    )}
                  </div>

                  {/* Header Title Text */}
                  <div className="flex-1 px-4 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                      {labInfo.healthService || 'DINAS KESEHATAN DAN KELUARGA BERENCANA'}
                    </p>
                    <h2 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-tight leading-tight mt-0.5">
                      {labInfo.hospitalName || 'RSUD SEHAT MAKMUR JAYA'}
                    </h2>
                    <h3 className="text-md sm:text-base font-bold uppercase text-slate-800 tracking-wide mt-0.5">
                      {labInfo.name || 'LABORATORIUM PATOLOGI KLINIK & KONTROL MUTU'}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      {labInfo.address || 'Jl. Kesehatan Raya No. 45, Blok A, Jakarta Pusat'} · Telp: {labInfo.phone || '(021) 555-1234'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      Email: {labInfo.email || 'laboratorium@rsud-sehat.go.id'} · Akreditasi: <strong>{labInfo.accreditation || 'PARIPURNA (KARS)'}</strong>
                    </p>
                  </div>

                  {/* Right Logo (optional, e.g. Hospital Accreditation/ISO logo) */}
                  <div className="w-20 h-20 flex items-center justify-center shrink-0">
                    {labInfo.logoRightUrl ? (
                      <img src={labInfo.logoRightUrl} alt="Logo Right" className="max-w-full max-h-full object-contain" />
                    ) : (
                      /* Accreditation Shield logo fallback */
                      <svg className="w-14 h-14 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.296-1.593 3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.746 3.746 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* 2. REPORT TITLE & METADATA */}
                <div className="text-center mb-6">
                  <h4 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wider">
                    LAPORAN RINGKASAN HARIAN KONTROL MUTU (QC)
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    No. Dokumen: <strong className="text-slate-700">LQR/QC/{new Date().getFullYear()}/{new Date().getMonth() + 1}/{new Date().getDate()}</strong>
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-left border border-slate-300 rounded-xl p-3.5 bg-slate-50/50 mt-4 text-[11px]">
                    <div className="space-y-1">
                      <p className="text-slate-500">Tanggal Laporan:</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500">Penanggung Jawab / Operator:</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                        <span>{user.name} (NIP: {user.nip || '19920803 201801 1 003'})</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. SECTION 1: RINGKASAN CAPAIAN (SUMMARY CARDS) */}
                <div className="mb-6 space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0B5FA5]" />
                    <span>I. Ringkasan Kinerja Kualitas (QC KPI)</span>
                  </h5>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="border border-slate-300 p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Parameter</span>
                      <strong className="text-lg font-mono font-black text-slate-800">{parameters.length}</strong>
                    </div>
                    <div className="border border-slate-300 p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Pengujian Hari Ini</span>
                      <strong className="text-lg font-mono font-black text-slate-800">{filteredResults.length} Run</strong>
                    </div>
                    <div className="border border-slate-300 p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Tingkat Kelolosan</span>
                      <strong className={`text-lg font-mono font-black ${passRate === 100 ? 'text-emerald-700' : passRate >= 80 ? 'text-amber-700' : 'text-rose-700'}`}>{passRate}%</strong>
                    </div>
                    <div className="border border-slate-300 p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Butuh Perhatian</span>
                      <strong className={`text-lg font-mono font-black ${attentionItems.length > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{attentionItems.length} Item</strong>
                    </div>
                  </div>
                </div>

                {/* 4. SECTION 2: CAKUPAN PENGUJIAN HARI INI (EXPECTED VS TESTED) */}
                <div className="mb-6 space-y-2.5">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-700" />
                    <span>II. Analisis Kepatuhan Cakupan QC Harian (Tested vs Expected)</span>
                  </h5>
                  <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-slate-800">Capaian Cakupan: {coverageData.testedCount} dari {coverageData.totalExpected} Parameter Selesai ({coverageData.completionPercentage}%)</p>
                      <p className="text-slate-500 leading-normal">
                        Menemukan <strong>{coverageData.missedCount} parameter rutin</strong> yang belum diuji kontrol mutunya hari ini.
                      </p>
                    </div>
                    <div className="w-full sm:w-1/3 bg-slate-200 h-2.5 rounded-full overflow-hidden shrink-0 border border-slate-300">
                      <div className={`h-full rounded-full ${coverageData.completionPercentage === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${coverageData.completionPercentage}%` }} />
                    </div>
                  </div>

                  {/* List of Missed QC Tests */}
                  {coverageData.missedCount > 0 ? (
                    <div className="border border-amber-300 bg-amber-50/30 rounded-xl p-3.5 text-[11px] space-y-2">
                      <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>⚠️ PERINGATAN: Parameter Rutin Berikut Belum Memiliki Catatan QC Hari Ini:</span>
                      </p>
                      <table className="w-full text-left border-collapse border border-amber-200 bg-white">
                        <thead>
                          <tr className="bg-amber-100 text-amber-950 font-bold font-mono text-[10px] border-b border-amber-200">
                            <th className="py-1.5 px-3">Kode Parameter</th>
                            <th className="py-1.5 px-3">Nama Parameter</th>
                            <th className="py-1.5 px-3">Alat / Analyzer</th>
                            <th className="py-1.5 px-3">Target Rujukan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200">
                          {coverageData.missedParameters.map(({ parameter, instrumentName }) => (
                            <tr key={parameter.id} className="hover:bg-amber-50/30">
                              <td className="py-1.5 px-3 font-mono font-bold text-amber-900">{parameter.code}</td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800">{parameter.name}</td>
                              <td className="py-1.5 px-3 text-slate-600">{instrumentName}</td>
                              <td className="py-1.5 px-3 font-mono text-slate-600">{parameter.targetMean} ± {parameter.targetSD} {parameter.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-emerald-300 bg-emerald-50/40 rounded-xl p-3 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Sempurna! Seluruh parameter rutin terdaftar telah diuji lengkap QC hari ini. Sampel pasien aman diproses.</span>
                    </div>
                  )}
                </div>

                {/* 5. SECTION 3: PARAMETER OUT-OF-CONTROL (REJECTS & WARNINGS) */}
                <div className="mb-6 space-y-2.5">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>III. Peringatan Penyimpangan Aturan Westgard & QC Out-of-Control</span>
                  </h5>
                  {qcResults.filter(r => r.status === 'reject' || r.status === 'warning').length > 0 ? (
                    <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold font-mono border-b border-slate-300">
                          <th className="py-2 px-3">Waktu</th>
                          <th className="py-2 px-3">Parameter (Kode)</th>
                          <th className="py-2 px-3">Alat</th>
                          <th className="py-2 px-3">Hasil</th>
                          <th className="py-2 px-3">Rujukan (Mean±SD)</th>
                          <th className="py-2 px-3">Z-Score</th>
                          <th className="py-2 px-3">Status / Pelanggaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {qcResults.filter(r => r.status === 'reject' || r.status === 'warning').slice(0, 5).map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-slate-500">{r.date} {r.time}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{r.parameterName} ({r.parameterCode})</td>
                            <td className="py-2 px-3 text-slate-600">{r.instrumentName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.value} {r.unit}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{r.mean} ± {r.sd}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.sdPosition}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${r.status === 'reject' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                {r.status} {r.violations?.map(v => v.rule).join(', ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-6 text-center text-[11px] text-slate-500 space-y-1.5 bg-slate-50/40">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                      <p className="font-bold text-emerald-800">Tidak ada penyimpangan kontrol mutu yang terdeteksi</p>
                      <p>Seluruh pengukuran berada di dalam rentang kendali (≤ ±2SD).</p>
                    </div>
                  )}
                </div>

                {/* 6. SECTION 4: AUTOMATED RUNNING AVERAGE SHIFT ALERTS (3-DAY TRENDS) */}
                <div className="mb-6 space-y-2.5">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
                    <span>IV. Pendeteksian Pergeseran Tren Analitik Kritis (3-Day Running Mean Shift Alert)</span>
                  </h5>
                  {activeShiftAlerts.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Peringatan pergeseran sistematis berdasarkan analisis pergerakan rata-rata kumulatif selama 3 hari berturut-turut melebihi 1SD:
                      </p>
                      <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold font-mono border-b border-slate-300">
                            <th className="py-2 px-3">Parameter</th>
                            <th className="py-2 px-3">Alat</th>
                            <th className="py-2 px-3">Running Mean</th>
                            <th className="py-2 px-3">Target Mean</th>
                            <th className="py-2 px-3">Penyimpangan (Z-Score)</th>
                            <th className="py-2 px-3">Jumlah Hari</th>
                            <th className="py-2 px-3">Status Investigasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {activeShiftAlerts.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-bold text-slate-800">{a.parameterName} ({a.parameterCode})</td>
                              <td className="py-2 px-3 text-slate-600">{a.instrumentName}</td>
                              <td className="py-2 px-3 font-mono font-extrabold text-orange-700">{a.latestRunningMean} {a.unit}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{a.targetMean} {a.unit}</td>
                              <td className="py-2 px-3 font-mono font-extrabold text-orange-700">+{a.latestZScore} SD</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{a.consecutiveDaysCount} Hari Berturut</td>
                              <td className="py-2 px-3 font-bold text-slate-700">Pengecekan Kalibrasi Alat</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-4 text-[11px] text-slate-500 bg-slate-50/40">
                      <span>✓ Aman: Tidak terdeteksi adanya tren pergeseran nilai rata-rata (systematic shift bias) selama 3 hari berturut-turut pada parameter manapun.</span>
                    </div>
                  )}
                </div>

                {/* 7. SECTION 5: DAFTAR HASIL QC TERBARU */}
                <div className="mb-6 space-y-2.5">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>V. Lembar Catatan Hasil Pengukuran Kontrol Mutu Terbaru</span>
                  </h5>
                  <table className="w-full text-left text-[9px] border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold font-mono border-b border-slate-300 uppercase tracking-wider text-[8px]">
                        <th className="py-2 px-3">No</th>
                        <th className="py-2 px-3">Waktu Pengerjaan</th>
                        <th className="py-2 px-3">Parameter & Alat</th>
                        <th className="py-2 px-3">Bahan Kontrol</th>
                        <th className="py-2 px-3">Hasil Uji</th>
                        <th className="py-2 px-3">SDI (Z-Score)</th>
                        <th className="py-2 px-3">Evaluasi</th>
                        <th className="py-2 px-3">Analis (ATLM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {recentQCResults.slice(0, 8).map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{r.date} {r.time}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {r.parameterName} <span className="font-normal text-slate-500">({r.instrumentName})</span>
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-700">{r.controlLevel} · Lot: {r.lotNumber}</td>
                          <td className="py-2 px-3 font-mono font-extrabold text-slate-900">{r.value} {r.unit}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.sdPosition}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[8px] uppercase ${r.status === 'reject' ? 'bg-rose-100 text-rose-800' : r.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{r.operatorName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 8. SECTION 6: SIGNATURE VALIDATION BLOCK */}
                <div className="mt-12 text-[11px] grid grid-cols-3 gap-6 text-center page-break-inside-avoid">
                  {/* Operator ATLM */}
                  <div className="space-y-16">
                    <p className="text-slate-500">Petugas Pemeriksa (ATLM),</p>
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 underline">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {user.nip || '19920803 201801 1 003'}</p>
                    </div>
                  </div>

                  {/* Kepala Mutu */}
                  <div className="space-y-16">
                    <p className="text-slate-500">Kepala Pemastian Mutu,</p>
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 underline">{labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {labInfo.qualityNip || '19850914 201001 2 015'}</p>
                    </div>
                  </div>

                  {/* Kepala Laboratorium */}
                  <div className="space-y-16">
                    <p className="text-slate-500">Kepala Laboratorium Patologi Klinik,</p>
                    <div className="space-y-0.5">
                      <p className="font-extrabold text-slate-900 underline">{labInfo.headOfLab || 'dr. H. Bambang Herawan, Sp.PK'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {labInfo.headNip || '19761125 200501 1 008'}</p>
                    </div>
                  </div>
                </div>

                {/* Print-only CSS style injection */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    .printable-report-area, .printable-report-area * {
                      visibility: visible !important;
                    }
                    .printable-report-area {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      border: none !important;
                    }
                    @page {
                      size: A4;
                      margin: 15mm;
                    }
                  }
                `}} />

              </div>
            </div>

            {/* Modal Footer (Hidden during printing) */}
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3 print:hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
