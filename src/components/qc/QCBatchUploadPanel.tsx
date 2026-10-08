import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  ArrowRight, 
  Loader2, 
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation } from '../../types';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { 
  calculateZScore, 
  formatSDPosition, 
  evaluateWestgardRules 
} from '../../utils/qcCalculations';

interface QCBatchUploadPanelProps {
  instruments: Instrument[];
  parameters: Parameter[];
  controls: ControlMaterial[];
  existingResults: QCResult[];
  onResultAdded: (newResult: QCResult) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

interface ParsedRowPreview {
  id: string;
  originalRaw: any;
  date: string;
  time: string;
  rawParamText: string;
  rawValueText: string;
  rawLevelText: string;
  rawLotText: string;
  
  // Mapped States
  mappedParam: Parameter | null;
  mappedInstrument: Instrument | null;
  mappedControl: ControlMaterial | null;
  lotNumber: string;
  controlLevel: 'Level 1' | 'Level 2' | 'Level 3';
  value: number | null;
  
  // Analysis
  zScore: number | null;
  sdPosition: string;
  status: 'pass' | 'warning' | 'reject' | 'error';
  violations: WestgardViolation[];
  validationError: string | null;
}

export const QCBatchUploadPanel: React.FC<QCBatchUploadPanelProps> = ({
  instruments,
  parameters,
  controls,
  existingResults,
  onResultAdded,
  onNavigateToTab,
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRowPreview[]>([]);
  const [isImporting, setIsSubmittingImport] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  // Parse excel/csv date serial
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      // Excel serial date format
      const dateObj = new Date((val - 25569) * 86400 * 1000);
      return dateObj.toISOString().split('T')[0];
    }
    const cleanStr = String(val).trim();
    // Try simple regex matching
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
      const parts = cleanStr.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  // Parse excel/csv time serial
  const parseExcelTime = (val: any): string => {
    if (!val) return new Date().toTimeString().split(' ')[0].substring(0, 5);
    if (typeof val === 'number') {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const cleanStr = String(val).trim();
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(cleanStr)) {
      return cleanStr.substring(0, 5);
    }
    return new Date().toTimeString().split(' ')[0].substring(0, 5);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsReadingFile(true);
    setParsedRows([]);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of objects
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (!rawJson || rawJson.length === 0) {
          alert('File kosong atau tidak memiliki data baris yang dapat dibaca.');
          setIsReadingFile(false);
          return;
        }

        const previewRows: ParsedRowPreview[] = rawJson.map((row, idx) => {
          // Attempt fuzzy mapping of common headers
          let dateVal = '';
          let timeVal = '';
          let paramText = '';
          let valueText = '';
          let levelText = '';
          let lotText = '';

          // Look through the row keys
          Object.entries(row).forEach(([key, val]) => {
            const k = key.toLowerCase().replace(/_|\s/g, '');
            if (k.includes('date') || k.includes('tanggal') || k === 'tgl') {
              dateVal = parseExcelDate(val);
            } else if (k.includes('time') || k.includes('waktu') || k === 'jam') {
              timeVal = parseExcelTime(val);
            } else if (k.includes('parameter') || k === 'code' || k === 'test' || k.includes('analit') || k === 'param') {
              paramText = String(val).trim();
            } else if (k.includes('value') || k.includes('result') || k === 'hasil' || k === 'nilai') {
              valueText = String(val).trim();
            } else if (k.includes('level') || k === 'lvl' || k.includes('control')) {
              levelText = String(val).trim();
            } else if (k.includes('lot') || k.includes('no_lot')) {
              lotText = String(val).trim();
            }
          });

          // Run Auto-Mapping algorithm
          const mappedParam = autoMapParameter(paramText);
          const mappedInstrument = mappedParam 
            ? instruments.find(i => i.id === mappedParam.instrumentId) || null 
            : null;
          
          let mappedControl = null;
          let lotNumberStr = lotText;
          let levelStr: ParsedRowPreview['controlLevel'] = 'Level 1';

          // Match control
          if (mappedParam) {
            mappedControl = controls.find(c => c.lotNumber.toLowerCase() === lotText.toLowerCase()) ||
                            controls.find(c => c.id === mappedParam.controlMaterialId) || null;
            if (mappedControl) {
              lotNumberStr = mappedControl.lotNumber;
              levelStr = mappedControl.level;
            } else {
              // Try level mapping
              const lowerLvl = levelText.toLowerCase();
              if (lowerLvl.includes('2') || lowerLvl.includes('high') || lowerLvl.includes('patolog')) {
                levelStr = 'Level 2';
              } else if (lowerLvl.includes('3') || lowerLvl.includes('low') || lowerLvl.includes('khusus')) {
                levelStr = 'Level 3';
              }
            }
          }

          const parsedValue = valueText ? parseFloat(valueText) : null;

          const item: ParsedRowPreview = {
            id: `ROW-${idx}-${Date.now().toString().slice(-4)}`,
            originalRaw: row,
            date: dateVal || new Date().toISOString().split('T')[0],
            time: timeVal || new Date().toTimeString().split(' ')[0].substring(0, 5),
            rawParamText: paramText,
            rawValueText: valueText,
            rawLevelText: levelText,
            rawLotText: lotText,
            mappedParam,
            mappedInstrument,
            mappedControl,
            lotNumber: lotNumberStr || (mappedControl?.lotNumber || 'LOT-DEFAULT'),
            controlLevel: levelStr,
            value: parsedValue,
            zScore: null,
            sdPosition: '',
            status: 'pass',
            violations: [],
            validationError: null,
          };

          // Validate and analyze Z-Score if mapped
          return analyzeSingleRow(item, mappedParam);
        });

        setParsedRows(previewRows);
      } catch (err) {
        console.error('Error reading spreadsheet:', err);
        alert('Format spreadsheet tidak valid atau gagal dibaca.');
      } finally {
        setIsReadingFile(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Helper to find parameter in master data
  const autoMapParameter = (text: string): Parameter | null => {
    if (!text) return null;
    const clean = text.toLowerCase().trim();
    // 1. Exact code match
    let matched = parameters.find(p => p.code.toLowerCase() === clean);
    if (matched) return matched;
    // 2. Exact name match
    matched = parameters.find(p => p.name.toLowerCase() === clean);
    if (matched) return matched;
    // 3. Substring code match
    matched = parameters.find(p => p.code.toLowerCase().includes(clean) || clean.includes(p.code.toLowerCase()));
    if (matched) return matched;
    // 4. Substring name match
    matched = parameters.find(p => p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()));
    return matched || null;
  };

  // Run Z-Score and Westgard rules for a row preview
  const analyzeSingleRow = (item: ParsedRowPreview, param: Parameter | null): ParsedRowPreview => {
    if (!param) {
      return {
        ...item,
        mappedParam: null,
        mappedInstrument: null,
        status: 'error',
        validationError: '⚠️ Parameter tidak dikenali. Silakan pilih parameter secara manual.',
      };
    }

    if (item.value === null || isNaN(item.value)) {
      return {
        ...item,
        mappedParam: param,
        mappedInstrument: instruments.find(i => i.id === param.instrumentId) || null,
        status: 'error',
        validationError: `⚠️ Nilai hasil "${item.rawValueText}" bukan angka numerik yang valid.`,
      };
    }

    const mean = param.targetMean;
    const sd = param.targetSD;
    const zScore = calculateZScore(item.value, mean, sd);
    const sdPosition = formatSDPosition(zScore);

    // Dynamic Z-score threshold evaluation
    let status: ParsedRowPreview['status'] = 'pass';
    if (Math.abs(zScore) >= 3.0) status = 'reject';
    else if (Math.abs(zScore) >= 2.0) status = 'warning';

    // Evaluate Westgard rules preview based on parameter history
    const history = existingResults.filter(r => r.parameterId === param.id);
    const tempId = `QC-TEMP-BATCH-${item.id}`;
    const westgardRules = StorageService.getWestgardRules();
    const { violations } = evaluateWestgardRules(
      { id: tempId, value: item.value, mean, sd, zScore },
      history,
      westgardRules
    );

    const inst = instruments.find(i => i.id === param.instrumentId) || null;
    const ctrl = controls.find(c => c.lotNumber.toLowerCase() === item.lotNumber.toLowerCase()) ||
                 controls.find(c => c.id === param.controlMaterialId) || null;

    return {
      ...item,
      mappedParam: param,
      mappedInstrument: inst,
      mappedControl: ctrl,
      lotNumber: ctrl?.lotNumber || item.lotNumber || 'LOT-DEFAULT',
      controlLevel: ctrl?.level || item.controlLevel || 'Level 1',
      zScore,
      sdPosition,
      status,
      violations,
      validationError: null,
    };
  };

  // Interactive handler: change mapped parameter on the fly
  const handleParameterChange = (rowId: string, paramId: string) => {
    const selectedParam = parameters.find(p => p.id === paramId) || null;
    
    setParsedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updatedRow = {
          ...row,
          mappedParam: selectedParam,
          validationError: null,
        };
        return analyzeSingleRow(updatedRow, selectedParam);
      }
      return row;
    }));
  };

  // Remove a row from the list
  const handleRemoveRow = (rowId: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Clear current upload
  const handleClearAll = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setImportSummary(null);
  };

  // Save all valid parsed rows to LocalStorage
  const handleSaveImport = () => {
    const validRows = parsedRows.filter(r => r.status !== 'error' && r.mappedParam !== null);
    
    if (validRows.length === 0) {
      alert('Tidak ada baris data valid yang siap diimpor.');
      return;
    }

    setIsSubmittingImport(true);

    setTimeout(() => {
      let successCount = 0;
      
      validRows.forEach((row, i) => {
        const fullDate = `${row.date}T${row.time}:00`;
        const fullTimestamp = new Date(fullDate).getTime() + i; // tiny skew to prevent identical timestamps

        const newResult: QCResult = {
          id: `QC-BAT-${Date.now().toString().slice(-4)}-${String(i).padStart(3, '0')}`,
          date: row.date,
          time: row.time,
          timestamp: fullTimestamp,
          operatorId: user.id,
          operatorName: user.name,
          instrumentId: row.mappedInstrument?.id || 'unknown',
          instrumentName: row.mappedInstrument?.name || 'Alat Lain',
          parameterId: row.mappedParam!.id,
          parameterName: row.mappedParam!.name,
          parameterCode: row.mappedParam!.code,
          controlLevel: row.controlLevel,
          lotNumber: row.lotNumber,
          value: row.value!,
          unit: row.mappedParam!.unit,
          mean: row.mappedParam!.targetMean,
          sd: row.mappedParam!.targetSD,
          zScore: row.zScore!,
          sdPosition: row.sdPosition,
          status: row.status === 'error' ? 'fail' : row.status,
          violations: row.violations,
          reviewStatus: row.status === 'pass' ? 'accepted' : 'pending',
          source: 'IMPORT',
        };

        try {
          StorageService.saveQCResult(newResult);
          
          if (newResult.status !== 'pass') {
            StorageService.addNotification({
              type: newResult.status === 'reject' ? 'danger' : 'warning',
              title: `QC ${newResult.parameterCode} ${newResult.status.toUpperCase()}`,
              message: `[BATCH IMPORT] Hasil pemeriksaan ${newResult.parameterName} bernilai ${newResult.value} ${newResult.unit} (${newResult.sdPosition}).`,
              linkTab: 'qc-review',
              linkId: newResult.id,
            });
          }

          onResultAdded(newResult);
          successCount++;
        } catch (e) {
          console.error('Error saving QC result:', e);
        }
      });

      // Log in Audit Trail
      StorageService.logAudit(
        'INPUT_QC',
        `Berhasil mengimpor massal ${successCount} data hasil QC dari file: ${selectedFile?.name || 'instrument_data.csv'} via Batch Ingestion.`
      );

      setImportSummary({ success: successCount, failed: parsedRows.length - successCount });
      setIsSubmittingImport(false);
      setParsedRows([]);
    }, 1500);
  };

  const readyToImportCount = parsedRows.filter(r => r.status !== 'error').length;
  const errorCount = parsedRows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-4">
      
      {/* Upper informational panel */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs leading-relaxed text-slate-700">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Petunjuk Ingest Data Alat Otomatis (Batch Upload):</p>
          <p>Fitur ini memproses file mentah CSV atau Excel (.xlsx) keluaran alat laboratorium. Sistem akan mendeteksi baris data dan **memetakannya secara otomatis** ke parameter, alat analitik, dan lot kontrol di Master Data berdasarkan pencocokan fuzzy nama atau kode analit.</p>
          <p className="pt-0.5 font-semibold text-slate-600">Formulir kolom yang didukung: <span className="font-mono text-[11px] bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-800">Date</span> · <span className="font-mono text-[11px] bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-800">Time</span> · <span className="font-mono text-[11px] bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-800">Parameter</span> · <span className="font-mono text-[11px] bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-800">Value/Hasil</span> · <span className="font-mono text-[11px] bg-white border border-slate-200 px-1 py-0.2 rounded text-slate-800">Lot (Opsional)</span></p>
        </div>
      </div>

      {/* File Ingestion Dropzone */}
      {!selectedFile && (
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 hover:bg-slate-50/50 hover:border-emerald-500 transition-all cursor-pointer relative">
          <input
            type="file"
            accept=".csv, .xlsx, .xls, .txt"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Pilih file spreadsheet data instrumen"
          />
          <div className="space-y-2.5">
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto shadow-2xs">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">Pilih atau Seret File Data Alat Lab Anda</p>
              <p className="text-xs text-slate-500 mt-0.5">Mendukung format CSV (.csv) atau Excel (.xlsx, .xls, .txt) s/d 5MB</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 mx-auto">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Pilih dari Komputer/Alat
            </span>
          </div>
        </div>
      )}

      {/* Read loader */}
      {isReadingFile && (
        <div className="p-8 border border-slate-200 rounded-2xl bg-white text-center space-y-2.5">
          <Loader2 className="h-8 w-8 text-[#0B5FA5] animate-spin mx-auto" />
          <p className="font-bold text-sm text-slate-800">Sedang Membaca & Memetakan Berkas...</p>
          <p className="text-xs text-slate-500">Sistem memparsing sel dan mencocokkan kode parameter di database.</p>
        </div>
      )}

      {/* Import Success Message */}
      {importSummary && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-emerald-600 text-white flex items-center justify-center rounded-xl shadow-xs shrink-0 mt-0.5">
              <CheckCircle2 className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm sm:text-base">Pengimporan Massal Selesai!</h3>
              <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                Berhasil menyimpan <strong>{importSummary.success} baris hasil QC</strong> ke dalam database kontrol mutu. Sistem secara otomatis menjalankan evaluasi aturan Westgard, memicu notifikasi peringatan jika ada parameter out-of-control, dan menyinkronkan data ke chart Levey-Jennings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Impor File Lainnya
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('dashboard')}
              className="px-3 py-1.5 text-slate-700 hover:bg-emerald-100 hover:text-emerald-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Lihat di Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Parsed Rows Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-4">
          
          {/* File details bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Berkas: <strong className="text-slate-950">{selectedFile?.name}</strong> ({Math.round(selectedFile!.size / 1024)} KB)</span>
              <span className="text-slate-400 font-normal">|</span>
              <span>Terdeteksi: <strong className="text-[#0B5FA5]">{parsedRows.length} Baris data</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-emerald-700">✓ {readyToImportCount} Siap Impor</span>
              {errorCount > 0 && (
                <span className="font-mono text-[11px] font-bold text-rose-700">⚠️ {errorCount} Error</span>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 hover:text-rose-600 underline font-semibold cursor-pointer"
              >
                Batalkan
              </button>
            </div>
          </div>

          {/* Core Mapping Table UI */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0 z-10 shadow-2xs">
                  <tr className="font-mono text-[10px]">
                    <th className="py-2.5 px-3">Tanggal & Waktu</th>
                    <th className="py-2.5 px-3">Raw Parameter</th>
                    <th className="py-2.5 px-3">Mapping Parameter Database</th>
                    <th className="py-2.5 px-3 text-right">Nilai Hasil</th>
                    <th className="py-2.5 px-3">Level & Lot</th>
                    <th className="py-2.5 px-3">SDI (Z-Score)</th>
                    <th className="py-2.5 px-3">Evaluasi QC</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {parsedRows.map((row) => {
                    const isErr = row.status === 'error';
                    const isRej = row.status === 'reject';
                    const isWarn = row.status === 'warning';

                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-slate-50/50 ${isErr ? 'bg-rose-50/30' : isRej ? 'bg-rose-50/20' : isWarn ? 'bg-amber-50/20' : ''}`}
                      >
                        {/* 1. Date & Time */}
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {row.date} <span className="text-slate-400">{row.time}</span>
                        </td>

                        {/* 2. Raw Sheet Text */}
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap max-w-[120px] truncate" title={row.rawParamText}>
                          {row.rawParamText || '-'}
                        </td>

                        {/* 3. Parameter Mapping Select */}
                        <td className="py-2 px-3 min-w-[200px]">
                          <div className="flex flex-col gap-0.5">
                            {row.mappedParam ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                  {row.mappedParam.code}
                                </span>
                                <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={row.mappedParam.name}>
                                  {row.mappedParam.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 self-start">
                                TIDAK TERPETAKAN
                              </span>
                            )}
                            
                            {/* Manual Override selector */}
                            <select
                              value={row.mappedParam?.id || ''}
                              onChange={(e) => handleParameterChange(row.id, e.target.value)}
                              aria-label="Ubah parameter mapping"
                              className="mt-1 w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-medium text-slate-600 focus:outline-none focus:border-[#0B5FA5]"
                            >
                              <option value="" disabled>-- Pilih Parameter Master --</option>
                              {parameters.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name} [{p.instrumentId}]
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 4. Nilai Terukur */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {row.value !== null ? `${row.value} ${row.mappedParam?.unit || ''}` : row.rawValueText || '-'}
                        </td>

                        {/* 5. Level & Lot */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-semibold text-slate-700">{row.controlLevel}</p>
                            <p className="font-mono text-slate-500 text-[10px]">Lot: {row.lotNumber}</p>
                          </div>
                        </td>

                        {/* 6. Z-Score (SDI) */}
                        <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {row.zScore !== null ? (
                            <span className={isRej ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-emerald-700'}>
                              {row.sdPosition}
                            </span>
                          ) : '-'}
                        </td>

                        {/* 7. QC Status & Violations */}
                        <td className="py-2 px-3 max-w-[180px]">
                          {row.validationError ? (
                            <p className="text-[11px] text-rose-700 font-medium font-sans leading-snug">{row.validationError}</p>
                          ) : (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                                isRej 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : isWarn 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {isRej ? 'REJECT (&gt;3SD)' : isWarn ? 'WARNING (1:2s)' : 'PASS (OK)'}
                              </span>
                              {row.violations.map((v, vidx) => (
                                <p key={vidx} className="text-[10px] text-rose-700 leading-tight font-semibold" title={v.description}>
                                  ⚠️ {v.ruleName} Viol
                                </p>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 8. Row Action */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus baris ini dari daftar import"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Execution Panel */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-xs text-slate-800">Konfirmasi Final & Simpan Massal Hasil QC</p>
              <p className="text-xs text-slate-500">
                Akan mengimpor <strong className="text-emerald-700 font-bold">{readyToImportCount} baris data valid</strong> ke dalam sistem. Baris yang memiliki error tidak akan disimpan.
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClearAll}
                className="w-1/2 sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 text-xs transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
              
              <button
                type="button"
                disabled={readyToImportCount === 0 || isImporting}
                onClick={handleSaveImport}
                className="w-1/2 sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengimpor ({readyToImportCount})...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Simpan Massal ({readyToImportCount} Baris)</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
