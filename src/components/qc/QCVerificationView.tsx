import React, { useState, useMemo, useEffect } from 'react';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  RotateCcw, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Calculator, 
  ZoomIn, 
  ZoomOut, 
  Sparkles,
  Building,
  Calendar,
  Clock,
  Layers,
  FileCheck2,
  AlertOctagon,
  ExternalLink,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { Parameter, Instrument, QCResult, WestgardViolation, QCStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { 
  calculateZScore, 
  formatSDPosition, 
  evaluateWestgardRules,
  DEFAULT_WESTGARD_RULES 
} from '../../utils/qcCalculations';
import { 
  buildVerifiedItemsFromAI, 
  VerifiedQCItem, 
  matchControlLevel 
} from '../../utils/aiUtils';

interface QCVerificationViewProps {
  extractedData: any[];
  previewUrl: string | null;
  documentMeta?: any;
  parameters: Parameter[];
  instruments: Instrument[];
  existingResults?: QCResult[];
  onSave?: (results: QCResult[]) => void;
  onRetakeScan?: () => void;
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

export const QCVerificationView: React.FC<QCVerificationViewProps> = ({ 
  extractedData, 
  previewUrl, 
  documentMeta,
  parameters, 
  instruments,
  existingResults = [],
  onSave,
  onRetakeScan,
  onNavigateToTab
}) => {
  const { user } = useAuth();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [lastSavedItems, setLastSavedItems] = useState<QCResult[]>([]);

  // Initialize verified items from AI extraction
  const [items, setItems] = useState<VerifiedQCItem[]>(() => {
    return buildVerifiedItemsFromAI(
      extractedData, 
      documentMeta, 
      parameters, 
      instruments, 
      existingResults
    );
  });

  // Keep items synchronized whenever extractedData, documentMeta or parameters change
  useEffect(() => {
    const newItems = buildVerifiedItemsFromAI(
      extractedData,
      documentMeta,
      parameters,
      instruments,
      existingResults
    );
    setItems(newItems);
  }, [extractedData, documentMeta, parameters, instruments]);

  // Re-calculate row when any field changes
  const updateItemField = (id: string, field: keyof VerifiedQCItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // When user changes parameter from dropdown, automatically synchronize Target Mean, Target SD, Unit, and Instrument
      if (field === 'parameterId') {
        const param = parameters.find(p => p.id === value);
        if (param) {
          updated.parameterName = param.name;
          updated.parameterCode = param.code;
          updated.targetMean = param.targetMean;
          updated.targetSD = param.targetSD;
          updated.unit = param.unit;
          if (param.instrumentId) {
            const inst = instruments.find(i => i.id === param.instrumentId);
            if (inst) {
              updated.instrumentId = inst.id;
              updated.instrumentName = inst.name;
            }
          }
        }
      }

      // If instrument changed
      if (field === 'instrumentId') {
        const inst = instruments.find(i => i.id === value);
        if (inst) {
          updated.instrumentName = inst.name;
        }
      }

      // Recalculate Z-score & Westgard using updated values
      const val = typeof updated.resultValue === 'number' ? updated.resultValue : parseFloat(String(updated.resultValue)) || 0;
      const mean = typeof updated.targetMean === 'number' ? updated.targetMean : parseFloat(String(updated.targetMean)) || 100;
      const sd = typeof updated.targetSD === 'number' && updated.targetSD > 0 ? updated.targetSD : parseFloat(String(updated.targetSD)) || 3.5;
      
      const zScore = calculateZScore(val, mean, sd);
      const sdPosition = formatSDPosition(zScore);

      const history = existingResults.filter(r => r.parameterId === updated.parameterId);
      const { status, violations } = evaluateWestgardRules(
        { id: item.id, value: val, mean, sd, zScore },
        history,
        DEFAULT_WESTGARD_RULES
      );

      updated.zScore = zScore;
      updated.sdPosition = sdPosition;
      updated.status = status;
      updated.violations = violations;

      return updated;
    }));
  };

  // Sync specific item targets back to Master Data default
  const syncWithMasterData = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const param = parameters.find(p => p.id === item.parameterId);
      if (!param) return item;

      const mean = param.targetMean;
      const sd = param.targetSD;
      const val = item.resultValue;
      const zScore = calculateZScore(val, mean, sd);
      const sdPosition = formatSDPosition(zScore);

      const history = existingResults.filter(r => r.parameterId === item.parameterId);
      const { status, violations } = evaluateWestgardRules(
        { id: item.id, value: val, mean, sd, zScore },
        history,
        DEFAULT_WESTGARD_RULES
      );

      return {
        ...item,
        targetMean: mean,
        targetSD: sd,
        unit: param.unit,
        zScore,
        sdPosition,
        status,
        violations
      };
    }));
  };

  const toggleSelectAll = (selected: boolean) => {
    setItems(prev => prev.map(i => ({ ...i, isSelected: selected })));
  };

  const toggleSelectItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isSelected: !i.isSelected } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addNewRow = () => {
    const defaultParam = parameters[0];
    const defaultInst = instruments[0];
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const newItem: VerifiedQCItem = {
      id: `VERIFY-${Date.now()}-MANUAL`,
      sourceText: 'Baris Parameter Tambahan',
      confidence: 1.0,
      needsVerification: false,
      instrumentId: defaultInst?.id || 'inst-chem-a',
      instrumentName: defaultInst?.name || 'Chemistry Analyzer A (Cobas c311)',
      parameterId: defaultParam?.id || 'param-glu',
      parameterName: defaultParam?.name || 'Glucose',
      parameterCode: defaultParam?.code || 'GLU',
      controlLevel: 'Level 1',
      lotNumber: 'LOT-CCM1-2026A',
      resultValue: defaultParam?.targetMean || 100,
      unit: defaultParam?.unit || 'mg/dL',
      targetMean: defaultParam?.targetMean || 100,
      targetSD: defaultParam?.targetSD || 3.5,
      zScore: 0,
      sdPosition: '+0.00 SD',
      status: 'pass',
      violations: [],
      isSelected: true,
      date: today,
      time: time,
    };
    setItems(prev => [...prev, newItem]);
  };

  const selectedItems = useMemo(() => items.filter(i => i.isSelected), [items]);

  const stats = useMemo(() => {
    const total = selectedItems.length;
    const normal = selectedItems.filter(i => i.status === 'pass').length;
    const warning = selectedItems.filter(i => i.status === 'warning').length;
    const reject = selectedItems.filter(i => i.status === 'reject' || i.status === 'fail').length;
    return { total, normal, warning, reject };
  }, [selectedItems]);

  const handleSaveAll = () => {
    if (selectedItems.length === 0) return;

    const savedResultsList: QCResult[] = [];

    selectedItems.forEach((item, idx) => {
      const fullDate = `${item.date}T${item.time}:00`;
      const id = `QC-AI-${Date.now().toString().slice(-6)}-${idx + 1}`;

      const newQC: QCResult = {
        id,
        date: item.date,
        time: item.time,
        timestamp: new Date(fullDate).getTime(),
        operatorId: user?.id || 'user-analis',
        operatorName: user?.name || 'Ahli Teknologi Laboratorium Medik',
        instrumentId: item.instrumentId,
        instrumentName: item.instrumentName,
        parameterId: item.parameterId,
        parameterName: item.parameterName,
        parameterCode: item.parameterCode,
        controlLevel: item.controlLevel,
        lotNumber: item.lotNumber,
        value: Number(item.resultValue),
        unit: item.unit,
        mean: Number(item.targetMean),
        sd: Number(item.targetSD),
        zScore: Number(item.zScore),
        sdPosition: item.sdPosition,
        status: item.status,
        violations: item.violations,
        notes: `Hasil scan AI Vision OCR (Confidence: ${Math.round(item.confidence * 100)}%)`,
        reviewStatus: (item.status === 'reject' || item.status === 'fail') ? 'investigation_required' : 'accepted',
        source: 'AI_VISION',
        verificationStatus: 'VERIFIED'
      };

      // Save to StorageService
      StorageService.saveQCResult(newQC);
      savedResultsList.push(newQC);

      // Audit Log
      StorageService.logAudit(
        'INPUT_QC',
        `Menyimpan hasil QC AI Vision: ${item.parameterName} (${item.resultValue} ${item.unit}, Z: ${item.sdPosition})`,
        newQC
      );
    });

    setLastSavedItems(savedResultsList);
    setSavedCount(savedResultsList.length);
    setIsSavedSuccess(true);

    if (onSave) {
      onSave(savedResultsList);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">Confidence {Math.round(confidence * 100)}%</span>;
    }
    if (confidence >= 0.7) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200">Review {Math.round(confidence * 100)}%</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200">Low {Math.round(confidence * 100)}%</span>;
  };

  const getStatusBadge = (status: QCStatus, violations: WestgardViolation[]) => {
    if (status === 'reject' || status === 'fail') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="h-3.5 w-3.5 text-rose-600" />
          <span>REJECT {violations.map(v => v.rule).join(', ')}</span>
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>WARNING {violations.map(v => v.rule).join(', ')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
        <span>IN CONTROL (PASS)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Success Modal / Banner */}
      {isSavedSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-6 text-emerald-900 shadow-md animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-950">
                  {savedCount} Hasil QC Berhasil Disimpan & Divalidasi ke Basis Data!
                </h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Data telah masuk ke QC Harian, grafik Levey-Jennings, evaluasi Westgard, dan Dashboard QC Intelligence.
                </p>
                {lastSavedItems.some(i => i.status === 'reject' || i.status === 'fail') && (
                  <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 shrink-0" />
                    <span>Perhatian: Ditemukan hasil QC Out-of-Control (Reject). Disarankan untuk membuka investigasi CAPA.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab?.('levey-jennings')}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span>Lihat Levey-Jennings</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onNavigateToTab?.('qc-input')}
                className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold rounded-xl shadow-sm"
              >
                Ke Form QC Harian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onRetakeScan}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
              title="Kembali ke Scanner"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Verifikasi & Sinkronisasi Hasil QC dari Foto</h1>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            Nilai <strong>Hasil (Result/Conc)</strong> dibaca dari alat (CST-240 / Cobas), sementara <strong>Target Mean</strong> & <strong>Target SD</strong> otomatis disinkronkan dengan Master Data.
          </p>
        </div>

        {/* Action Summary Pill */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-100 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
            Total: <strong>{items.length}</strong>
          </div>
          <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl font-semibold border border-emerald-200">
            Pass: <strong>{stats.normal}</strong>
          </div>
          {stats.warning > 0 && (
            <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl font-semibold border border-amber-200">
              Warning: <strong>{stats.warning}</strong>
            </div>
          )}
          {stats.reject > 0 && (
            <div className="bg-rose-50 text-rose-800 px-3 py-1.5 rounded-xl font-semibold border border-rose-200">
              Reject: <strong>{stats.reject}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photo Preview with Zoom Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0B5FA5]" />
                <span>Foto Struk Alat Asli</span>
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.2))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-500 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600 text-xs font-semibold ml-1"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl overflow-hidden min-h-[380px] max-h-[560px] flex items-center justify-center p-2 relative">
              {previewUrl ? (
                <div 
                  className="transition-transform duration-150 ease-out origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img 
                    src={previewUrl} 
                    alt="QC Result Printout" 
                    className="max-h-[520px] w-auto object-contain rounded" 
                  />
                </div>
              ) : (
                <div className="text-center text-slate-400 text-xs p-8">
                  <p>Tidak ada foto yang diunggah.</p>
                </div>
              )}
            </div>

            {/* Document Metadata Extracted */}
            {documentMeta && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>Metadata Hasil Pembacaan</span>
                  <span className="text-[10px] text-blue-600 font-bold">CST-240 / Vision</span>
                </div>
                {documentMeta.analyzer && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Analyzer:</span>
                    <span className="font-semibold text-slate-800">{documentMeta.analyzer}</span>
                  </div>
                )}
                {documentMeta.lot_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lot Struk:</span>
                    <span className="font-semibold text-slate-800">{documentMeta.lot_number}</span>
                  </div>
                )}
                {documentMeta.date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu:</span>
                    <span className="font-semibold text-slate-800">{documentMeta.date} {documentMeta.time || ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Verification & Editing Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Detail Ekstraksi & Pencocokan Nilai QC</h3>
                <p className="text-xs text-slate-500">
                  Pastikan <strong>Hasil (Result)</strong> terukur sesuai struk, dan nilai <strong>Target Mean / SD</strong> tersinkron dengan Master Data.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addNewRow}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(selectedItems.length !== items.length)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-xl"
                >
                  {selectedItems.length === items.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
            </div>

            {/* Items List */}
            {items.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-800 text-sm">Tidak ada parameter yang terbaca dari gambar</p>
                <p className="text-xs text-slate-500">Klik "Tambah Baris" untuk memasukkan parameter QC secara manual.</p>
                <button
                  type="button"
                  onClick={addNewRow}
                  className="px-4 py-2 bg-[#0B5FA5] text-white text-xs font-bold rounded-xl"
                >
                  + Tambah Parameter Manual
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={`border-2 rounded-2xl p-4 transition-all ${
                      item.status === 'reject' || item.status === 'fail'
                        ? 'border-rose-300 bg-rose-50/20 shadow-sm' 
                        : item.status === 'warning'
                        ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-300 shadow-sm'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="h-4 w-4 rounded text-[#0B5FA5] focus:ring-[#0B5FA5]"
                        />
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <div className="font-bold text-slate-900 text-sm">
                          {item.parameterName} ({item.parameterCode})
                        </div>
                        {getConfidenceBadge(item.confidence)}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(item.status, item.violations)}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Parameter & Instrument Selection (Row 1) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                      {/* Parameter Dropdown - Synchronizes Mean, SD, Unit on change */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-slate-700 font-bold">Parameter Pemeriksaan</label>
                          <span className="text-[10px] text-blue-600 font-semibold">Sinkron Master</span>
                        </div>
                        <select
                          value={item.parameterId}
                          onChange={(e) => updateItemField(item.id, 'parameterId', e.target.value)}
                          className="w-full border-2 border-slate-300 rounded-xl p-2 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-[#0B5FA5] focus:border-[#0B5FA5]"
                        >
                          {parameters.map(p => (
                            <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
                          ))}
                        </select>
                      </div>

                      {/* Instrument Dropdown */}
                      <div className="space-y-1">
                        <label className="text-slate-700 font-bold">Alat / Analyzer</label>
                        <select
                          value={item.instrumentId}
                          onChange={(e) => updateItemField(item.id, 'instrumentId', e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-2 font-medium bg-white focus:ring-2 focus:ring-[#0B5FA5]"
                        >
                          {instruments.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Level & Lot */}
                      <div className="space-y-1">
                        <label className="text-slate-700 font-bold">Level & Lot Kontrol</label>
                        <div className="flex gap-1.5">
                          <select
                            value={item.controlLevel}
                            onChange={(e) => updateItemField(item.id, 'controlLevel', e.target.value as any)}
                            className="w-1/2 border border-slate-300 rounded-xl p-2 font-medium bg-white focus:ring-2 focus:ring-[#0B5FA5]"
                          >
                            <option value="Level 1">Level 1</option>
                            <option value="Level 2">Level 2</option>
                            <option value="Level 3">Level 3</option>
                          </select>
                          <input
                            type="text"
                            value={item.lotNumber}
                            onChange={(e) => updateItemField(item.id, 'lotNumber', e.target.value)}
                            placeholder="No Lot"
                            className="w-1/2 border border-slate-300 rounded-xl p-2 font-mono text-xs font-semibold bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Distinct 3-Column Box: RESULT vs TARGET MEAN vs TARGET SD vs Z-SCORE (Row 2) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      {/* Box 1: RESULT (Nilai Hasil Pengukuran Aktual dari Alat CST-240) */}
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border-2 border-blue-500 shadow-sm">
                        <div className="flex justify-between items-center">
                          <label className="text-blue-950 font-extrabold text-[11px] uppercase tracking-wider">
                            1. Hasil QC (Result/Conc)
                          </label>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                            {item.unit}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={item.resultValue}
                          onChange={(e) => updateItemField(item.id, 'resultValue', parseFloat(e.target.value) || 0)}
                          className="w-full font-mono font-black text-xl text-blue-700 bg-transparent outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block">Dibaca dari struk/layar</span>
                      </div>

                      {/* Box 2: TARGET MEAN (X̄) */}
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-300">
                        <div className="flex justify-between items-center">
                          <label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                            2. Target Mean (X̄)
                          </label>
                          <button
                            type="button"
                            onClick={() => syncWithMasterData(item.id)}
                            className="text-[10px] text-[#0B5FA5] hover:underline flex items-center gap-0.5 font-bold"
                            title="Reset ke nilai Master Data"
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Sync
                          </button>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={item.targetMean}
                          onChange={(e) => updateItemField(item.id, 'targetMean', parseFloat(e.target.value) || 0)}
                          className="w-full font-mono font-bold text-base text-slate-800 bg-transparent outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block">Nilai rujukan rata-rata</span>
                      </div>

                      {/* Box 3: TARGET SD (1 SD) */}
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-300">
                        <div className="flex justify-between items-center">
                          <label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                            3. Target SD (1 SD)
                          </label>
                          <button
                            type="button"
                            onClick={() => syncWithMasterData(item.id)}
                            className="text-[10px] text-[#0B5FA5] hover:underline flex items-center gap-0.5 font-bold"
                            title="Reset ke nilai Master Data"
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Sync
                          </button>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={item.targetSD}
                          onChange={(e) => updateItemField(item.id, 'targetSD', parseFloat(e.target.value) || 0)}
                          className="w-full font-mono font-bold text-base text-slate-800 bg-transparent outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block">Standar deviasi kontrol</span>
                      </div>

                      {/* Box 4: Z-SCORE & STATUS POSITION */}
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-300 flex flex-col justify-between">
                        <div className="flex justify-between items-center">
                          <label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                            4. Z-Score (SDI)
                          </label>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.status === 'pass' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : item.status === 'warning' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="font-mono font-black text-lg text-slate-900">
                          {item.sdPosition}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Formula: (Result - Mean) / SD
                        </span>
                      </div>
                    </div>

                    {/* Source Text / OCR Notice */}
                    {item.sourceText && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Teks terbaca pada alat: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{item.sourceText}</code></span>
                        {item.verificationReason && (
                          <span className="text-amber-600 font-semibold">{item.verificationReason}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Save & Commit Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                <span>Terpilih untuk disimpan: </span>
                <strong className="text-slate-900">{selectedItems.length} dari {items.length} parameter</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onRetakeScan}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal / Scan Ulang
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={selectedItems.length === 0}
                  className="px-6 py-2.5 bg-[#0B5FA5] hover:bg-[#084B83] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <Save className="h-4 w-4" />
                  <span>Simpan Semua ke QC Harian & Validasi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
