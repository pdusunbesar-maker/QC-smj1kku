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
  Edit
} from 'lucide-react';

interface QCScanViewProps {
  onScanComplete: (results: any[], previewUrl: string | null, documentMeta?: any) => void;
}

// Preset samples with clean, reliable inline base64/SVG or high-reliability data
const SAMPLE_PRESETS = [
  {
    id: 'sample-cobas',
    title: 'Cobas c311 (Kimia Klinik)',
    description: 'Glucose, Cholesterol, Ureum, Creatinine (PreciControl Level 1)',
    badge: 'Roche Cobas c311',
    color: 'border-blue-500 bg-blue-50/50 text-blue-800',
    dataUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Chemistry Analyzer A (Cobas c311)',
      control_level: 'Level 1',
      lot_number: 'LOT-CCM1-2026A',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Glucose', original_text: 'GLUC', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 101.5, original_text: '101.5', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 100.0, confidence: 0.95 },
        sd: { value: 3.5, confidence: 0.95 },
        source_text: 'GLUC 101.5 mg/dL',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Cholesterol Total', original_text: 'CHOL', confidence: 0.96 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 162.0, original_text: '162.0', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 160.0, confidence: 0.95 },
        sd: { value: 5.2, confidence: 0.95 },
        source_text: 'CHOL 162.0 mg/dL',
        overall_confidence: 0.96,
        needs_verification: false
      },
      {
        parameter: { value: 'Urea (Ureum)', original_text: 'UREA', confidence: 0.94 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 37.8, original_text: '37.8', confidence: 0.97 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 38.0, confidence: 0.95 },
        sd: { value: 1.6, confidence: 0.95 },
        source_text: 'UREA 37.8 mg/dL',
        overall_confidence: 0.95,
        needs_verification: false
      },
      {
        parameter: { value: 'Creatinine', original_text: 'CREA', confidence: 0.95 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CCM1-2026A', confidence: 0.95 },
        result: { value: 1.24, original_text: '1.24', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 1.25, confidence: 0.95 },
        sd: { value: 0.06, confidence: 0.95 },
        source_text: 'CREA 1.24 mg/dL',
        overall_confidence: 0.95,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-sysmex',
    title: 'Sysmex XN-550 (Hematologi)',
    description: 'Hemoglobin, Leukosit (WBC), Trombosit (PLT) (Eightcheck 3WP)',
    badge: 'Sysmex XN-550',
    color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800',
    dataUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Hematology Analyzer 5-Diff (Sysmex XN-550)',
      control_level: 'Level 1',
      lot_number: 'LOT-EC8C-9912',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Hemoglobin', original_text: 'HGB', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 13.5, original_text: '13.5', confidence: 0.99 },
        unit: { value: 'g/dL', confidence: 0.98 },
        mean: { value: 13.6, confidence: 0.95 },
        sd: { value: 0.4, confidence: 0.95 },
        source_text: 'HGB 13.5 g/dL',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Leukosit (WBC)', original_text: 'WBC', confidence: 0.96 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 7.2, original_text: '7.2', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 7.0, confidence: 0.95 },
        sd: { value: 0.5, confidence: 0.95 },
        source_text: 'WBC 7.2 10^3/uL',
        overall_confidence: 0.96,
        needs_verification: false
      },
      {
        parameter: { value: 'Trombosit (PLT)', original_text: 'PLT', confidence: 0.95 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 245, original_text: '245', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 250, confidence: 0.95 },
        sd: { value: 15, confidence: 0.95 },
        source_text: 'PLT 245 10^3/uL',
        overall_confidence: 0.95,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-level2',
    title: 'PreciControl Multi 2 (Patologis)',
    description: 'Glukosa & Kolesterol Kontrol Level 2 (Nilai Tinggi/Patologis)',
    badge: 'Cobas Level 2',
    color: 'border-amber-500 bg-amber-50/50 text-amber-800',
    dataUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Chemistry Analyzer A (Cobas c311)',
      control_level: 'Level 2',
      lot_number: 'LOT-CCM2-2026B',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Glucose', original_text: 'GLUC', confidence: 0.97 },
        level: { value: 'Level 2', original_text: 'L2', confidence: 0.96 },
        lot: { value: 'LOT-CCM2-2026B', confidence: 0.95 },
        result: { value: 242.0, original_text: '242.0', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 240.0, confidence: 0.95 },
        sd: { value: 7.0, confidence: 0.95 },
        source_text: 'GLUC 242.0 mg/dL',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Cholesterol Total', original_text: 'CHOL', confidence: 0.95 },
        level: { value: 'Level 2', original_text: 'L2', confidence: 0.96 },
        lot: { value: 'LOT-CCM2-2026B', confidence: 0.95 },
        result: { value: 288.0, original_text: '288.0', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 285.0, confidence: 0.95 },
        sd: { value: 9.5, confidence: 0.95 },
        source_text: 'CHOL 288.0 mg/dL',
        overall_confidence: 0.95,
        needs_verification: false
      }
    ]
  }
];

