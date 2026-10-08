import React, { useState, useMemo, useEffect } from 'react';
import { 
  Save, 
  AlertTriangle, 
  CheckCircle, 
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
  FileCheck2, 
  AlertOctagon, 
  ExternalLink,
  Sliders,
  RefreshCw,
  Filter,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2
} from 'lucide-react';
import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation, QCStatus } from '../../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from '../../utils/qcCalculations';
import { buildVerifiedItemsFromAI, VerifiedQCItem } from '../../utils/aiUtils';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';

interface QCVerificationViewProps {
  extractedData: any[];
  previewUrl: string | null;
  documentMeta?: any;
  parameters: Parameter[];
  instruments: Instrument[];
  controls?: ControlMaterial[];
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
  controls,
  existingResults = [],
  onSave,
  onRetakeScan,
  onNavigateToTab
}) => {
  const { user } = useAuth();
  const masterControls = useMemo(() => {
    return controls && controls.length > 0 ? controls : StorageService.getControlMaterials();
  }, [controls]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [lastSavedItems, setLastSavedItems] = useState<QCResult[]>([]);
  const [activeBatchImageIndex, setActiveBatchImageIndex] = useState<number>(0);

  // Batch images array
  const batchImages: string[] = useMemo(() => {
    if (documentMeta?.isBatch && Array.isArray(documentMeta.batchImages) && documentMeta.batchImages.length > 0) {
      return documentMeta.batchImages;
    }
    return previewUrl ? [previewUrl] : [];
  }, [documentMeta, previewUrl]);

  const currentPreviewUrl = batchImages[activeBatchImageIndex] || previewUrl;

  // Detected instrument from scan
  const detectedInstrumentId = useMemo(() => {
    if (documentMeta?.instrument_id) return documentMeta.instrument_id;
    const docName = (documentMeta?.analyzer || '').toLowerCase();
    if (docName.includes('dimih') || docName.includes('3980')) return 'inst-dirui-3980';
    if (docName.includes('cst') || docName.includes('cs-t240') || docName.includes('cobas') || docName.includes('c311')) return 'inst-cst240';
    if (docName.includes('sysmex') || docName.includes('xn')) return 'inst-hema-a';
    return 'ALL';
  }, [documentMeta]);

  // Active filter for view (e.g. 'ALL', 'inst-cst240', 'inst-dirui-3980')
  const [instrumentFilter, setInstrumentFilter] = useState<string>('ALL');

  // Initialize verified items from AI extraction
  const [items, setItems] = useState<VerifiedQCItem[]>(() => {
    return buildVerifiedItemsFromAI(
      extractedData, 
      documentMeta, 
      parameters, 
      instruments, 
      existingResults,
      documentMeta?.instrument_id
    );
  });

  // Keep items synchronized whenever extractedData, documentMeta or parameters change
  useEffect(() => {
    const newItems = buildVerifiedItemsFromAI(
      extractedData,
      documentMeta,
      parameters,
      instruments,
      existingResults,
      documentMeta?.instrument_id
    );
    setItems(newItems);
    setInstrumentFilter('ALL');
  }, [extractedData, documentMeta, parameters, instruments]);

  // Re-calculate row when any field changes
  const updateItemField = (id: string, field: keyof VerifiedQCItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: value };

      // When user changes parameter from dropdown, automatically synchronize Target Mean, Target SD, Unit, Instrument, and Control Lot
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
          // Auto-sync Control Lot Number and Level with Master Data
          const matchedCtrl = masterControls.find(c => c.id === param.controlMaterialId);
          if (matchedCtrl) {
            updated.lotNumber = matchedCtrl.lotNumber;
            updated.controlLevel = matchedCtrl.level;
          }
        }
      }

      // If instrument changed
      if (field === 'instrumentId') {
        const inst = instruments.find(i => i.id === value);
        if (inst) {
          updated.instrumentName = inst.name;
          // Auto switch to first parameter of this instrument if current parameter belongs to another
          const curParam = parameters.find(p => p.id === updated.parameterId);
          if (curParam && curParam.instrumentId && curParam.instrumentId !== inst.id) {
            const matchingParam = parameters.find(p => p.instrumentId === inst.id);
            if (matchingParam) {
              updated.parameterId = matchingParam.id;
              updated.parameterName = matchingParam.name;
              updated.parameterCode = matchingParam.code;
              updated.targetMean = matchingParam.targetMean;
              updated.targetSD = matchingParam.targetSD;
              updated.unit = matchingParam.unit;
            }
          }
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

  // Sync specific item targets and control lot back to Master Data default
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

      const matchedCtrl = masterControls.find(c => c.id === param.controlMaterialId);

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
        lotNumber: matchedCtrl?.lotNumber || item.lotNumber,
        controlLevel: matchedCtrl?.level || item.controlLevel,
        zScore,
        sdPosition,
        status,
        violations
      };
    }));
  };

  // Sync all items' control lot numbers with Master Data Parameter defaults
  const syncAllLotsWithMasterData = () => {
    setItems(prev => prev.map(item => {
      const param = parameters.find(p => p.id === item.parameterId);
      if (!param) return item;
      const matchedCtrl = masterControls.find(c => c.id === param.controlMaterialId);
      if (!matchedCtrl) return item;
      return {
        ...item,
        lotNumber: matchedCtrl.lotNumber,
        controlLevel: matchedCtrl.level
      };
    }));
  };

  // Quick swap between Result and Target SD if columns were inverted on thermal receipt
  const swapResultAndSD = (id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newResult = item.targetSD;
      const newSD = item.resultValue;
      const mean = item.targetMean;

      const zScore = calculateZScore(newResult, mean, newSD);
      const sdPosition = formatSDPosition(zScore);

      const history = existingResults.filter(r => r.parameterId === item.parameterId);
      const { status, violations } = evaluateWestgardRules(
        { id: item.id, value: newResult, mean, sd: newSD, zScore },
        history,
        DEFAULT_WESTGARD_RULES
      );

      return {
        ...item,
        resultValue: newResult,
        targetSD: newSD,
        zScore,
        sdPosition,
        status,
        violations
      };
    }));
  };

  // Remove all items that don't belong to a specific instrument
  const isolateToInstrument = (instId: string) => {
    setItems(prev => prev.filter(i => i.instrumentId === instId));
    setInstrumentFilter(instId);
  };

  const toggleSelectAll = (selected: boolean) => {
    setItems(prev => prev.map(i => {
      if (instrumentFilter === 'ALL' || i.instrumentId === instrumentFilter) {
        return { ...i, isSelected: selected };
      }
      return i;
    }));
  };

  const toggleSelectItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isSelected: !i.isSelected } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addNewRow = () => {
    const targetInstId = instrumentFilter !== 'ALL' ? instrumentFilter : (detectedInstrumentId !== 'ALL' ? detectedInstrumentId : 'inst-cst240');
    const targetInst = instruments.find(i => i.id === targetInstId) || instruments[0];
    const instParams = parameters.filter(p => p.instrumentId === targetInst?.id);
    const defaultParam = instParams[0] || parameters[0];

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const newItem: VerifiedQCItem = {
      id: `VERIFY-${Date.now()}-MANUAL`,
      sourceText: 'Baris Parameter Tambahan',
      confidence: 1.0,
      needsVerification: false,
      instrumentId: targetInst?.id || 'inst-cst240',
      instrumentName: targetInst?.name || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
      parameterId: defaultParam?.id || 'param-cst-glu',
      parameterName: defaultParam?.name || 'Glucose (Glukosa Darah CST-240)',
      parameterCode: defaultParam?.code || 'GLU',
      controlLevel: 'Level 1',
      lotNumber: 'LOT-CST1-2026A',
      resultValue: defaultParam?.targetMean || 100,
      unit: defaultParam?.unit || 'mg/dL',
      targetMean: defaultParam?.targetMean || 100,
      targetSD: defaultParam?.targetSD || 3.5,
      zScore: 0,
      sdPosition: '+0.00 SD',
      status: 'pass',
      violations: [],
      schemaValid: true,
      schemaWarnings: [],
      isSelected: true,
      date: today,
      time: time,
    };
    setItems(prev => [...prev, newItem]);
  };

  // Filter items by active instrument filter
  const displayedItems = useMemo(() => {
    if (instrumentFilter === 'ALL') return items;
    const filtered = items.filter(i => i.instrumentId === instrumentFilter);
    return filtered.length > 0 ? filtered : items;
  }, [items, instrumentFilter]);

  const selectedItems = useMemo(() => displayedItems.filter(i => i.isSelected), [displayedItems]);

  const stats = useMemo(() => {
    const total = selectedItems.length;
    const normal = selectedItems.filter(i => i.status === 'pass').length;
    const warning = selectedItems.filter(i => i.status === 'warning').length;
    const reject = selectedItems.filter(i => i.status === 'reject' || i.status === 'fail').length;
    return { total, normal, warning, reject };
  }, [selectedItems]);

  // Check how many items belong to CST-240 vs other machines
  const instrumentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      map[i.instrumentId] = (map[i.instrumentId] || 0) + 1;
    });
    return map;
  }, [items]);

  const handleSaveAll = () => {
    if (isSaving || selectedItems.length === 0) return;
    setIsSaving(true);

    const savedResultsList: QCResult[] = [];
    const seenBatchKeys = new Set<string>();

    selectedItems.forEach((item, idx) => {
      // Guard against identical duplicates within same batch
      const batchKey = `${item.parameterId}_${item.instrumentId}_${item.controlLevel}_${item.date}_${item.time}_${item.resultValue}`;
      if (seenBatchKeys.has(batchKey)) return;
      seenBatchKeys.add(batchKey);

      const fullDate = `${item.date}T${item.time}:00`;
      const itemTimestamp = new Date(fullDate).getTime();

      // Check if identical result already exists in existingResults
      const existingMatch = existingResults.find(r => 
        r.parameterId === item.parameterId &&
        r.instrumentId === item.instrumentId &&
        r.controlLevel === item.controlLevel &&
        r.date === item.date &&
        (r.time === item.time || Math.abs(r.timestamp - itemTimestamp) < 60000) &&
        Number(r.value) === Number(item.resultValue)
      );

      const id = existingMatch ? existingMatch.id : `QC-AI-${Date.now().toString().slice(-6)}-${idx + 1}`;

      const newQC: QCResult = {
        id,
        date: item.date,
        time: item.time,
        timestamp: itemTimestamp,
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
    setItems([]); // Clear items so form is emptied and double clicking cannot save again

    if (onSave) {
      onSave(savedResultsList);
    }

    // Otomatis dialihkan ke Menu Awal (Dashboard)
    setTimeout(() => {
      onNavigateToTab?.('dashboard', {
        qcSaved: true,
        source: 'scan',
        count: savedResultsList.length,
        analyzer: documentMeta?.analyzer || instruments.find(i => i.id === detectedInstrumentId)?.name,
        message: `${savedResultsList.length} Hasil QC berhasil diverifikasi & disimpan. Otomatis dialihkan ke Menu Awal.`
      });
    }, 500);
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
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Verifikasi & Sinkronisasi Hasil QC dari Foto</span>
              {documentMeta?.isBatch && (
                <span className="text-xs bg-blue-600 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Batch {documentMeta.totalImages || batchImages.length} Struk</span>
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            Nilai <strong>Hasil (Result/Conc)</strong> dibaca dari alat, sementara <strong>Target Mean</strong> & <strong>Target SD</strong> otomatis disinkronkan dengan Master Data alat terkait.
          </p>
        </div>

        {/* Action Summary Pill */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            type="button"
            onClick={syncAllLotsWithMasterData}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0B5FA5] font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Satu klik menyinkronkan seluruh nomor lot dan level dengan Master Data Kontrol"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Lot Master Data</span>
          </button>
          <div className="bg-slate-100 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
            Terpilih: <strong>{selectedItems.length}</strong> / {displayedItems.length}
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

      {/* Instrument Filter & Separation Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Filter className="h-3.5 w-3.5 text-blue-600" /> Filter Alat:
          </span>
          <button
            type="button"
            onClick={() => setInstrumentFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              instrumentFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua Hasil ({items.length})
          </button>
          {instruments.map(inst => {
            const count = instrumentCounts[inst.id] || 0;
            if (count === 0 && instrumentFilter !== inst.id) return null;
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => setInstrumentFilter(inst.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  instrumentFilter === inst.id
                    ? 'bg-[#0B5FA5] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{inst.name.split('(')[0].trim()}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clean Foreign Parameters button if multiple instruments are detected */}
        {Object.keys(instrumentCounts).length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => isolateToInstrument('inst-cst240')}
              className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Hapus parameter dari alat lain dan simpan hanya parameter CST-240"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
              <span>Hanya Simpan CST-240</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photo Preview with Zoom Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0B5FA5]" />
                <span>
                  {batchImages.length > 1 
                    ? `Foto Struk #${activeBatchImageIndex + 1} dari ${batchImages.length}` 
                    : 'Foto Struk Alat Asli'}
                </span>
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

            {/* Batch Photo Pager Bar */}
            {batchImages.length > 1 && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveBatchImageIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeBatchImageIndex === 0}
                  className="p-1 rounded-lg bg-white border border-blue-200 text-blue-700 disabled:opacity-40 hover:bg-blue-100 transition-colors"
                  title="Foto Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {batchImages.map((_, imgIdx) => (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={() => setActiveBatchImageIndex(imgIdx)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeBatchImageIndex === imgIdx
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      Struk #{imgIdx + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveBatchImageIndex(prev => Math.min(batchImages.length - 1, prev + 1))}
                  disabled={activeBatchImageIndex === batchImages.length - 1}
                  className="p-1 rounded-lg bg-white border border-blue-200 text-blue-700 disabled:opacity-40 hover:bg-blue-100 transition-colors"
                  title="Foto Selanjutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="bg-slate-900 rounded-xl overflow-hidden min-h-[380px] max-h-[560px] flex items-center justify-center p-2 relative">
              {currentPreviewUrl ? (
                <div 
                  className="transition-transform duration-150 ease-out origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img 
                    src={currentPreviewUrl} 
                    alt={`QC Printout ${activeBatchImageIndex + 1}`} 
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
                  <span>Metadata Pembacaan</span>
                  <span className="text-[10px] text-blue-600 font-bold">Terverifikasi</span>
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
                  onClick={() => toggleSelectAll(selectedItems.length !== displayedItems.length)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-xl"
                >
                  {selectedItems.length === displayedItems.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
            </div>

            {/* Items List */}
            {displayedItems.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="font-bold text-slate-800 text-sm">Tidak ada parameter untuk filter alat ini</p>
                <p className="text-xs text-slate-500">Klik "Tambah Baris" untuk memasukkan parameter QC secara manual atau pilih "Semua Hasil".</p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInstrumentFilter('ALL')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Tampilkan Semua Hasil
                  </button>
                  <button
                    type="button"
                    onClick={addNewRow}
                    className="px-4 py-2 bg-[#0B5FA5] text-white text-xs font-bold rounded-xl"
                  >
                    + Tambah Parameter Manual
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedItems.map((item, idx) => (
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
                      {/* Parameter Dropdown - Filtered/Grouped */}
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
                          {/* Options for current instrument first */}
                          <optgroup label={`Parameter ${item.instrumentName.split('(')[0]}`}>
                            {parameters.filter(p => p.instrumentId === item.instrumentId).map(p => (
                              <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
                            ))}
                          </optgroup>
                          {/* Other parameters */}
                          <optgroup label="Parameter Alat Lain">
                            {parameters.filter(p => p.instrumentId !== item.instrumentId).map(p => (
                              <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
                            ))}
                          </optgroup>
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
                        <div className="flex items-center justify-between text-xs">
                          <label className="text-slate-700 font-bold">Level & Lot Kontrol</label>
                          {masterControls.some(c => c.lotNumber === item.lotNumber) ? (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                              ✓ Sync Master
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              Custom Lot
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <select
                            value={item.controlLevel}
                            onChange={(e) => updateItemField(item.id, 'controlLevel', e.target.value as any)}
                            className="w-1/3 border border-slate-300 rounded-xl p-2 font-medium bg-white focus:ring-2 focus:ring-[#0B5FA5]"
                          >
                            <option value="Level 1">Level 1</option>
                            <option value="Level 2">Level 2</option>
                            <option value="Level 3">Level 3</option>
                          </select>
                          <select
                            value={masterControls.some(c => c.lotNumber === item.lotNumber) ? item.lotNumber : 'CUSTOM'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== 'CUSTOM') {
                                const matched = masterControls.find(c => c.lotNumber === val);
                                if (matched) {
                                  updateItemField(item.id, 'lotNumber', matched.lotNumber);
                                  updateItemField(item.id, 'controlLevel', matched.level);
                                }
                              }
                            }}
                            className="w-2/3 border border-slate-300 rounded-xl p-2 font-mono text-xs font-bold bg-white focus:ring-2 focus:ring-[#0B5FA5]"
                          >
                            {masterControls.map(c => {
                              const paramObj = parameters.find(p => p.id === item.parameterId);
                              const isParamDefault = paramObj?.controlMaterialId === c.id;
                              return (
                                <option key={c.id} value={c.lotNumber}>
                                  {c.lotNumber}{isParamDefault ? ' ★ [Default]' : ''} ({c.level})
                                </option>
                              );
                            })}
                            <option value="CUSTOM">+ Lot Manual ({item.lotNumber})</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Distinct 3-Column Box: RESULT vs TARGET MEAN vs TARGET SD vs Z-SCORE (Row 2) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                        <span className="font-semibold text-slate-700">Penetapan Nilai QC:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => swapResultAndSD(item.id)}
                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#0B5FA5] rounded-md font-bold text-[10px] border border-blue-200 flex items-center gap-1 transition-colors"
                            title="Tukar posisi nilai Result dan SD jika terbalik pada struk"
                          >
                            <Sliders className="h-3 w-3" /> Tukar Result ⇄ SD
                          </button>
                          <button
                            type="button"
                            onClick={() => syncWithMasterData(item.id)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[10px] border border-slate-300 flex items-center gap-1 transition-colors"
                            title="Reset Mean dan SD ke konfigurasi Master Data"
                          >
                            <RefreshCw className="h-3 w-3" /> Reset ke Master Data
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                        {/* Box 1: RESULT (Nilai Hasil Pengukuran Aktual dari Alat) */}
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
                          <span className="text-[10px] text-slate-400 block">Standar Deviasi 1 SD</span>
                        </div>

                        {/* Box 4: Z-SCORE & STATUS POSITION */}
                        <div className={`space-y-1 p-2.5 rounded-xl border flex flex-col justify-between ${
                          item.status === 'reject' || item.status === 'fail'
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : item.status === 'warning'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        }`}>
                          <div>
                            <div className="flex justify-between items-center">
                              <label className="font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                                <Calculator className="h-3 w-3" /> Z-Score (SDI)
                              </label>
                              <span className="text-[10px] font-bold">
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="font-mono font-black text-lg mt-0.5">
                              {item.sdPosition}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Z = ({item.resultValue} - {item.targetMean}) / {item.targetSD}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Source Raw Text & Verification Reason */}
                    {item.sourceText && (
                      <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg font-mono flex items-center justify-between">
                        <span>Teks Asli Struk: "{item.sourceText}"</span>
                        {item.verificationReason && (
                          <span className="text-amber-700 font-bold ml-2">[{item.verificationReason}]</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Floating Action Bar */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#0B5FA5] text-white rounded-xl">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedItems.length} Parameter Siap Divalidasi & Disimpan
                </div>
                <div className="text-xs text-slate-500">
                  Target: <strong>{instrumentFilter === 'ALL' ? (detectedInstrumentId !== 'ALL' ? instruments.find(i => i.id === detectedInstrumentId)?.name || 'CST-240' : 'Semua Alat Terpilih') : instruments.find(i => i.id === instrumentFilter)?.name}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onRetakeScan}
                className="w-1/2 sm:w-auto px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Scan Ulang
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={selectedItems.length === 0 || isSaving}
                className="w-1/2 sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menyimpan & Mengalihkan ke Menu Awal...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Simpan Semua ke QC Harian & Validasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
