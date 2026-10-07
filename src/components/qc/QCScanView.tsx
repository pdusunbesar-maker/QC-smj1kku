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
  Image as ImageIcon
} from 'lucide-react';

interface QCScanViewProps {
  onScanComplete: (results: any[], previewUrl: string | null, documentMeta?: any) => void;
}

// Preset samples for rapid laboratory verification and testing
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
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I'
    }
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
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I'
    }
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
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I'
    }
  }
];

export const QCScanView: React.FC<QCScanViewProps> = ({ onScanComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [documentMeta, setDocumentMeta] = useState<any>(null);

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
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewUrl(dataUrl);
      stopCamera();
    }
  };

  // Helper to compress image client-side to prevent oversized payloads
  const compressImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1400;
        const MAX_HEIGHT = 1400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setErrorMsg(null);
      setFile(selectedFile);
      setDocumentMeta(null);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSelectPreset = async (preset: typeof SAMPLE_PRESETS[0]) => {
    setErrorMsg(null);
    setPreviewUrl(preset.dataUrl);
    setDocumentMeta(preset.documentMeta);
  };

  const scanQC = async () => {
    if (!previewUrl) return;
    setIsScanning(true);
    setErrorMsg(null);
    setScanStep('1. Mengoptimalkan gambar & prapemrosesan...');

    try {
      const compressedDataUrl = await compressImage(previewUrl);
      const base64Data = compressedDataUrl.includes(',') 
        ? compressedDataUrl.split(',')[1] 
        : compressedDataUrl;

      setScanStep('2. AI Vision OCR sedang membaca struk / printout QC...');

      const response = await fetch('/api/qc/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64Data, 
          mimeType: 'image/jpeg' 
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

      if (results.length === 0) {
        setErrorMsg('AI Vision tidak menemukan parameter QC yang jelas pada gambar. Anda tetap dapat memasukkan data secara terverifikasi.');
      }

      // Complete scan and move to verification view
      onScanComplete(results, previewUrl, meta);
    } catch (error: any) {
      console.error('OCR Error:', error);
      setErrorMsg('Gagal memproses gambar QC. Silakan coba lagi atau gunakan foto dengan pencahayaan lebih terang.');
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
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Perhatian</p>
            <p>{errorMsg}</p>
          </div>
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
                  setDocumentMeta(null);
                  setErrorMsg(null);
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
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Metode Pemrosesan:</h3>
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
                    <p className="text-[11px] text-center text-slate-400">
                      Hasil dapat diedit dan diverifikasi sebelum disimpan ke basis data QC harian.
                    </p>
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
