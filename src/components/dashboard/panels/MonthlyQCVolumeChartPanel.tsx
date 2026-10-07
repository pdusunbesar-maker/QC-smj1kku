import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  Info,
  CalendarDays
} from 'lucide-react';
import { QCResult, Instrument } from '../../../types';

interface MonthlyQCVolumeChartPanelProps {
  qcResults: QCResult[];
  instruments: Instrument[];
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

interface MonthData {
  key: string; // "YYYY-MM"
  year: number;
  month: number; // 1-12
  monthLabel: string; // "Okt 26"
  fullLabel: string; // "Oktober 2026"
  total: number;
  pass: number;
  warning: number;
  reject: number;
  passRate: number;
  isCurrentMonth: boolean;
  instrumentBreakdown: Record<string, number>;
}

const INDONESIAN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const INDONESIAN_MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MonthlyQCVolumeChartPanel: React.FC<MonthlyQCVolumeChartPanelProps> = ({
  qcResults,
  instruments,
  onNavigateToTab,
}) => {
  // Filters & State
  const [selectedRange, setSelectedRange] = useState<'6m' | '12m' | 'ytd'>('6m');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'stacked' | 'total'>('stacked');
  const [hoveredMonth, setHoveredMonth] = useState<MonthData | null>(null);

  // Current year & month for baseline reference
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Filter QC Results by selected instrument
  const instrumentFilteredResults = useMemo(() => {
    if (selectedInstrumentId === 'all') return qcResults;
    return qcResults.filter(r => r.instrumentId === selectedInstrumentId);
  }, [qcResults, selectedInstrumentId]);

  // Generate continuous list of months based on selected range
  const monthlyDataList = useMemo<MonthData[]>(() => {
    const monthsKeys: Array<{ year: number; month: number }> = [];

    if (selectedRange === '6m') {
      // Last 6 months up to current month
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        monthsKeys.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    } else if (selectedRange === '12m') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        monthsKeys.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    } else {
      // YTD: January of current year up to current month
      for (let m = 1; m <= currentMonth; m++) {
        monthsKeys.push({ year: currentYear, month: m });
      }
    }

    // Build aggregations per month key "YYYY-MM"
    const resultMap = new Map<string, QCResult[]>();
    instrumentFilteredResults.forEach(r => {
      if (!r.date || r.date.length < 7) return;
      const key = r.date.substring(0, 7); // "YYYY-MM"
      const list = resultMap.get(key) || [];
      list.push(r);
      resultMap.set(key, list);
    });

    return monthsKeys.map(({ year, month }) => {
      const monthStr = String(month).padStart(2, '0');
      const key = `${year}-${monthStr}`;
      const records = resultMap.get(key) || [];

      let pass = 0;
      let warning = 0;
      let reject = 0;
      const instrumentBreakdown: Record<string, number> = {};

      records.forEach(r => {
        if (r.status === 'pass') pass++;
        else if (r.status === 'warning') warning++;
        else if (r.status === 'reject') reject++;

        const instName = r.instrumentName || 'Unknown';
        instrumentBreakdown[instName] = (instrumentBreakdown[instName] || 0) + 1;
      });

      const total = records.length;
      const passRate = total > 0 ? Math.round((pass / total) * 100) : 100;
      const isCurrentMonth = year === currentYear && month === currentMonth;
      const yearShort = String(year).slice(-2);
      const monthLabel = `${INDONESIAN_MONTHS_SHORT[month - 1]} '${yearShort}`;
      const fullLabel = `${INDONESIAN_MONTHS_FULL[month - 1]} ${year}`;

      return {
        key,
        year,
        month,
        monthLabel,
        fullLabel,
        total,
        pass,
        warning,
        reject,
        passRate,
        isCurrentMonth,
        instrumentBreakdown,
      };
    });
  }, [instrumentFilteredResults, selectedRange, currentYear, currentMonth]);

