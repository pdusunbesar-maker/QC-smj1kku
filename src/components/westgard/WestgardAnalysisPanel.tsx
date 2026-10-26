import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  SlidersHorizontal, 
  Layers, 
  Clock, 
  Calendar, 
  Activity, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  AlertOctagon, 
  Lock, 
  Unlock, 
  Check, 
  RotateCcw,
  Sparkles,
  Info,
  Wrench,
  Search,
  BookOpen
} from 'lucide-react';
import { Parameter, QCResult, WestgardRuleConfig } from '../../types';
import { 
  evaluateDatasetWestgard, 
  formatZScoreDisplay, 
  WestgardEvaluationResult,
  WestgardNumericalProof,
  NonTriggeredRuleDetail,
  UnevaluatedRuleDetail
} from '../../utils/westgardEngine';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

interface WestgardAnalysisPanelProps {
  parameter: Parameter;
  results: QCResult[];
  instrumentName?: string;
  selectedLevel?: string;
  lotNumber?: string;
  startDate?: string;
  endDate?: string;
  activeRules?: WestgardRuleConfig[];
  onCreateCapa?: (result: QCResult) => void;
  onCreateNC?: (result: QCResult) => void;
  onSelectResult?: (result: QCResult) => void;
  onRefreshData?: () => void;
}

