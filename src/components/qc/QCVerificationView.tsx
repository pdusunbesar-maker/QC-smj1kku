import React, { useState } from 'react';
import { Save, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';
import { Parameter, Instrument, QCLevel } from '../../types';

interface QCVerificationViewProps {
  extractedData: any[]; // Matches the structure from server response
  previewUrl: string | null;
  parameters: Parameter[];
  instruments: Instrument[];
  onSave: (results: any[]) => void;
}

export const QCVerificationView: React.FC<QCVerificationViewProps> = ({ 
  extractedData, 
  previewUrl, 
  parameters, 
  instruments, 
  onSave 
}) => {
  const [data, setData] = useState(extractedData);

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.9) return { label: 'High', color: 'text-emerald-700 bg-emerald-50' };
    if (confidence >= 0.7) return { label: 'Review', color: 'text-amber-700 bg-amber-50' };
    return { label: 'Low', color: 'text-rose-700 bg-rose-50' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Left: Photo Preview */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Foto Hasil QC</h2>
        <div className="border rounded-xl p-2 bg-slate-100 sticky top-4">
          {previewUrl && <img src={previewUrl} alt="QC Result" className="w-full rounded-lg" />}
        </div>
      </div>

      {/* Right: Data Verification */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Verifikasi Data AI</h2>
          <button 
            onClick={() => onSave(data)} 
            className="flex items-center gap-2 bg-[#0B5FA5] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#084B83]"
          >
            <Save className="h-4 w-4" /> Simpan & Validasi
          </button>
        </div>

        <div className="space-y-4">
          {data.map((item, i) => {
            const conf = getConfidenceLevel(item.overall_confidence || 0);
            return (
              <div key={i} className="border rounded-xl p-4 space-y-3 bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">{item.parameter?.value || 'Parameter tidak terbaca'}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${conf.color}`}>
                    {Math.round((item.overall_confidence || 0) * 100)}% - {conf.label}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500">Analyzer</label>
                    <div className="font-semibold">{item.analyzer || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-slate-500">Lot</label>
                    <div className="font-semibold">{item.lot?.value || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-slate-500">Result</label>
                    <div className="font-mono font-bold text-lg">{item.result?.value} {item.unit?.value}</div>
                  </div>
                  <div>
                    <label className="text-slate-500">Status</label>
                    {item.needs_verification ? (
                      <div className="text-amber-600 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="h-3 w-3" /> Perlu Review
                      </div>
                    ) : (
                      <div className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle className="h-3 w-3" /> OK
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
