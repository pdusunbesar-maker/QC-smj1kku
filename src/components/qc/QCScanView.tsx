import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Scan, 
  Loader2, 
  ArrowRight, 
  X, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Eye,
  Zap,
  Image as ImageIcon,
  Edit,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Instrument } from '../../types';

interface QCScanViewProps {
  onScanComplete: (results: any[], previewUrl: string | null, documentMeta?: any) => void;
}

// Preset samples with clean, reliable inline base64/SVG or high-reliability data
const SAMPLE_PRESETS = [
  {
    id: 'sample-cst240',
    title: 'Chemistry Analyzer CST-240',
    description: 'Glucose, Cholesterol, Ureum, Creatinine (Dirui CS-T240 Kimia Klinik)',
    badge: 'CST-240 / Dirui',
    instrumentId: 'inst-cst240',
    color: 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400/30',
    dataUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
      instrument_id: 'inst-cst240',
      control_level: 'Level 1',
      lot_number: 'LOT-CST1-2026A',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Glucose (Glukosa Darah CST-240)', original_text: 'GLU', confidence: 0.99 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 104.2, original_text: 'Conc: 104.2', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 100.0, confidence: 0.96 },
        sd: { value: 3.5, confidence: 0.96 },
        source_text: 'GLU Conc: 104.2 Target: 100.0 SD: 3.50',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Cholesterol Total (CST-240)', original_text: 'CHOL', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 161.5, original_text: 'Conc: 161.5', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 160.0, confidence: 0.96 },
        sd: { value: 5.2, confidence: 0.96 },
        source_text: 'CHOL Conc: 161.5 Target: 160.0 SD: 5.20',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Urea / Ureum (CST-240)', original_text: 'UREA', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 37.6, original_text: 'Conc: 37.6', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 38.0, confidence: 0.95 },
        sd: { value: 1.6, confidence: 0.95 },
        source_text: 'UREA Conc: 37.6 Target: 38.0 SD: 1.60',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Creatinine (CST-240)', original_text: 'CREA', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 1.23, original_text: 'Conc: 1.23', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 1.25, confidence: 0.95 },
        sd: { value: 0.06, confidence: 0.95 },
        source_text: 'CREA Conc: 1.23 Target: 1.25 SD: 0.06',
        overall_confidence: 0.97,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-dimih3980',
    title: 'Dirui Dimih 3980 Analyzer',
    description: 'Hemoglobin, Leukosit (WBC), Trombosit (PLT) (Khusus Dimih 3980)',
    badge: 'Dirui Dimih 3980',
    instrumentId: 'inst-dirui-3980',
    color: 'border-purple-500 bg-purple-50/60 text-purple-900',
    dataUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Dirui Dimih 3980 Automated Analyzer',
      instrument_id: 'inst-dirui-3980',
      control_level: 'Level 1',
      lot_number: 'LOT-EC8C-9912',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Hemoglobin (Dirui Dimih 3980)', original_text: 'HGB', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 13.5, original_text: '13.5', confidence: 0.99 },
        unit: { value: 'g/dL', confidence: 0.98 },
        mean: { value: 13.6, confidence: 0.95 },
        sd: { value: 0.4, confidence: 0.95 },
        source_text: 'HGB 13.5 g/dL',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Leukosit / WBC (Dirui Dimih 3980)', original_text: 'WBC', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 7.2, original_text: '7.2', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 7.0, confidence: 0.95 },
        sd: { value: 0.5, confidence: 0.95 },
        source_text: 'WBC 7.2 10^3/uL',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Trombosit / PLT (Dirui Dimih 3980)', original_text: 'PLT', confidence: 0.96 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 245, original_text: '245', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 250, confidence: 0.95 },
        sd: { value: 15, confidence: 0.95 },
        source_text: 'PLT 245 10^3/uL',
        overall_confidence: 0.96,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-cobas',
    title: 'Cobas c311 Auto-Chemistry',
    description: 'Glukosa, Kolesterol, Ureum, Kreatinin (Roche Diagnostics)',
    badge: 'Cobas c311',
    instrumentId: 'inst-chem-a',
    color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800',
    dataUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Chemistry Analyzer A (Cobas c311)',
      instrument_id: 'inst-chem-a',
      control_level: 'Level 1',
      lot_number: 'LOT-CCM1-2026A',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Glucose (Glukosa Darah Cobas c311)', original_text: 'GLUC', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 101.5, original_text: '101.5', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 100.0, confidence: 0.95 },
        sd: { value: 3.5, confidence: 0.95 },
        source_text: 'GLUC 101.5 mg/dL',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Cholesterol Total (Cobas c311)', original_text: 'CHOL', confidence: 0.95 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 162.0, original_text: '162.0', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 160.0, confidence: 0.95 },
        sd: { value: 5.2, confidence: 0.95 },
        source_text: 'CHOL 162.0 mg/dL',
        overall_confidence: 0.95,
        needs_verification: false
      }
    ]
  }
];

