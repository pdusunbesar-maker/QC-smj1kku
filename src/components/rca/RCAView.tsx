import React, { useState } from 'react';
import { 
  Network, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FishboneData, FiveWhyData, CAPA } from '../../types';
import { StorageService } from '../../services/storage';

interface RCAViewProps {
  capas: CAPA[];
  onCapaUpdated: (updated: CAPA) => void;
  selectedCapaId?: string;
}

export const RCAView: React.FC<RCAViewProps> = ({
  capas,
  onCapaUpdated,
  selectedCapaId,
}) => {
  const [activeCapaId, setActiveCapaId] = useState<string>(
    selectedCapaId || capas[0]?.id || ''
  );

  const activeCapa = capas.find(c => c.id === activeCapaId) || capas[0];

  // Local RCA state for active CAPA
  const [fishbone, setFishbone] = useState<FishboneData>(
    activeCapa?.fishbone || {
      man: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: [],
    }
  );

  const [fiveWhy, setFiveWhy] = useState<FiveWhyData>(
    activeCapa?.fiveWhy || {
      why1: '',
      why2: '',
      why3: '',
      why4: '',
      why5: '',
      rootCauseConclusion: '',
    }
  );

  const [newCauseText, setNewCauseText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof FishboneData>('man');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync when active CAPA changes
  const handleSelectCapa = (id: string) => {
    setActiveCapaId(id);
    const target = capas.find(c => c.id === id);
    if (target) {
      setFishbone(target.fishbone || {
        man: [],
        machine: [],
        method: [],
        material: [],
        measurement: [],
        environment: [],
      });
      setFiveWhy(target.fiveWhy || {
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        rootCauseConclusion: '',
      });
    }
    setSavedSuccess(false);
  };

  const handleAddCause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCauseText.trim()) return;

    setFishbone(prev => ({
      ...prev,
      [selectedCategory]: [...prev[selectedCategory], newCauseText.trim()],
    }));
    setNewCauseText('');
  };

  const handleRemoveCause = (category: keyof FishboneData, index: number) => {
    setFishbone(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const handleSaveRCA = () => {
    if (!activeCapa) return;

    const updated: CAPA = {
      ...activeCapa,
      fishbone,
      fiveWhy,
      identifiedRootCause: fiveWhy.rootCauseConclusion || activeCapa.identifiedRootCause,
    };

    StorageService.saveCAPA(updated);
    StorageService.logAudit(
      'UPDATE_CAPA',
      `Memperbarui analisis akar masalah (RCA Fishbone & 5-Why) untuk ${activeCapa.id}`
    );
    onCapaUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const categories: { key: keyof FishboneData; label: string; color: string }[] = [
    { key: 'man', label: 'Man (SDM / Petugas)', color: 'border-blue-400 bg-blue-50/70 text-blue-900' },
    { key: 'machine', label: 'Machine (Instrumen / Alat)', color: 'border-purple-400 bg-purple-50/70 text-purple-900' },
    { key: 'method', label: 'Method (Metode / SOP)', color: 'border-teal-400 bg-teal-50/70 text-teal-900' },
    { key: 'material', label: 'Material (Reagen / Kontrol)', color: 'border-amber-400 bg-amber-50/70 text-amber-900' },
    { key: 'measurement', label: 'Measurement (Kalibrasi / Nilai)', color: 'border-emerald-400 bg-emerald-50/70 text-emerald-900' },
    { key: 'environment', label: 'Environment (Suhu / Lingkungan)', color: 'border-rose-400 bg-rose-50/70 text-rose-900' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Root Cause Analysis (RCA) - Diagram Ishikawa & 5 Why
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Investigasi terstruktur penyebab utama kegagalan kontrol mutu (Fishbone 6M & Metode 5-Why).
          </p>
        </div>

        {/* CAPA Selector */}
        {capas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Dokumen CAPA:</span>
            <select
              value={activeCapaId}
              onChange={(e) => handleSelectCapa(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold bg-white text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {capas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.problemStatement.substring(0, 35)}...
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeCapa ? (
        <div className="space-y-6">
          {/* Active Problem Header Banner */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-indigo-900">{activeCapa.id}</span>
              <span className="text-slate-500">PIC: {activeCapa.pic}</span>
            </div>
            <p className="font-bold text-slate-900 text-sm mt-1">{activeCapa.problemStatement}</p>
            <p className="text-slate-600 mt-0.5">{activeCapa.nonConformityDescription}</p>
          </div>

          {/* Section 1: Fishbone (Ishikawa) 6M Interactive Diagram */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Diagram Tulang Ikan (Fishbone 6M)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Penyebab Teridentifikasi: {Object.values(fishbone).reduce((a, b) => a + b.length, 0)} faktor
              </span>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddCause} className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white font-medium sm:w-56"
              >
                {categories.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={newCauseText}
                onChange={(e) => setNewCauseText(e.target.value)}
                placeholder="Tuliskan dugaan penyebab (contoh: Probe belum dibersihkan mingguan)..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Tulang</span>
              </button>
            </form>

            {/* 6M Category Bones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {categories.map(cat => {
                const items = fishbone[cat.key];
                return (
                  <div
                    key={cat.key}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between ${cat.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-black/10">
                        <span className="font-bold text-xs">{cat.label}</span>
                        <span className="text-[10px] font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded">
                          {items.length}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5 min-h-[70px]">
                        {items.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Belum ada penyebab dicatat.</p>
                        ) : (
                          items.map((item, idx) => (
                            <div
                              key={idx}
                              className="group flex items-start justify-between gap-1 bg-white/80 p-1.5 rounded-md border border-black/5 text-xs"
                            >
                              <span className="leading-snug">{item}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCause(cat.key, idx)}
                                className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: 5 Why RCA Method */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Metode 5-Why (Analisis 5 Tingkat Mengapa)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Penyelidikan Mendalam
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { key: 'why1', label: 'Why 1 (Mengapa masalah ini terjadi?)', placeholder: 'Mengapa kontrol glukosa tinggi...' },
                { key: 'why2', label: 'Why 2 (Mengapa kondisi di Why 1 terjadi?)', placeholder: 'Karena reagen mengalami evaporasi...' },
                { key: 'why3', label: 'Why 3 (Mengapa kondisi di Why 2 terjadi?)', placeholder: 'Karena tutup botol cassette on-board terbuka lebih 25 hari...' },
                { key: 'why4', label: 'Why 4 (Mengapa kondisi di Why 3 terjadi?)', placeholder: 'Karena tidak ada alarm otomatis batas masa buka reagen...' },
                { key: 'why5', label: 'Why 5 (Akar masalah mendasar)', placeholder: 'SOP reagen belum mewajibkan digital tracking open-vial stability...' },
              ].map((w, idx) => (
                <div key={w.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="w-48 font-semibold text-slate-700 font-mono text-[11px]">
                    {w.label}
                  </span>
                  <input
                    type="text"
                    value={(fiveWhy as any)[w.key]}
                    onChange={(e) => setFiveWhy({ ...fiveWhy, [w.key]: e.target.value })}
                    placeholder={w.placeholder}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-800 mb-1">
                  Kesimpulan Akar Masalah (Root Cause Conclusion)
                </label>
                <textarea
                  value={fiveWhy.rootCauseConclusion}
                  onChange={(e) => setFiveWhy({ ...fiveWhy, rootCauseConclusion: e.target.value })}
                  rows={2}
                  placeholder="Rumuskan akar masalah definitif berdasarkan hasil 5-Why dan Fishbone di atas..."
                  className="w-full rounded-lg border-2 border-emerald-200 p-2.5 text-xs font-medium focus:border-emerald-500 focus:outline-none bg-emerald-50/20"
                />
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Analisis RCA berhasil disimpan!</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveRCA}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Hasil RCA ke CAPA</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          Belum ada data CAPA yang dipilih untuk dilakukan analisis RCA.
        </div>
      )}
    </div>
  );
};
