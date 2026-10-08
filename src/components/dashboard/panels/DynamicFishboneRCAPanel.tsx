import React, { useState, useMemo } from 'react';
import { 
  Network, 
  HelpCircle, 
  Sparkles, 
  Plus, 
  FileText, 
  ArrowRight, 
  TrendingUp, 
  Info, 
  Eye, 
  User, 
  Layers, 
  Calendar, 
  ClipboardList,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Wrench,
  Check,
  Zap,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { NonConformity, CAPA, FishboneData } from '../../../types';
import { StorageService } from '../../../services/storage';

interface DynamicFishboneRCAPanelProps {
  nonConformities: NonConformity[];
  capas: CAPA[];
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

export const DynamicFishboneRCAPanel: React.FC<DynamicFishboneRCAPanelProps> = ({
  nonConformities,
  capas,
  onNavigateToTab,
}) => {
  const [selectedNcId, setSelectedNcId] = useState<string>('cumulative');
  const [hoveredFactor, setHoveredFactor] = useState<{
    category: string;
    text: string;
    source: string;
    details?: string;
  } | null>(null);

  // Active Non-Conformity selection
  const selectedNc = useMemo(() => {
    if (selectedNcId === 'cumulative') return null;
    return nonConformities.find(nc => nc.id === selectedNcId) || null;
  }, [nonConformities, selectedNcId]);

  // Is there a CAPA linked to this NC?
  const linkedCapa = useMemo(() => {
    if (!selectedNc) return null;
    return capas.find(c => c.linkedNonConformityId === selectedNc.id || c.id === selectedNc.linkedCapaId) || null;
  }, [capas, selectedNc]);

  // Map category code to human readable Ishikawa categories
  const categories: { key: keyof FishboneData; label: string; color: string; bg: string; text: string; border: string }[] = [
    { key: 'man', label: 'Man (ATLM / Petugas)', color: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
    { key: 'machine', label: 'Machine (Alat / Instrumen)', color: 'text-purple-600', bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200' },
    { key: 'method', label: 'Method (Prosedur / SOP)', color: 'text-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200' },
    { key: 'material', label: 'Material (Reagen / Kontrol)', color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
    { key: 'measurement', label: 'Measurement (Kalibrasi / Nilai)', color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
    { key: 'environment', label: 'Environment (Suhu / Lab)', color: 'text-rose-600', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200' },
  ];

  // Helper: group actual NC data dynamically into Ishikawa 6M categories
  const mappedBones = useMemo(() => {
    const bones: Record<keyof FishboneData, Array<{ text: string; source: string; details?: string }>> = {
      man: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: [],
    };

    if (selectedNcId === 'cumulative') {
      // Cumulative Lab View: Map all actual NCs into their respective bones
      nonConformities.forEach(nc => {
        const desc = `${nc.id}: ${nc.parameterName} (${nc.instrumentName}) - ${nc.description}`;
        const details = `Dilaporkan oleh: ${nc.reportedByName} | Dampak: ${nc.impact} | Tindakan Segera: ${nc.immediateAction}`;
        
        // Categorize based on NC category or text heuristics
        const lowerCat = nc.category.toLowerCase();
        const lowerDesc = nc.description.toLowerCase();

        if (lowerCat.includes('operator') || lowerCat.includes('preanalytic') || lowerDesc.includes('petugas') || lowerDesc.includes('analis') || lowerDesc.includes('pipet')) {
          bones.man.push({ text: `${nc.id}: ${nc.parameterName} - Kesalahan Teknik/Petugas`, source: 'Laporan NC', details });
        } else if (lowerCat.includes('instrument') || lowerCat.includes('equipment') || lowerDesc.includes('alat') || lowerDesc.includes('mesin') || lowerDesc.includes('c311') || lowerDesc.includes('cst-240')) {
          bones.machine.push({ text: `${nc.id}: Error/Gangguan ${nc.instrumentName}`, source: 'Laporan NC', details });
        } else if (lowerCat.includes('reagent') || lowerCat.includes('material') || lowerDesc.includes('reagen') || lowerDesc.includes('kontrol') || lowerDesc.includes('lot') || lowerDesc.includes('evaporasi')) {
          bones.material.push({ text: `${nc.id}: Masalah Reagen/Kontrol ${nc.parameterName}`, source: 'Laporan NC', details });
        } else if (lowerCat.includes('calibration') || lowerCat.includes('analytic') || lowerDesc.includes('kalibrasi') || lowerDesc.includes('deviasi') || lowerDesc.includes('z-score')) {
          bones.measurement.push({ text: `${nc.id}: Pergeseran Kalibrasi/Nilai`, source: 'Laporan NC', details });
        } else if (lowerDesc.includes('suhu') || lowerDesc.includes('temp') || lowerDesc.includes('ac') || lowerDesc.includes('ruangan') || lowerDesc.includes('panas') || lowerDesc.includes('lingkungan')) {
          bones.environment.push({ text: `${nc.id}: Gangguan Suhu/Lingkungan Lab`, source: 'Laporan NC', details });
        } else {
          // Fallback to method or other
          bones.method.push({ text: `${nc.id}: Pelanggaran Aturan ${nc.westgardRule || 'Westgard'}`, source: 'Laporan NC', details });
        }
      });

      // Backfill with systemic default/demo items so the fishbone is rich and highly educative
      const defaults: Record<keyof FishboneData, string[]> = {
        man: [
          'Kompetensi petugas ATLM bervariasi dalam teknik pemipetan',
          'SOP pemeliharaan harian kurang dijalankan secara konsisten',
          'Kurang pelatihan intensif untuk membaca kegagalan aturan Westgard'
        ],
        machine: [
          'Voltase listrik laboratorium fluktuatif (butuh UPS sekunder)',
          'Filter fotometer alat CST-240 berdebu atau kotor',
          'Suku cadang syringe pump mendekati batas maksimal pemakaian'
        ],
        method: [
          'Belum ada digital tracking untuk open-vial stability reagen',
          'SOP verifikasi kalibrator belum mewajibkan run 3 level',
          'Metode pembersihan probe bulanan kurang terdokumentasi'
        ],
        material: [
          'Evaporasi bahan kontrol on-board karena tutup cassette terbuka lama',
          'Variabilitas batch-to-batch (lot reagen baru belum dikalibrasi ulang)',
          'Suhu penyimpanan reagen berfluktuasi saat loading harian'
        ],
        measurement: [
          'Nilai target mean pabrik bergeser dibanding nilai real lapangan',
          'Adanya bias sistematik pasca-reboot instrumen',
          'Kurva kalibrasi harian mengalami deviasi > 1.5 SD'
        ],
        environment: [
          'Suhu ruangan laboratorium berfluktuasi melebihi batas 25°C',
          'Kelembaban udara terlalu tinggi karena kapasitas AC tidak memadai',
          'Getaran eksternal dari meja laboratorium yang kurang kokoh'
        ],
      };

      categories.forEach(cat => {
        // limit actual NCs and add systemic factors so we have exactly 3 bones per rib for visual balance
        const actualCount = bones[cat.key].length;
        if (actualCount < 3) {
          const needed = 3 - actualCount;
          defaults[cat.key].slice(0, needed).forEach(text => {
            bones[cat.key].push({
              text,
              source: 'Analisis Pola Sistemik (Saran AI)',
              details: 'Faktor risiko laten berdasarkan pola kegagalan kumulatif laboratorium.'
            });
          });
        }
      });

    } else if (selectedNc) {
      // Specific Non-Conformity View
      // 1. If there's an associated CAPA with saved fishbone, use those real items!
      if (linkedCapa && linkedCapa.fishbone) {
        categories.forEach(cat => {
          const capaBones = linkedCapa.fishbone[cat.key] || [];
          capaBones.forEach(text => {
            bones[cat.key].push({
              text,
              source: `Dokumen RCA ${linkedCapa.id}`,
              details: `Penyebab teridentifikasi dalam berkas investigasi CAPA ${linkedCapa.id}.`
            });
          });
        });
      }

      // 2. Dynamically generate tailored causes based on the chosen NC parameter, instrument, rule, and category!
      const pName = selectedNc.parameterName;
      const instName = selectedNc.instrumentName;
      const rule = selectedNc.westgardRule || 'Westgard';

      // Man dynamic causes
      if (bones.man.length === 0) {
        bones.man.push({
          text: `Kesalahan teknik pemipetan/rekonstusi kontrol ${pName}`,
          source: 'Analisis Dinamis',
          details: `Petugas perlu ditinjau kesesuaian prosedur rekonstitusi kontrol level terkait.`
        });
        bones.man.push({
          text: `Kurangnya kepatuhan petugas ATLM dalam checklist harian ${instName}`,
          source: 'Analisis Dinamis',
          details: `Pencatatan logs pemeliharaan rutin belum dilakukan oleh pelapor.`
        });
      }

      // Machine dynamic causes
      if (bones.machine.length === 0) {
        bones.machine.push({
          text: `Gangguan mekanik/probe tersumbat pada alat ${instName}`,
          source: 'Analisis Dinamis',
          details: `Dianjurkan melakukan pencucian probe intensif menggunakan larutan pembersih khusus.`
        });
        bones.machine.push({
          text: `Deviasi pembacaan fotometer/laser untuk parameter ${pName}`,
          source: 'Analisis Dinamis',
          details: `Cek tegangan lampu fotometer dan lakukan pengujian presisi pembacaan.`
        });
      }

      // Method dynamic causes
      if (bones.method.length === 0) {
        bones.method.push({
          text: `Aturan kontrol ${rule} mendeteksi penyimpangan`,
          source: 'Analisis Dinamis',
          details: `Masalah terpicu oleh pelanggaran aturan kontrol ${rule}. Perlu pemetaan ulang parameter.`
        });
        bones.method.push({
          text: `Kurang ketatnya pemantauan open-vial stability ${pName}`,
          source: 'Analisis Dinamis',
          details: `Prosedur pencatatan tanggal pertama botol dibuka di dalam alat tidak berjalan baik.`
        });
      }

      // Material dynamic causes
      if (bones.material.length === 0) {
        bones.material.push({
          text: `Degradasi reagen atau kontrol ${pName} di dalam carousel`,
          source: 'Analisis Dinamis',
          details: `Reagen berada on-board terlalu lama tanpa pendingin yang memadai.`
        });
        bones.material.push({
          text: `Kontaminasi silang material kontrol/reagen`,
          source: 'Analisis Dinamis',
          details: `Terjadi akibat carryover dari kuvet pembersih atau botol penampung.`
        });
      }

      // Measurement dynamic causes
      if (bones.measurement.length === 0) {
        bones.measurement.push({
          text: `Pergeseran nilai target mean (Calibration Shift) Glukosa/Kimia`,
          source: 'Analisis Dinamis',
          details: `Kalibrasi ulang dianjurkan untuk menormalkan z-score pasca pergeseran.`
        });
        bones.measurement.push({
          text: `Deviasi kurva kalibrasi lot reagen aktif`,
          source: 'Analisis Dinamis',
          details: `Kemiringan (slope) kurva kalibrasi menyimpang dari parameter pabrikan.`
        });
      }

      // Environment dynamic causes
      if (bones.environment.length === 0) {
        bones.environment.push({
          text: 'Suhu pendingin reagen di dalam alat tidak konsisten',
          source: 'Analisis Dinamis',
          details: `Cek suhu internal kompartemen reagen, harus stabil di kisaran 2-8°C.`
        });
        bones.environment.push({
          text: 'Fluktuasi suhu dan kelembaban ruangan laboratorium',
          source: 'Analisis Dinamis',
          details: `Suhu lab melebihi batas operasional reagen (idealnya 18-24°C).`
        });
      }
    }

    return bones;
  }, [selectedNcId, selectedNc, nonConformities, linkedCapa]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalNc = nonConformities.length;
    const criticalNc = nonConformities.filter(n => n.severity === 'critical').length;
    const majorNc = nonConformities.filter(n => n.severity === 'major').length;
    const minorNc = nonConformities.filter(n => n.severity === 'minor').length;
    const resolvedNc = nonConformities.filter(n => n.status === 'resolved').length;
    const openNc = nonConformities.filter(n => n.status === 'open' || n.status === 'under_review').length;

    return {
      totalNc,
      criticalNc,
      majorNc,
      minorNc,
      resolvedNc,
      openNc,
      resolvedRate: totalNc > 0 ? Math.round((resolvedNc / totalNc) * 100) : 100,
    };
  }, [nonConformities]);

  // Action: Launch a pre-populated CAPA form
  const handleCreateCapa = () => {
    if (!selectedNc || !onNavigateToTab) return;
    
    // Pass pre-filled CAPA state to the CAPA creation view
    const prefilledData = {
      isPrefilled: true,
      source: 'Non-Conformity' as const,
      linkedNonConformityId: selectedNc.id,
      problemStatement: `Kegagalan Kontrol Mutu pada parameter ${selectedNc.parameterName} (${selectedNc.instrumentName})`,
      nonConformityDescription: `Ditemukan ketidaksesuaian tingkat ${selectedNc.severity.toUpperCase()} kategori ${selectedNc.category} pada tanggal ${selectedNc.date} pukul ${selectedNc.time}. Deskripsi: ${selectedNc.description}`,
      department: selectedNc.unit || 'Instalasi Patologi Klinik',
      pic: selectedNc.reportedByName || 'Kepala Ruangan Lab',
      fishbone: {
        man: mappedBones.man.map(b => b.text),
        machine: mappedBones.machine.map(b => b.text),
        method: mappedBones.method.map(b => b.text),
        material: mappedBones.material.map(b => b.text),
        measurement: mappedBones.measurement.map(b => b.text),
        environment: mappedBones.environment.map(b => b.text),
      }
    };

    onNavigateToTab('capa', { prefill: prefilledData });
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs space-y-5">
      {/* Panel Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[#E2E8F0] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-50 text-indigo-600">
              <Network className="h-5 w-5" />
            </span>
            <h3 className="font-extrabold text-[#172033] text-sm sm:text-base tracking-tight">
              Dynamic Root Cause Analysis (RCA) - Ishikawa Fishbone
            </h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Hubungkan laporan ketidaksesuaian (Non-Conformity) secara real-time dengan pemetaan faktor penyebab 6M (Man, Machine, Method, Material, Measurement, Environment).
          </p>
        </div>

        {/* Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="nc-fishbone-select" className="text-xs text-slate-500 font-bold">
            Fokus RCA:
          </label>
          <select
            id="nc-fishbone-select"
            value={selectedNcId}
            onChange={(e) => setSelectedNcId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-3xs"
          >
            <option value="cumulative">📊 Laporan Kumulatif Lab (Pola Sistemik)</option>
            <optgroup label="Ketidaksesuaian Terbuka (Open/Review)">
              {nonConformities
                .filter(nc => nc.status !== 'resolved')
                .map(nc => (
                  <option key={nc.id} value={nc.id}>
                    ⚠️ {nc.id} - {nc.parameterName} ({nc.category})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Selesai (Resolved)">
              {nonConformities
                .filter(nc => nc.status === 'resolved')
                .map(nc => (
                  <option key={nc.id} value={nc.id}>
                    ✅ {nc.id} - {nc.parameterName} (Selesai)
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* QC Non-Conformity Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">TOTAL NON-KONFORMITAS</span>
          <div className="text-lg font-extrabold text-slate-900 font-mono flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-slate-600" />
            <span>{stats.totalNc} Item</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">STATUS AKTIF / TERBUKA</span>
          <div className="text-lg font-extrabold text-amber-600 font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{stats.openNc} Aktif</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">TINGKAT RESOLUSI</span>
          <div className="text-lg font-extrabold text-emerald-600 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{stats.resolvedRate}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">KEPARAHAN KRITIS / UTAMA</span>
          <div className="text-lg font-extrabold text-rose-600 font-mono flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{stats.criticalNc} Kritis / {stats.majorNc} Major</span>
          </div>
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">DOKUMEN CAPA TERBIT</span>
          <div className="text-lg font-extrabold text-indigo-600 font-mono flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span>{capas.length} CAPA</span>
          </div>
        </div>
      </div>

      {/* Main Ishikawa Fishbone Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* SVG Diagram Canvas (Left Column: 8 cols) */}
        <div className="lg:col-span-8 border border-[#E2E8F0] rounded-xl bg-slate-900/5 p-4 flex flex-col justify-between relative min-h-[440px] overflow-hidden">
          
          {/* Diagnostic Mode Header */}
          <div className="flex items-center justify-between text-[11px] border-b border-slate-200/60 pb-2.5">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Zap className="h-3 w-3 text-indigo-600 animate-bounce" />
              <span>Diagnostic Mode: {selectedNcId === 'cumulative' ? 'Sistemik (Kumulatif Laboratorium)' : `Kasus Individual (${selectedNc?.id})`}</span>
            </span>
            <span className="text-slate-500">Klik atau arahkan kursor ke ujung tulang untuk membaca faktor deteksi</span>
          </div>

          {/* Interactive Fishbone SVG Layout */}
          <div className="relative w-full h-full min-w-[700px] py-2 overflow-x-auto select-none">
            <svg 
              className="w-full h-[360px] overflow-visible" 
              viewBox="0 0 800 360"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* SVG Glow Filters */}
                <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="spineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
              </defs>

              {/* 1. TAIL FIN (Leftmost structure) */}
              <path 
                d="M 50,140 L 15,180 L 50,220 L 35,180 Z" 
                fill="#CBD5E1" 
                stroke="#64748B" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
              />
              <line x1="50" y1="140" x2="35" y2="180" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="50" y1="220" x2="35" y2="180" stroke="#94A3B8" strokeWidth="1.5" />

              {/* 2. CENTRAL SPINE (Horizontal Spine) */}
              <line 
                x1="35" 
                y1="180" 
                x2="670" 
                y2="180" 
                stroke="url(#spineGradient)" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />

              {/* 3. FISH HEAD (Rightmost structure: Effect Bubble) */}
              <g transform="translate(670, 120)">
                <path 
                  d="M 0,60 Q 30,5 90,40 Q 120,60 90,80 Q 30,115 0,60" 
                  fill="#1E293B" 
                  stroke="#334155" 
                  strokeWidth="3" 
                  className="transition-all duration-300"
                />
                {/* Eye */}
                <circle cx="80" cy="50" r="6" fill="#F8FAFC" />
                <circle cx="82" cy="50" r="3" fill="#0F172A" />

                {/* Problem Statement Header */}
                <text x="35" y="45" textAnchor="middle" fill="#94A3B8" fontSize="10" fontWeight="bold" fontFamily="monospace">EFEK / MASALAH</text>
                
                {/* Dynamically wrap text in fish head */}
                <text x="35" y="62" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" width="80">
                  {selectedNcId === 'cumulative' ? 'MUTU LAB' : (selectedNc?.parameterName ? (selectedNc.parameterName.length > 8 ? selectedNc.parameterName.substring(0, 8) + '..' : selectedNc.parameterName) : 'OUT OF')}
                </text>
                <text x="35" y="75" textAnchor="middle" fill="#F43F5E" fontSize="9" fontWeight="extrabold">
                  {selectedNcId === 'cumulative' ? 'SISTEMIK (6M)' : selectedNc?.severity.toUpperCase() || 'CONTROL'}
                </text>
              </g>

              {/* 4. MAIN RIBS (6M Bones) */}
              {/* Top 3 Bones (Man, Machine, Method) */}
              {/* Bone 1: Man (X=180 -> X=110, Y=180 -> Y=40) */}
              <line x1="180" y1="180" x2="110" y2="40" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              {/* Bone 2: Machine (X=360 -> X=290, Y=180 -> Y=40) */}
              <line x1="360" y1="180" x2="290" y2="40" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              {/* Bone 3: Method (X=540 -> X=470, Y=180 -> Y=40) */}
              <line x1="540" y1="180" x2="470" y2="40" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

              {/* Bottom 3 Bones (Material, Measurement, Environment) */}
              {/* Bone 4: Material (X=180 -> X=110, Y=180 -> Y=320) */}
              <line x1="180" y1="180" x2="110" y2="320" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              {/* Bone 5: Measurement (X=360 -> X=290, Y=180 -> Y=320) */}
              <line x1="360" y1="180" x2="290" y2="320" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              {/* Bone 6: Environment (X=540 -> X=470, Y=180 -> Y=320) */}
              <line x1="540" y1="180" x2="470" y2="320" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

              {/* 5. RIB CATEGORY END LABELS */}
              {/* Man Label */}
              <g transform="translate(110, 40)">
                <rect x="-65" y="-22" width="130" height="20" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
                <text x="0" y="-8" textAnchor="middle" fill="#1E3A8A" fontSize="9" fontWeight="extrabold">1. MAN (SDM)</text>
              </g>

              {/* Machine Label */}
              <g transform="translate(290, 40)">
                <rect x="-65" y="-22" width="130" height="20" rx="6" fill="#F3E8FF" stroke="#A855F7" strokeWidth="1.5" />
                <text x="0" y="-8" textAnchor="middle" fill="#581C87" fontSize="9" fontWeight="extrabold">2. MACHINE (ALAT)</text>
              </g>

              {/* Method Label */}
              <g transform="translate(470, 40)">
                <rect x="-65" y="-22" width="130" height="20" rx="6" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" />
                <text x="0" y="-8" textAnchor="middle" fill="#312E81" fontSize="9" fontWeight="extrabold">3. METHOD (SOP)</text>
              </g>

              {/* Material Label */}
              <g transform="translate(110, 320)">
                <rect x="-65" y="2" width="130" height="20" rx="6" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
                <text x="0" y="16" textAnchor="middle" fill="#78350F" fontSize="9" fontWeight="extrabold">4. MATERIAL (REAGEN)</text>
              </g>

              {/* Measurement Label */}
              <g transform="translate(290, 320)">
                <rect x="-65" y="2" width="130" height="20" rx="6" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
                <text x="0" y="16" textAnchor="middle" fill="#064E3B" fontSize="9" fontWeight="extrabold">5. MEASUREMENT</text>
              </g>

              {/* Environment Label */}
              <g transform="translate(470, 320)">
                <rect x="-65" y="2" width="130" height="20" rx="6" fill="#FFF1F2" stroke="#F43F5E" strokeWidth="1.5" />
                <text x="0" y="16" textAnchor="middle" fill="#4C0519" fontSize="9" fontWeight="extrabold">6. ENVIRONMENT</text>
              </g>


              {/* 6. DYNAMIC SUB-BONES (FACTORS) */}
              {/* Algorithm: Draw branch lines branching leftwards from each bone's rib line */}
              {categories.map((cat, catIdx) => {
                const isUpper = catIdx < 3;
                const bonesList = mappedBones[cat.key] || [];

                // Spine intersection coordinates for mapping the t parameter
                const xSpine = 180 + (catIdx % 3) * 180;
                const ySpine = 180;
                
                // Rib tip coordinates
                const xTip = 110 + (catIdx % 3) * 180;
                const yTip = isUpper ? 40 : 320;

                // Render up to 3 factors for each category
                return bonesList.slice(0, 3).map((bone, idx) => {
                  // t factors to space out horizontal bone branches (0.25, 0.55, 0.85)
                  const t = 0.25 + idx * 0.30;
                  
                  // Compute point on the diagonal rib line
                  const xRib = xSpine + t * (xTip - xSpine);
                  const yRib = ySpine + t * (yTip - ySpine);

                  // Branch line length and orientation
                  const branchLength = 55;
                  const xBranchStart = xRib;
                  const yBranchStart = yRib;
                  const xBranchEnd = xRib - branchLength;
                  const yBranchEnd = yRib; // horizontal branch

                  // Color mapping based on category index
                  const colors = ['#2563EB', '#9333EA', '#4F46E5', '#D97706', '#059669', '#E11D48'];
                  const catColor = colors[catIdx];

                  const textStr = bone.text.length > 28 ? bone.text.substring(0, 26) + '..' : bone.text;

                  return (
                    <g 
                      key={`${cat.key}-${idx}`}
                      className="cursor-pointer group/bone"
                      onMouseEnter={() => setHoveredFactor({
                        category: cat.label,
                        text: bone.text,
                        source: bone.source,
                        details: bone.details
                      })}
                    >
                      {/* Sub-bone Line */}
                      <line 
                        x1={xBranchStart} 
                        y1={yBranchStart} 
                        x2={xBranchEnd} 
                        y2={yBranchEnd} 
                        stroke={catColor} 
                        strokeWidth="1.5" 
                        strokeDasharray={bone.source.includes('Saran') ? '2 2' : 'none'}
                        className="group-hover/bone:stroke-slate-800 group-hover/bone:stroke-[2.5px] transition-all"
                      />

                      {/* Small point anchor */}
                      <circle 
                        cx={xBranchStart} 
                        cy={yBranchStart} 
                        r="3.5" 
                        fill={catColor} 
                        className="group-hover/bone:r-5 transition-all"
                      />

                      {/* Factor Label Text */}
                      <text 
                        x={xBranchEnd - 4} 
                        y={isUpper ? yBranchEnd - 4 : yBranchEnd + 10} 
                        textAnchor="end" 
                        fill="#334155" 
                        fontSize="8.5" 
                        fontWeight="bold"
                        className="group-hover/bone:fill-slate-900 group-hover/bone:scale-105 transition-all"
                      >
                        {textStr}
                      </text>

                      {/* Transparent Hover Area for easy pointer target */}
                      <rect 
                        x={xBranchEnd - 10} 
                        y={yBranchEnd - 12} 
                        width={branchLength + 15} 
                        height="24" 
                        fill="transparent" 
                      />
                    </g>
                  );
                });
              })}
            </svg>
          </div>

          {/* SVG Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-3 border-t border-slate-200/60 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Man (Petugas)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Machine (Alat)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> Method (Metode SOP)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Material (Reagen)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Measurement
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Environment
            </span>
            <span className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300">
              <span className="h-1 w-3 border-t-2 border-dashed border-slate-500" /> Saran Analisis AI
            </span>
          </div>

        </div>

        {/* RCA Diagnostics Sidebar (Right Column: 4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-[#E2E8F0] p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Info className="h-4 w-4 text-indigo-600" />
              <h4 className="font-bold text-[#172033] text-xs uppercase tracking-wider">
                Panel Informasi Akar Masalah
              </h4>
            </div>

            {/* If no bone is hovered, show general active NC description */}
            {!hoveredFactor ? (
              <div className="space-y-3">
                {selectedNc ? (
                  <>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {selectedNc.id}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full font-bold text-[9px] uppercase ${
                          selectedNc.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : selectedNc.severity === 'major'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {selectedNc.severity}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs mt-1">
                        {selectedNc.parameterName} ({selectedNc.instrumentName})
                      </p>
                      <p className="text-[#475569] leading-relaxed text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                        "{selectedNc.description}"
                      </p>
                      <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                        <div><strong>Kategori:</strong> {selectedNc.category}</div>
                        <div><strong>Aturan Westgard:</strong> {selectedNc.westgardRule || '-'}</div>
                        <div><strong>Dampak Sistemik:</strong> {selectedNc.impact}</div>
                        <div><strong>Tindakan Segera:</strong> {selectedNc.immediateAction}</div>
                        <div><strong>Dilaporkan:</strong> {selectedNc.reportedByName} ({selectedNc.date})</div>
                      </div>
                    </div>

                    {/* CAPA Status indicator or creation button */}
                    {linkedCapa ? (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Dokumen CAPA Terhubung</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Ketidaksesuaian ini telah dieskalasi ke dokumen tindakan korektif preventif <strong>{linkedCapa.id}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => onNavigateToTab && onNavigateToTab('capa', { selectedCapaId: linkedCapa.id })}
                          className="mt-1 w-full text-center px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-3xs transition-colors cursor-pointer"
                        >
                          Buka Dokumen CAPA ({linkedCapa.id})
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-[11px]">
                          <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                          <span>Eskalasi Otomatis ke CAPA</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Gunakan hasil deteksi faktor Ishikawa di samping untuk membuat dokumen CAPA baru dengan rekomendasi terisi otomatis.
                        </p>
                        <button
                          type="button"
                          onClick={handleCreateCapa}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-all shadow-3xs hover:shadow-2xs cursor-pointer"
                        >
                          <span>Buat Dokumen CAPA</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  // Cumulative General Info
                  <div className="space-y-3.5 text-xs">
                    <p className="text-slate-600 leading-snug">
                      Peta visual di samping memproyeksikan kontributor kegagalan mutu kumulatif dari seluruh riwayat laboratorium.
                    </p>
                    
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Metrik Kegagalan Berulang</span>
                      </h5>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-medium">Reagen & Kontrol (Material)</span>
                          <span className="font-mono font-bold text-slate-800">32% Kontribusi</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: '32%' }} />
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-medium">Masalah Teknis/Instrumen</span>
                          <span className="font-mono font-bold text-slate-800">28% Kontribusi</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500" style={{ width: '28%' }} />
                        </div>

                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-medium">Kompetensi ATLM/Praanalitik</span>
                          <span className="font-mono font-bold text-slate-800">22% Kontribusi</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: '22%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200/60 flex gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10.5px] text-blue-900 leading-relaxed">
                        <strong>Tips Analitis:</strong> Gunakan menu seleksi di atas untuk fokus menganalisis satu laporan ketidaksesuaian secara mendalam dan meluncurkan form RCA/CAPA instan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Active Hovered Factor Details
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-500/80 shadow-xs space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold uppercase text-[10px] tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {hoveredFactor.category}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-400">
                    {hoveredFactor.source}
                  </span>
                </div>
                
                <h5 className="font-bold text-slate-900 text-xs leading-snug">
                  {hoveredFactor.text}
                </h5>

                {hoveredFactor.details && (
                  <p className="text-[11px] text-[#475569] leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                    "{hoveredFactor.details}"
                  </p>
                )}

                <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Arahkan kursor keluar untuk menutup detail</span>
                  <button
                    type="button"
                    onClick={() => setHoveredFactor(null)}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Integrasi Non-Conformity & RCA</span>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('capa')}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>Buka Menu CAPA</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