export const QCScanView: React.FC<QCScanViewProps> = ({ onScanComplete }) => {
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
    setRawBase64(null);
    setFile(null);
  };

  const handleManualFallback = () => {
    // Navigate straight to verification with current preview
    onScanComplete(activePresetResults || [], previewUrl, documentMeta || {
      analyzer: 'Chemistry Analyzer A (Cobas c311)',
      control_level: 'Level 1',
      lot_number: 'LOT-CCM1-2026A'
    });
  };

  const scanQC = async () => {
    if (!previewUrl) return;
    setIsScanning(true);
    setErrorMsg(null);
    setScanStep('1. Mempersiapkan gambar struk QC...');

    try {
      // If user selected a preset directly, use high precision preset data
      if (activePresetResults && activePresetResults.length > 0) {
        setScanStep('2. AI Vision sedang membaca data laboratorium...');
        await new Promise(r => setTimeout(r, 600));
        setScanStep('3. Mencocokkan Master Data L-QCMS...');
        await new Promise(r => setTimeout(r, 400));
        onScanComplete(activePresetResults, previewUrl, documentMeta);
        setIsScanning(false);
        return;
      }

      setScanStep('2. AI Vision OCR sedang membaca struk / printout alat...');

      let base64ToSend = rawBase64;
      if (!base64ToSend && previewUrl.startsWith('data:')) {
        base64ToSend = previewUrl.split(',')[1];
      }

      // If still no base64 and it's a URL, fetch blob safely
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
          mimeType: file?.type || 'image/jpeg' 
        })
      });

      setScanStep('3. Mencocokkan data dengan Master Data QC...');

      const data = await response.json();
      const results = data.results || [];
      const meta = {
        ...(documentMeta || {}),
        ...(data.document || {}),
        scanId: data.scan?.scan_id || `SCAN-${Date.now().toString().slice(-6)}`,
        timestamp: data.scan?.timestamp || new Date().toISOString()
      };

      // Complete scan and move to verification view
      onScanComplete(results, previewUrl, meta);
    } catch (error: any) {
      console.error('OCR Error:', error);
      setErrorMsg('Gagal terhubung ke AI Vision. Anda dapat langsung membuka form verifikasi.');
      // Auto fallback to ensure ATLM is never stuck
      handleManualFallback();
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0B5FA5] to-[#084B83] text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI Vision & OCR Engine v2.5</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Scan Hasil QC dari Foto / Struk</h1>
            <p className="text-blue-100 text-sm">
              Ambil foto struk hasil cetak alat atau upload gambar untuk ekstraksi otomatis, verifikasi Z-Score, dan aturan Westgard.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Terkoneksi ke Master Data & Westgard Multirules</span>
          </div>
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
              <span>Kamera Aktif — Arahkan ke Struk QC</span>
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
              className="border-2 border-dashed border-slate-300 hover:border-[#0B5FA5] bg-white hover:bg-blue-50/30 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-sm"
            >
              <div className="h-16 w-16 bg-blue-50 text-[#0B5FA5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Unggah Foto / Gambar Hasil QC</h3>
                <p className="text-xs text-slate-500 mt-1">Format JPG, PNG, WEBP hingga 20MB. Drag & Drop atau klik di sini.</p>
              </div>
              <button
                type="button"
                className="bg-[#0B5FA5] hover:bg-[#084B83] text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm"
              >
                <ImageIcon className="h-4 w-4" /> Pilih File Gambar
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            {/* Box 2: Camera Capture */}
            <div 
              onClick={startCamera}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-white hover:bg-emerald-50/30 transition-all rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-sm"
            >
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Gunakan Kamera Smartphone / Laptop</h3>
                <p className="text-xs text-slate-500 mt-1">Foto langsung dari layar alat analizer atau struk thermal printer lab.</p>
              </div>
              <button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm"
              >
                <Camera className="h-4 w-4" /> Buka Kamera
              </button>
            </div>
          </div>

          {/* Rapid Test Presets for Instant Testing */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 text-sm">Contoh Struk / Foto Sampel QC Siap Uji</h3>
              </div>
              <span className="text-xs text-slate-500">Klik salah satu untuk mencoba scanner secara instan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:border-[#0B5FA5] ${preset.color} flex flex-col justify-between gap-3`}
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border">
                      {preset.badge}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{preset.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{preset.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B5FA5] pt-2 border-t border-slate-200/50">
                    <span>Gunakan Sampel Ini</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Image Preview & Scan Action Screen */
        previewUrl && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Foto Hasil QC Terpilih</h2>
                <p className="text-xs text-slate-500">Pastikan angka hasil dan nama parameter terlihat dengan jelas.</p>
              </div>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setFile(null);
                  setRawBase64(null);
                  setDocumentMeta(null);
                  setErrorMsg(null);
                  setActivePresetResults(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 font-medium border border-slate-200"
              >
                <X className="h-4 w-4" /> Ganti Gambar
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Photo Viewport */}
              <div className="lg:col-span-6 bg-slate-900 rounded-xl overflow-hidden p-2 relative flex items-center justify-center min-h-[320px] max-h-[460px]">
                <img 
                  src={previewUrl} 
                  alt="QC Printout Preview" 
                  className="max-h-[440px] w-auto object-contain rounded-lg shadow" 
                />
              </div>

              {/* Action & Info Panel */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alur Otomatisasi:</h3>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Ekstraksi AI Vision otomatis (Parameter, Nilai, Satuan, Lot).</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Pencocokan presisi dengan <strong>Master Data L-QCMS</strong>.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Penghitungan instan <strong>Z-Score</strong> & <strong>Westgard Rules</strong>.</span>
                    </li>
                  </ul>
                </div>

                {/* Scanning Progress */}
                {isScanning ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center space-y-3">
                    <Loader2 className="h-8 w-8 text-[#0B5FA5] animate-spin mx-auto" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Sedang Memproses Hasil QC...</p>
                      <p className="text-xs text-blue-700 mt-1 font-medium">{scanStep}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={scanQC}
                      className="w-full bg-[#0B5FA5] hover:bg-[#084B83] text-white py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.01]"
                    >
                      <Scan className="h-5 w-5" />
                      <span>Mulai Ekstraksi & Baca Hasil QC</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                    <button
                      type="button"
                      onClick={handleManualFallback}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Buka Form Verifikasi Langsung dengan Foto Ini</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
