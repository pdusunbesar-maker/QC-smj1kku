import React, { useState, useRef } from 'react';
import { Camera, Upload, Scan, Loader2, ArrowRight, X } from 'lucide-react';
import { QCResult } from '../../types';

interface QCScanViewProps {
  onScanComplete: (results: any[], previewUrl: string | null) => void;
}

export const QCScanView: React.FC<QCScanViewProps> = ({ onScanComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const scanQC = async () => {
    if (!file) return;
    setIsScanning(true);
    
    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      try {
        const response = await fetch('/api/qc/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
        });
        const data = await response.json();
        onScanComplete(data.results || [], previewUrl);
      } catch (error) {
        console.error('OCR Error', error);
      } finally {
        setIsScanning(false);
      }
    };
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Scan Hasil QC</h1>
        <p className="text-sm text-slate-500">Unggah foto atau gunakan kamera untuk ekstraksi data QC otomatis.</p>
      </div>

      {!previewUrl ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center flex flex-col items-center gap-4">
            <Upload className="h-10 w-10 text-slate-400" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0B5FA5] text-white px-6 py-2 rounded-lg font-bold"
            >
              Upload Foto QC
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-full max-w-lg mx-auto">
            <img src={previewUrl} alt="Preview" className="rounded-xl w-full" />
            <button 
              onClick={() => { setPreviewUrl(null); setFile(null); }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={scanQC}
              disabled={isScanning}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="animate-spin" /> : <Scan />}
              {isScanning ? 'Menganalisis...' : 'Baca Hasil QC'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
