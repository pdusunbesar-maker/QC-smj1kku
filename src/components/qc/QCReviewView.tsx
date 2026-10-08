import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  MessageSquare, 
  ShieldAlert, 
  Check, 
  X, 
  FileQuestion, 
  UserCheck, 
  ChevronRight, 
  Clock,
  Edit3,
  Trash2,
  AlertTriangle,
  Save,
  RotateCcw,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { QCResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { calculateZScore, formatSDPosition } from '../../utils/qcCalculations';

interface QCReviewViewProps {
  results: QCResult[];
  onResultUpdated: (updated: QCResult) => void;
  onResultDeleted?: (id: string) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const QCReviewView: React.FC<QCReviewViewProps> = ({
  results,
  onResultUpdated,
  onResultDeleted,
  onNavigateToTab,
}) => {
  const { user, can } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review Modal State
  const [selectedResult, setSelectedResult] = useState<QCResult | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  // Edit QC Result State
  const [editingResult, setEditingResult] = useState<QCResult | null>(null);
  const [editForm, setEditForm] = useState({
    value: 0,
    date: '',
    time: '',
    lotNumber: '',
    notes: '',
  });

  // Delete QC Result State
  const [resultToDelete, setResultToDelete] = useState<QCResult | null>(null);
  const [deleteReason, setDeleteReason] = useState('Kesalahan pencatatan nilai / duplikasi');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const isSupervisorOrAdmin = can('review_qc') || user.role === 'admin' || user.role === 'supervisor';
  const canEditOrDelete = can('input_qc') || user.role === 'admin' || user.role === 'supervisor';

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      // Filter status
      if (filterStatus === 'pending' && r.reviewStatus !== 'pending') return false;
      if (filterStatus === 'accepted' && r.reviewStatus !== 'accepted') return false;
      if (filterStatus === 'rejected' && r.reviewStatus !== 'rejected') return false;
      if (filterStatus === 'investigation' && r.reviewStatus !== 'investigation_required') return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.parameterName.toLowerCase().includes(q) ||
          r.parameterCode.toLowerCase().includes(q) ||
          r.operatorName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.lotNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [results, filterStatus, searchQuery]);

  // Handle Supervisor Review Decision
  const handleReviewDecision = (
    result: QCResult,
    status: 'accepted' | 'rejected' | 'investigation_required'
  ) => {
    const updated: QCResult = {
      ...result,
      reviewStatus: status,
      reviewedBy: user.id,
      reviewedByName: user.name,
      reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      reviewComment: reviewComment || (status === 'accepted' ? 'Disetujui untuk rilis hasil klinis.' : 'Ditolak, perlu pemeriksaan ulang.'),
    };

    StorageService.saveQCResult(updated);
    StorageService.logAudit(
      'REVIEW_QC',
      `Review QC ${updated.id} (${updated.parameterName}): Status diubah menjadi ${status.toUpperCase()} oleh ${user.name}`,
      updated,
      result
    );

    onResultUpdated(updated);
    setSelectedResult(null);
    setReviewComment('');
  };

  // Open Edit Modal
  const handleOpenEdit = (r: QCResult) => {
    setEditingResult(r);
    setEditForm({
      value: r.value,
      date: r.date,
      time: r.time,
      lotNumber: r.lotNumber,
      notes: r.notes || '',
    });
  };

  // Save Edit QC
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;

    const val = Number(editForm.value);
    const z = calculateZScore(val, editingResult.mean, editingResult.sd);
    const sdPos = formatSDPosition(z);
    const status = Math.abs(z) > 3 ? 'fail' : Math.abs(z) > 2 ? 'warning' : 'pass';

    const updated: QCResult = {
      ...editingResult,
      value: val,
      date: editForm.date,
      time: editForm.time,
      lotNumber: editForm.lotNumber,
      notes: editForm.notes,
      zScore: z,
      sdPosition: sdPos,
      status,
    };

    StorageService.saveQCResult(updated);
    StorageService.logAudit(
      'UPDATE_QC_RESULT',
      `Mengoreksi hasil QC #${updated.id} [${updated.parameterName}] dari ${editingResult.value} menjadi ${val} ${updated.unit} oleh ${user.name}`,
      updated,
      editingResult
    );

    onResultUpdated(updated);
    setEditingResult(null);
  };

  // Confirm Delete QC
  const handleConfirmDelete = () => {
    if (!resultToDelete) return;
    StorageService.deleteQCResult(resultToDelete.id);
    StorageService.logAudit(
      'DELETE_QC_RESULT',
      `Menghapus data hasil QC #${resultToDelete.id} (${resultToDelete.parameterName}) oleh ${user.name}. Alasan: ${deleteReason}`,
      null,
      resultToDelete
    );

    if (onResultDeleted) {
      onResultDeleted(resultToDelete.id);
    } else {
      onResultUpdated(resultToDelete);
    }
    setResultToDelete(null);
  };

  // Export Filtered QC Results to CSV (Audit & External Archiving)
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data QC yang dapat diekspor dengan filter saat ini.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const filename = `Data_Hasil_QC_Review_${filterStatus.toUpperCase()}_${todayDate}.csv`;

    const headers = [
      'No',
      'ID_QC',
      'Tanggal',
      'Waktu',
      'Nama_Instrumen',
      'ID_Instrumen',
      'Kode_Parameter',
      'Nama_Parameter',
      'Level_Kontrol',
      'Nomor_Lot',
      'Nilai_Hasil_QC',
      'Satuan',
      'Target_Mean',
      'Target_SD',
      'Z_Score_SDI',
      'Posisi_SD',
      'Status_QC',
      'Pelanggaran_Westgard',
      'Status_Review',
      'Direview_Oleh',
      'Waktu_Review',
      'Catatan_Review',
      'Operator_ATLM',
      'Metode_Input',
      'Keterangan'
    ];

    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    filteredResults.forEach((r, idx) => {
      const escapeCsv = (str: string | number | undefined | null) => {
        if (str === undefined || str === null) return '""';
        const stringified = String(str).replace(/"/g, '""');
        return `"${stringified}"`;
      };

      const violationsStr = (r.violations || []).map(v => `${v.rule} (${v.description})`).join('; ') || '-';
      const sourceStr = r.source === 'AI_VISION' ? 'AI Vision Scan' : 'Manual Entry';

      const row = [
        idx + 1,
        escapeCsv(r.id),
        escapeCsv(r.date),
        escapeCsv(r.time),
        escapeCsv(r.instrumentName),
        escapeCsv(r.instrumentId),
        escapeCsv(r.parameterCode),
        escapeCsv(r.parameterName),
        escapeCsv(r.controlLevel),
        escapeCsv(r.lotNumber),
        r.value,
        escapeCsv(r.unit),
        r.mean,
        r.sd,
        r.zScore,
        escapeCsv(r.sdPosition),
        escapeCsv(r.status.toUpperCase()),
        escapeCsv(violationsStr),
        escapeCsv(r.reviewStatus.toUpperCase()),
        escapeCsv(r.reviewedByName || '-'),
        escapeCsv(r.reviewedAt || '-'),
        escapeCsv(r.reviewComment || '-'),
        escapeCsv(r.operatorName || '-'),
        escapeCsv(sourceStr),
        escapeCsv(r.notes || '-')
      ];

      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(`File CSV berhasil diunduh (${filteredResults.length} data QC terarsip).`);
    setTimeout(() => {
      setExportFeedback(null);
    }, 5000);
  };

  // Export Filtered QC Results to Excel
  const handleExportExcel = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data QC yang dapat diekspor dengan filter saat ini.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const filename = `Data_Hasil_QC_Review_${filterStatus.toUpperCase()}_${todayDate}.xlsx`;

    const excelData = filteredResults.map((r, idx) => {
      const violationsStr = (r.violations || []).map(v => `${v.rule} (${v.description})`).join('; ') || '-';
      const sourceStr = r.source === 'AI_VISION' ? 'AI Vision Scan' : 'Manual Entry';

      return {
        'No': idx + 1,
        'ID QC': r.id,
        'Tanggal': r.date,
        'Waktu': r.time,
        'Nama Instrumen': r.instrumentName,
        'ID Instrumen': r.instrumentId,
        'Kode Parameter': r.parameterCode,
        'Nama Parameter': r.parameterName,
        'Level Kontrol': r.controlLevel,
        'Nomor Lot': r.lotNumber,
        'Nilai Hasil QC': r.value,
        'Satuan': r.unit,
        'Target Mean': r.mean,
        'Target SD': r.sd,
        'Z-Score (SDI)': r.zScore,
        'Posisi SD': r.sdPosition,
        'Status QC': r.status.toUpperCase(),
        'Pelanggaran Westgard': violationsStr,
        'Status Review': r.reviewStatus.toUpperCase(),
        'Direview Oleh': r.reviewedByName || '-',
        'Waktu Review': r.reviewedAt || '-',
        'Catatan Review': r.reviewComment || '-',
        'Operator ATLM': r.operatorName || '-',
        'Metode Input': sourceStr,
        'Keterangan': r.notes || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data QC");
    XLSX.writeFile(workbook, filename);

    setExportFeedback(`File Excel berhasil diunduh (${filteredResults.length} data QC terarsip).`);
    setTimeout(() => {
      setExportFeedback(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Export Success Notification Banner */}
      {exportFeedback && (
        <div className="p-3.5 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            QC Review, Validasi & Kelola Data Kontrol
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Validasi kepatuhan aturan Westgard, disposisi pelepasan hasil pasien, koreksi kesalahan input, dan penghapusan data QC.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-1.5 min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 rounded-xl transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            title="Unduh data tabel QC saat ini ke file CSV terstruktur untuk pengarsipan eksternal"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            <span>Ekspor CSV ({filteredResults.length})</span>
          </button>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-1.5 min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-300 rounded-xl transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
            title="Unduh data tabel QC saat ini ke file Excel terstruktur untuk pengarsipan eksternal"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Ekspor Excel ({filteredResults.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('qc-input')}
            className="flex items-center gap-2 min-h-[42px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <span>+ Input QC Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'pending', label: 'Menunggu Review' },
            { id: 'accepted', label: 'Disetujui (Accepted)' },
            { id: 'investigation', label: 'Investigasi' },
            { id: 'rejected', label: 'Ditolak (Rejected)' },
            { id: 'all', label: 'Semua Hasil' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                filterStatus === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Field & Inline Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari parameter, ATLM, ID..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-300 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Unduh data tabel yang difilter ke format CSV"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-300 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Unduh data tabel yang difilter ke format Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Tanggal & Jam</th>
                <th className="px-4 py-3">ID / Parameter</th>
                <th className="px-3 py-3">Level / Lot</th>
                <th className="px-4 py-3 text-right">Hasil QC</th>
                <th className="px-3 py-3 text-center">Z-Score</th>
                <th className="px-3 py-3">Status QC</th>
                <th className="px-4 py-3">Aturan Westgard</th>
                <th className="px-4 py-3">Status Review</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans">
                    Tidak ada data QC yang sesuai dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors font-sans">
                      {/* Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        <div className="font-mono font-medium">{r.date}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.time}</div>
                      </td>

                      {/* Parameter */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{r.parameterName}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 rounded">
                            {r.parameterCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
                          {r.id} · ATLM: {r.operatorName}
                        </div>
                      </td>

                      {/* Level & Lot */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[11px]">
                        <div>{r.controlLevel}</div>
                        <div className="font-mono text-slate-400">{r.lotNumber}</div>
                      </td>

                      {/* Value & Target */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">
                          {r.value} <span className="text-[10px] font-normal text-slate-400">{r.unit}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          Target: {r.mean} ±{r.sd}
                        </div>
                      </td>

                      {/* Z-Score Position */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                          Math.abs(r.zScore) > 3
                            ? 'bg-rose-100 text-rose-800'
                            : Math.abs(r.zScore) > 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.sdPosition}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
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

                      {/* Westgard Violations */}
                      <td className="px-4 py-3">
                        {r.violations && r.violations.length > 0 ? (
                          <div className="space-y-0.5">
                            {r.violations.map((v, i) => (
                              <span 
                                key={i}
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono mr-1 ${
                                  v.type === 'reject' 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {v.rule.replace('_', '-')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Review Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.reviewStatus === 'accepted' ? (
                          <div className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Accepted</span>
                          </div>
                        ) : r.reviewStatus === 'rejected' ? (
                          <div className="text-rose-700 text-[11px] font-medium flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Rejected</span>
                          </div>
                        ) : r.reviewStatus === 'investigation_required' ? (
                          <div className="text-indigo-700 text-[11px] font-medium flex items-center gap-1">
                            <FileQuestion className="h-3.5 w-3.5" />
                            <span>Investigasi</span>
                          </div>
                        ) : (
                          <div className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Pending</span>
                          </div>
                        )}
                        {r.reviewedByName && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            oleh {r.reviewedByName}
                          </p>
                        )}
                      </td>

                      {/* Action Buttons: Review, Edit, and Delete */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResult(r);
                              setReviewComment(r.reviewComment || '');
                            }}
                            className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="Validasi & Disposisi Mutu"
                          >
                            Review
                          </button>

                          {canEditOrDelete && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(r)}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit / Koreksi Data QC"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setResultToDelete(r)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                title="Hapus Hasil QC"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Review Modal Dialog */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Disposisi Review QC #{selectedResult.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedResult.parameterName} · {selectedResult.date} {selectedResult.time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border font-mono">
                <p className="text-[10px] text-slate-400">Hasil</p>
                <p className="font-bold text-slate-900">{selectedResult.value} {selectedResult.unit}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border font-mono">
                <p className="text-[10px] text-slate-400">Z-Score</p>
                <p className="font-bold text-slate-900">{selectedResult.sdPosition}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border font-mono">
                <p className="text-[10px] text-slate-400">Status Awal</p>
                <p className={`font-bold uppercase ${
                  selectedResult.status === 'pass' ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {selectedResult.status}
                </p>
              </div>
            </div>

            {/* Westgard Violations in Modal */}
            {selectedResult.violations.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Aturan Westgard Terlanggar:
                </p>
                {selectedResult.violations.map((v, i) => (
                  <p key={i}>• {v.ruleName}: {v.description}</p>
                ))}
              </div>
            )}

            {/* Supervisor Comment Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Evaluasi Supervisor / PJ Mutu
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Tuliskan analisis reagen, instruksi rerun, atau justifikasi penerimaan..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Decision Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewDecision(selectedResult, 'accepted')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  <Check className="h-4 w-4" />
                  <span>Setujui (Accept)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewDecision(selectedResult, 'investigation_required')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  <FileQuestion className="h-4 w-4" />
                  <span>Investigasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewDecision(selectedResult, 'rejected')}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-2xs"
                >
                  <X className="h-4 w-4" />
                  <span>Tolak (Reject)</span>
                </button>
              </div>

              {selectedResult.violations.length > 0 && (
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResult(null);
                      onNavigateToTab('non-conformity', { fromQc: selectedResult });
                    }}
                    className="flex-1 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
                  >
                    + Buat Laporan Ketidaksesuaian (NC)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResult(null);
                      onNavigateToTab('capa', { fromQc: selectedResult });
                    }}
                    className="flex-1 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                  >
                    + Buat Tindakan CAPA
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit QC Result Modal */}
      {editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Koreksi Nilai Hasil QC #{editingResult.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editingResult.parameterName} [{editingResult.parameterCode}]
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Uji *</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Uji *</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nilai Hasil Pemeriksaan ({editingResult.unit}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                    Target: {editingResult.mean} ±{editingResult.sd}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Lot Kontrol</label>
                <input
                  type="text"
                  value={editForm.lotNumber}
                  onChange={(e) => setEditForm({ ...editForm, lotNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Koreksi & Alasan</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Contoh: Koreksi typo pengetikan desimal oleh ATLM shift pagi..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingResult(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete QC Result Modal */}
      {resultToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Konfirmasi Hapus Data QC
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: #{resultToDelete.id}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-2">
              <p className="text-slate-800">
                Apakah Anda yakin ingin menghapus data QC parameter <strong>"{resultToDelete.parameterName}"</strong> senilai <strong>{resultToDelete.value} {resultToDelete.unit}</strong> pada tanggal <strong>{resultToDelete.date}</strong>?
              </p>
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                ⚠️ Data yang dihapus akan dicatat ke dalam Log Audit demi kepatuhan ISO 15189.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Penghapusan *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Contoh: Kesalahan input alat / sampel kontaminasi..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResultToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Hapus Data QC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