  // Overall Statistics for Performance Evaluation
  const overallStats = useMemo(() => {
    let totalExaminations = 0;
    let totalPass = 0;
    let totalWarning = 0;
    let totalReject = 0;
    let maxMonth: MonthData | null = null;

    for (const m of monthlyDataList) {
      totalExaminations += m.total;
      totalPass += m.pass;
      totalWarning += m.warning;
      totalReject += m.reject;

      if (!maxMonth || m.total > maxMonth.total) {
        maxMonth = m;
      }
    }

    const activeMonthsCount = monthlyDataList.length || 1;
    const avgMonthly = Math.round((totalExaminations / activeMonthsCount) * 10) / 10;
    const overallPassRate = totalExaminations > 0 
      ? Math.round((totalPass / totalExaminations) * 1000) / 10 
      : 100;

    const validPeakMonth: MonthData | null = maxMonth && maxMonth.total > 0 ? maxMonth : null;

    return {
      totalExaminations,
      totalPass,
      totalWarning,
      totalReject,
      avgMonthly,
      overallPassRate,
      maxMonth: validPeakMonth,
    };
  }, [monthlyDataList]);

  // Chart Dimensions & Scales
  const maxTotal = useMemo(() => {
    const highest = Math.max(...monthlyDataList.map(m => m.total), 10);
    // Round up to nice step (e.g. 20, 50, 100, etc.)
    const step = highest > 100 ? 25 : highest > 40 ? 10 : 5;
    return Math.ceil(highest / step) * step;
  }, [monthlyDataList]);

  const chartHeight = 180;
  const chartWidth = 640;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const barCount = monthlyDataList.length;
  const slotWidth = plotWidth / Math.max(1, barCount);
  const barWidth = Math.min(38, Math.max(16, slotWidth * 0.58));

