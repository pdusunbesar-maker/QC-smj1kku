import React, { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  FileDown,
  Filter, 
  Calendar, 
  FileText, 
  Layers, 
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Search,
  RefreshCw,
  Clock,
  UserCheck,
  ShieldAlert,
  ClipboardCheck,
  FileCheck,
  ArrowUpDown,
  Edit3,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  QCResult, 
  LaboratoryInfo, 
  Parameter, 
  Instrument, 
  CAPA, 
  NonConformity 
} from '../../types';
import { calculateQCStatistics } from '../../utils/qcCalculations';
import { exportAuditReadyExcel } from '../../utils/excelExport';
import { StorageService } from '../../services/storage';
import { KopEditorModal } from '../common/KopEditorModal';

interface ReportsViewProps {
  labInfo: LaboratoryInfo;
  results: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
  capas: CAPA[];
  nonConformities: NonConformity[];
  onLabInfoUpdated?: (info: LaboratoryInfo) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  labInfo,
  results,
  parameters,
  instruments,
  capas,
  nonConformities,
  onLabInfoUpdated,
}) => {
  // Report category
  const [reportType, setReportType] = useState<'qc' | 'westgard' | 'nc' | 'capa'>('qc');
  
  // Date Range Search ("Dari Tanggal" - "Sampai Tanggal")
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Additional Filters
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedParameterId, setSelectedParameterId] = useState<string>('all');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  // Signatories modal edit state (Penanggung Jawab Mutu & Pimpinan Lab)
  const [isSignatoriesModalOpen, setIsSignatoriesModalOpen] = useState(false);
  const [signatoriesForm, setSignatoriesForm] = useState({
    headOfLab: labInfo.headOfLab || 'dr. Hendra Wijaya, Sp.PK',
    headNip: labInfo.headNip || '19800512 200801 1 008',
    headOfQuality: labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes',
    qualityNip: labInfo.qualityNip || '19850914 201001 2 015',
  });

  const handleOpenSignatoriesModal = () => {
    setSignatoriesForm({
      headOfLab: labInfo.headOfLab || 'dr. Hendra Wijaya, Sp.PK',
      headNip: labInfo.headNip || '19800512 200801 1 008',
      headOfQuality: labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes',
      qualityNip: labInfo.qualityNip || '19850914 201001 2 015',
    });
    setIsSignatoriesModalOpen(true);
  };

  const handleSaveSignatories = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedLab: LaboratoryInfo = {
      ...labInfo,
      headOfLab: signatoriesForm.headOfLab.trim(),
      headNip: signatoriesForm.headNip.trim(),
      headOfQuality: signatoriesForm.headOfQuality.trim(),
      qualityNip: signatoriesForm.qualityNip.trim(),
    };
    StorageService.updateLabInfo(updatedLab);
    if (onLabInfoUpdated) {
      onLabInfoUpdated(updatedLab);
    }
    setIsSignatoriesModalOpen(false);
  };

  // Quick Date Preset Handler
  const handleSetPreset = (preset: 'today' | '7d' | 'this_month' | 'last_month' | 'all') => {
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
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate(todayStr > '2026-12-31' ? todayStr : '2026-12-31');
    }
  };

  // 1. FILTERED QC RESULTS
  const filteredQC = useMemo(() => {
    return results.filter(r => {
      // Date range check
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Parameter filter
      if (selectedParameterId !== 'all' && r.parameterId !== selectedParameterId) return false;

      // Instrument filter
      if (selectedInstrumentId !== 'all' && r.instrumentId !== selectedInstrumentId) return false;

      // Status filter
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;

      // Keyword search
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchParam = r.parameterName.toLowerCase().includes(query) || r.parameterCode.toLowerCase().includes(query);
        const matchInst = r.instrumentName.toLowerCase().includes(query);
        const matchOp = r.operatorName.toLowerCase().includes(query);
        const matchLot = r.lotNumber.toLowerCase().includes(query);
        const matchNotes = (r.notes || '').toLowerCase().includes(query);
        if (!matchParam && !matchInst && !matchOp && !matchLot && !matchNotes) return false;
      }

      return true;
    });
  }, [results, startDate, endDate, selectedParameterId, selectedInstrumentId, selectedStatus, searchKeyword]);

  // 2. FILTERED WESTGARD VIOLATIONS
  const filteredWestgard = useMemo(() => {
    const violationItems: Array<{
      qcId: string;
      date: string;
      time: string;
      instrumentName: string;
      parameterName: string;
      parameterCode: string;
      controlLevel: string;
      lotNumber: string;
      value: number;
      unit: string;
      zScore: number;
      sdPosition: string;
      ruleKey: string;
      ruleName: string;
      type: 'warning' | 'reject';
      description: string;
      operatorName: string;
      reviewStatus: string;
      linkedNCId?: string;
      linkedCAPAId?: string;
    }> = [];

    results.forEach(r => {
      // Date range check
      if (startDate && r.date < startDate) return;
      if (endDate && r.date > endDate) return;

      // Parameter & Instrument filter
      if (selectedParameterId !== 'all' && r.parameterId !== selectedParameterId) return;
      if (selectedInstrumentId !== 'all' && r.instrumentId !== selectedInstrumentId) return;

      if (r.violations && r.violations.length > 0) {
        r.violations.forEach(v => {
          if (selectedStatus !== 'all' && v.type !== selectedStatus) return;

          if (searchKeyword.trim()) {
            const q = searchKeyword.toLowerCase();
            const match = r.parameterName.toLowerCase().includes(q) ||
                          r.parameterCode.toLowerCase().includes(q) ||
                          v.ruleName.toLowerCase().includes(q) ||
                          v.description.toLowerCase().includes(q) ||
                          r.operatorName.toLowerCase().includes(q);
            if (!match) return;
          }

          violationItems.push({
            qcId: r.id,
            date: r.date,
            time: r.time,
            instrumentName: r.instrumentName,
            parameterName: r.parameterName,
            parameterCode: r.parameterCode,
            controlLevel: r.controlLevel,
            lotNumber: r.lotNumber,
            value: r.value,
            unit: r.unit,
            zScore: r.zScore,
            sdPosition: r.sdPosition,
            ruleKey: v.rule,
            ruleName: v.ruleName,
            type: v.type,
            description: v.description,
            operatorName: r.operatorName,
            reviewStatus: r.reviewStatus,
            linkedNCId: r.linkedNonConformityId,
            linkedCAPAId: r.linkedCapaId,
          });
        });
      }
    });

    return violationItems;
  }, [results, startDate, endDate, selectedParameterId, selectedInstrumentId, selectedStatus, searchKeyword]);

  // 3. FILTERED NON-CONFORMITIES (NC)
  const filteredNC = useMemo(() => {
    return nonConformities.filter(nc => {
      // Date check
      if (startDate && nc.date < startDate) return false;
      if (endDate && nc.date > endDate) return false;

      // Instrument filter
      if (selectedInstrumentId !== 'all' && nc.instrumentId !== selectedInstrumentId) return false;

      // Parameter filter
      if (selectedParameterId !== 'all' && nc.parameterId !== selectedParameterId) return false;

      // Severity filter
      if (selectedSeverity !== 'all' && nc.severity !== selectedSeverity) return false;

      // Status filter
      if (selectedStatus !== 'all' && nc.status !== selectedStatus) return false;

      // Keyword search
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchId = nc.id.toLowerCase().includes(q);
        const matchDesc = nc.description.toLowerCase().includes(q);
        const matchParam = nc.parameterName.toLowerCase().includes(q);
        const matchInst = nc.instrumentName.toLowerCase().includes(q);
        const matchReporter = nc.reportedByName.toLowerCase().includes(q);
        const matchImpact = nc.impact.toLowerCase().includes(q);
        if (!matchId && !matchDesc && !matchParam && !matchInst && !matchReporter && !matchImpact) return false;
      }

      return true;
    });
  }, [nonConformities, startDate, endDate, selectedInstrumentId, selectedParameterId, selectedSeverity, selectedStatus, searchKeyword]);

  // 4. FILTERED CAPA DOCUMENTS
  const filteredCAPA = useMemo(() => {
    return capas.filter(c => {
      const createdDate = c.createdAt ? c.createdAt.substring(0, 10) : '';
      if (startDate && createdDate < startDate) return false;
      if (endDate && createdDate > endDate) return false;

      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;

      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchId = c.id.toLowerCase().includes(q);
        const matchProblem = c.problemStatement.toLowerCase().includes(q);
        const matchPIC = c.pic.toLowerCase().includes(q);
        const matchRoot = (c.identifiedRootCause || '').toLowerCase().includes(q);
        if (!matchId && !matchProblem && !matchPIC && !matchRoot) return false;
      }

      return true;
    });
  }, [capas, startDate, endDate, selectedStatus, searchKeyword]);

  // Stats calculation for QC
  const firstParam = parameters.find(p => p.id === selectedParameterId) || parameters[0];
  const qcStats = useMemo(() => {
    if (!firstParam || filteredQC.length === 0) return null;
    return calculateQCStatistics(
      filteredQC,
      firstParam.targetMean,
      firstParam.targetSD,
      firstParam.targetCV
    );
  }, [filteredQC, firstParam]);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';
    const dateRangeLabel = `${startDate}_sd_${endDate}`;

    if (reportType === 'qc') {
      filename = `Laporan_QC_Harian_RSUD_SMJ1_${dateRangeLabel}.csv`;
      csvContent = 'No,ID,Tanggal,Jam,Instrumen,Parameter,Kode_Parameter,Level_Kontrol,Nomor_Lot,Nilai,Satuan,Target_Mean,Target_SD,Z_Score,Posisi_SD,Status_QC,Petugas_ATLM,Review_Supervisor,Catatan\n';
      filteredQC.forEach((r, idx) => {
        csvContent += `"${idx + 1}","${r.id}","${r.date}","${r.time}","${r.instrumentName}","${r.parameterName}","${r.parameterCode}","${r.controlLevel}","${r.lotNumber}",${r.value},"${r.unit}",${r.mean},${r.sd},${r.zScore},"${r.sdPosition}","${r.status}","${r.operatorName}","${r.reviewStatus}","${(r.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else if (reportType === 'westgard') {
      filename = `Laporan_Pelanggaran_Westgard_RSUD_SMJ1_${dateRangeLabel}.csv`;
      csvContent = 'No,ID_QC,Tanggal,Jam,Instrumen,Parameter,Kode,Level,Lot,Nilai,Z_Score,Aturan_Westgard,Tipe,Deskripsi_Pelanggaran,Petugas_ATLM,Status_Review\n';
      filteredWestgard.forEach((v, idx) => {
        csvContent += `"${idx + 1}","${v.qcId}","${v.date}","${v.time}","${v.instrumentName}","${v.parameterName}","${v.parameterCode}","${v.controlLevel}","${v.lotNumber}",${v.value},${v.zScore},"${v.ruleName}","${v.type}","${v.description.replace(/"/g, '""')}","${v.operatorName}","${v.reviewStatus}"\n`;
      });
    } else if (reportType === 'nc') {
      filename = `Laporan_Penyimpangan_Mutu_NC_RSUD_SMJ1_${dateRangeLabel}.csv`;
      csvContent = 'No,ID_NC,Tanggal,Waktu,Unit,Instrumen,Parameter,Aturan_Terkait,Tingkat_Keparahan,Kategori,Deskripsi_Penyimpangan,Dampak_Hasil_Pasien,Tindakan_Segera,Pelapor,Status,Tanggal_Selesai\n';
      filteredNC.forEach((nc, idx) => {
        csvContent += `"${idx + 1}","${nc.id}","${nc.date}","${nc.time}","${nc.unit}","${nc.instrumentName}","${nc.parameterName}","${nc.westgardRule || '-'}","${nc.severity}","${nc.category}","${nc.description.replace(/"/g, '""')}","${nc.impact.replace(/"/g, '""')}","${nc.immediateAction.replace(/"/g, '""')}","${nc.reportedByName}","${nc.status}","${nc.resolvedAt || '-'}"\n`;
      });
    } else if (reportType === 'capa') {
      filename = `Laporan_Dokumen_CAPA_RSUD_SMJ1_${dateRangeLabel}.csv`;
      csvContent = 'No,ID_CAPA,Tanggal_Dibuat,Sumber_Masalah,Departemen,PIC,Pernyataan_Masalah,Akar_Masalah_RCA,Jumlah_Tindakan_Korektif,Jumlah_Tindakan_Preventif,Batas_Waktu_DueDate,Status,Efektivitas\n';
      filteredCAPA.forEach((c, idx) => {
        csvContent += `"${idx + 1}","${c.id}","${c.createdAt}","${c.source}","${c.department}","${c.pic}","${c.problemStatement.replace(/"/g, '""')}","${(c.identifiedRootCause || '-').replace(/"/g, '""')}",${c.correctiveActions.length},${c.preventiveActions.length},"${c.overallDueDate}","${c.status}","${c.effectiveness}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Enterprise Audit-Ready Excel (.XLSX) Export Handler with multi-sheets and auto-calculations
  const handleExportAuditExcel = () => {
    const selectedParamObj = parameters.find(p => p.id === selectedParameterId);
    const selectedInstObj = instruments.find(i => i.id === selectedInstrumentId);

    exportAuditReadyExcel({
      labInfo,
      qcResults: filteredQC,
      parameters,
      instruments,
      capas: filteredCAPA,
      nonConformities: filteredNC,
      startDate,
      endDate,
      selectedParamName: selectedParamObj ? `${selectedParamObj.name} (${selectedParamObj.code})` : undefined,
      selectedInstrumentName: selectedInstObj ? selectedInstObj.name : undefined
    });
  };

  const printableDocRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Direct PDF Export using html2canvas & jsPDF
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
          const sheet = clonedDoc.getElementById('printable-report-sheet');
          if (sheet) {
            sheet.style.border = 'none';
            sheet.style.borderRadius = '0px';
            sheet.style.boxShadow = 'none';
            sheet.style.padding = '0px';
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

      pdf.save(`Laporan_QC_${reportType.toUpperCase()}_RSUD_SMJ1_${startDate}_sd_${endDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
      {/* Top Header - Screen Only */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              Laporan & Ekspor Kontrol Mutu Laboratorium
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Pencarian data presisi dari rentang tanggal, filter parameter, pratinjau lembar resmi KOP Surat RSUD Sultan Muhammad Jamaludin I, dan ekspor data.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Button Edit KOP Surat & Pimpinan */}
          <button
            type="button"
            onClick={() => setIsSignatoriesModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            title="Edit KOP Surat, Logo, Alamat, dan Pejabat Bertandatangan"
          >
            <Edit3 className="h-4 w-4 text-slate-600" />
            <span>Edit KOP Surat & Pimpinan</span>
          </button>

          {/* Excel XLSX Multi-sheet Export */}
          <button
            type="button"
            onClick={handleExportAuditExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 rounded-lg shadow-2xs transition-colors"
            title="Ekspor Workbook Excel (.xlsx) Multi-Sheet Lengkap dengan Auto-Perhitungan Statistik QC, Log Westgard, CAPA, & NC"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-800" />
            <span>Ekspor Excel (.XLSX)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            title="Ekspor data tabel aktif ke format teks .CSV"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-lg shadow-2xs transition-colors"
            title="Simpan lembar laporan sebagai file PDF"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Simpan PDF</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Lembar</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs - Screen Only */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        {[
          { id: 'qc', label: '1. Laporan QC Harian', icon: FileCheck, count: filteredQC.length },
          { id: 'westgard', label: '2. Pelanggaran Westgard', icon: AlertTriangle, count: filteredWestgard.length },
          { id: 'nc', label: '3. Penyimpangan Mutu (NC)', icon: AlertOctagon, count: filteredNC.length },
          { id: 'capa', label: '4. Dokumen CAPA', icon: ClipboardCheck, count: filteredCAPA.length },
        ].map(t => {
          const Icon = t.icon;
          const isActive = reportType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportType(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-800'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Date Range & Comprehensive Filter Card - Screen Only */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <span>Pencarian Rentang Tanggal & Filter Laporan</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">Preset:</span>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: '7d', label: '7 Hari' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'last_month', label: 'Bulan Lalu' },
              { id: 'all', label: 'Semua Data' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSetPreset(p.id as any)}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {/* Dari Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Dari Tanggal:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none bg-slate-50"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none bg-slate-50"
            />
          </div>

          {/* Parameter Filter */}
          {(reportType === 'qc' || reportType === 'westgard' || reportType === 'nc') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Parameter Pemeriksaan:
              </label>
              <select
                value={selectedParameterId}
                onChange={(e) => setSelectedParameterId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white"
              >
                <option value="all">Semua Parameter ({parameters.length})</option>
                {parameters.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
          )}

          {/* Instrument Filter */}
          {(reportType === 'qc' || reportType === 'westgard' || reportType === 'nc') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Instrumen / Alat:
              </label>
              <select
                value={selectedInstrumentId}
                onChange={(e) => setSelectedInstrumentId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white"
              >
                <option value="all">Semua Alat ({instruments.length})</option>
                {instruments.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                ))}
              </select>
            </div>
          )}

          {/* Severity filter (NC only) */}
          {reportType === 'nc' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tingkat Keparahan:
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white"
              >
                <option value="all">Semua Severity</option>
                <option value="critical">Critical (Kritis)</option>
                <option value="major">Major (Mayor)</option>
                <option value="minor">Minor (Minor)</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Status Laporan:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white"
            >
              <option value="all">Semua Status</option>
              {reportType === 'qc' && (
                <>
                  <option value="pass">Pass (Lolos)</option>
                  <option value="warning">Warning (Peringatan)</option>
                  <option value="reject">Reject (Ditolak)</option>
                </>
              )}
              {reportType === 'westgard' && (
                <>
                  <option value="reject">Reject Rule (Pelanggaran Penolakan)</option>
                  <option value="warning">Warning Rule (Peringatan 1:2s)</option>
                </>
              )}
              {reportType === 'nc' && (
                <>
                  <option value="open">Open (Terbuka)</option>
                  <option value="resolved">Resolved (Terselesaikan)</option>
                  <option value="escalated_to_capa">Eskalasi ke CAPA</option>
                </>
              )}
              {reportType === 'capa' && (
                <>
                  <option value="open">Open (Baru)</option>
                  <option value="investigation">Investigation (Investigasi)</option>
                  <option value="action_in_progress">Action in Progress</option>
                  <option value="closed">Closed (Selesai/Efektif)</option>
                </>
              )}
            </select>
          </div>

          {/* Keyword Search */}
          <div className={reportType === 'capa' ? 'sm:col-span-2' : ''}>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Kata Kunci Pencarian:
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari parameter, nomor lot, PIC, atau masalah..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none bg-white"
              />
            </div>
          </div>
        </div>

        {/* Results count indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
          <span>
            Menampilkan data periode: <strong className="text-slate-800">{startDate}</strong> s/d <strong className="text-slate-800">{endDate}</strong>
          </span>
          <span>
            Ditemukan: <strong className="text-emerald-700 font-bold">
              {reportType === 'qc' && filteredQC.length}
              {reportType === 'westgard' && filteredWestgard.length}
              {reportType === 'nc' && filteredNC.length}
              {reportType === 'capa' && filteredCAPA.length}
            </strong> rekaman data
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL PRINTABLE REPORT SHEET (WITH HOSPITAL KOP SURAT)                  */}
      {/* ========================================================================= */}
      <div 
        ref={printableDocRef}
        id="printable-report-sheet"
        className="printable-sheet rounded-xl border border-slate-200 bg-white p-8 shadow-xs print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none"
      >
        {/* KOP SURAT RESMI RSUD SULTAN MUHAMMAD JAMALUDIN I */}
        <div className="w-full kop-surat print-avoid-break mb-6">
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
                {(() => {
                  const r = labInfo.regency || 'PEMERINTAH KABUPATEN KAYONG UTARA';
                  return r.toUpperCase() === 'KABUPATEN KAYONG UTARA' || r.toUpperCase() === 'KAYONG UTARA'
                    ? 'PEMERINTAH KABUPATEN KAYONG UTARA'
                    : r.toUpperCase();
                })()}
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

        {/* Title of Document */}
        <div className="text-center my-4">
          <h2 className="text-base font-bold uppercase text-slate-900 tracking-wide underline underline-offset-4">
            {reportType === 'qc' && 'LEMBAR LAPORAN REKAPITULASI QUALITY CONTROL (QC) HARIAN'}
            {reportType === 'westgard' && 'LEMBAR REKAPITULASI PELANGGARAN ATURAN WESTGARD'}
            {reportType === 'nc' && 'LEMBAR LAPORAN KETIDAKSESUAIAN MUTU (NON-CONFORMITY / NC)'}
            {reportType === 'capa' && 'LEMBAR DOKUMEN CORRECTIVE & PREVENTIVE ACTION (CAPA)'}
          </h2>
          <p className="text-xs text-slate-600 font-mono mt-1.5">
            Rentang Tanggal: <strong>{startDate}</strong> s/d <strong>{endDate}</strong> · Tanggal Cetak: {new Date().toISOString().split('T')[0]} · Unit: {labInfo.roomUnit}
          </p>
        </div>

        {/* Statistical Summary Bar for QC */}
        {reportType === 'qc' && qcStats && (
          <div className="mb-5 grid grid-cols-2 sm:grid-cols-6 gap-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Pemeriksaan</p>
              <p className="font-bold text-sm text-slate-900">{filteredQC.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Mean Aktual</p>
              <p className="font-bold text-sm text-slate-900">{qcStats.mean}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">SD Aktual</p>
              <p className="font-bold text-sm text-slate-900">{qcStats.sd}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">CV% Aktual</p>
              <p className="font-bold text-sm text-emerald-700">{qcStats.cv}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Lolos Mutu (Pass)</p>
              <p className="font-bold text-sm text-emerald-700">
                {qcStats.count > 0 ? Math.round((qcStats.passCount / qcStats.count) * 100) : 0}% ({qcStats.passCount})
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Penolakan (Reject)</p>
              <p className="font-bold text-sm text-rose-700">{qcStats.rejectCount}</p>
            </div>
          </div>
        )}

        {/* Summary Bar for Westgard Violations */}
        {reportType === 'westgard' && (
          <div className="mb-5 grid grid-cols-3 gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Insiden Westgard</p>
              <p className="font-bold text-sm text-slate-900">{filteredWestgard.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Kategori Reject Rule</p>
              <p className="font-bold text-sm text-rose-700">
                {filteredWestgard.filter(w => w.type === 'reject').length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Kategori Warning Rule (1:2s)</p>
              <p className="font-bold text-sm text-amber-700">
                {filteredWestgard.filter(w => w.type === 'warning').length}
              </p>
            </div>
          </div>
        )}

        {/* Summary Bar for Non-Conformities */}
        {reportType === 'nc' && (
          <div className="mb-5 grid grid-cols-4 gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Laporan NC</p>
              <p className="font-bold text-sm text-slate-900">{filteredNC.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Status Open</p>
              <p className="font-bold text-sm text-rose-700">
                {filteredNC.filter(n => n.status === 'open').length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Terselesaikan (Resolved)</p>
              <p className="font-bold text-sm text-emerald-700">
                {filteredNC.filter(n => n.status === 'resolved').length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Eskalasi ke CAPA</p>
              <p className="font-bold text-sm text-indigo-700">
                {filteredNC.filter(n => n.status === 'escalated_to_capa').length}
              </p>
            </div>
          </div>
        )}

        {/* Summary Bar for CAPA */}
        {reportType === 'capa' && (
          <div className="mb-5 grid grid-cols-4 gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-center text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Dokumen CAPA</p>
              <p className="font-bold text-sm text-slate-900">{filteredCAPA.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Sedang Berjalan</p>
              <p className="font-bold text-sm text-amber-700">
                {filteredCAPA.filter(c => c.status !== 'closed').length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Selesai (Closed)</p>
              <p className="font-bold text-sm text-emerald-700">
                {filteredCAPA.filter(c => c.status === 'closed').length}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Efektif Terverifikasi</p>
              <p className="font-bold text-sm text-emerald-700">
                {filteredCAPA.filter(c => c.effectiveness === 'effective').length}
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DATA TABLES BY REPORT TYPE                                                */}
        {/* ========================================================================= */}
        <div className="overflow-x-auto">
          {/* TAB 1: LAPORAN QC HARIAN */}
          {reportType === 'qc' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border border-slate-300">Tanggal / Jam</th>
                  <th className="p-2 border border-slate-300">Instrumen</th>
                  <th className="p-2 border border-slate-300">Parameter</th>
                  <th className="p-2 border border-slate-300">Level / Lot</th>
                  <th className="p-2 border border-slate-300 text-right">Hasil QC</th>
                  <th className="p-2 border border-slate-300 text-right">Target Mean</th>
                  <th className="p-2 border border-slate-300 text-center">Z-Score</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                  <th className="p-2 border border-slate-300">Petugas ATLM</th>
                  <th className="p-2 border border-slate-300">Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredQC.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500 font-sans">
                      Tidak ada data QC yang ditemukan pada rentang tanggal {startDate} s/d {endDate}.
                    </td>
                  </tr>
                ) : (
                  filteredQC.map((r, idx) => (
                    <tr key={r.id} className="text-[11px] hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 whitespace-nowrap">{r.date} {r.time}</td>
                      <td className="p-2 border border-slate-200 font-sans">{r.instrumentName}</td>
                      <td className="p-2 border border-slate-200 font-sans font-semibold">
                        {r.parameterName} <span className="text-[10px] text-slate-500 font-mono">({r.parameterCode})</span>
                      </td>
                      <td className="p-2 border border-slate-200">
                        {r.controlLevel} <span className="text-[10px] text-slate-500">[{r.lotNumber}]</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-right font-bold">
                        {r.value} {r.unit}
                      </td>
                      <td className="p-2 border border-slate-200 text-right">{r.mean}</td>
                      <td className={`p-2 border border-slate-200 text-center font-bold ${
                        Math.abs(r.zScore) > 3 ? 'text-rose-700 bg-rose-50' : Math.abs(r.zScore) > 2 ? 'text-amber-700 bg-amber-50' : 'text-slate-800'
                      }`}>
                        {r.sdPosition}
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'pass'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 font-sans">{r.operatorName}</td>
                      <td className="p-2 border border-slate-200 font-sans text-[10px] uppercase">
                        {r.reviewStatus === 'accepted' ? (
                          <span className="text-emerald-700 font-bold">Disetujui</span>
                        ) : r.reviewStatus === 'rejected' ? (
                          <span className="text-rose-700 font-bold">Ditolak</span>
                        ) : (
                          <span className="text-slate-500">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: LAPORAN PELANGGARAN WESTGARD */}
          {reportType === 'westgard' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border border-slate-300">Tanggal / Jam</th>
                  <th className="p-2 border border-slate-300">Parameter & Alat</th>
                  <th className="p-2 border border-slate-300">Level / Lot</th>
                  <th className="p-2 border border-slate-300 text-center">Aturan Westgard</th>
                  <th className="p-2 border border-slate-300 text-center">Tipe</th>
                  <th className="p-2 border border-slate-300">Deskripsi Pelanggaran & Rekomendasi</th>
                  <th className="p-2 border border-slate-300 text-center">Z-Score</th>
                  <th className="p-2 border border-slate-300">Petugas ATLM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredWestgard.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 font-sans">
                      Tidak ada pelanggaran aturan Westgard yang tercatat pada rentang tanggal terpilih.
                    </td>
                  </tr>
                ) : (
                  filteredWestgard.map((v, idx) => (
                    <tr key={`${v.qcId}-${idx}`} className="text-[11px] hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 whitespace-nowrap">{v.date} {v.time}</td>
                      <td className="p-2 border border-slate-200 font-sans">
                        <div className="font-semibold text-slate-900">{v.parameterName} ({v.parameterCode})</div>
                        <div className="text-[10px] text-slate-500">{v.instrumentName}</div>
                      </td>
                      <td className="p-2 border border-slate-200">
                        {v.controlLevel} <span className="text-[10px] text-slate-500">[{v.lotNumber}]</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-slate-900 font-mono">
                        {v.ruleName}
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.type === 'reject'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 font-sans">
                        <p className="text-slate-900">{v.description}</p>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold text-rose-700 font-mono">
                        {v.sdPosition}
                      </td>
                      <td className="p-2 border border-slate-200 font-sans">{v.operatorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: LAPORAN PENYIMPANGAN MUTU (NC) */}
          {reportType === 'nc' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border border-slate-300">No. Dokumen NC</th>
                  <th className="p-2 border border-slate-300">Tanggal / Waktu</th>
                  <th className="p-2 border border-slate-300">Parameter & Alat</th>
                  <th className="p-2 border border-slate-300 text-center">Severity</th>
                  <th className="p-2 border border-slate-300">Kategori & Deskripsi Masalah</th>
                  <th className="p-2 border border-slate-300">Dampak & Tindakan Segera</th>
                  <th className="p-2 border border-slate-300">Pelapor</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredNC.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      Tidak ada laporan penyimpangan mutu (Non-Conformity) pada rentang tanggal terpilih.
                    </td>
                  </tr>
                ) : (
                  filteredNC.map((nc, idx) => (
                    <tr key={nc.id} className="text-[11px] hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-slate-900">{nc.id}</td>
                      <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{nc.date} {nc.time}</td>
                      <td className="p-2 border border-slate-200">
                        <div className="font-semibold text-slate-900">{nc.parameterName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{nc.instrumentName}</div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          nc.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : nc.severity === 'major'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {nc.severity}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 max-w-xs">
                        <span className="font-semibold text-slate-800 block text-[10px] uppercase text-emerald-800">{nc.category}</span>
                        <span className="text-slate-700">{nc.description}</span>
                      </td>
                      <td className="p-2 border border-slate-200 max-w-xs">
                        <p className="text-slate-900 font-medium">Tindakan: {nc.immediateAction}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dampak: {nc.impact}</p>
                      </td>
                      <td className="p-2 border border-slate-200">{nc.reportedByName}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono font-bold uppercase text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${
                          nc.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : nc.status === 'escalated_to_capa'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {nc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: LAPORAN DOKUMEN CAPA */}
          {reportType === 'capa' && (
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-10">No</th>
                  <th className="p-2 border border-slate-300">No. CAPA</th>
                  <th className="p-2 border border-slate-300">Tanggal</th>
                  <th className="p-2 border border-slate-300">PIC & Unit</th>
                  <th className="p-2 border border-slate-300">Pernyataan Masalah & Akar Masalah</th>
                  <th className="p-2 border border-slate-300">Tindakan Korektif & Preventif</th>
                  <th className="p-2 border border-slate-300 text-center">Batas Waktu</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                  <th className="p-2 border border-slate-300 text-center">Efektivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCAPA.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">
                      Tidak ada dokumen CAPA yang tercatat pada rentang tanggal terpilih.
                    </td>
                  </tr>
                ) : (
                  filteredCAPA.map((c, idx) => (
                    <tr key={c.id} className="text-[11px] hover:bg-slate-50">
                      <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-slate-900">{c.id}</td>
                      <td className="p-2 border border-slate-200 font-mono whitespace-nowrap">{c.createdAt.substring(0, 10)}</td>
                      <td className="p-2 border border-slate-200">
                        <div className="font-semibold text-slate-900">{c.pic}</div>
                        <div className="text-[10px] text-slate-500">{c.department}</div>
                      </td>
                      <td className="p-2 border border-slate-200 max-w-xs">
                        <p className="font-semibold text-slate-900">{c.problemStatement}</p>
                        {c.identifiedRootCause && (
                          <p className="text-[10px] text-slate-600 mt-1 italic">
                            Akar Masalah: {c.identifiedRootCause}
                          </p>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold mr-1">
                          {c.correctiveActions.length} Korektif
                        </span>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {c.preventiveActions.length} Preventif
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-mono">{c.overallDueDate}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono uppercase font-bold text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${
                          c.status === 'closed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-mono uppercase font-bold text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${
                          c.effectiveness === 'effective'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.effectiveness}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* OFFICIAL SIGNATURE FOOTER */}
        <div className="mt-10 grid grid-cols-2 text-center text-xs pt-6 border-t-2 border-slate-900 signature-block print-avoid-break">
          <div>
            <p className="text-slate-600 whitespace-nowrap">Mengetahui & Menyetujui,</p>
            <p className="font-bold text-slate-900 mt-1 whitespace-nowrap">Penanggung Jawab Laboratorium</p>
            <div className="h-20" />
            <p className="font-bold underline text-slate-900 whitespace-nowrap">{labInfo.headOfLab}</p>
            <p className="text-[11px] font-mono text-slate-500 whitespace-nowrap">NIP: {labInfo.headNip}</p>
          </div>

          <div className="relative group">
            <p className="text-slate-600 whitespace-nowrap">Sukadana, {new Date().toISOString().split('T')[0]}</p>
            <p className="font-bold text-slate-900 mt-1 whitespace-nowrap">Penanggung Jawab Mutu</p>
            <div className="h-20" />
            <p className="font-bold underline text-slate-900 whitespace-nowrap">
              {labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes'}
            </p>
            <p className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
              NIP: {labInfo.qualityNip || '19850914 201001 2 015'}
            </p>
            
            {/* Quick edit trigger on hover (Hidden on Print) */}
            <button
              type="button"
              onClick={handleOpenSignatoriesModal}
              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 text-[10px] flex items-center gap-1 print:hidden"
              title="Klik untuk mengubah nama/NIP Penanggung Jawab Mutu"
            >
              <Edit3 className="h-3 w-3" />
              <span>Ubah</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL EDIT KOP SURAT LAPORAN & PEJABAT BERTANDATANGAN                     */}
      {/* ========================================================================= */}
      <KopEditorModal
        isOpen={isSignatoriesModalOpen}
        onClose={() => setIsSignatoriesModalOpen(false)}
        labInfo={labInfo}
        onSaved={(updated) => {
          if (onLabInfoUpdated) onLabInfoUpdated(updated);
        }}
      />
    </div>
  );
};
