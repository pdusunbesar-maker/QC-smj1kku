import React, { useState, useMemo, useRef } from 'react';
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
  ArrowRight,
  Search,
  SlidersHorizontal,
  HelpCircle,
  Gauge,
  FileDown,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { QCResult, Instrument, Parameter } from '../../../types';
import { RunningAverageAlertService } from '../../../services/runningAverageAlertService';
import { StorageService } from '../../../services/storage';

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
  const [activeTab, setActiveTab] = useState<'monthly' | 'early_detection'>('early_detection');
  const [violationMode, setViolationMode] = useState<'reject_and_warning' | 'reject_only'>('reject_and_warning');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert_only' | 'stable_only'>('all');

  // PDF Export
  const printableDocRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const labInfo = StorageService.getLabInfo();

  const handleExportPDF = async () => {
    if (!printableDocRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const element = printableDocRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        ignoreElements: (el) => 
          el.classList.contains('print:hidden') || 
          el.classList.contains('no-print') || 
          el.tagName === 'BUTTON',
        onclone: (clonedDoc) => {
          const sheet = clonedDoc.getElementById('printable-report-sheet-trend');
          if (sheet) {
            sheet.style.display = 'block';
            sheet.style.border = 'none';
            sheet.style.borderRadius = '0px';
            sheet.style.boxShadow = 'none';
            sheet.style.padding = '20px';
            sheet.style.margin = '0px';
            sheet.style.width = '100%';
            sheet.style.maxWidth = '100%';
          }
          clonedDoc.querySelectorAll('.print\\:hidden, button').forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      const pageAvailableHeight = pdfHeight - margin * 2;

      if (contentHeight <= pageAvailableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      } else {
        const totalPages = Math.ceil(contentHeight / pageAvailableHeight);
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          const yPosition = margin - i * pageAvailableHeight;
          pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, contentHeight);
          
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Halaman ${i + 1} dari ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        }
      }

      pdf.save(`Laporan_Trend_QC_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Filter QC Results by selected instrument
  const filteredResults = useMemo(() => {
    if (selectedInstrumentId === 'all') return qcResults;
    return qcResults.filter(r => r.instrumentId === selectedInstrumentId);
  }, [qcResults, selectedInstrumentId]);

  // =========================================================================
  // Tab 1 Engine: Monthly Comparison Analysis (Original Feature)
  // =========================================================================
  const trendPeriod = useMemo(() => {
    const now = new Date();
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const availableMonths = Array.from(new Set(filteredResults.map(r => r.date.substring(0, 7))))
      .filter(m => m.length === 7)
      .sort()
      .reverse();

    const thisMonthKey = availableMonths.includes(currentYYYYMM) ? currentYYYYMM : (availableMonths[0] || currentYYYYMM);
    
    let lastMonthKey = '';
    if (availableMonths.length > 1) {
      const thisIdx = availableMonths.indexOf(thisMonthKey);
      if (thisIdx !== -1 && thisIdx + 1 < availableMonths.length) {
        lastMonthKey = availableMonths[thisIdx + 1];
      } else {
        lastMonthKey = availableMonths[1];
      }
    } else {
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

  const monthlyStats = useMemo(() => {
    const isViolation = (r: QCResult) => {
      if (violationMode === 'reject_only') {
        return r.status === 'reject';
      }
      return r.status === 'reject' || r.status === 'warning';
    };

    const thisMonthRuns = filteredResults.filter(r => r.date.startsWith(trendPeriod.thisMonthKey));
    const lastMonthRuns = filteredResults.filter(r => r.date.startsWith(trendPeriod.lastMonthKey));

    const thisMonthTotal = thisMonthRuns.length;
    const thisMonthViolations = thisMonthRuns.filter(isViolation).length;
    const thisMonthRejects = thisMonthRuns.filter(r => r.status === 'reject').length;
    const thisMonthWarnings = thisMonthRuns.filter(r => r.status === 'warning').length;
    const thisMonthPasses = thisMonthRuns.filter(r => r.status === 'pass').length;
    const thisMonthViolationRate = thisMonthTotal > 0 ? (thisMonthViolations / thisMonthTotal) * 100 : 0;

    const lastMonthTotal = lastMonthRuns.length;
    const lastMonthViolations = lastMonthRuns.filter(isViolation).length;
    const lastMonthRejects = lastMonthRuns.filter(r => r.status === 'reject').length;
    const lastMonthWarnings = lastMonthRuns.filter(r => r.status === 'warning').length;
    const lastMonthPasses = lastMonthRuns.filter(r => r.status === 'pass').length;
    const lastMonthViolationRate = lastMonthTotal > 0 ? (lastMonthViolations / lastMonthTotal) * 100 : 0;

    const deltaRate = thisMonthViolationRate - lastMonthViolationRate;
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


  // =========================================================================
  // Tab 2 Engine: New Automatic Shift & Linear Trend Detection
  // =========================================================================
  const earlyTrendAnalysis = useMemo(() => {
    return RunningAverageAlertService.detectEarlyTrendWarnings(filteredResults, parameters, instruments);
  }, [parameters, instruments, filteredResults]);

  // Aggregate stats for Early Warning findings
  const earlyWarningStats = useMemo(() => {
    const totalMonitored = earlyTrendAnalysis.length;
    const criticalCount = earlyTrendAnalysis.filter(f => f.status === 'critical').length;
    const warningCount = earlyTrendAnalysis.filter(f => f.status === 'warning').length;
    const stableCount = earlyTrendAnalysis.filter(f => f.status === 'stable').length;
    const overallScore = totalMonitored > 0 
      ? Math.round(((stableCount + warningCount * 0.5) / totalMonitored) * 100) 
      : 100;

    return {
      totalMonitored,
      criticalCount,
      warningCount,
      stableCount,
      overallScore,
    };
  }, [earlyTrendAnalysis]);

  // Filter & Search findings for Early Warning view
  const filteredFindings = useMemo(() => {
    return earlyTrendAnalysis.filter(f => {
      // 1. Search Query filter
      const matchesSearch = 
        f.parameter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.parameter.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.instrument?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter === 'alert_only') {
        return f.status === 'critical' || f.status === 'warning';
      }
      if (statusFilter === 'stable_only') {
        return f.status === 'stable';
      }
      return true;
    }).sort((a, b) => {
      // Prioritize Critical, then Warning, then Stable
      const priority = { critical: 3, warning: 2, stable: 1 };
      return priority[b.status] - priority[a.status];
    });
  }, [earlyTrendAnalysis, searchQuery, statusFilter]);

  const isImproved = monthlyStats.deltaRate < 0;
  const isWorsened = monthlyStats.deltaRate > 0;

  return (
    <div 
      ref={printableDocRef}
      id="printable-report-sheet-trend"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
    >
      {/* Official Kop Surat (Visible only on print/PDF) */}
      <div className="hidden print:block w-full kop-surat mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="w-20 shrink-0 flex items-center justify-start">
             <img src={labInfo.logoUrl || '/logo_kayong_utara.png'} alt="Logo" className="h-16 w-auto" />
          </div>
          <div className="flex-1 text-center px-2 space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">
              {(() => {
                const r = labInfo.regency || 'PEMERINTAH KABUPATEN KAYONG UTARA';
                return r.toUpperCase() === 'KABUPATEN KAYONG UTARA' || r.toUpperCase() === 'KAYONG UTARA'
                  ? 'PEMERINTAH KABUPATEN KAYONG UTARA'
                  : r.toUpperCase();
              })()}
            </h3>
            <h3 className="text-sm font-extrabold uppercase text-slate-900 leading-tight">
              {labInfo.healthService || 'DINAS KESEHATAN DAN KELUARGA BERENCANA'}
            </h3>
            <h2 className="text-xl font-black uppercase text-slate-950 tracking-tight leading-tight mt-0.5">
              {labInfo.hospitalName || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'}
            </h2>
          </div>
          <div className="w-20 shrink-0 flex items-center justify-end"></div>
        </div>
      </div>

      {/* Upper Navigation Tabs as Segmented Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 text-[#0B5FA5] flex items-center justify-center shrink-0 shadow-2xs">
              <Gauge className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Sistem Analisis Tren & Stabilitas QC
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Deteksi otomatis pergeseran rata-rata (shift) dan tren linear harian sebelum pelanggaran aturan Westgard terjadi.
          </p>
        </div>

        {/* Tab Switcher & Export */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-lg shadow-2xs transition-colors"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            <span>PDF</span>
          </button>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto shrink-0 font-semibold text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('early_detection')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'early_detection'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deteksi Dini Pola & Tren
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                activeTab === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stabilitas Bulanan (Delta)
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW: NEW TAB - EARLY WARNING DETECTION ENGINE (SHIFT & TREND)            */}
      {/* ========================================================================= */}
      {activeTab === 'early_detection' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Summary Dashboard Cards for early warning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total combinations monitored */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Total Grup Terpantau
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {earlyWarningStats.totalMonitored}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Kombinasi</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Parameter & Level Kontrol yang memiliki data pemeriksaan aktif.
              </p>
            </div>

            {/* Card 2: Active Shift alerts */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-2">
              <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Shift Aktif (Aturan Westgard 10x)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${earlyWarningStats.criticalCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {earlyWarningStats.criticalCount}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Kasus</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Grup dengan ≥10 titik berurutan di satu sisi mean (pelanggaran Westgard aktif).
              </p>
            </div>

            {/* Card 3: Early trend / shift warnings */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Peringatan Pola & Tren</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${earlyWarningStats.warningCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {earlyWarningStats.warningCount}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Kasus</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Grup dengan pergeseran 6-9 titik, atau tren linear progresif bertahap.
              </p>
            </div>

            {/* Card 4: Overall Index score */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Indeks Stabilitas Alat</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {earlyWarningStats.overallScore}%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Sistem Stabil</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Estimasi tingkat kesehatan presisi alat lab analitik secara keseluruhan.
              </p>
            </div>

          </div>

          {/* Filtering Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs font-semibold">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari parameter atau alat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 font-sans font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B5FA5] transition-colors"
              />
            </div>

            {/* State Filter Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-100 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('alert_only')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    statusFilter === 'alert_only' ? 'bg-rose-100 text-rose-950 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Peringatan/Bahaya ({earlyWarningStats.criticalCount + earlyWarningStats.warningCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('stable_only')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    statusFilter === 'stable_only' ? 'bg-emerald-100 text-emerald-950 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Normal ({earlyWarningStats.stableCount})
                </button>
              </div>

              {/* Instrument Filter inside the search row */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                <Filter className="h-3 w-3 text-slate-400" />
                <select
                  value={selectedInstrumentId}
                  onChange={(e) => setSelectedInstrumentId(e.target.value)}
                  className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-[11px]"
                >
                  <option value="all">Semua Alat Lab</option>
                  {instruments.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Findings List (Beautiful Cards containing Sequence visualizations) */}
          <div className="space-y-4">
            {filteredFindings.length > 0 ? (
              filteredFindings.map((finding, idx) => {
                const isCritical = finding.status === 'critical';
                const isWarning = finding.status === 'warning';
                const isStable = finding.status === 'stable';

                return (
                  <div 
                    key={`${finding.parameter.id}-${finding.controlLevel}`}
                    className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-4 ${
                      isCritical 
                        ? 'border-rose-200 hover:border-rose-300' 
                        : isWarning 
                        ? 'border-amber-200 hover:border-amber-300' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    
                    {/* Card Header row with single-row unboxed metadata (anti-pill style) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        {/* Parameter name with code in monospace */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 leading-tight">
                            {finding.parameter.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200/80 px-1.5 py-0.2 rounded font-bold">
                            {finding.parameter.code}
                          </span>
                        </div>
                        
                        {/* Clean inline unboxed metadata (anti-pill) */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1">
                          <span>{finding.instrument?.name || 'Alat Lain'}</span>
                          <span aria-hidden="true">•</span>
                          <span className="font-semibold text-slate-700">{finding.controlLevel}</span>
                          <span aria-hidden="true">•</span>
                          <span>Target: <strong className="font-mono tabular-nums text-slate-700">{finding.parameter.targetMean}</strong> (SD: <strong className="font-mono tabular-nums text-slate-700">{finding.parameter.targetSD}</strong>)</span>
                        </div>
                      </div>

                      {/* Status / Diagnosis Indicator Block */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${
                          isCritical 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : isWarning 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isCritical ? (
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                          <span>{finding.statusLabel}</span>
                        </span>
                      </div>
                    </div>

                    {/* Sequence Visualization (Sparkline map of the last 10 points) */}
                    <div className="space-y-2.5 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 font-mono">
                          <Activity className="h-3.5 w-3.5 text-slate-400" />
                          <span>Visualisasi Urutan Nilai Kontrol (10 Run Terakhir)</span>
                        </span>
                        
                        {/* Summary shift/trend active metrics */}
                        <span className="text-[11px] text-slate-600 font-mono">
                          {finding.activeShiftStreak > 0 && (
                            <>Shift Terakhir: <strong className={finding.activeShiftStreak >= 10 ? 'text-rose-600' : 'text-amber-600'}>{finding.activeShiftStreak}x</strong> ({finding.shiftDirection === 'above' ? 'Atas Mean' : 'Bawah Mean'})</>
                          )}
                          {finding.activeTrendStreak > 1 && (
                            <>{finding.activeShiftStreak > 0 ? ' · ' : ''}Tren Berurutan: <strong className="text-amber-600">{finding.activeTrendStreak}x</strong> ({finding.trendDirection === 'increasing' ? 'Naik' : 'Turun'})</>
                          )}
                        </span>
                      </div>

                      {/* Sparkline Dots Row */}
                      <div className="flex items-center justify-between gap-1 bg-white p-3 rounded-lg border border-slate-200/80 relative overflow-hidden">
                        
                        {/* Connecting Line background */}
                        <div className="absolute left-[5%] right-[5%] top-1/2 h-[1.5px] bg-slate-200 -translate-y-1/2 z-0" />

                        {finding.latestResults.map((res, ptIdx) => {
                          const z = finding.parameter.targetSD > 0 
                            ? (res.value - finding.parameter.targetMean) / finding.parameter.targetSD 
                            : 0;
                          
                          // Determine color based on z score magnitude
                          const absZ = Math.abs(z);
                          let dotColor = 'bg-emerald-500 border-emerald-600';
                          let tooltipColor = 'text-emerald-700';
                          
                          if (absZ > 3.0) {
                            dotColor = 'bg-rose-500 border-rose-600';
                            tooltipColor = 'text-rose-600';
                          } else if (absZ > 2.0) {
                            dotColor = 'bg-amber-500 border-amber-600';
                            tooltipColor = 'text-amber-600';
                          } else if (absZ > 1.0) {
                            dotColor = 'bg-lime-500 border-lime-600';
                            tooltipColor = 'text-lime-700';
                          }

                          const isLastPoint = ptIdx === finding.latestResults.length - 1;

                          return (
                            <div 
                              key={res.id} 
                              className="relative flex flex-col items-center flex-1 z-10 group"
                            >
                              {/* Small vertical guideline indicator */}
                              <div className={`h-2.5 w-[1px] bg-slate-300 absolute bottom-full mb-1 ${isLastPoint ? 'h-4 bg-[#0B5FA5]' : ''}`} />
                              
                              {/* Dot circle */}
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white border transition-transform group-hover:scale-125 cursor-help shadow-2xs ${dotColor}`}>
                                {z > 0 ? '+' : z < 0 ? '-' : '•'}
                              </div>
                              
                              {/* Date labels beneath node */}
                              <span className="text-[9px] text-slate-400 mt-1 font-mono tracking-tight text-center font-medium max-w-[36px] truncate">
                                {res.date.substring(8, 10)}/{res.date.substring(5, 7)}
                              </span>

                              {/* Hover Tooltip card */}
                              <div className="absolute bottom-full mb-6 hidden group-hover:block bg-slate-950 text-white p-2.5 rounded-lg text-[10px] font-mono shadow-xl z-50 pointer-events-none min-w-[120px]">
                                <p className="font-bold border-b border-white/20 pb-1 mb-1 text-slate-300">{res.date} {res.time}</p>
                                <p>Hasil: <span className="text-white font-bold">{res.value}</span> {finding.parameter.unit}</p>
                                <p className="font-bold">SD: <span className={tooltipColor}>{res.sdPosition || `${z.toFixed(2)} SD`}</span></p>
                                <p className="capitalize text-slate-400">Status: {res.status}</p>
                              </div>
                            </div>
                          );
                        })}

                      </div>
                    </div>

                    {/* Math Breakdown & Detailed Explanation section */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      {/* Left: Cause of warning and details */}
                      <div className="md:col-span-8 space-y-2">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>Analisis Diagnostik Deviasi:</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-sans bg-slate-50 border border-slate-200/50 p-3 rounded-xl">
                          {finding.reason}
                        </p>

                        {/* Recommendation Plan block */}
                        <div className="space-y-1 bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
                          <strong className="text-[11px] text-[#0B5FA5] block font-bold uppercase tracking-wider font-mono">
                            Rekomendasi Rencana Tindakan (CAPA Mandiri):
                          </strong>
                          <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                            {finding.recommendation}
                          </p>
                        </div>
                      </div>

                      {/* Right: Calculated math regression indices */}
                      <div className="md:col-span-4 rounded-xl border border-slate-100 bg-slate-50/30 p-3 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                            Metrik Regresi Terhitung
                          </span>
                          
                          <div className="space-y-1 text-[11px] text-slate-600 font-mono">
                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                              <span>Suku Kemiringan (Slope):</span>
                              <strong className={`font-bold ${Math.abs(finding.slope) >= 0.1 ? 'text-amber-600' : 'text-slate-800'}`}>
                                {finding.slope > 0 ? '+' : ''}{finding.slope.toFixed(4)} SD/run
                              </strong>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-1 pt-1">
                              <span>Koefisien Korelasi (r):</span>
                              <strong className={`font-bold ${Math.abs(finding.correlation) >= 0.65 ? 'text-amber-600' : 'text-slate-800'}`}>
                                {finding.correlation.toFixed(3)}
                              </strong>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-1 pt-1">
                              <span>Determinasi (R²):</span>
                              <strong className={`font-bold ${finding.rSquared >= 0.45 ? 'text-amber-600' : 'text-slate-800'}`}>
                                {finding.rSquared.toFixed(3)}
                              </strong>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span>Total Run Teranalisis:</span>
                              <strong className="text-slate-800 font-bold">{finding.latestResults.length} run</strong>
                            </div>
                          </div>
                        </div>

                        {/* Navigate to Levey-Jennings Tab */}
                        {onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('levey-jennings', { parameterId: finding.parameter.id })}
                            className="w-full mt-3 py-2 px-3 text-[11px] font-bold text-white bg-[#0B5FA5] hover:bg-[#084B83] rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                          >
                            <span>Evaluasi Grafik Levey-Jennings</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })
            ) : (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">
                  Tidak Ada Grup yang Memenuhi Filter Pencarian
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Semua parameter berjalan normal, atau parameter yang Anda cari belum memiliki data yang memadai.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: ORIGINAL TAB - MONTHLY COMPARISON ANALYSIS (DELTA COMPARISON)       */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controls for Monthly comparison tab */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              Perbandingan Tingkat Kerusakan Mutu (Bulan Ini vs Bulan Lalu)
            </h4>

            {/* Sub Filters */}
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

              {/* Instrument Filter inside the original tab */}
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
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Peningkatan Pelanggaran / Deviasi
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
      )}

    </div>
  );
};
