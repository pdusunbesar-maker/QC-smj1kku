import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Scan, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Eye, 
  Sliders, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  Calendar, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  Maximize2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { executeDiruiOcr, DiruiParsedItem, DiruiOcrProgress } from '../../services/diruiOcrService';
import { DEFAULT_DIRUI_TABLE_CROP, CropRegion } from '../../utils/diruiOcrPreprocessing';
import { QCHematologi, Parameter, Instrument } from '../../types';

interface DiruiHematologiScanViewProps {
  onNavigateToTab?: (tab: string, payload?: any) => void;
  instruments?: Instrument[];
  parameters?: Parameter[];
}

export const DiruiHematologiScanView: React.FC<DiruiHematologiScanViewProps> = ({
  onNavigateToTab,
  instruments = [],
  parameters = []
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Source image state
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | Blob | null>(null);
  const [cropRegion, setCropRegion] = useState<CropRegion>(DEFAULT_DIRUI_TABLE_CROP);
  const [customCropEnabled, setCustomCropEnabled] = useState(false);

  // OCR Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState<DiruiOcrProgress>({ status: '', progress: 0 });
  const [preprocessedPreview, setPreprocessedPreview] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');

  // Results State (Editable Table)
  const [items, setItems] = useState<DiruiParsedItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');

  // Notification / Modal State
  const [saveSuccess, setSaveSuccess] = useState<{ message: string; count: number; fotoUrl?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreprocessedModal, setShowPreprocessedModal] = useState(false);
  const [syncToGeneralQC, setSyncToGeneralQC] = useState(true);

  // History State
  const [historyRecords, setHistoryRecords] = useState<QCHematologi[]>(() => StorageService.getQCHematologi());

  const reloadHistory = useCallback(() => {
    setHistoryRecords(StorageService.getQCHematologi());
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  // Helper to generate a realistic Dirui Dimih 3980 receipt image onto canvas
  const handleLoadSampleDiruiReceipt = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 680;
    canvas.height = 1150;
    const ctx = canvas.getContext('2d')!;

    // Background thermal paper texture (off-white)
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle thermal paper grain
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    ctx.globalAlpha = 1.0;

    // Header Print
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('DIRUI DIMIH 3980 ANALYZER', canvas.width / 2, 50);

    ctx.font = 'bold 18px monospace';
    ctx.fillText('HEMATOLOGY QC REPORT', canvas.width / 2, 80);

    ctx.font = '15px monospace';
    ctx.fillText('RSUD SULTAN MUHAMMAD JAMALUDIN I', canvas.width / 2, 108);

    ctx.textAlign = 'left';
    ctx.font = '15px monospace';
    ctx.fillText('------------------------------------------------', 40, 135);
    ctx.fillText(`DATE: ${selectedDate}   TIME: 08:35:12`, 40, 160);
    ctx.fillText('SAMPLE ID : QC-HEMA-LV1    LOT: 2026A', 40, 185);
    ctx.fillText('OPERATOR  : ' + (user.name || 'ATLM-01'), 40, 210);
    ctx.fillText('------------------------------------------------', 40, 235);

    // Table Header
    ctx.font = 'bold 16px monospace';
    ctx.fillText('ITEM        FLAG  VALUE    UNIT', 40, 260);
    ctx.fillText('------------------------------------------------', 40, 280);

    // Table Rows with real Dirui Dimih 3980 formatting: [FLAG] [ITEM] [FLAG] [NILAI] [UNIT]
    const sampleRows = [
      { item: 'WBC', flag: '', val: '7.2', unit: '10^9/L' },
      { item: 'RBC', flag: '', val: '4.52', unit: '10^12/L' },
      { item: 'HGB', flag: 'L', val: '11.4', unit: 'g/dL' },
      { item: 'HCT', flag: 'L', val: '34.2', unit: '%' },
      { item: 'MCV', flag: '', val: '82.5', unit: 'fL' },
      { item: 'MCH', flag: '', val: '27.8', unit: 'pg' },
      { item: 'MCHC', flag: 'L', val: '31.1', unit: 'g/dL' },
      { item: 'PLT', flag: 'H', val: '450', unit: '10^9/L' },
      { item: 'LYM%', flag: '', val: '28.5', unit: '%' },
      { item: 'MXD%', flag: '', val: '7.2', unit: '%' },
      { item: 'NEUT%', flag: '', val: '64.3', unit: '%' },
      { item: 'LYM#', flag: '', val: '2.05', unit: '10^9/L' },
      { item: 'MXD#', flag: '', val: '0.52', unit: '10^9/L' },
      { item: 'NEUT#', flag: '', val: '4.63', unit: '10^9/L' },
      { item: 'RDW-CV', flag: '', val: '13.8', unit: '%' },
      { item: 'RDW-SD', flag: '', val: '42.1', unit: 'fL' },
      { item: 'MPV', flag: '', val: '9.8', unit: 'fL' },
      { item: 'PDW', flag: '', val: '15.4', unit: '%' },
      { item: 'PCT', flag: '', val: '0.32', unit: '%' },
    ];

    let y = 310;
    ctx.font = '16px monospace';
    sampleRows.forEach((r) => {
      // ITEM (pad 10)
      const colItem = r.item.padEnd(10, ' ');
      // FLAG (pad 4)
      const colFlag = (r.flag || ' ').padEnd(4, ' ');
      // VALUE (pad 8)
      const colVal = r.val.padStart(6, ' ');
      // UNIT
      const colUnit = '   ' + r.unit;

      ctx.fillText(`${colItem}${colFlag}${colVal}${colUnit}`, 40, y);
      y += 34;
    });

    ctx.fillText('------------------------------------------------', 40, y);
    y += 25;
    ctx.font = '14px monospace';
    ctx.fillText('* STATUS: ANALYZER CONTROL VERIFIED OK *', 40, y);
    y += 30;
    ctx.fillText('================================================', 40, y);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSourceImage(dataUrl);

    canvas.toBlob((b) => {
      if (b) setSourceFile(b);
    }, 'image/jpeg');

    setErrorMessage(null);
    setSaveSuccess(null);
    setItems([]);
  }, [selectedDate, user.name]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file foto struk berupa format JPG atau PNG.');
      return;
    }

    setSourceFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSourceImage(ev.target?.result as string);
      setErrorMessage(null);
      setSaveSuccess(null);
      setItems([]);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR
  const handleStartOCR = async () => {
    if (!sourceImage) {
      setErrorMessage('Pilih atau ambil foto struk terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressState({ status: 'Memulai preprocessing citra...', progress: 0.05 });

    try {
      const result = await executeDiruiOcr(
        sourceImage,
        cropRegion,
        (progress) => setProgressState(progress)
      );

      setPreprocessedPreview(result.preprocessedDataUrl);
      setRawOcrText(result.rawText);

      if (result.items.length === 0) {
        setErrorMessage('Tidak ada baris Item-Hasil-Unit yang terdeteksi dengan format yang valid. Coba sesuaikan area crop atau pastikan foto struk cukup terang dan tegak.');
      } else {
        setItems(result.items);
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setErrorMessage(`Terjadi kesalahan OCR: ${err.message || 'Gagal memproses struk.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Inline table edits
  const handleUpdateItem = (id: string, field: keyof DiruiParsedItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNewItem = () => {
    const newItem: DiruiParsedItem = {
      id: `dirui-custom-${Date.now()}`,
      item: 'NEW_ITEM',
      hasil: 0.0,
      flag: null,
      unit: '%',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Save to Supabase table qc_hematologi and storage bucket struk-qc
  const handleSaveToQC = async () => {
    if (items.length === 0) {
      setErrorMessage('Tidak ada item data hasil untuk disimpan.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Save to qc_hematologi table & upload photo to struk-qc bucket
      const result = await StorageService.saveQCHematologiBatch(
        items.map((i) => ({
          item: i.item,
          hasil: Number(i.hasil),
          flag: i.flag,
          unit: i.unit,
          tanggal: selectedDate,
        })),
        sourceFile || (sourceImage ? await (await fetch(sourceImage)).blob() : undefined),
        selectedDate
      );

      // 2. Synchronize to General QC Results if requested and parameter match exists
      if (syncToGeneralQC) {
        const diruiInstrument = instruments.find((inst) => inst.id === 'inst-dirui-3980');
        const diruiInstrumentName = diruiInstrument?.name || 'Dirui Dimih 3980 Automated Analyzer';

        items.forEach((item) => {
          // Find matching parameter on Dirui Dimih 3980
          const matchParam = parameters.find(
            (p) =>
              p.instrumentId === 'inst-dirui-3980' &&
              (p.code.toUpperCase() === item.item.toUpperCase() ||
                p.name.toUpperCase().includes(item.item.toUpperCase()))
          );

          if (matchParam) {
            const zScore = matchParam.targetSD > 0 ? (item.hasil - matchParam.targetMean) / matchParam.targetSD : 0;
            const status: 'pass' | 'warning' | 'reject' =
              Math.abs(zScore) >= 3 ? 'reject' : Math.abs(zScore) >= 2 ? 'warning' : 'pass';

            StorageService.saveQCResult({
              id: `QC-DIRUI-${Date.now()}-${item.item}-${Math.random().toString(36).substring(7)}`,
              date: selectedDate,
              time: new Date().toTimeString().split(' ')[0].substring(0, 5),
              timestamp: Date.now(),
              operatorId: user.id,
              operatorName: user.name,
              instrumentId: 'inst-dirui-3980',
              instrumentName: diruiInstrumentName,
              parameterId: matchParam.id,
              parameterName: matchParam.name,
              parameterCode: matchParam.code,
              controlLevel: 'Level 1',
              lotNumber: 'LOT-EC8C-9912',
              value: item.hasil,
              unit: item.unit || matchParam.unit,
              mean: matchParam.targetMean,
              sd: matchParam.targetSD,
              zScore: Number(zScore.toFixed(2)),
              sdPosition: `${zScore >= 0 ? '+' : ''}${zScore.toFixed(1)} SD`,
              status,
              violations: [],
              notes: `Diimpor otomatis dari Struk Hematologi Dirui Dimih 3980 (Flag: ${item.flag || 'Normal'})`,
              reviewStatus: 'pending',
              source: 'AI_VISION',
              verificationStatus: 'VERIFIED',
            });
          }
        });
      }

      setSaveSuccess({
        message: 'Hasil QC Hematologi Dirui Dimih 3980 berhasil disimpan ke Supabase dan diarsipkan!',
        count: items.length,
        fotoUrl: result.fotoUrl,
      });

      reloadHistory();
    } catch (err: any) {
      console.error('Error saving to QC:', err);
      setErrorMessage(`Gagal menyimpan ke Supabase: ${err.message || 'Terjadi kesalahan jaringan.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const countL = items.filter((i) => i.flag === 'L').length;
  const countH = items.filter((i) => i.flag === 'H').length;
  const countNormal = items.filter((i) => !i.flag).length;

  return (
    <div className="space-y-6 antialiased">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Scan className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
                Scan Struk Hematologi Dirui Dimih 3980 (OCR)
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                Pengenalan Optik Karakter Tesseract.js v5 dengan Preprocessing Canvas Otomatis (Grayscale, Contrast 1.8, Threshold 180).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scan' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scan className="h-3.5 w-3.5" />
              <span>Pemindai OCR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                reloadHistory();
              }}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Arsip Struk ({historyRecords.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {saveSuccess && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 sm:p-5 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  Tersimpan di Supabase
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  Tabel: qc_hematologi & Bucket: struk-qc
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-950 mt-0.5">
                {saveSuccess.message} ({saveSuccess.count} parameter)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-center">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Lihat Grafik QC</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveSuccess(null)}
              className="p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm font-medium">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'scan' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: UPLOAD, CAMERA, PREVIEW & PREPROCESSING CANVAS */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Upload & Camera Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Foto Struk Dirui Dimih 3980
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleDiruiReceipt}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  <span>Coba Contoh Struk</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-5 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="mt-3 text-xs font-bold text-slate-800">
                  Klik untuk Memilih File atau Tarik Foto Struk ke Sini
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Format JPG / PNG dari thermal printer Dirui Dimih 3980
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Buka Kamera Ponsel</span>
                  </button>
                </div>
              </div>

              {/* Date selection */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Tanggal Pemeriksaan:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 bg-white"
                />
              </div>

              {/* Image Preview & Preprocessing Info */}
              {sourceImage && (
                <div className="space-y-3 pt-2">
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group">
                    <img
                      src={sourceImage}
                      alt="Source Struk"
                      className="w-full max-h-72 object-contain mx-auto"
                    />

                    {/* Auto-Crop Overlay Indicator */}
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-none transition-all"
                      style={{
                        left: `${cropRegion.x}%`,
                        top: `${cropRegion.y}%`,
                        width: `${cropRegion.width}%`,
                        height: `${cropRegion.height}%`,
                      }}
                    >
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-800/90 text-white font-mono text-[9px] font-bold">
                        Area Auto-Crop Tabel (Item-Hasil-Unit)
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      {preprocessedPreview && (
                        <button
                          type="button"
                          onClick={() => setShowPreprocessedModal(true)}
                          className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 backdrop-blur-xs shadow-xs cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Hasil Preprocessing Canvas</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preprocessing Settings Ribbon */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-blue-600" />
                        Konfigurasi Preprocessing WAJIB:
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                        Threshold 180 · Contrast 1.8
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Sistem mengonversi citra ke Grayscale, menaikkan kontras 1.8, melakukan binarisasi threshold 180, dan melakukan auto-crop tepat pada area tabel pengujian sebelum dipindai oleh Tesseract.js v5 (PSM 6).
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setCustomCropEnabled(!customCropEnabled)}
                        className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{customCropEnabled ? 'Gunakan Auto-Crop Bawaan' : 'Sesuaikan Area Crop'}</span>
                      </button>

                      {customCropEnabled && (
                        <button
                          type="button"
                          onClick={() => setCropRegion(DEFAULT_DIRUI_TABLE_CROP)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    {customCropEnabled && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Crop Atas (Y%): {cropRegion.y}%</label>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={cropRegion.y}
                            onChange={(e) => setCropRegion({ ...cropRegion, y: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Tinggi Area (H%): {cropRegion.height}%</label>
                          <input
                            type="range"
                            min="30"
                            max="95"
                            value={cropRegion.height}
                            onChange={(e) => setCropRegion({ ...cropRegion, height: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OCR ACTION BUTTON */}
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleStartOCR}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{progressState.status || 'Memproses OCR Tesseract.js...'}</span>
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4" />
                        <span>Mulai Ekstraksi OCR Struk</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: EDITABLE TABLE OF EXTRACTED ITEMS (Requirement 4) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Tabel Koreksi Hasil OCR
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {items.length} Parameter
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ATLM dapat memeriksa dan mengoreksi nilai serta flag L/H sebelum disimpan ke database QC.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>

              {/* Summary Badges */}
              {items.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Item</span>
                    <div className="text-lg font-mono font-extrabold text-slate-900">{items.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase">Flag Low (L)</span>
                    <div className="text-lg font-mono font-extrabold text-blue-700">{countL}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Flag High (H)</span>
                    <div className="text-lg font-mono font-extrabold text-rose-700">{countH}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Normal</span>
                    <div className="text-lg font-mono font-extrabold text-emerald-700">{countNormal}</div>
                  </div>
                </div>
              )}

              {/* Editable Table */}
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 space-y-2">
                  <Scan className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    Belum ada hasil ekstraksi OCR
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Pilih foto struk di panel kiri atau klik &ldquo;Coba Contoh Struk&rdquo;, lalu tekan tombol &ldquo;Mulai Ekstraksi OCR Struk&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Hasil OCR</th>
                        <th className="py-2.5 px-3">Flag</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {items.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Item Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.item}
                              onChange={(e) => handleUpdateItem(row.id, 'item', e.target.value.toUpperCase())}
                              className="font-mono font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-hidden w-24"
                            />
                          </td>

                          {/* Numeric Value */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="any"
                              value={row.hasil}
                              onChange={(e) => handleUpdateItem(row.id, 'hasil', parseFloat(e.target.value) || 0)}
                              className="font-mono font-extrabold text-slate-900 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white px-2 py-1 rounded-md outline-hidden w-28 text-right"
                            />
                          </td>

                          {/* Flag L/H/Normal */}
                          <td className="py-2 px-3">
                            <select
                              value={row.flag || ''}
                              onChange={(e) => handleUpdateItem(row.id, 'flag', e.target.value || null)}
                              className={`font-mono font-bold text-xs px-2 py-1 rounded-md border outline-hidden ${
                                row.flag === 'L'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : row.flag === 'H'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <option value="">Normal (-)</option>
                              <option value="L">Low (L)</option>
                              <option value="H">High (H)</option>
                            </select>
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => handleUpdateItem(row.id, 'unit', e.target.value)}
                              className="font-mono text-slate-600 bg-transparent border-b border-transparent focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-hidden w-20"
                            />
                          </td>

                          {/* Delete Action */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus baris item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Save Controls (Requirement 5) */}
              {items.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="syncGeneral"
                      checked={syncToGeneralQC}
                      onChange={(e) => setSyncToGeneralQC(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="syncGeneral" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Sinkronkan juga ke grafik Levey-Jennings QC instrumen <strong>Dirui Dimih 3980</strong> jika parameter cocok
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="text-[11px] text-slate-500">
                      Disimpan oleh: <strong className="text-slate-800">{user.name}</strong> ({user.role})
                    </div>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveToQC}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Menyimpan ke Supabase & Storage...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Simpan ke QC Hematologi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB: ARSIP STRUK QC HEMATOLOGI */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Arsip Data Struk Hematologi (Tabel: qc_hematologi)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar rekaman pengujian hematologi Dirui Dimih 3980 yang telah dipindai dan disimpan ke Supabase.
              </p>
            </div>
            <button
              type="button"
              onClick={reloadHistory}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              title="Muat Ulang"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {historyRecords.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <FileCheck className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Belum ada riwayat struk tersimpan.</p>
              <p className="text-xs text-slate-400">Gunakan tab Pemindai OCR untuk memindai struk hematologi pertama Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Hasil</th>
                    <th className="py-2.5 px-3">Flag</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Foto Struk</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {historyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-700">{rec.tanggal}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{rec.item}</td>
                      <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900">{rec.hasil}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            rec.flag === 'L'
                              ? 'bg-blue-100 text-blue-800'
                              : rec.flag === 'H'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec.flag ? `Flag ${rec.flag}` : 'Normal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{rec.unit}</td>
                      <td className="py-2.5 px-3">
                        {rec.fotoUrl || rec.foto_url ? (
                          <a
                            href={rec.fotoUrl || rec.foto_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
                          >
                            <span>Lihat Foto</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus catatan ${rec.item} tanggal ${rec.tanggal}?`)) {
                              StorageService.deleteQCHematologi(rec.id);
                              reloadHistory();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus catatan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: PREPROCESSED CANVAS PREVIEW */}
      {showPreprocessedModal && preprocessedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Citra Hasil Preprocessing Canvas (Grayscale, Threshold 180, Contrast 1.8)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Citra binarisasi bertenaga tinggi yang dikirim ke engine Tesseract.js v5 (PSM 6).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreprocessedModal(false)}
                className="p-2 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 rounded-xl p-3 flex items-center justify-center">
              <img
                src={preprocessedPreview}
                alt="Preprocessed Canvas"
                className="max-h-[60vh] object-contain shadow-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-500 font-mono">
                Engine: Tesseract.js v5 · Whitelist: ABCDEFGHIJKLMNOPQRSTUVWXYZ%#-.0123456789
              </div>
              <button
                type="button"
                onClick={() => setShowPreprocessedModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