export const WestgardAnalysisPanel: React.FC<WestgardAnalysisPanelProps> = ({
  parameter,
  results,
  instrumentName,
  selectedLevel = 'all',
  lotNumber,
  startDate,
  endDate,
  activeRules,
  onCreateCapa,
  onCreateNC,
  onSelectResult,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'triggered' | 'safe' | 'unevaluated' | 'interpretation'>('triggered');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState('');
  const [overrideAuthority, setOverrideAuthority] = useState('SOP-LAB-QC-004 (Pengendalian Mutu Internal)');
  const [overrideActionPlan, setOverrideActionPlan] = useState('Re-run vial kontrol baru dan verifikasi kalibrasi');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideSuccessNotice, setOverrideSuccessNotice] = useState<string | null>(null);

  // Deterministic evaluation using single source of truth engine
  const evalResult: WestgardEvaluationResult = useMemo(() => {
    return evaluateDatasetWestgard(
      results,
      parameter,
      selectedLevel,
      lotNumber,
      {
        activeRules: activeRules || StorageService.getWestgardRules(),
        allowAcrossLevels2_2s: true
      }
    );
  }, [results, parameter, selectedLevel, lotNumber, activeRules]);

  // Filtered QC records in this specific dataset
  const datasetResults = useMemo(() => {
    let list = results.filter(r => r.parameterId === parameter.id && !r.isDeleted && !r.deletedAt);
    if (selectedLevel !== 'all') {
      list = list.filter(r => r.controlLevel === selectedLevel);
    }
    if (lotNumber) {
      list = list.filter(r => r.lotNumber === lotNumber);
    }
    return [...list].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [results, parameter.id, selectedLevel, lotNumber]);

  const latestResult = datasetResults[datasetResults.length - 1];

  const canOverride = user.role === 'admin' || user.role === 'supervisor';

  const handleOpenOverride = () => {
    setOverrideRationale('');
    setOverrideSuccessNotice(null);
    setIsOverrideModalOpen(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestResult || !overrideRationale.trim() || isSubmittingOverride) return;

    setIsSubmittingOverride(true);
    try {
      const updatedResult: QCResult = {
        ...latestResult,
        reviewStatus: 'accepted',
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: new Date().toISOString(),
        reviewComment: `[SUPERVISOR OVERRIDE SESUAI SOP] Otoritas: ${overrideAuthority}. Alasan: ${overrideRationale.trim()}. Rencana Tindakan: ${overrideActionPlan.trim()}`,
      };

      await StorageService.saveQCResult(updatedResult);

      await StorageService.logAudit(
        'SUPERVISOR_OVERRIDE_QC',
        `Supervisor Override pada QC ${parameter.code} (${latestResult.controlLevel}, nilai ${latestResult.value} ${latestResult.unit}, Z-Score: ${latestResult.sdPosition}) dari REJECT menjadi ACCEPTED dengan persetujuan SOP oleh ${user.name} (${user.role}). Alasan: ${overrideRationale.trim()}`,
        {
          previousStatus: latestResult.status,
          newStatus: 'accepted',
          violations: latestResult.violations,
          authority: overrideAuthority,
          rationale: overrideRationale.trim(),
          actionPlan: overrideActionPlan.trim()
        }
      );

      setIsOverrideModalOpen(false);
      setOverrideSuccessNotice(`Override berhasil dicatat ke Audit Trail oleh ${user.name}. Status run diverifikasi dengan otorisasi SOP.`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Failed to save supervisor override:', err);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const triggeredCount = evalResult.violations.length;
  const safeCount = evalResult.nonTriggeredRules?.length || 0;
  const unevaluatedCount = evalResult.unevaluatedRules?.length || 0;

  // Status-dependent styling
  const statusConfig = {
    NORMAL: {
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      pillBg: 'bg-emerald-600 text-white',
      borderCol: 'border-emerald-300',
      title: 'STATUS NORMAL (IN-CONTROL)',
      subtitle: 'Seluruh aturan Westgard aktif terpenuhi tanpa pelanggaran. Hasil pemeriksaan pasien pada analitik run ini dapat diloloskan.',
      icon: CheckCircle2,
      bannerBg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    },
    WARNING: {
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-300',
      pillBg: 'bg-amber-600 text-white',
      borderCol: 'border-amber-300',
      title: 'STATUS PERINGATAN (WARNING 1:2s)',
      subtitle: 'Satu hasil QC berada di zona peringatan ±2SD. Lanjutkan evaluasi aturan penolakan. Sampel pasien dapat diproses dengan pengawasan ketat.',
      icon: AlertTriangle,
      bannerBg: 'bg-amber-50 border-amber-200 text-amber-950',
    },
    REJECT: {
      badgeBg: 'bg-rose-50 text-rose-900 border-rose-300',
      pillBg: 'bg-rose-600 text-white',
      borderCol: 'border-rose-400',
      title: 'STATUS REJECT (OUT-OF-CONTROL)',
      subtitle: 'Pelanggaran aturan penolakan Westgard terdeteksi! DILARANG meloloskan hasil pemeriksaan pasien sebelum tindakan korektif dan re-run kontrol divalidasi.',
      icon: AlertOctagon,
      bannerBg: 'bg-rose-50 border-rose-300 text-rose-950',
    },
    INDETERMINATE: {
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      pillBg: 'bg-slate-700 text-white',
      borderCol: 'border-slate-300',
      title: 'STATUS INDETERMINATE',
      subtitle: evalResult.indeterminateReason || 'Data pengukuran belum mencukupi atau konfigurasi target SD tidak valid. Sistem menolak menetapkan status Normal secara prematur.',
      icon: HelpCircle,
      bannerBg: 'bg-slate-50 border-slate-300 text-slate-800',
    },
  }[evalResult.runStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden text-xs print-avoid-break">
      {/* 1. TOP HEADER & METADATA BAR */}
      <div className="bg-slate-900 text-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold font-mono text-[10px] uppercase">
                Mesin Deterministik Westgard
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">
                ISO 15189 SQC Engine
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">
                N = {datasetResults.length} Hasil
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-wide flex items-center gap-2">
              <span>PANEL HASIL ANALISIS OTOMATIS: {parameter.name} [{parameter.code}]</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Instrumen: <strong className="text-white">{instrumentName || parameter.instrumentId}</strong> · Level Kontrol: <strong className="text-white">{selectedLevel}</strong> {lotNumber ? `(Lot: ${lotNumber})` : ''} · Metode: <span className="font-semibold">{parameter.method}</span>
            </p>
          </div>

          {/* Target Parameters & Latest QC Z-Score */}
          <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-lg border border-white/10 flex-wrap">
            <div>
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Target Nilai</span>
              <span className="font-mono font-bold text-white text-xs">
                X̄: {parameter.targetMean} {parameter.unit} (SD: {parameter.targetSD})
              </span>
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Hasil QC Terbaru</span>
              {latestResult ? (
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-white text-xs">
                    {latestResult.value} {parameter.unit}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    Math.abs(latestResult.zScore) > 3 
                      ? 'bg-rose-500 text-white' 
                      : Math.abs(latestResult.zScore) > 2 
                      ? 'bg-amber-400 text-slate-900' 
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {latestResult.sdPosition}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 font-mono">-</span>
              )}
            </div>
            <div className="border-l border-white/20 pl-3">
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Status Run</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[11px] ${statusConfig.pillBg}`}>
                <StatusIcon className="h-3 w-3" />
                <span>{evalResult.runStatus}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PATIENT SAMPLE POLICY & SOP CLINICAL RECOMMENDATION BANNER */}
      <div className={`p-3.5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${statusConfig.bannerBg}`}>
        <div className="flex items-start gap-2.5">
          <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
              <span>{statusConfig.title}</span>
              {evalResult.runStatus === 'REJECT' && (
                <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] tracking-wider animate-pulse">
                  HASIL PASIEN DITAHAN
                </span>
              )}
            </h4>
            <p className="text-[11px] leading-relaxed max-w-3xl">
              {statusConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Action Buttons for Escalation & Supervisor Override */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
          {evalResult.runStatus === 'REJECT' && (
            <>
              {canOverride && (
                <button
                  type="button"
                  onClick={handleOpenOverride}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Supervisor Override sesuai SOP dengan pencatatan audit trail"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Supervisor Override SOP</span>
                </button>
              )}
              {onCreateCapa && latestResult && (
                <button
                  type="button"
                  onClick={() => onCreateCapa(latestResult)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>+ Terbitkan CAPA</span>
                </button>
              )}
              {onCreateNC && latestResult && (
                <button
                  type="button"
                  onClick={() => onCreateNC(latestResult)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  <span>+ Lapor NC</span>
                </button>
              )}
            </>
          )}

          {evalResult.runStatus === 'WARNING' && onCreateNC && latestResult && (
            <button
              type="button"
              onClick={() => onCreateNC(latestResult)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Lapor Peringatan NC</span>
            </button>
          )}
        </div>
      </div>

      {overrideSuccessNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{overrideSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setOverrideSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* 3. THREE-WAY RULES EXPLORER (TABS) */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('triggered')}
            className={`px-3.5 py-2 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'triggered'
                ? 'border-rose-600 text-rose-900 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span>Aturan Terpicu</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              triggeredCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {triggeredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('safe')}
            className={`px-3.5 py-2 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'safe'
                ? 'border-emerald-600 text-emerald-900 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Aturan Terpenuhi / Aman</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {safeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unevaluated')}
            className={`px-3.5 py-2 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'unevaluated'
                ? 'border-slate-600 text-slate-900 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            <span>Belum Dapat Dievaluasi</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
              {unevaluatedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interpretation')}
            className={`px-3.5 py-2 font-bold text-xs border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'interpretation'
                ? 'border-indigo-600 text-indigo-900 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            <span>Interpretasi Klinis Terstruktur</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENT AREAS */}
      <div className="p-4 space-y-4">
        {/* TAB 1: TRIGGERED RULES */}
        {activeTab === 'triggered' && (
          <div className="space-y-3">
            {evalResult.violations.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-emerald-50/50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h5 className="font-bold text-sm">Tidak Ada Pelanggaran Aturan Westgard</h5>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Seluruh {evalResult.activeRulesEvaluated.length} aturan Westgard yang aktif telah dievaluasi dan tidak ada satupun yang melanggar batas kritis. Run analitik memenuhi kriteria kontrol mutu.
                </p>
              </div>
            ) : (
              evalResult.violations.map((violation, vIdx) => {
                const proof = evalResult.numericalProofs.find(p => p.ruleKey === violation.rule);
                const isReject = violation.type === 'reject';

                return (
                  <div
                    key={vIdx}
                    className={`rounded-xl border p-4 space-y-3 ${
                      isReject ? 'bg-rose-50/40 border-rose-300' : 'bg-amber-50/40 border-amber-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                          isReject ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {violation.type.toUpperCase()}
                        </span>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                          {violation.ruleName}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        Terdeteksi pada: {violation.detectedAt ? new Date(violation.detectedAt).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>

                    {/* Deskripsi & Ringkasan Pelanggaran */}
                    <p className="text-slate-800 font-semibold leading-relaxed">
                      {violation.description}
                    </p>

                    {/* BUKTI NUMERIK (NUMERICAL PROOF) */}
                    {proof && (
                      <div className="rounded-lg bg-white border border-slate-200 p-3 space-y-2 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-slate-700 font-sans border-b border-slate-100 pb-1">
                          <span className="font-bold text-[10px] uppercase text-slate-500 flex items-center gap-1">
                            <Activity className="h-3 w-3 text-slate-600" />
                            Bukti Numerik Deterministik (Auditable Evidence)
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {proof.isWithinRun ? 'Evaluasi Dalam 1 Run' : 'Evaluasi Deret Waktu'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Rumus Syarat Pelanggaran:</span>
                            <span className="font-bold text-slate-900">{proof.conditionFormula}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ambang Batas Evaluasi:</span>
                            <span className="font-bold text-slate-900">{proof.evaluatedThreshold}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px]">Observasi Aktual Pengukuran:</span>
                          <span className={`font-bold ${isReject ? 'text-rose-700' : 'text-amber-800'}`}>
                            {proof.actualObservation}
                          </span>
                        </div>

                        {/* Snapshot Titik yang Terlibat */}
                        {proof.pointsInvolved && proof.pointsInvolved.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <span className="text-slate-500 font-sans font-bold text-[10px] block mb-1">
                              Titik Data yang Terlibat ({proof.pointsInvolved.length} titik):
                            </span>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[10px] border border-slate-200">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="p-1 border">ID Run</th>
                                    <th className="p-1 border">Tanggal / Waktu</th>
                                    <th className="p-1 border">Level</th>
                                    <th className="p-1 border text-right">Nilai Terukur</th>
                                    <th className="p-1 border text-center">Mean (X̄)</th>
                                    <th className="p-1 border text-center">Target SD</th>
                                    <th className="p-1 border text-center font-bold">Skor-Z (SDI)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {proof.pointsInvolved.map((pt, pIdx) => (
                                    <tr key={pIdx} className="hover:bg-slate-50">
                                      <td className="p-1 border font-bold text-slate-900">{pt.id}</td>
                                      <td className="p-1 border text-slate-600">{pt.dateTime}</td>
                                      <td className="p-1 border">{pt.controlLevel}</td>
                                      <td className="p-1 border text-right font-bold text-slate-900">
                                        {pt.measuredValue} {parameter.unit}
                                      </td>
                                      <td className="p-1 border text-center">{pt.targetMean}</td>
                                      <td className="p-1 border text-center">{pt.targetSD}</td>
                                      <td className={`p-1 border text-center font-bold ${
                                        Math.abs(pt.unroundedZScore) > 2 ? 'text-rose-600' : 'text-slate-900'
                                      }`}>
                                        {pt.formattedZScore} ({pt.unroundedZScore.toFixed(4)})
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Panduan Klinis & Investigasi SOP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-sans">
                      {violation.probableCauses && violation.probableCauses.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-900 block flex items-center gap-1">
                            <Search className="h-3 w-3 text-slate-600" />
                            Kemungkinan Akar Masalah (Root Causes):
                          </span>
                          <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                            {violation.probableCauses.map((c, cIdx) => (
                              <li key={cIdx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {violation.correctiveActions && violation.correctiveActions.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-bold text-emerald-950 block flex items-center gap-1">
                            <Wrench className="h-3 w-3 text-emerald-700" />
                            Rekomendasi Tindakan Korektif SOP:
                          </span>
                          <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                            {violation.correctiveActions.map((a, aIdx) => (
                              <li key={aIdx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: NON-TRIGGERED RULES (AMAN) */}
        {activeTab === 'safe' && (
          <div className="space-y-2">
            <p className="text-slate-600 text-[11px] mb-2">
              Daftar aturan aktif yang telah dievaluasi dan dinyatakan aman berdasarkan data pengukuran numerik:
            </p>
            {evalResult.nonTriggeredRules && evalResult.nonTriggeredRules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {evalResult.nonTriggeredRules.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        {r.ruleName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        Aman
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600">
                      <span>Syarat Aman: </span>
                      <strong className="text-slate-800">{r.proofFormula}</strong>
                    </div>
                    <p className="text-[11px] text-slate-700 font-sans">
                      {r.safeObservation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">Tidak ada aturan non-triggered.</p>
            )}
          </div>
        )}

        {/* TAB 3: UNEVALUATED RULES */}
        {activeTab === 'unevaluated' && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-700" />
                Ketentuan Integritas Data Evaluasi:
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Sistem tidak mengasumsikan aturan normal apabila jumlah titik data belum mencukupi batas minimum SOP. Evaluasi aturan multi-run hanya dapat diproses setelah akumulasi data memenuhi syarat.
              </p>
            </div>

            {evalResult.unevaluatedRules && evalResult.unevaluatedRules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {evalResult.unevaluatedRules.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {r.ruleName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700 uppercase">
                        Menunggu Data
                      </span>
                    </div>
                    <div className="text-[10px] space-y-0.5 text-slate-600">
                      <div>Syarat Minimal: <strong className="text-slate-800">{r.requiredCondition}</strong></div>
                      <div>Kondisi Saat Ini: <strong className="text-slate-800">{r.currentCondition}</strong></div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-sans italic">
                      {r.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">Seluruh aturan aktif telah memiliki data yang mencukupi untuk evaluasi.</p>
            )}
          </div>
        )}

        {/* TAB 4: STRUCTURED CLINICAL INTERPRETATION */}
        {activeTab === 'interpretation' && (
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-3 font-sans">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs border-b border-indigo-100 pb-2">
              <BookOpen className="h-4 w-4 text-indigo-700" />
              <span>Ringkasan Intepretasi SQC Deterministik (Sesuai Westgard & ISO 15189)</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
              <p>
                1. <strong>Identitas Pengujian:</strong> Evaluasi terhadap parameter <strong>{parameter.name} ({parameter.code})</strong> pada instrumen <strong>{instrumentName || parameter.instrumentId}</strong> mencakup <strong>{datasetResults.length} titik pemeriksaan</strong> pada periode <strong>{startDate || '-'} s/d {endDate || '-'}</strong>.
              </p>
              <p>
                2. <strong>Status Kontrol Analitik:</strong> Mesin kalkulasi menghasilkan status akhir <strong className={`font-mono px-1.5 py-0.2 rounded ${statusConfig.badgeBg}`}>{evalResult.runStatus}</strong>. Hasil pengukuran QC terbaru adalah <strong>{latestResult ? latestResult.value : '-'} {parameter.unit}</strong> dengan Z-Score murni <strong>{evalResult.formattedZScore}</strong> terhadap Target Mean {parameter.targetMean} {parameter.unit}.
              </p>
              <p>
                3. <strong>Analisis Pelanggaran:</strong> Terdeteksi <strong>{triggeredCount} aturan Westgard yang terpicu</strong> ({evalResult.violations.map(v => v.ruleName).join(', ') || 'Nihil'}). {triggeredCount > 0 ? 'Terdapat indikasi deviasi analitik yang membutuhkan tindakan penanganan sebelum pengujian spesimen pasien dilanjutkan.' : 'Tidak terdapat penyimpangan signifikan pada batch pemeriksaan ini.'}
              </p>
              <p>
                4. <strong>Kebijakan Pengeluaran Hasil Pasien:</strong> {evalResult.runStatus === 'REJECT' ? 'HASIL PASIEN DITAHAN. Sesuai SOP Pengendalian Mutu, spesimen klinis pasien yang dikerjakan pada run ini dilarang dirilis sebelum re-run kontrol baru divalidasi dan tindakan korektif diverifikasi.' : evalResult.runStatus === 'WARNING' ? 'HASIL PASIEN DAPAT DIPERIKSA DENGAN PENGAWASAN (Screening Warning 1:2s aktif). Lakukan verifikasi visual reagen dan kalibrator.' : 'RUN DITERIMA. Hasil pemeriksaan pasien dapat divalidasi dan dikeluarkan secara sah.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL SUPERVISOR OVERRIDE DENGAN AUDIT TRAIL */}
      {isOverrideModalOpen && latestResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                <h4 className="font-bold text-sm">Supervisor Override SOP (Pelepasan Terkendali)</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="p-4 space-y-3.5 text-xs">
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-rose-700" />
                  Perhatian: Tindakan Ini Akan Dicatat Permanen di Audit Trail
                </span>
                <p className="text-[11px] text-slate-700">
                  Melakukan override terhadap status REJECT memerlukan otorisasi Penanggung Jawab Mutu atau Dokter Sp.PK sesuai klausul akreditasi laboratorium (ISO 15189).
                </p>
              </div>

              <div className="space-y-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>Parameter: <strong>{parameter.name} ({parameter.code})</strong></div>
                <div>Level / Lot: <strong>{latestResult.controlLevel} ({latestResult.lotNumber})</strong></div>
                <div>Hasil Terukur: <strong>{latestResult.value} {parameter.unit} (Z-Score: {latestResult.sdPosition})</strong></div>
                <div>Aturan Terlanggar: <strong className="text-rose-700">{latestResult.violations?.map(v => v.ruleName).join(', ') || 'Reject'}</strong></div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Dasar Kewenangan SOP:
                </label>
                <input
                  type="text"
                  required
                  value={overrideAuthority}
                  onChange={(e) => setOverrideAuthority(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-slate-900 font-mono"
                  placeholder="Contoh: SOP-LAB-QC-004 Revisi 02"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Justifikasi Klinis & Alasan Tertulis (Wajib Diisi):
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideRationale}
                  onChange={(e) => setOverrideRationale(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-slate-900"
                  placeholder="Jelaskan alasan mengapa hasil dapat diterima (misal: telah dikonfirmasi dengan vial kontrol kedua dalam rentang normal, tidak ada kelainan pada sampel pasien korelasi, dll.)"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Rencana Tindakan Korektif & Verifikasi:
                </label>
                <input
                  type="text"
                  required
                  value={overrideActionPlan}
                  onChange={(e) => setOverrideActionPlan(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-slate-900"
                  placeholder="Langkah investigasi yang dijalankan"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !overrideRationale.trim()}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs shadow-xs"
                >
                  {isSubmittingOverride ? 'Menyimpan Otorisasi...' : 'Simpan Override ke Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