  // Y-axis grid ticks (4 ticks)
  const yTicks = [
    0,
    Math.round(maxTotal * 0.33),
    Math.round(maxTotal * 0.66),
    maxTotal
  ];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B5FA5]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#172033] text-sm sm:text-base">
                  Tren Volume Pemeriksaan QC Bulanan
                </h3>
                <span className="font-mono text-[11px] font-semibold text-slate-500 hidden sm:inline">
                  · Evaluasi Kinerja Laboratorium
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Frekuensi running kontrol mutu analitik per bulan untuk evaluasi volume & beban kerja instrumen
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Instrument Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Filter Alat Laboratorium"
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#0B5FA5] transition-colors cursor-pointer"
            >
              <option value="all">Semua Alat ({instruments.length} Unit)</option>
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Display Mode: Stacked vs Total */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode('stacked')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                displayMode === 'stacked'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan rincian status Pass, Warning, dan Reject"
            >
              <Layers className="h-3 w-3" />
              <span>Status</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('total')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                displayMode === 'total'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan total pemeriksaan utuh"
            >
              <span>Total</span>
            </button>
          </div>

          {/* Period Range Filter Buttons */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRange('6m')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedRange === '6m'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Bulan
            </button>
            <button
              type="button"
              onClick={() => setSelectedRange('12m')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedRange === '12m'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 Bulan
            </button>
            <button
              type="button"
              onClick={() => setSelectedRange('ytd')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedRange === 'ytd'
                  ? 'bg-[#0B5FA5] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahun Ini
            </button>
          </div>
        </div>
      </div>

      {/* KPI Volume Highlights (Evaluation Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL PEMERIKSAAN
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900">
              {overallStats.totalExaminations}
            </span>
            <span className="text-xs text-slate-500">Run</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
            Periode {selectedRange === '6m' ? '6 Bulan' : selectedRange === '12m' ? '12 Bulan' : 'Tahun 2026'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
            RATA-RATA / BULAN
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-blue-700">
              {overallStats.avgMonthly}
            </span>
            <span className="text-xs text-slate-500">Run/Bulan</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
            Volume operasional lab
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
            BULAN TERTINGGI
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 truncate">
              {overallStats.maxMonth ? overallStats.maxMonth.total : '-'}
            </span>
            <span className="text-xs text-slate-500">Run</span>
          </div>
          <span className="text-[11px] text-slate-600 font-medium mt-0.5 block truncate">
            {overallStats.maxMonth ? overallStats.maxMonth.fullLabel : 'Belum ada data'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
            KEPATUHAN (PASS RATE)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900">
              {overallStats.overallPassRate}%
            </span>
            <span className="text-xs text-emerald-600 font-bold">In-Control</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
            {overallStats.totalPass} Pass · {overallStats.totalWarning} Warn · {overallStats.totalReject} Rej
          </span>
        </div>
      </div>

      {/* SVG Bar Chart Visualization */}
      <div className="relative bg-slate-50/50 rounded-xl border border-slate-200/90 p-4 pt-6 overflow-hidden">
        {monthlyDataList.length > 0 ? (
          <div className="w-full">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 sm:h-64 overflow-visible"
            >
              <defs>
                {/* Total bar gradient */}
                <linearGradient id="qcBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B5FA5" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>

                {/* Active month highlight gradient */}
                <linearGradient id="qcBarActiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#084B83" />
                  <stop offset="100%" stopColor="#0B5FA5" />
                </linearGradient>
              </defs>

              {/* Y-Axis Horizontal Grid Lines and Labels */}
              {yTicks.map((tick, i) => {
                const y = paddingTop + plotHeight - (maxTotal > 0 ? (tick / maxTotal) * plotHeight : 0);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray={i === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="monospace"
                      fill="#94A3B8"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Bars per Month */}
              {monthlyDataList.map((m, idx) => {
                const xCenter = paddingLeft + (idx + 0.5) * slotWidth;
                const xBar = xCenter - barWidth / 2;
                const totalH = maxTotal > 0 ? (m.total / maxTotal) * plotHeight : 0;
                const yTotal = paddingTop + plotHeight - totalH;

                // Segments for stacked mode
                const passH = maxTotal > 0 ? (m.pass / maxTotal) * plotHeight : 0;
                const warnH = maxTotal > 0 ? (m.warning / maxTotal) * plotHeight : 0;
                const rejH = maxTotal > 0 ? (m.reject / maxTotal) * plotHeight : 0;

                // Stack positions from bottom up: Pass at bottom, Warning in middle, Reject at top
                const yPass = paddingTop + plotHeight - passH;
                const yWarn = yPass - warnH;
                const yRej = yWarn - rejH;

                const isHovered = hoveredMonth?.key === m.key;

                return (
                  <g
                    key={m.key}
                    className="cursor-pointer transition-opacity duration-150"
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Hover indicator background pill */}
                    {isHovered && (
                      <rect
                        x={xCenter - slotWidth * 0.45}
                        y={paddingTop - 5}
                        width={slotWidth * 0.9}
                        height={plotHeight + 25}
                        fill="#0B5FA5"
                        fillOpacity="0.05"
                        rx="6"
                      />
                    )}

                    {m.total === 0 ? (
                      // Empty state bar stub
                      <line
                        x1={xBar}
                        y1={paddingTop + plotHeight}
                        x2={xBar + barWidth}
                        y2={paddingTop + plotHeight}
                        stroke="#CBD5E1"
                        strokeWidth="2"
                      />
                    ) : displayMode === 'stacked' ? (
                      // Stacked Bar Mode
                      <g>
                        {/* 1. Pass Segment (Bottom) */}
                        {passH > 0 && (
                          <rect
                            x={xBar}
                            y={yPass}
                            width={barWidth}
                            height={passH}
                            fill="#10B981"
                            rx={warnH === 0 && rejH === 0 ? 3 : 0}
                            className="transition-all"
                          />
                        )}

                        {/* 2. Warning Segment (Middle) */}
                        {warnH > 0 && (
                          <rect
                            x={xBar}
                            y={yWarn}
                            width={barWidth}
                            height={warnH}
                            fill="#F59E0B"
                            rx={rejH === 0 ? 3 : 0}
                            className="transition-all"
                          />
                        )}

                        {/* 3. Reject Segment (Top) */}
                        {rejH > 0 && (
                          <rect
                            x={xBar}
                            y={yRej}
                            width={barWidth}
                            height={rejH}
                            fill="#EF4444"
                            rx={3}
                            className="transition-all"
                          />
                        )}
                      </g>
                    ) : (
                      // Total Bar Mode
                      <rect
                        x={xBar}
                        y={yTotal}
                        width={barWidth}
                        height={totalH}
                        fill={m.isCurrentMonth ? 'url(#qcBarActiveGradient)' : 'url(#qcBarGradient)'}
                        rx="3"
                        className="transition-all"
                      />
                    )}

                    {/* Numeric Count Label on top of bar */}
                    {m.total > 0 && (
                      <text
                        x={xCenter}
                        y={Math.max(paddingTop - 6, yTotal - 6)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        fill={isHovered ? '#0B5FA5' : '#475569'}
                      >
                        {m.total}
                      </text>
                    )}

                    {/* X-Axis Month Label */}
                    <text
                      x={xCenter}
                      y={chartHeight - paddingBottom + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={m.isCurrentMonth || isHovered ? 'bold' : 'normal'}
                      fill={m.isCurrentMonth ? '#0B5FA5' : isHovered ? '#1E293B' : '#64748B'}
                    >
                      {m.monthLabel}
                    </text>

                    {/* Current Month Active Dot */}
                    {m.isCurrentMonth && (
                      <circle
                        cx={xCenter}
                        cy={chartHeight - paddingBottom + 26}
                        r="2.5"
                        fill="#0B5FA5"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip on Hover */}
            {hoveredMonth && (
              <div 
                className="absolute top-4 right-4 bg-slate-900/95 text-white text-xs p-3.5 rounded-xl shadow-xl pointer-events-none z-30 font-sans border border-slate-700/80 max-w-xs animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-2 mb-2 font-mono">
                  <span className="font-bold text-white text-sm">
                    {hoveredMonth.fullLabel}
                  </span>
                  {hoveredMonth.isCurrentMonth && (
                    <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-1.5 py-0.2 rounded">
                      Bulan Berjalan
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-mono">
                    <span>Total Pemeriksaan:</span>
                    <strong className="text-white text-sm">{hoveredMonth.total} Run</strong>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-[11px] font-mono">
                    <div className="text-emerald-400">
                      <div className="text-[10px] text-slate-400 uppercase">Pass</div>
                      <span className="font-bold">{hoveredMonth.pass}</span>
                      <span className="text-[10px] text-emerald-300/80 ml-1">
                        ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.pass / hoveredMonth.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="text-amber-400">
                      <div className="text-[10px] text-slate-400 uppercase">Warn</div>
                      <span className="font-bold">{hoveredMonth.warning}</span>
                      <span className="text-[10px] text-amber-300/80 ml-1">
                        ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.warning / hoveredMonth.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="text-rose-400">
                      <div className="text-[10px] text-slate-400 uppercase">Reject</div>
                      <span className="font-bold">{hoveredMonth.reject}</span>
                      <span className="text-[10px] text-rose-300/80 ml-1">
                        ({hoveredMonth.total > 0 ? Math.round((hoveredMonth.reject / hoveredMonth.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Top instrument for this month */}
                  {Object.keys(hoveredMonth.instrumentBreakdown).length > 0 && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <span>Alat aktif: </span>
                      <span className="text-slate-200 font-medium">
                        {Object.entries(hoveredMonth.instrumentBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 2)
                          .map(([name, count]) => `${name} (${count})`)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-14 text-center text-xs text-slate-400">
            Belum ada data pemeriksaan QC untuk rentang waktu yang dipilih.
          </div>
        )}
      </div>

      {/* Legend & Evaluation Insight Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
        {/* Unboxed Typographic Legend (Zero-Pill Discipline) */}
        <div className="flex items-center gap-4 text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shrink-0" />
            <span>Pass (In-Control)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 shrink-0" />
            <span>Warning (1:2s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 shrink-0" />
            <span>Reject (Out of Control)</span>
          </div>
        </div>

        {/* Quick Review Navigation Link */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateToTab?.('qc-review')}
            className="text-xs font-semibold text-[#0B5FA5] hover:text-[#084B83] flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Laporan QC & Review</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Workload Evaluation Analytical Insight Box */}
      <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-xs text-slate-700 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-[#0B5FA5] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900">
            Evaluasi Volume Kinerja Laboratorium:
          </p>
          <p className="text-slate-600 leading-relaxed">
            Rata-rata <strong>{overallStats.avgMonthly} pemeriksaan QC per bulan</strong> memastikan bahwa seluruh alat analitik memenuhi standar akreditasi dan verifikasi presisi berkala. 
            {overallStats.totalReject > 0 ? (
              <span> Terdapat {overallStats.totalReject} run pemeriksaan berstatus Reject yang telah terdokumentasi dan dapat ditindaklanjuti melalui modul CAPA & Non-Conformity.</span>
            ) : (
              <span> Seluruh parameter kontrol berada dalam batas toleransi analitik yang memuaskan.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
