import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Dna, 
  Microscope, 
  CheckCircle2, 
  Sparkles,
  FlaskConical,
  TrendingUp,
  Award
} from 'lucide-react';
import { LaboratoryInfo } from '../../types';

interface MedicalTechVisualProps {
  labInfo: LaboratoryInfo;
  isCompact?: boolean;
}

// 24 ambient medical data particles with distinct positions and delays
const PARTICLES = [
  { top: '12%', left: '15%', size: 3, delay: '0s', duration: '11s', opacity: 0.35 },
  { top: '22%', left: '78%', size: 4, delay: '1.5s', duration: '13s', opacity: 0.25 },
  { top: '35%', left: '28%', size: 2, delay: '3s', duration: '9s', opacity: 0.40 },
  { top: '48%', left: '85%', size: 3, delay: '0.8s', duration: '14s', opacity: 0.30 },
  { top: '62%', left: '12%', size: 2, delay: '2.2s', duration: '10s', opacity: 0.35 },
  { top: '75%', left: '42%', size: 4, delay: '4s', duration: '12s', opacity: 0.20 },
  { top: '18%', left: '45%', size: 3, delay: '1s', duration: '15s', opacity: 0.30 },
  { top: '88%', left: '72%', size: 2, delay: '2.5s', duration: '8s', opacity: 0.40 },
  { top: '29%', left: '92%', size: 3, delay: '3.8s', duration: '12s', opacity: 0.25 },
  { top: '55%', left: '68%', size: 2, delay: '0.5s', duration: '11s', opacity: 0.35 },
  { top: '82%', left: '20%', size: 4, delay: '1.8s', duration: '13s', opacity: 0.20 },
  { top: '42%', left: '08%', size: 3, delay: '2.9s', duration: '10s', opacity: 0.30 },
  { top: '08%', left: '62%', size: 2, delay: '4.2s', duration: '14s', opacity: 0.35 },
  { top: '68%', left: '90%', size: 3, delay: '1.2s', duration: '9s', opacity: 0.25 },
  { top: '92%', left: '38%', size: 2, delay: '3.3s', duration: '12s', opacity: 0.35 },
  { top: '25%', left: '34%', size: 3, delay: '0.2s', duration: '11s', opacity: 0.20 },
];

