import React, { useState, useMemo, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Printer, 
  Download, 
  FileDown,
  Info,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Loader2,
  FileText,
  Edit3
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QCResult, Parameter, QCStatistics, LaboratoryInfo } from '../../types';
import { calculateQCStatistics } from '../../utils/qcCalculations';
import { StorageService } from '../../services/storage';
import { KopEditorModal } from '../common/KopEditorModal';

interface LeveyJenningsChartProps {
  parameter: Parameter;
  results: QCResult[];
  labInfo?: LaboratoryInfo;
  onSelectResult?: (result: QCResult) => void;
  onCreateCapa?: (result: QCResult) => void;
  onCreateNC?: (result: QCResult) => void;
}

export const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({
  parameter,
  results,
  labInfo: propLabInfo,
  onSelectResult,
  onCreateCapa,
  onCreateNC,
}) => {
  const labInfo = propLabInfo || StorageService.getLabInfo();
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'Level 1' | 'Level 2' | 'Level 3'>('all');
  
  // Precise Date Range Search ("Dari Tanggal" s/d "Sampai Tanggal")
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredPoint, setHoveredPoint] = useState<{
    result: QCResult;
    x: number;
    y: number;
  } | null>(null);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isKopModalOpen, setIsKopModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const printableDocRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Quick preset button handler
  const handleSetPreset = (preset: 'today' | '7d' | 'this_month' | 'last_month' | '90d' | 'all') => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('sv-SE');

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setStartDate(d7.toLocaleDateString('sv-SE'));
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(startOfMonth.toLocaleDateString('sv-SE'));
      setEndDate(endOfMonth.toLocaleDateString('sv-SE'));
    } else if (preset === 'last_month') {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(startOfLastMonth.toLocaleDateString('sv-SE'));
      setEndDate(endOfLastMonth.toLocaleDateString('sv-SE'));
    } else if (preset === '90d') {
      const d90 = new Date();
      d90.setDate(d90.getDate() - 89);
      setStartDate(d90.toLocaleDateString('sv-SE'));
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate(todayStr > '2026-12-31' ? todayStr : '2026-12-31');
    }
  };

  // Filter results by parameter, level, and exact date range
  const filteredResults = useMemo(() => {
    let list = results.filter(r => r.parameterId === parameter.id);

    if (selectedLevel !== 'all') {
      list = list.filter(r => r.controlLevel === selectedLevel);
    }

    if (startDate) {
      list = list.filter(r => r.date >= startDate);
    }

    if (endDate) {
      list = list.filter(r => r.date <= endDate);
    }

    // Sort chronologically
    return [...list].sort((a, b) => a.timestamp - b.timestamp);
  }, [results, parameter.id, selectedLevel, startDate, endDate]);

  // Compute live statistics for current selection
  const stats: QCStatistics = useMemo(() => {
    return calculateQCStatistics(
      filteredResults,
      parameter.targetMean,
      parameter.targetSD,
      parameter.targetCV
    );
  }, [filteredResults, parameter]);

  // Violations in current selection
  const violationsList = useMemo(() => {
    return filteredResults.filter(r => r.violations && r.violations.length > 0);
  }, [filteredResults]);

  // Chart Geometry
  const width = 960;
  const height = 400;
  const padding = { top: 40, right: 90, bottom: 50, left: 70 };
  const chartWidth = Math.max(width - padding.left - padding.right, filteredResults.length * 32) * zoomLevel;
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

  // Reference lines definition
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
    canvas.width = (padding.left + chartWidth + padding.right) * 2;
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
      link.download = `Levey_Jennings_${parameter.code}_${startDate}_sd_${endDate}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = url;
  };

  // Direct Save as PDF using html2canvas & jsPDF
  const handleExportPDF = async () => {
    if (!printableDocRef.current) return;
    setIsGeneratingPDF(true);

    try {
      const element = printableDocRef.current;
      
      // Render clean canvas with high DPI scale
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1280,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm
      const margin = 10; // 10mm margins
      const availableWidth = pdfWidth - margin * 2; // 277mm
      const availableHeight = pdfHeight - margin * 2; // 190mm

      // Calculate initial dimensions based on full width
      let renderWidth = availableWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      // Scale down proportionally to fit exactly on 1 Landscape A4 page if taller than printable area
      if (renderHeight > availableHeight) {
        const scaleRatio = availableHeight / renderHeight;
        renderHeight = availableHeight;
        renderWidth = renderWidth * scaleRatio;
      }

      // Center horizontally and vertically on page
      const xOffset = margin + (availableWidth - renderWidth) / 2;
      const yOffset = margin + (availableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
      pdf.save(`Laporan_Grafik_QC_Levey_Jennings_${parameter.code}_${startDate}_sd_${endDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('print-landscape');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-landscape');
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* SCREEN ACTION TOOLBAR & FILTER CONTROLS (HIDDEN ON PRINT) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-2xs">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight">
                Grafik Kendali Mutu Levey-Jennings: {parameter.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Metode: <strong className="text-slate-700 font-semibold">{parameter.method}</strong> · Mean: <strong className="text-slate-700 font-semibold">{parameter.targetMean} {parameter.unit}</strong> (SD: {parameter.targetSD}, CV: {parameter.targetCV}%)
              </p>
            </div>
          </div>

          {/* Action buttons (Zoom, PNG, Save PDF, Print) */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-slate-600">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3))}
                className="p-1.5 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                title="Perbesar Grafik"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1))}
                className="p-1.5 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                title="Perkecil Grafik"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsKopModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="Edit Identitas KOP Surat, Logo, Alamat, dan Tanda Tangan"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-600" />
              <span>Edit KOP Surat</span>
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="Ekspor Gambar Grafik (PNG)"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>Ekspor PNG</span>
            </button>

            {/* Simpan PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-lg shadow-2xs transition-colors"
              title="Simpan lembar evaluasi grafik Levey-Jennings sebagai file PDF"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Simpan PDF</span>
                </>
              )}
            </button>

            {/* Cetak Lembar Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
              title="Cetak lembar dokumen grafik Levey-Jennings secara bersih tanpa elemen navigasi"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Lembar</span>
            </button>
          </div>
        </div>

        {/* Date Range & Level Filter Card */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>Pencarian Rentang Tanggal Grafik:</span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-slate-400 font-medium mr-1">Preset:</span>
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: '7d', label: '7 Hari' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: '90d', label: '3 Bulan' },
                { id: 'all', label: 'Semua Data' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSetPreset(p.id as any)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Dari Tanggal */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Dari Tanggal:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none bg-white"
              />
            </div>

            {/* Sampai Tanggal */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Sampai Tanggal:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none bg-white"
              />
            </div>

            {/* Level Kontrol */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Level Bahan Kontrol:
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="all">Semua Level (Level 1, 2, 3)</option>
                <option value="Level 1">Level 1 (Normal)</option>
                <option value="Level 2">Level 2 (Patologis)</option>
                <option value="Level 3">Level 3 (Tinggi)</option>
              </select>
            </div>

            {/* Filter Status Indicator */}
            <div className="flex flex-col justify-end">
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Titik Terpilih:</span>
                <span className="font-bold text-emerald-700">{filteredResults.length} Hasil QC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL PRINTABLE LEVEY-JENNINGS SHEET (CLEAN & COMPLETE WITH KOP SURAT) */}
      {/* ========================================================================= */}
      <div 
        ref={printableDocRef}
        id="printable-levey-jennings-doc"
        className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs space-y-5 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none"
      >
        {/* KOP SURAT RESMI RSUD SULTAN MUHAMMAD JAMALUDIN I */}
        <div className="w-full kop-surat print-avoid-break mb-5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Kiri */}
            <div className="w-20 sm:w-24 shrink-0 flex items-center justify-start">
              <img
                src={labInfo.logoUrl || '/logo_kayong_utara.png'}
                alt="Lambang Daerah Kabupaten Kayong Utara"
                className="h-20 sm:h-24 w-auto object-contain max-w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_kayong_utara.png';
                }}
              />
            </div>

            {/* Kalimat & Informasi Instansi */}
            <div className="flex-1 text-center px-2 space-y-0.5">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 leading-tight">
                {labInfo.regency || 'PEMERINTAH KABUPATEN KAYONG UTARA'}
              </h3>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase text-slate-900 leading-tight">
                {labInfo.healthService || 'DINAS KESEHATAN DAN KELUARGA BERENCANA'}
              </h3>
              <h2 className="text-base sm:text-xl font-black uppercase text-slate-950 tracking-tight leading-tight mt-0.5">
                {labInfo.hospitalName || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'}
              </h2>
              <h4 className="text-xs sm:text-base font-bold uppercase text-emerald-950 leading-tight">
                {labInfo.name || 'INSTALASI PATOLOGI KLINIK & LABORATORIUM TERPADU'}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-700 mt-1 font-normal leading-normal">
                {labInfo.address}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono leading-normal">
                Telp: {labInfo.phone} · Surel: {labInfo.email} {labInfo.accreditation ? `· Akreditasi: ${labInfo.accreditation}` : ''}
              </p>
            </div>

            {/* Logo / Badge Kanan Simetris */}
            <div className="w-20 sm:w-24 shrink-0 flex items-center justify-end">
              {labInfo.logoRightUrl ? (
                <img
                  src={labInfo.logoRightUrl}
                  alt="Logo Kanan Instansi"
                  className="h-20 sm:h-24 w-auto object-contain max-w-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-center w-full">
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300 font-bold block w-full">
                    KARS PARIPURNA
                  </span>
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300 font-bold block w-full">
                    ISO 15189
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Garis Bawah Kop Surat Proporsional Bergaris Ganda Sesuai Lebar Dokumen */}
          <div className="w-full mt-3">
            <div className="border-b-[3px] border-slate-900 w-full" />
            <div className="border-b-[1px] border-slate-900 w-full mt-[2px]" />
          </div>
        </div>

        {/* DOCUMENT TITLE & METADATA */}
        <div className="text-center pb-2 border-b border-slate-200 print-avoid-break">
          <h1 className="text-sm md:text-base font-black uppercase text-slate-900 tracking-wide">
            LEMBAR EVALUASI GRAFIK KENDALI MUTU (LEVEY-JENNINGS)
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            Pemantauan Mutu Internal (PMI) Laboratorium Patologi Klinik
          </p>
        </div>

        {/* PARAMETER & EVALUATION METADATA GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200 print:bg-slate-50 print-avoid-break">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Parameter Uji</span>
            <span className="font-bold text-slate-900 text-xs">{parameter.name} [{parameter.code}]</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Metode Pemeriksaan</span>
            <span className="font-semibold text-slate-800 text-xs">{parameter.method}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Target Nilai Rujukan</span>
            <span className="font-mono font-bold text-slate-900 text-xs">
              Mean: {parameter.targetMean} {parameter.unit} (SD: {parameter.targetSD})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Periode Evaluasi</span>
            <span className="font-mono font-bold text-slate-900 text-xs">
              {startDate} s/d {endDate} {selectedLevel !== 'all' ? `(${selectedLevel})` : ''}
            </span>
          </div>
        </div>

        {/* SUMMARY STATS STRIP */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs print-avoid-break">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="text-[9px] text-slate-500 uppercase font-semibold">Total Run (N)</p>
            <p className="text-sm md:text-base font-bold font-mono text-slate-900">{stats.count}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="text-[9px] text-slate-500 uppercase font-semibold">Mean Terhitung</p>
            <p className="text-sm md:text-base font-bold font-mono text-slate-900">{stats.mean}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="text-[9px] text-slate-500 uppercase font-semibold">SD Terhitung</p>
            <p className="text-sm md:text-base font-bold font-mono text-slate-900">{stats.sd}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="text-[9px] text-slate-500 uppercase font-semibold">CV% Aktual</p>
            <p className={`text-sm md:text-base font-bold font-mono ${stats.cv > parameter.targetCV ? 'text-amber-600' : 'text-emerald-700'}`}>
              {stats.cv}%
            </p>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <p className="text-[9px] text-slate-500 uppercase font-semibold">Target CV%</p>
            <p className="text-sm md:text-base font-bold font-mono text-slate-600">{parameter.targetCV}%</p>
          </div>
          <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
            <p className="text-[9px] text-emerald-700 uppercase font-semibold">Pass (Normal)</p>
            <p className="text-sm md:text-base font-bold font-mono text-emerald-800">{stats.passCount}</p>
          </div>
          <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200">
            <p className="text-[9px] text-amber-700 uppercase font-semibold">Warning (±2SD)</p>
            <p className="text-sm md:text-base font-bold font-mono text-amber-800">{stats.warningCount}</p>
          </div>
          <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-200">
            <p className="text-[9px] text-rose-700 uppercase font-semibold">Reject / Out</p>
            <p className="text-sm md:text-base font-bold font-mono text-rose-800">{stats.rejectCount}</p>
          </div>
        </div>

        {/* SVG LEVEY-JENNINGS CHART CANVAS */}
        <div 
          ref={containerRef}
          className="relative overflow-x-auto select-none rounded-xl border border-slate-300 bg-white p-2 print:overflow-visible print:border-slate-300 print-avoid-break"
        >
          {filteredResults.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Info className="h-8 w-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Tidak ada data QC pada rentang tanggal ini.</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Coba perluas rentang tanggal ({startDate} s/d {endDate}) atau ubah filter level kontrol.
              </p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={padding.left + chartWidth + padding.right}
              height={height}
              className="overflow-visible mx-auto"
            >
              {/* Background Shaded Safety Zones */}
              {/* 1. Normal safe zone (+1SD to -1SD) */}
              <rect
                x={padding.left}
                y={getY(targetMean + targetSD)}
                width={chartWidth}
                height={getY(targetMean - targetSD) - getY(targetMean + targetSD)}
                fill="#10b981"
                fillOpacity="0.06"
              />
              {/* 2. Warning zone top (+1SD to +2SD) */}
              <rect
                x={padding.left}
                y={getY(targetMean + 2 * targetSD)}
                width={chartWidth}
                height={getY(targetMean + targetSD) - getY(targetMean + 2 * targetSD)}
                fill="#f59e0b"
                fillOpacity="0.08"
              />
              {/* 3. Warning zone bottom (-1SD to -2SD) */}
              <rect
                x={padding.left}
                y={getY(targetMean - targetSD)}
                width={chartWidth}
                height={getY(targetMean - 2 * targetSD) - getY(targetMean - targetSD)}
                fill="#f59e0b"
                fillOpacity="0.08"
              />
              {/* 4. Reject zone top (+2SD to +3.5SD) */}
              <rect
                x={padding.left}
                y={getY(yMax)}
                width={chartWidth}
                height={getY(targetMean + 2 * targetSD) - getY(yMax)}
                fill="#f43f5e"
                fillOpacity="0.06"
              />
              {/* 5. Reject zone bottom (-2SD to -3.5SD) */}
              <rect
                x={padding.left}
                y={getY(targetMean - 2 * targetSD)}
                width={chartWidth}
                height={getY(yMin) - getY(targetMean - 2 * targetSD)}
                fill="#f43f5e"
                fillOpacity="0.06"
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
                      opacity={0.85}
                    />

                    {/* Left label: +3SD, +2SD, Mean, etc */}
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      fill={line.color}
                      fontSize="10"
                      fontWeight={line.label === 'Mean' ? 'bold' : '600'}
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {line.label}
                    </text>

                    {/* Right label: Exact concentration value */}
                    <text
                      x={padding.left + chartWidth + 8}
                      y={y + 3.5}
                      fill={line.color}
                      fontSize="9.5"
                      fontWeight={line.label === 'Mean' ? 'bold' : 'normal'}
                      textAnchor="start"
                      fontFamily="monospace"
                    >
                      {line.value.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Connecting trend lines between QC run points */}
              {filteredResults.length > 1 && (
                <path
                  d={filteredResults.reduce((acc, curr, idx) => {
                    const x = getX(idx, filteredResults.length);
                    const y = getY(curr.value);
                    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                  }, '')}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* QC Result Data Points */}
              {filteredResults.map((res, idx) => {
                const x = getX(idx, filteredResults.length);
                const y = getY(res.value);
                const isOut = res.status === 'reject';
                const isWarn = res.status === 'warning';
                const isHovered = hoveredPoint?.result.id === res.id;

                let fillColor = '#10b981'; // Green (Normal)
                let strokeColor = '#047857';
                let pointRadius = 5;

                if (isOut) {
                  fillColor = '#e11d48'; // Red (Reject)
                  strokeColor = '#9f1239';
                  pointRadius = 6.5;
                } else if (isWarn) {
                  fillColor = '#f59e0b'; // Amber (Warning)
                  strokeColor = '#b45309';
                  pointRadius = 5.5;
                }

                return (
                  <g key={res.id} className="cursor-pointer">
                    {/* Pulsing ring on reject/warning */}
                    {(isOut || isWarn) && (
                      <circle
                        cx={x}
                        cy={y}
                        r={pointRadius + 4}
                        fill={fillColor}
                        fillOpacity="0.25"
                      />
                    )}

                    {/* Main data point */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? pointRadius + 2 : pointRadius}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      onMouseEnter={() => setHoveredPoint({ result: res, x, y })}
                      onClick={() => onSelectResult && onSelectResult(res)}
                    />

                    {/* Numeric value label above point */}
                    <text
                      x={x}
                      y={y - (pointRadius + 4)}
                      fill={isOut ? '#e11d48' : isWarn ? '#d97706' : '#334155'}
                      fontSize="9"
                      fontWeight={isOut || isWarn ? 'bold' : '600'}
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {res.value}
                    </text>

                    {/* Date / Run sequence below bottom axis */}
                    <text
                      x={x}
                      y={padding.top + chartHeight + 18}
                      fill="#64748b"
                      fontSize="8.5"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {res.date.substring(5)}
                    </text>
                    <text
                      x={x}
                      y={padding.top + chartHeight + 30}
                      fill="#94a3b8"
                      fontSize="7.5"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      #{idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Interactive Inspection Tooltip (Hidden on Print/PDF) */}
          {hoveredPoint && (
            <div
              className="absolute z-20 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs print:hidden pointer-events-auto"
              style={{
                left: Math.min(hoveredPoint.x + 15, chartWidth - 160),
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
                      + Lapor NC
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

        {/* LEGEND & GUIDELINES */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-200 print-avoid-break">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="font-medium">Normal / Accept (&lt; ±2SD)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-medium">Warning / Peringatan (±2SD)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              <span className="font-medium">Reject / Out-of-Control (±3SD)</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Rentang Evaluasi: <strong>{startDate}</strong> s/d <strong>{endDate}</strong> ({filteredResults.length} data point)
          </div>
        </div>

        {/* WESTGARD VIOLATIONS SUMMARY TABLE (IF ANY) */}
        {violationsList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 print-avoid-break">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5 text-rose-800">
              <ShieldAlert className="h-4 w-4" />
              <span>Daftar Pelanggaran Aturan Westgard Pada Periode Ini ({violationsList.length} Kejadian)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-rose-50 text-rose-950 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-10">No</th>
                    <th className="p-2 border border-slate-300">Tanggal & Jam</th>
                    <th className="p-2 border border-slate-300">Level / Lot</th>
                    <th className="p-2 border border-slate-300 text-right">Nilai Hasil</th>
                    <th className="p-2 border border-slate-300 text-center">Z-Score</th>
                    <th className="p-2 border border-slate-300">Aturan Terlanggar & Penjelasan</th>
                    <th className="p-2 border border-slate-300">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {violationsList.map((vRes, idx) => (
                    <tr key={vRes.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{vRes.date} {vRes.time}</td>
                      <td className="p-2 border border-slate-200 font-mono">{vRes.controlLevel} ({vRes.lotNumber})</td>
                      <td className="p-2 border border-slate-200 font-mono text-right font-bold text-slate-900">
                        {vRes.value} {vRes.unit}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono text-center font-bold text-rose-600">
                        {vRes.sdPosition} ({vRes.zScore})
                      </td>
                      <td className="p-2 border border-slate-200">
                        {vRes.violations.map((v, i) => (
                          <div key={i} className="text-rose-900">
                            <strong>{v.ruleName}:</strong> {v.description}
                          </div>
                        ))}
                      </td>
                      <td className="p-2 border border-slate-200">{vRes.operatorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFICIAL SIGNATURE FOOTER */}
        <div className="mt-10 grid grid-cols-2 text-center text-xs pt-6 border-t-2 border-slate-900 signature-block print-avoid-break">
          <div>
            <p className="text-slate-600">Mengetahui & Menyetujui,</p>
            <p className="font-bold text-slate-900 mt-1">Penanggung Jawab Laboratorium</p>
            <div className="h-20" />
            <p className="font-bold underline text-slate-900">{labInfo.headOfLab}</p>
            <p className="text-[11px] font-mono text-slate-500">NIP: {labInfo.headNip}</p>
          </div>

          <div className="relative group">
            <p className="text-slate-600">Sukadana, {new Date().toISOString().split('T')[0]}</p>
            <p className="font-bold text-slate-900 mt-1">Penanggung Jawab Mutu</p>
            <div className="h-20" />
            <p className="font-bold underline text-slate-900">
              {labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes'}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              NIP: {labInfo.qualityNip || '19850914 201001 2 015'}
            </p>
          </div>
        </div>
      </div>

      {/* MODAL EDIT KOP SURAT LAPORAN */}
      <KopEditorModal
        isOpen={isKopModalOpen}
        onClose={() => setIsKopModalOpen(false)}
        labInfo={labInfo}
      />
    </div>
  );
};
