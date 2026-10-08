import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  FileText,
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Instrument, ControlMaterial, Parameter } from '../../types';
import { StorageService } from '../../services/storage';

interface ParameterCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: Instrument[];
  controls: ControlMaterial[];
  existingParameters: Parameter[];
  onImportSuccess: (importedCount: number) => void;
}

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, any>;
  code: string;
  name: string;
  unit: string;
  method: string;
  targetMean: number;
  targetSD: number;
  targetCV: number;
  minAcceptable: number;
  maxAcceptable: number;
  decimalPlaces: number;
  instrumentId: string;
  instrumentName: string;
  controlMaterialId: string;
  controlLot: string;
  status: 'valid' | 'warning' | 'error';
  validationMessage: string;
  isExisting: boolean;
}

export const ParameterCsvImportModal: React.FC<ParameterCsvImportModalProps> = ({
  isOpen,
  onClose,
  instruments,
  controls,
  existingParameters,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultInstrumentId, setDefaultInstrumentId] = useState<string>(instruments[0]?.id || '');
  const [defaultControlId, setDefaultControlId] = useState<string>(controls[0]?.id || '');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate and download standard CSV template
  const handleDownloadTemplate = () => {
    const defaultInstCode = instruments[0]?.code || 'CHEM-01';
    const defaultLot = controls[0]?.lotNumber || 'CTRL-PNU-01';

    const csvHeader = [
      'Kode Parameter',
      'Nama Parameter',
      'Satuan',
      'Metode Pemeriksaan',
      'Target Mean',
      'Target SD',
      'Target CV (%)',
      'LCL (Min)',
      'UCL (Max)',
      'Desimal',
      'Kode Alat',
      'Lot Bahan Kontrol'
    ].join(',');

    const sampleRows = [
      `ALB,Albumin,g/dL,Bromocresol Green (BCG),38.0,1.2,3.16,34.4,41.6,1,${defaultInstCode},${defaultLot}`,
      `GLU,Glukosa Darah,mg/dL,Hexokinase Enzymatic,100.0,3.5,3.50,89.5,110.5,1,${defaultInstCode},${defaultLot}`,
      `CHOL,Kolesterol Total,mg/dL,CHOD-PAP,185.0,5.2,2.81,169.4,200.6,1,${defaultInstCode},${defaultLot}`,
      `CREA,Kreatinin,mg/dL,Jaffe Kinetic,1.20,0.06,5.00,1.02,1.38,2,${defaultInstCode},${defaultLot}`,
      `SGOT,SGOT / AST,U/L,IFCC Tanpa Pyridoxal Phosphate,35.0,2.1,6.00,28.7,41.3,1,${defaultInstCode},${defaultLot}`,
      `SGPT,SGPT / ALT,U/L,IFCC Tanpa Pyridoxal Phosphate,32.0,1.9,5.94,26.3,37.7,1,${defaultInstCode},${defaultLot}`
    ].join('\n');

    const csvContent = `${csvHeader}\n${sampleRows}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Import_Parameter_QC_Lab.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process File Reading & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    parseCsvFile(file);
  };

  const parseCsvFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setParsedRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to array of objects
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        setParseError('File CSV atau Excel yang diunggah kosong atau tidak memiliki baris data.');
        setIsParsing(false);
        return;
      }

      // Map parsed rows
      const rows: ParsedRow[] = jsonData.map((row, index) => {
        // Clean key names (lowercase, remove spaces, underscores, symbols)
        const normalizedRow: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.toLowerCase().replace(/[^a-z0-0]/g, '');
          normalizedRow[cleanKey] = row[key];
        });

        const findVal = (possibleKeys: string[]): any => {
          for (const k of possibleKeys) {
            const cleanK = k.toLowerCase().replace(/[^a-z0-0]/g, '');
            if (normalizedRow[cleanK] !== undefined && normalizedRow[cleanK] !== '') {
              return normalizedRow[cleanK];
            }
          }
          return undefined;
        };

        const code = String(findVal(['kodeparameter', 'kode', 'code', 'kodeparam']) || '').trim().toUpperCase();
        const name = String(findVal(['namaparameter', 'nama', 'name', 'namaparam']) || '').trim();
        const unit = String(findVal(['satuan', 'unit', 'units']) || 'mg/dL').trim();
        const method = String(findVal(['metodepemeriksaan', 'metode', 'method']) || 'Fotometri').trim();

        // Target Statistics Numbers
        const rawMean = findVal(['targetmean', 'mean', 'ratarata', 'xbar']);
        const targetMean = rawMean !== undefined && !isNaN(Number(rawMean)) ? Number(rawMean) : 0;

        const rawSD = findVal(['targetsd', 'sd', 'standarddeviation', 'deviasistandar']);
        const targetSD = rawSD !== undefined && !isNaN(Number(rawSD)) ? Number(rawSD) : 0;

        let rawCV = findVal(['targetcv', 'cv', 'cvpercent', 'cv%']);
        let targetCV = rawCV !== undefined && !isNaN(Number(rawCV)) && Number(rawCV) > 0
          ? Number(rawCV)
          : targetMean > 0 ? Number(((targetSD / targetMean) * 100).toFixed(2)) : 0;

        // Decimal places inference
        const rawDecimal = findVal(['desimal', 'decimalplaces', 'decimal', 'presisi']);
        let decimalPlaces = rawDecimal !== undefined && !isNaN(Number(rawDecimal))
          ? Number(rawDecimal)
          : String(rawSD || '').includes('.') ? String(rawSD).split('.')[1].length : 1;
        if (decimalPlaces < 0) decimalPlaces = 0;
        if (decimalPlaces > 4) decimalPlaces = 4;

        // LCL (Min Acceptable) and UCL (Max Acceptable)
        const rawLCL = findVal(['lcl', 'minacceptable', 'min', 'lclmin']);
        const minAcceptable = rawLCL !== undefined && !isNaN(Number(rawLCL)) && Number(rawLCL) !== 0
          ? Number(rawLCL)
          : Number((targetMean - 3 * targetSD).toFixed(decimalPlaces));

        const rawUCL = findVal(['ucl', 'maxacceptable', 'max', 'uclmax']);
        const maxAcceptable = rawUCL !== undefined && !isNaN(Number(rawUCL)) && Number(rawUCL) !== 0
          ? Number(rawUCL)
          : Number((targetMean + 3 * targetSD).toFixed(decimalPlaces));

        // Instrument matching
        const rawInstCode = String(findVal(['kodealat', 'instrumentcode', 'alat', 'instrument', 'namaalat']) || '').trim();
        let matchedInst = instruments.find(i => 
          i.code.toLowerCase() === rawInstCode.toLowerCase() || 
          i.name.toLowerCase().includes(rawInstCode.toLowerCase()) ||
          i.id === rawInstCode
        );
        const instrumentId = matchedInst?.id || defaultInstrumentId;
        const instrumentName = matchedInst?.name || instruments.find(i => i.id === defaultInstrumentId)?.name || 'Default Alat';

        // Control material matching
        const rawCtrlLot = String(findVal(['lotbahankontrol', 'lotkontrol', 'controllot', 'bahankontrol', 'lot']) || '').trim();
        let matchedCtrl = controls.find(c => 
          c.lotNumber.toLowerCase() === rawCtrlLot.toLowerCase() || 
          c.name.toLowerCase().includes(rawCtrlLot.toLowerCase()) ||
          c.id === rawCtrlLot
        );
        const controlMaterialId = matchedCtrl?.id || defaultControlId;
        const controlLot = matchedCtrl?.lotNumber || rawCtrlLot || controls.find(c => c.id === defaultControlId)?.lotNumber || '-';

        // Validation logic
        let status: 'valid' | 'warning' | 'error' = 'valid';
        let validationMessages: string[] = [];

        if (!code) {
          status = 'error';
          validationMessages.push('Kode Parameter wajib diisi.');
        }

        if (!name) {
          status = 'error';
          validationMessages.push('Nama Parameter wajib diisi.');
        }

        if (targetMean <= 0) {
          status = status === 'error' ? 'error' : 'warning';
          validationMessages.push('Target Mean harus angka positif > 0.');
        }

        if (targetSD <= 0) {
          status = status === 'error' ? 'error' : 'warning';
          validationMessages.push('Target SD harus angka positif > 0.');
        }

        const isExisting = existingParameters.some(
          p => p.code.toLowerCase() === code.toLowerCase() && p.instrumentId === instrumentId
        );

        if (isExisting && status === 'valid') {
          status = 'warning';
          validationMessages.push('Parameter dengan kode ini sudah ada (akan diperbarui).');
        }

        return {
          rowIndex: index + 2, // 1-based index including header
          raw: row,
          code,
          name,
          unit,
          method,
          targetMean,
          targetSD,
          targetCV,
          minAcceptable,
          maxAcceptable,
          decimalPlaces,
          instrumentId,
          instrumentName,
          controlMaterialId,
          controlLot,
          status,
          validationMessage: validationMessages.join(' '),
          isExisting
        };
      });

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error parsing CSV file:', err);
      setParseError(`Gagal membaca file CSV: ${err.message || 'Format file tidak valid'}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Perform Import
  const handleExecuteImport = () => {
    const validRowsToImport = parsedRows.filter(r => r.status !== 'error');

    if (validRowsToImport.length === 0) {
      alert('Tidak ada baris data parameter yang valid untuk diimpor.');
      return;
    }

    const paramsToSave: Parameter[] = validRowsToImport.map(row => {
      const existing = existingParameters.find(
        p => p.code.toLowerCase() === row.code.toLowerCase() && p.instrumentId === row.instrumentId
      );

      const id = existing ? existing.id : `param-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      return {
        id,
        code: row.code,
        name: row.name,
        unit: row.unit,
        method: row.method,
        instrumentId: row.instrumentId || defaultInstrumentId,
        controlMaterialId: row.controlMaterialId || defaultControlId,
        targetMean: row.targetMean,
        targetSD: row.targetSD,
        targetCV: row.targetCV,
        minAcceptable: row.minAcceptable,
        maxAcceptable: row.maxAcceptable,
        decimalPlaces: row.decimalPlaces,
      };
    });

    const result = StorageService.saveParameters(paramsToSave);
    onImportSuccess(validRowsToImport.length);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.status === 'valid').length;
  const warningCount = parsedRows.filter(r => r.status === 'warning').length;
  const errorCount = parsedRows.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Import Master Parameter QC via File CSV / Excel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah data target nilai Mean, SD, LCL, dan UCL parameter pemeriksaan secara sekaligus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Step 1: Upload & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Upload Box */}
            <div className="md:col-span-2 border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/60 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-white rounded-full shadow-xs border border-purple-100 group-hover:scale-105 transition-transform mb-3">
                <Upload className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Klik untuk Memilih File CSV / Excel Parameter'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung format <strong>.CSV</strong>, <strong>.XLSX</strong>, atau <strong>.XLS</strong> dengan pemisah koma (,) atau titik-koma (;)
              </p>
            </div>

            {/* Template & Helper Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                  <Info className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>Petunjuk & Template</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Gunakan format kolom yang sesuai agar perhitungan LCL/UCL dan SD otomatis dipetakan secara akurat.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors w-full"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Format CSV Contoh</span>
              </button>
            </div>
          </div>

          {/* Fallback Defaults Configuration */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <span>Pengaturan Default (Jika Kode Alat / Lot Kontrol di CSV Kosong):</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium whitespace-nowrap">Default Instrumen:</label>
                <select
                  value={defaultInstrumentId}
                  onChange={(e) => setDefaultInstrumentId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
                >
                  {instruments.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-medium whitespace-nowrap">Default Bahan Kontrol:</label>
                <select
                  value={defaultControlId}
                  onChange={(e) => setDefaultControlId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
                >
                  {controls.map(ctrl => (
                    <option key={ctrl.id} value={ctrl.id}>
                      {ctrl.name} - Lot {ctrl.lotNumber} ({ctrl.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Parse Errors */}
          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Step 2: Parsed Table Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Summary Stats Badge */}
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs font-medium">
                <div className="flex items-center gap-3">
                  <span className="text-slate-700">Total Baris: <strong>{parsedRows.length}</strong></span>
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valid: <strong>{validCount}</strong>
                  </span>
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Peringatan / Update: <strong>{warningCount}</strong>
                  </span>
                  {errorCount > 0 && (
                    <span className="text-rose-700 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Error (Tidak diimpor): <strong>{errorCount}</strong>
                    </span>
                  )}
                </div>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Perbarui data jika parameter sudah ada</span>
                </label>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Kode & Parameter</th>
                      <th className="px-3 py-2">Satuan & Metode</th>
                      <th className="px-3 py-2 text-right font-mono">Target Mean</th>
                      <th className="px-3 py-2 text-right font-mono">Target SD</th>
                      <th className="px-3 py-2 text-right font-mono">Target CV%</th>
                      <th className="px-3 py-2 font-mono">Target Range (LCL - UCL)</th>
                      <th className="px-3 py-2">Instrumen & Lot Kontrol</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedRows.map((row) => (
                      <tr key={row.rowIndex} className={`hover:bg-slate-50 ${row.status === 'error' ? 'bg-rose-50/40' : row.status === 'warning' ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-2 font-mono text-slate-400 text-center">{row.rowIndex}</td>
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-900">{row.name || '-'}</div>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 rounded">
                            {row.code || 'TANPA KODE'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <div>{row.unit}</div>
                          <div className="text-[10px] text-slate-400">{row.method}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{row.targetMean}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{row.targetSD}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700 font-semibold">{row.targetCV}%</td>
                        <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                          {row.minAcceptable} - {row.maxAcceptable}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <div className="font-medium">{row.instrumentName}</div>
                          <div className="text-[10px] text-slate-400">Lot: {row.controlLot}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.status === 'valid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> SIAP
                            </span>
                          )}
                          {row.status === 'warning' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={row.validationMessage}>
                              <AlertTriangle className="h-3 w-3" /> UPDATE
                            </span>
                          )}
                          {row.status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={row.validationMessage}>
                              <XCircle className="h-3 w-3" /> ERROR
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || validCount + warningCount === 0}
            onClick={handleExecuteImport}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors shadow-xs ${
              parsedRows.length === 0 || validCount + warningCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-800 text-white'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Impor ({validCount + warningCount}) Parameter Ke Master Data</span>
          </button>
        </div>

      </div>
    </div>
  );
};