export const MedicalTechVisual: React.FC<MedicalTechVisualProps> = ({ labInfo }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#071A33] text-white select-none">
      
      {/* ========================================================================= */}
      {/* LAYER 1: BASE GRADIENT (Deep Navy -> Medical Blue -> Teal)               */}
      {/* ========================================================================= */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#071A33] via-[#0B2D52] to-[#0A385C]"
        aria-hidden="true"
      />

      {/* LAYER 2: LARGE RADIAL GLOWS (Cyan, Teal, Deep Blue) */}
      <div 
        className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-[#13A6A6]/20 blur-[100px] pointer-events-none animate-medical-glow"
        aria-hidden="true" 
      />
      <div 
        className="absolute top-1/3 -right-28 w-96 h-96 rounded-full bg-[#0E5A7A]/35 blur-[90px] pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute -bottom-24 left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#22B8CF]/18 blur-[100px] pointer-events-none" 
        aria-hidden="true" 
      />

      {/* LAYER 3: SUBTLE MOVING GRADIENT (Infinite 20s) */}
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#0B5FA5]/10 to-[#13A6A6]/10 animate-moving-gradient pointer-events-none opacity-60"
        aria-hidden="true"
      />

      {/* LAYER 6: LIGHT BEAM SWEEP (Subtle diagonal radial light beam) */}
      <div 
        className="absolute -inset-1/2 bg-[radial-gradient(ellipse_at_center,rgba(34,184,207,0.12)_0%,rgba(14,90,122,0.05)_45%,transparent_70%)] animate-light-beam pointer-events-none"
        aria-hidden="true"
      />

      {/* LAYER 5: MEDICAL PRECISION GRID */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none opacity-70"
        aria-hidden="true"
      />

      {/* LAYER 4: MOLECULAR NETWORK SVG & MEDICAL PARTICLES */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="netLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13A6A6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22B8CF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Molecular Network Connecting Lines */}
        <g stroke="url(#netLineGrad)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="12%" y1="18%" x2="28%" y2="26%" />
          <line x1="28%" y1="26%" x2="46%" y2="19%" />
          <line x1="46%" y1="19%" x2="68%" y2="30%" />
          <line x1="28%" y1="26%" x2="22%" y2="48%" />
          <line x1="22%" y1="48%" x2="38%" y2="62%" />
          <line x1="38%" y1="62%" x2="58%" y2="54%" />
          <line x1="58%" y1="54%" x2="74%" y2="68%" />
          <line x1="68%" y1="30%" x2="84%" y2="40%" />
          <line x1="84%" y1="40%" x2="74%" y2="68%" />
          <line x1="38%" y1="62%" x2="28%" y2="82%" />
          <line x1="58%" y1="54%" x2="64%" y2="80%" />
        </g>

        {/* Molecular Network Nodes with glowing halos */}
        {[
          { cx: '12%', cy: '18%', r: 3.5, pulse: true },
          { cx: '28%', cy: '26%', r: 4.5, pulse: false },
          { cx: '46%', cy: '19%', r: 3, pulse: true },
          { cx: '68%', cy: '30%', r: 4, pulse: false },
          { cx: '22%', cy: '48%', r: 3, pulse: true },
          { cx: '38%', cy: '62%', r: 5, pulse: false },
          { cx: '58%', cy: '54%', r: 4, pulse: true },
          { cx: '74%', cy: '68%', r: 3.5, pulse: false },
          { cx: '84%', cy: '40%', r: 3, pulse: true },
          { cx: '28%', cy: '82%', r: 3.5, pulse: false },
          { cx: '64%', cy: '80%', r: 4, pulse: true },
        ].map((node, i) => (
          <g key={i}>
            <circle 
              cx={node.cx} 
              cy={node.cy} 
              r={node.r * 2} 
              fill="#13A6A6" 
              fillOpacity="0.15" 
              className={node.pulse ? 'animate-molecular-node' : ''}
            />
            <circle 
              cx={node.cx} 
              cy={node.cy} 
              r={node.r} 
              fill="#22B8CF" 
              fillOpacity="0.8" 
              stroke="#E0F2FE" 
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>

      {/* Floating Medical Micro-Particles */}
      {PARTICLES.map((p, idx) => (
        <span
          key={idx}
          className="absolute rounded-full bg-cyan-300 pointer-events-none animate-particle-drift"
          style={{
            top: p.top,
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: p.delay,
            animationDuration: p.duration,
            boxShadow: '0 0 6px rgba(34,184,207,0.8)'
          }}
        />
      ))}

      {/* ========================================================================= */}
      {/* TOP HEADER: INSTITUTION BRANDING & SYSTEM STATUS                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
            <img
              src={labInfo.logoUrl || '/logo_kayong_utara.png'}
              alt="Logo RSUD SMJ I"
              className="max-h-full max-w-full object-contain drop-shadow"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo_kayong_utara.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                RSUD SULTAN MUHAMMAD JAMALUDIN I
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium">
              Laboratorium Patologi Klinik
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[11px] font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>QC Engine: Operational</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTERPIECE: 2.5D MEDICAL TECH COMPOSITION & GLASSMORPHISM CARDS           */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 py-2 my-auto">
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
          
          {/* Circular Orbital HUD Ring */}
          <svg 
            className="absolute inset-0 w-full h-full text-cyan-400/20 animate-spin-extremely-slow pointer-events-none" 
            viewBox="0 0 440 440" 
            fill="none"
            aria-hidden="true"
          >
            <circle cx="220" cy="220" r="200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="220" cy="220" r="160" stroke="currentColor" strokeWidth="1" strokeDasharray="8 12" opacity="0.6" />
            <circle cx="220" cy="220" r="110" stroke="currentColor" strokeWidth="1" opacity="0.35" />
            <path d="M 20 220 H 45 M 395 220 H 420 M 220 20 V 45 M 220 395 V 420" stroke="currentColor" strokeWidth="2" opacity="0.8" />
          </svg>

          {/* FLOATING DECORATIVE MEDICAL OBJECT A: MICROSCOPE (animate-float-a) */}
          <div 
            className="absolute -top-3 left-4 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.14] shadow-lg animate-float-a"
          >
            <Microscope className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-[10px] font-mono font-medium text-cyan-100">Olympus CX23 · Online</span>
          </div>

          {/* FLOATING DECORATIVE MEDICAL OBJECT B: SAMPLE TUBE / FLASK (animate-float-b) */}
          <div 
            className="absolute -bottom-3 right-6 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/[0.14] shadow-lg animate-float-b"
          >
            <FlaskConical className="h-3.5 w-3.5 text-teal-300" />
            <span className="text-[10px] font-mono font-medium text-teal-100">Serum Kontrol Lv 1 & 2</span>
          </div>

          {/* MAIN 2.5D MEDICAL ANALYZER DISPLAY CARD */}
          <div className="relative w-76 h-76 sm:w-84 sm:h-84 rounded-3xl bg-gradient-to-b from-white/12 to-white/[0.04] backdrop-blur-xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col justify-between overflow-hidden animate-float-b">
            
            {/* Top Diagnostics Status */}
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                  <Activity className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-cyan-300 block">Levey-Jennings</span>
                  <span className="font-bold text-white text-xs">Analyzer Ready</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                ±1.2 SD (PASS)
              </span>
            </div>

            {/* Central Animated Vector Tech: Levey-Jennings Curve */}
            <div className="relative my-auto py-2">
              <svg className="w-full h-24 overflow-visible" viewBox="0 0 280 80" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#13A6A6" />
                    <stop offset="50%" stopColor="#22B8CF" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22B8CF" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#22B8CF" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Target Mean & SD Lines */}
                <line x1="0" y1="40" x2="280" y2="40" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                <line x1="0" y1="18" x2="280" y2="18" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
                <line x1="0" y1="62" x2="280" y2="62" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.4" />
                
                {/* QC Control Chart Curve */}
                <path
                  d="M 10 42 L 40 34 L 75 46 L 110 30 L 145 42 L 180 24 L 215 38 L 245 32 L 270 40"
                  stroke="url(#waveGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="filter drop-shadow-[0_2px_8px_rgba(34,184,207,0.5)]"
                />

                {/* Shaded Area Under Curve */}
                <path
                  d="M 10 42 L 40 34 L 75 46 L 110 30 L 145 42 L 180 24 L 215 38 L 245 32 L 270 40 L 270 70 L 10 70 Z"
                  fill="url(#areaGradient)"
                />

                {/* Data Points */}
                {[
                  { cx: 40, cy: 34 },
                  { cx: 75, cy: 46 },
                  { cx: 110, cy: 30 },
                  { cx: 145, cy: 42 },
                  { cx: 180, cy: 24 },
                  { cx: 215, cy: 38 },
                  { cx: 245, cy: 32 }
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.cx} cy={pt.cy} r="5" fill="#082B49" stroke="#22B8CF" strokeWidth="2" />
                    <circle cx={pt.cx} cy={pt.cy} r="2" fill="#E0F2FE" />
                  </g>
                ))}
              </svg>

              <div className="flex items-center justify-between text-[9px] font-mono text-cyan-200/70 pt-1">
                <span>-2SD</span>
                <span className="text-white font-bold">TARGET MEAN (X̄)</span>
                <span>+2SD</span>
              </div>
            </div>

            {/* Bottom 3 Micro-indicators */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center font-mono">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-slate-300 block">WESTGARD</span>
                <span className="text-[11px] font-bold text-emerald-300">1:2s Pass</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-slate-300 block">CV REAGEN</span>
                <span className="text-[11px] font-bold text-cyan-300">2.14%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-slate-300 block">AKURASI</span>
                <span className="text-[11px] font-bold text-white">99.8%</span>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* GLASSMORPHISM DATA CARD 1: QUALITY CONTROL (Sample Data)              */}
          {/* ===================================================================== */}
          <div 
            className="absolute -top-6 -right-6 bg-slate-900/85 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-1 min-w-[150px] animate-float-a pointer-events-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                Quality Control
              </span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                Sample Data
              </span>
            </div>
            <div className="text-lg font-black text-white font-mono tracking-tight leading-none mt-0.5">
              98.7%
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>● Stable & Verified</span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* GLASSMORPHISM DATA CARD 2: LAB RESULTS / ACCURACY (Sample Data)       */}
          {/* ===================================================================== */}
          <div 
            className="absolute -bottom-6 -left-6 bg-slate-900/85 backdrop-blur-md border border-teal-400/30 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-1 min-w-[150px] animate-float-c pointer-events-none"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold tracking-wider text-teal-300 uppercase">
                Lab Results
              </span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                Sample Data
              </span>
            </div>
            <div className="text-lg font-black text-white font-mono tracking-tight leading-none mt-0.5">
              1,248
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>↑ 12.4% Akurasi Bulan Ini</span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* GLASSMORPHISM DATA CARD 3: WESTGARD ACCREDITATION (Sample Data)       */}
          {/* ===================================================================== */}
          <div 
            className="absolute top-1/2 -left-12 -translate-y-1/2 hidden xl:flex flex-col gap-1 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl min-w-[140px] animate-float-d pointer-events-none"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-mono font-bold text-slate-300">ISO 15189</span>
              <Award className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-white">In Control</div>
            <div className="text-[10px] text-emerald-300 font-mono">100% Passed</div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM HERO TEXT: CLEAN HEALTHCARE TYPOGRAPHY                             */}
      {/* ========================================================================= */}
      <div className="relative z-10 px-6 sm:px-10 pb-8 sm:pb-10 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          <span>Enterprise Healthcare Platform</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            L-QCMS
          </h1>
          <p className="text-sm sm:text-base font-semibold text-cyan-200/90 mt-0.5">
            Laboratory Quality Control Management System
          </p>
        </div>

        <p className="text-sm font-medium text-emerald-400 italic">
          "Precision in Every Result."
        </p>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed font-normal">
          Smarter quality control for reliable laboratory results. Sistem terpadu kendali mutu reagen, instrumen, dan validasi pemeriksaan medis.
        </p>

        {/* Institution Info */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            RSUD Sultan Muhammad Jamaludin I
          </span>
          <span>•</span>
          <span>Kabupaten Kayong Utara</span>
        </div>
      </div>
    </div>
  );
};