export const QCScanView: React.FC<QCScanViewProps> = ({ onScanComplete }) => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('inst-cst240');
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [documentMeta, setDocumentMeta] = useState<any>(null);
  const [activePresetResults, setActivePresetResults] = useState<any[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const instList = StorageService.getInstruments();
    setInstruments(instList);
  }, []);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error, fallback to file input:', err);
      setIsCameraActive(false);
      // Fallback: trigger file input with capture
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreviewUrl(dataUrl);
        setRawBase64(dataUrl.split(',')[1]);
        setFile(null);
        setActivePresetResults(null);
        stopCamera();
      }
    } catch (err) {
      console.error('Capture error:', err);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setErrorMsg(null);
      setFile(selectedFile);
      setDocumentMeta(null);
      setActivePresetResults(null);

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        setPreviewUrl(resultStr);
        if (resultStr.includes(',')) {
          setRawBase64(resultStr.split(',')[1]);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setErrorMsg(null);
    setPreviewUrl(preset.dataUrl);
    setDocumentMeta(preset.documentMeta);
    setActivePresetResults(preset.presetResults);
    setSelectedInstrumentId(preset.instrumentId);
    setRawBase64(null);
    setFile(null);
  };

  const getTargetInstrument = () => {
    if (selectedInstrumentId === 'auto') return null;
    return instruments.find(i => i.id === selectedInstrumentId) || null;
  };

  const handleManualFallback = () => {
    const targetInst = getTargetInstrument();
    onScanComplete(activePresetResults || [], previewUrl, documentMeta || {
      analyzer: targetInst?.name || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
      instrument_id: targetInst?.id || 'inst-cst240',
      control_level: 'Level 1',
      lot_number: 'LOT-CST1-2026A'
    });
  };

  const scanQC = async () => {
    if (!previewUrl) return;
    setIsScanning(true);
    setErrorMsg(null);
    setScanStep('1. Mempersiapkan gambar struk QC...');

    const targetInst = getTargetInstrument();
    const instHintName = targetInst ? targetInst.name : (selectedInstrumentId === 'auto' ? undefined : selectedInstrumentId);

    try {
      // If user selected a preset directly, use high precision preset data
      if (activePresetResults && activePresetResults.length > 0) {
        setScanStep('2. AI Vision sedang membaca data laboratorium...');
        await new Promise(r => setTimeout(r, 500));
        setScanStep('3. Mengisolasi parameter sesuai alat...');
        await new Promise(r => setTimeout(r, 300));
        onScanComplete(activePresetResults, previewUrl, {
          ...(documentMeta || {}),
          analyzer: targetInst?.name || documentMeta?.analyzer || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
          instrument_id: targetInst?.id || documentMeta?.instrument_id || 'inst-cst240'
        });
        setIsScanning(false);
        return;
      }

      setScanStep(`2. AI Vision OCR sedang membaca struk ${instHintName ? `[Alat: ${instHintName}]` : ''}...`);

      let base64ToSend = rawBase64;
      if (!base64ToSend && previewUrl.startsWith('data:')) {
        base64ToSend = previewUrl.split(',')[1];
      }

      if (!base64ToSend && previewUrl.startsWith('http')) {
        try {
          const imgResp = await fetch(previewUrl);
          const blob = await imgResp.blob();
          base64ToSend = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve((r.result as string).split(',')[1]);
            r.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Could not fetch external image as base64, using fallback text');
        }
      }

      const response = await fetch('/api/qc/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64ToSend || 'FALLBACK_IMG_DATA', 
          mimeType: file?.type || 'image/jpeg',
          instrumentHint: instHintName
        })
      });

      setScanStep('3. Memvalidasi & memfilter parameter sesuai alat...');

      const data = await response.json();
      const results = data.results || [];
      const meta = {
        ...(documentMeta || {}),
        ...(data.document || {}),
        analyzer: targetInst?.name || data.document?.analyzer || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
        instrument_id: targetInst?.id || data.document?.instrument_id || 'inst-cst240',
        scanId: data.scan?.scan_id || `SCAN-${Date.now().toString().slice(-6)}`,
        timestamp: data.scan?.timestamp || new Date().toISOString()
      };

      // Complete scan and move to verification view
      onScanComplete(results, previewUrl, meta);
    } catch (error: any) {
      console.error('OCR Error:', error);
      setErrorMsg('Gagal terhubung ke AI Vision. Mengarahkan langsung ke form verifikasi.');
      handleManualFallback();
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const selectedInstObj = instruments.find(i => i.id === selectedInstrumentId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0B5FA5] to-[#084B83] text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI Vision & OCR Engine v2.6 — Strict Instrument Isolation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Scan Hasil QC dari Foto / Struk</h1>
            <p className="text-blue-100 text-sm">
              Ekstraksi hasil QC akurat (Result vs Target Mean vs Target SD). Parameter diisolasi khusus untuk alat yang dipilih.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <ShieldCheck className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Anti Campur-Aduk Parameter Alat Lain</span>
          </div>
        </div>
      </div>

      {/* Instrument Selection Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Target Alat / Instrumen Pemeriksaan:
              </label>
              <div className="text-sm font-semibold text-slate-800">
                {selectedInstObj ? selectedInstObj.name : 'Auto-Detect dari Foto / Printout'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="auto">🔍 Auto-Detect dari Foto (Semua Alat)</option>
              <option value="inst-cst240">🧪 Chemistry Analyzer CST-240 (Dirui CS-T240)</option>
              <option value="inst-dirui-3980">🔬 Dirui Dimih 3980 Automated Analyzer</option>
              <option value="inst-chem-a">🏥 Chemistry Analyzer A (Cobas c311)</option>
              <option value="inst-hema-a">🩸 Hematology Analyzer (Sysmex XN-550)</option>
            </select>
          </div>
        </div>

        {/* Isolation Alert Helper */}
        <div className="mt-3 text-xs bg-blue-50/70 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Proteksi Alat Aktif:</strong> Saat memindai struk alat <strong>{selectedInstObj ? selectedInstObj.name : 'CST-240'}</strong>, sistem secara ketat hanya membaca parameter milik alat tersebut dan mencegah masuknya parameter dari alat lain (seperti Dirui Dimih 3980 atau alat hematologi lainnya).
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Pemberitahuan Sistem</p>
              <p>{errorMsg}</p>
            </div>
          </div>
          {previewUrl && (
            <button
              onClick={handleManualFallback}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" /> Lanjut ke Verifikasi
            </button>
          )}
        </div>
      )}

      {/* Camera Live View Modal / Area */}
      {isCameraActive && (
        <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden text-white shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="h-4 w-4 text-emerald-400" />
              <span>Kamera Aktif — Arahkan ke Struk QC {selectedInstObj ? `(${selectedInstObj.code})` : ''}</span>
            </div>
            <button
              onClick={stopCamera}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative aspect-video max-h-[480px] bg-black rounded-xl overflow-hidden my-3 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            {/* Guide overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="bg-black/60 text-emerald-300 text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                Posisikan struk alat di dalam kotak ini
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => {
                setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
                startCamera();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Putar Kamera
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/40"
            >
              <Camera className="h-5 w-5" /> Ambil Foto Struk
            </button>
          </div>
        </div>
      )}

      {/* Main Upload / Preview Area */}
      {!previewUrl && !isCameraActive ? (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: File Upload */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-white p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[260px]"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="p-4 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Unggah Foto Struk QC</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Klik untuk memilih foto dari komputer atau galeri ponsel (JPG, PNG, WEBP hingga 25MB)
              </p>
              <span className="px-4 py-2 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" /> Pilih File Gambar
              </span>
            </div>

            {/* Box 2: Direct Camera */}
            <div 
              onClick={startCamera}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 bg-white p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[260px]"
            >
              <div className="p-4 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Ambil Foto Langsung (Kamera)</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                Gunakan kamera smartphone atau webcam untuk memotret kertas struk QC langsung di depan alat
              </p>
              <span className="px-4 py-2 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5">
                <Camera className="h-4 w-4" /> Buka Kamera
              </span>
            </div>
          </div>

          {/* Quick Presets Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Preset Sampel Struk QC Laboratorium (Uji Coba Cepat Tanpa Upload):
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-3.5 rounded-xl border bg-white hover:shadow-md transition-all flex flex-col justify-between ${preset.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 border">
                        {preset.badge}
                      </span>
                    </div>
                    <div className="font-bold text-xs mb-1">{preset.title}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{preset.description}</p>
                  </div>
                  <div className="mt-3 text-[11px] font-bold text-blue-700 flex items-center gap-1">
                    <span>Gunakan Sampel Ini</span> <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Preview & Scan Action Card */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Scan className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pratinjau Foto Struk QC</h3>
                <p className="text-xs text-slate-500">
                  Target Alat: <strong>{selectedInstObj ? selectedInstObj.name : 'Auto-Detect CST-240'}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setPreviewUrl(null);
                setFile(null);
                setRawBase64(null);
                setActivePresetResults(null);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Ganti Gambar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Image Preview */}
            <div className="md:col-span-1 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center max-h-[320px] p-2">
              <img 
                src={previewUrl || ''} 
                alt="Pratinjau Struk QC" 
                className="max-h-[300px] w-auto object-contain rounded-lg shadow"
              />
            </div>

            {/* Scan Action Controls */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Siap Membaca Data QC Secara Cerdas</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Sistem AI Vision akan membedakan <strong>Hasil Konsentrasi (Result)</strong>, <strong>Target Mean</strong>, dan <strong>Target SD</strong>, serta mengekstrak <strong>HANYA parameter alat {selectedInstObj ? selectedInstObj.name : 'CST-240'}</strong>.
                </p>
              </div>

              {isScanning ? (
                <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    <div className="text-xs font-semibold">
                      {scanStep || 'Sedang memproses gambar...'}
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={scanQC}
                    className="w-full sm:w-auto flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Baca Hasil QC dengan AI Vision</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleManualFallback}
                    className="w-full sm:w-auto px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Buka Form Verifikasi Langsung</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
