import React, { useState, useMemo, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Printer, 
  Download, 
  Info,
  Calendar,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { QCResult, Parameter, QCStatistics } from '../../types';
import { calculateQCStatistics } from '../../utils/qcCalculations';

interface LeveyJenningsChartProps {
  parameter: Parameter;
  results: QCResult[];
  onSelectResult?: (result: QCResult) => void;
  onCreateCapa?: (result: QCResult) => void;
  onCreateNC?: (result: QCResult) => void;
}

export const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({
  parameter,
  results,
  onSelectResult,
  onCreateCapa,
  onCreateNC,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'Level 1' | 'Level 2' | 'Level 3'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredPoint, setHoveredPoint] = useState<{
    result: QCResult;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter results by parameter, level, and date
  const filteredResults = useMemo(() => {
    let list = results.filter(r => r.parameterId === parameter.id);

    if (selectedLevel !== 'all') {
      list = list.filter(r => r.controlLevel === selectedLevel);
    }

    if (dateFilter !== 'all') {
      const now = new Date('2026-10-03T12:00:00Z').getTime(); // anchored to current context date
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = now - days * 24 * 3600 * 1000;
      list = list.filter(r => r.timestamp >= cutoff);
    }

    // Sort chronologically
    return [...list].sort((a, b) => a.timestamp - b.timestamp);
  }, [results, parameter.id, selectedLevel, dateFilter]);

  // Compute live statistics for current selection
  const stats: QCStatistics = useMemo(() => {
    return calculateQCStatistics(
      filteredResults,
      parameter.targetMean,
      parameter.targetSD,
      parameter.targetCV
    );
  }, [filteredResults, parameter]);

  // Chart Geometry
  const width = 960;
  const height = 400;
  const padding = { top: 40, right: 90, bottom: 50, left: 70 };
  const chartWidth = (width - padding.left - padding.right) * zoomLevel;
  const chartHeight = height - padding.top - padding.bottom;

  // Y Scale based on Mean +/- 3.5 SD
  const targetMean = parameter.targetMean;
  const targetSD = parameter.targetSD;
  const yMin = targetMean - 3.5 * targetSD;
  const yMax = targetMean + 3.5 * targetSD;

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const ratio = (clamped - yMin) / (yMax - yMin);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (total - 1)) * chartWidth;
  };

  // Lines definition
  const lines = [
    { label: '+3 SD', value: targetMean + 3 * targetSD, color: '#e11d48', strokeWidth: 1.5, strokeDash: '4,4' },
    { label: '+2 SD', value: targetMean + 2 * targetSD, color: '#f59e0b', strokeWidth: 1.5, strokeDash: '4,4' },
    { label: '+1 SD', value: targetMean + 1 * targetSD, color: '#94a3b8', strokeWidth: 1, strokeDash: '2,2' },
    { label: 'Mean', value: targetMean, color: '#0f172a', strokeWidth: 2, strokeDash: '' },
    { label: '-1 SD', value: targetMean - 1 * targetSD, color: '#94a3b8', strokeWidth: 1, strokeDash: '2,2' },
    { label: '-2 SD', value: targetMean - 2 * targetSD, color: '#f59e0b', strokeWidth: 1.5, strokeDash: '4,4' },
    { label: '-3 SD', value: targetMean - 3 * targetSD, color: '#e11d48', strokeWidth: 1.5, strokeDash: '4,4' },
  ];

  // Export SVG to PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Levey_Jennings_${parameter.code}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = url;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Grafik Levey-Jennings: {parameter.name}
            </h2>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {parameter.code}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              · Satuan: {parameter.unit}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Metode: {parameter.method} · Mean Target: {parameter.targetMean} {parameter.unit} (SD: {parameter.targetSD})
          </p>
        </div>

        {/* Filter controls & Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            {(['all', 'Level 1', 'Level 2'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {lvl === 'all' ? 'Semua Level' : lvl}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
            {[
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
              { id: '90d', label: '3 Bulan' },
              { id: 'all', label: 'Semua' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  dateFilter === d.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 2.5))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              title="Perbesar Grafik"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              title="Perkecil Grafik"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Export & Print */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportPNG}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg"
              title="Ekspor Gambar PNG"
            >
              <Download className="h-3.5 w-3.5" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg"
              title="Cetak Grafik"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 py-3 border-b border-slate-100 text-xs">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Run (N)</p>
          <p className="text-base font-bold font-mono text-slate-900">{stats.count}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Mean Aktual</p>
          <p className="text-base font-bold font-mono text-slate-900">{stats.mean}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">SD Aktual</p>
          <p className="text-base font-bold font-mono text-slate-900">{stats.sd}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">CV% Aktual</p>
          <p className={`text-base font-bold font-mono ${stats.cv > parameter.targetCV ? 'text-amber-600' : 'text-emerald-700'}`}>
            {stats.cv}%
          </p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Target CV%</p>
          <p className="text-base font-bold font-mono text-slate-600">{parameter.targetCV}%</p>
        </div>
        <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/60">
          <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold">Pass (Normal)</p>
          <p className="text-base font-bold font-mono text-emerald-800">{stats.passCount}</p>
        </div>
        <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
          <p className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">Warning (±2SD)</p>
          <p className="text-base font-bold font-mono text-amber-800">{stats.warningCount}</p>
        </div>
        <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-200/60">
          <p className="text-[10px] text-rose-700 uppercase tracking-wider font-semibold">Reject / Out</p>
          <p className="text-base font-bold font-mono text-rose-800">{stats.rejectCount}</p>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div 
        ref={containerRef}
        className="relative mt-4 overflow-x-auto select-none rounded-lg border border-slate-100 bg-slate-50/40 p-2"
      >
        <svg
          ref={svgRef}
          width={padding.left + chartWidth + padding.right}
          height={height}
          className="overflow-visible"
        >
          {/* Background Shaded Safety Zones */}
          {/* 1. Normal safe zone (+1SD to -1SD) */}
          <rect
            x={padding.left}
            y={getY(targetMean + targetSD)}
            width={chartWidth}
            height={getY(targetMean - targetSD) - getY(targetMean + targetSD)}
            fill="#10b981"
            fillOpacity="0.05"
          />
          {/* 2. Warning zone top (+1SD to +2SD) */}
          <rect
            x={padding.left}
            y={getY(targetMean + 2 * targetSD)}
            width={chartWidth}
            height={getY(targetMean + targetSD) - getY(targetMean + 2 * targetSD)}
            fill="#f59e0b"
            fillOpacity="0.06"
          />
          {/* 3. Warning zone bottom (-1SD to -2SD) */}
          <rect
            x={padding.left}
            y={getY(targetMean - targetSD)}
            width={chartWidth}
            height={getY(targetMean - 2 * targetSD) - getY(targetMean - targetSD)}
            fill="#f59e0b"
            fillOpacity="0.06"
          />
          {/* 4. Reject zone top (+2SD to +3.5SD) */}
          <rect
            x={padding.left}
            y={getY(yMax)}
            width={chartWidth}
            height={getY(targetMean + 2 * targetSD) - getY(yMax)}
            fill="#f43f5e"
            fillOpacity="0.05"
          />
          {/* 5. Reject zone bottom (-2SD to -3.5SD) */}
          <rect
            x={padding.left}
            y={getY(targetMean - 2 * targetSD)}
            width={chartWidth}
            height={getY(yMin) - getY(targetMean - 2 * targetSD)}
            fill="#f43f5e"
            fillOpacity="0.05"
          />

          {/* Reference SD and Mean Lines */}
          {lines.map((line, idx) => {
            const y = getY(line.value);
            return (
              <g key={idx}>
                {/* Horizontal guide line */}
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  strokeDasharray={line.strokeDash}
                  opacity={line.label === 'Mean' ? 0.9 : 0.65}
                />
                {/* Left Label (+3SD, Mean, etc) */}
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontFamily="monospace"
                  fill={line.color}
                  fontWeight={line.label === 'Mean' ? 'bold' : 'normal'}
                >
                  {line.label}
                </text>
                {/* Right Value (e.g. 107.0 mg/dL) */}
                <text
                  x={padding.left + chartWidth + 8}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="10"
                  fontFamily="monospace"
                  fill={line.color}
                  fontWeight={line.label === 'Mean' ? 'bold' : 'normal'}
                >
                  {line.value.toFixed(parameter.decimalPlaces)}
                </text>
              </g>
            );
          })}

          {/* Connecting Trend Polyline */}
          {filteredResults.length > 1 && (
            <path
              d={filteredResults.reduce((acc, pt, i) => {
                const x = getX(i, filteredResults.length);
                const y = getY(pt.value);
                return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#475569"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {filteredResults.map((pt, i) => {
            const x = getX(i, filteredResults.length);
            const y = getY(pt.value);

            let pointFill = '#10b981'; // normal pass
            let pointStroke = '#047857';
            let radius = 4.5;

            if (pt.status === 'reject') {
              pointFill = '#f43f5e';
              pointStroke = '#be123c';
              radius = 6;
            } else if (pt.status === 'warning') {
              pointFill = '#f59e0b';
              pointStroke = '#b45309';
              radius = 5.5;
            }

            const isHovered = hoveredPoint?.result.id === pt.id;

            return (
              <g 
                key={pt.id} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ result: pt, x, y })}
                onClick={() => onSelectResult && onSelectResult(pt)}
              >
                {/* Outer halo when hovered or violation */}
                {(isHovered || pt.status !== 'pass') && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 3}
                    fill={pointFill}
                    fillOpacity="0.25"
                    className="animate-pulse"
                  />
                )}
                {/* Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? radius + 1.5 : radius}
                  fill={pointFill}
                  stroke={pointStroke}
                  strokeWidth="1.5"
                  className="transition-all"
                />

                {/* X-Axis bottom date labels (subsampled if many) */}
                {(filteredResults.length <= 15 || i % Math.ceil(filteredResults.length / 12) === 0) && (
                  <text
                    x={x}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fill="#64748b"
                  >
                    {pt.date.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Precision HUD Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm text-xs min-w-[260px]"
            style={{
              left: Math.min(hoveredPoint.x + 15, width - 260),
              top: Math.max(hoveredPoint.y - 120, 10),
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
              <span className="font-mono font-bold text-slate-900">
                {hoveredPoint.result.id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                hoveredPoint.result.status === 'pass' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : hoveredPoint.result.status === 'warning'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {hoveredPoint.result.status}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Nilai Pengukuran:</span>
                <span className="font-bold text-slate-900">
                  {hoveredPoint.result.value} {hoveredPoint.result.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Z-Score:</span>
                <span className={`font-semibold ${Math.abs(hoveredPoint.result.zScore) > 2 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {hoveredPoint.result.sdPosition} ({hoveredPoint.result.zScore})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu:</span>
                <span className="text-slate-700">{hoveredPoint.result.date} {hoveredPoint.result.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Level / Lot:</span>
                <span className="text-slate-700">{hoveredPoint.result.controlLevel} · {hoveredPoint.result.lotNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator:</span>
                <span className="text-slate-700 truncate max-w-[130px]">{hoveredPoint.result.operatorName}</span>
              </div>
            </div>

            {/* Westgard violations info */}
            {hoveredPoint.result.violations.length > 0 && (
              <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200/80 p-2 text-[10px] text-rose-800">
                <div className="flex items-center gap-1 font-bold text-rose-900 mb-0.5">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>Pelanggaran Westgard Terdeteksi:</span>
                </div>
                {hoveredPoint.result.violations.map((v, vIdx) => (
                  <p key={vIdx} className="leading-tight">
                    • <strong>{v.ruleName}:</strong> {v.description}
                  </p>
                ))}
              </div>
            )}

            {/* Direct Escalation Action Buttons */}
            {hoveredPoint.result.status !== 'pass' && (
              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                {onCreateNC && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNC(hoveredPoint.result);
                      setHoveredPoint(null);
                    }}
                    className="flex-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[10px] transition-colors"
                  >
                    + Lapor Penyimpangan
                  </button>
                )}
                {onCreateCapa && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreateCapa(hoveredPoint.result);
                      setHoveredPoint(null);
                    }}
                    className="flex-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[10px] transition-colors"
                  >
                    + Terbitkan CAPA
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Guide Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Normal (Accept)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Warning (±2SD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
            <span>Reject / Out-of-Control (±3SD)</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Info className="h-3.5 w-3.5" />
          <span>Arahkan mouse ke titik untuk detail pengukuran & aturan Westgard</span>
        </div>
      </div>
    </div>
  );
};
