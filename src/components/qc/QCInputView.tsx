import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Save, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  Calculator,
  History,
  Info,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { QCBatchUploadPanel } from './QCBatchUploadPanel';
import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { 
  calculateZScore, 
  formatSDPosition, 
  evaluateWestgardRules,
  DEFAULT_WESTGARD_RULES 
} from '../../utils/qcCalculations';

interface QCInputViewProps {
  instruments: Instrument[];
  parameters: Parameter[];
  controls: ControlMaterial[];
  existingResults: QCResult[];
  onResultAdded: (newResult: QCResult) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
  initialData?: any;
}

export const QCInputView: React.FC<QCInputViewProps> = ({
  instruments,
  parameters,
  controls,
  existingResults,
  onResultAdded,
  onNavigateToTab,
  initialData,
}) => {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<'manual' | 'batch'>('manual');

  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  
  // Use initialData for pre-selection
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(initialData?.instrumentId || instruments[0]?.id || '');
  const [selectedParameterId, setSelectedParameterId] = useState(initialData?.parameterId || parameters[0]?.id || '');
  
  // Sync state if initialData changes (or on mount)
  useEffect(() => {
    if (initialData?.parameterId) {
      setSelectedParameterId(initialData.parameterId);
      const param = parameters.find(p => p.id === initialData.parameterId);
      if (param) setSelectedInstrumentId(param.instrumentId);
    }
  }, [initialData, parameters]);

  const [selectedLevel, setSelectedLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 1');
  const [lotNumber, setLotNumber] = useState(controls[0]?.lotNumber || 'LOT-CST1-2026A');
  const [inputValue, setInputValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [lastSavedResult, setLastSavedResult] = useState<QCResult | null>(null);

  // Filter parameters by chosen instrument
  const availableParameters = useMemo(() => {
    return parameters.filter(p => p.instrumentId === selectedInstrumentId);
  }, [parameters, selectedInstrumentId]);

  // Selected parameter object
  const currentParam = useMemo(() => {
    return parameters.find(p => p.id === selectedParameterId) || parameters[0];
  }, [parameters, selectedParameterId]);

  // Selected instrument
  const currentInstrument = useMemo(() => {
    return instruments.find(i => i.id === selectedInstrumentId) || instruments[0];
  }, [instruments, selectedInstrumentId]);

  // Auto-sync Control Lot Number and Level with Master Data when Parameter changes
  useEffect(() => {
    if (!currentParam) return;
    const matchedControl = controls.find(c => c.id === currentParam.controlMaterialId);
    if (matchedControl) {
      setLotNumber(matchedControl.lotNumber);
      setSelectedLevel(matchedControl.level);
    } else if (controls.length > 0) {
      setLotNumber(controls[0].lotNumber);
      setSelectedLevel(controls[0].level);
    }
  }, [selectedParameterId, currentParam, controls]);

  // Active matched control material object from Master Data
  const activeControlMaterial = useMemo(() => {
    return controls.find(c => c.lotNumber === lotNumber) || 
           controls.find(c => c.id === currentParam?.controlMaterialId);
  }, [controls, lotNumber, currentParam]);

  // Live calculation of Z-Score, position, and Westgard preview
  const liveAnalysis = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || !currentParam) {
      return null;
    }

    const mean = currentParam.targetMean;
    const sd = currentParam.targetSD;
    const zScore = calculateZScore(val, mean, sd);
    const sdPosition = formatSDPosition(zScore);

    // Get previous results for this parameter to test Westgard multi-rules
    const history = existingResults.filter(r => r.parameterId === currentParam.id);

    const tempId = `QC-TEMP-${Date.now()}`;
    const westgardRules = StorageService.getWestgardRules();
    const { status, violations } = evaluateWestgardRules(
      { id: tempId, value: val, mean, sd, zScore },
      history,
      westgardRules
    );

    return {
      value: val,
      mean,
      sd,
      zScore,
      sdPosition,
      status,
      violations,
    };
  }, [inputValue, currentParam, existingResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !liveAnalysis || !currentParam) return;

    const val = liveAnalysis.value;
    const fullDate = `${date}T${time}:00`;
    const fullTimestamp = new Date(fullDate).getTime();

    // Anti-double input check: prevent duplicate input of the same parameter, instrument, level, date, time & value
    const isDuplicate = existingResults.some(r => 
      r.parameterId === currentParam.id &&
      r.instrumentId === currentInstrument.id &&
      r.controlLevel === selectedLevel &&
      r.date === date &&
      (r.time === time || Math.abs(r.timestamp - fullTimestamp) < 60000) &&
      Number(r.value) === Number(val)
    );

    if (isDuplicate) {
      setDuplicateWarning(`Peringatan: Hasil QC ${currentParam.code} (${val} ${currentParam.unit}) pada tanggal ${date} (${time}) sudah tersimpan di database. Sistem mencegah input ganda hasil yang sama.`);
      return;
    }

    setIsSubmitting(true);
    setDuplicateWarning(null);

    const id = `QC-${Date.now().toString().slice(-6)}`;

    const newResult: QCResult = {
      id,
      date,
      time,
      timestamp: fullTimestamp,
      operatorId: user.id,
      operatorName: user.name,
      instrumentId: currentInstrument.id,
      instrumentName: currentInstrument.name,
      parameterId: currentParam.id,
      parameterName: currentParam.name,
      parameterCode: currentParam.code,
      controlLevel: selectedLevel,
      lotNumber,
      value: val,
      unit: currentParam.unit,
      mean: currentParam.targetMean,
      sd: currentParam.targetSD,
      zScore: liveAnalysis.zScore,
      sdPosition: liveAnalysis.sdPosition,
      status: liveAnalysis.status,
      violations: liveAnalysis.violations,
      notes: notes.trim() || undefined,
      reviewStatus: liveAnalysis.status === 'pass' ? 'accepted' : 'pending',
    };

    StorageService.saveQCResult(newResult);
    StorageService.logAudit(
      'INPUT_QC',
      `Input QC ${newResult.parameterCode} nilai ${newResult.value} ${newResult.unit} (${newResult.sdPosition}) status: ${newResult.status.toUpperCase()}`,
      newResult
    );

    if (newResult.status !== 'pass') {
      StorageService.addNotification({
        type: newResult.status === 'reject' ? 'danger' : 'warning',
        title: `QC ${newResult.parameterCode} ${newResult.status.toUpperCase()}`,
        message: `Hasil pemeriksaan ${newResult.parameterName} bernilai ${newResult.value} ${newResult.unit} (${newResult.sdPosition}).`,
        linkTab: 'qc-review',
        linkId: newResult.id,
      });
    }

    onResultAdded(newResult);
    setLastSavedResult(newResult);
    setIsSaved(true);

    // Reset input fields immediately to prevent double submissions
    setInputValue('');
    setNotes('');
    setIsSaved(true);

    // Otomatis diarahkan kembali ke Formulir QC Input
    // (Jika ingin tetap di halaman input, tidak perlu pindah ke dashboard)
    setTimeout(() => {
      setIsSaved(false); // Reset saved state for next input
      setIsSubmitting(false);
    }, 2000);
  };

  const handleResetForm = () => {
    setInputValue('');
    setNotes('');
    setIsSaved(false);
    setIsSubmitting(false);
    setDuplicateWarning(null);
    setLastSavedResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            Pencatatan Hasil Kontrol Mutu (QC Entry)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Input hasil harian instrumen patologi klinik dengan verifikasi Z-Score dan deteksi otomatis Westgard Rules secara instan.
          </p>
        </div>
      </div>

      {/* Tab Selector Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl max-w-md font-semibold text-xs print:hidden">
        <button
          type="button"
          onClick={() => setInputMode('manual')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
            inputMode === 'manual'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Input Hasil Manual</span>
        </button>
        <button
          type="button"
          onClick={() => setInputMode('batch')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1.5 ${
            inputMode === 'batch'
              ? 'bg-white text-slate-900 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
          <span>Batch Ingest Data Alat (CSV/Excel)</span>
        </button>
      </div>

      {inputMode === 'manual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Entry Form (7 Columns) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-semibold text-sm text-slate-900">
                Formulir Hasil Pemeriksaan Bahan Kontrol
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Operator: <strong className="text-slate-700">{user.name}</strong>
              </span>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pengujian *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Waktu Running *
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Instrument & Parameter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instrumen Laboratorium *
                </label>
                <select
                  value={selectedInstrumentId}
                  onChange={(e) => {
                    setSelectedInstrumentId(e.target.value);
                    const matched = parameters.find(p => p.instrumentId === e.target.value);
                    if (matched) setSelectedParameterId(matched.id);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none bg-white"
                >
                  {instruments.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parameter Pemeriksaan *
                </label>
                <select
                  value={selectedParameterId}
                  onChange={(e) => setSelectedParameterId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none bg-white font-medium"
                >
                  {availableParameters.map(p => {
                    const lcl = p.minAcceptable !== undefined && p.minAcceptable !== null 
                      ? Number(p.minAcceptable).toFixed(p.decimalPlaces) 
                      : (p.targetMean - 3 * p.targetSD).toFixed(p.decimalPlaces);
                    const ucl = p.maxAcceptable !== undefined && p.maxAcceptable !== null 
                      ? Number(p.maxAcceptable).toFixed(p.decimalPlaces) 
                      : (p.targetMean + 3 * p.targetSD).toFixed(p.decimalPlaces);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.code}] - Mean: {p.targetMean} | Target Range: {lcl} - {ucl} {p.unit}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Control Material Level & Lot */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Level Bahan Kontrol *
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Level 1">Level 1 (Normal)</option>
                    <option value="Level 2">Level 2 (Patologis / High)</option>
                    <option value="Level 3">Level 3 (Low / Khusus)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Pilih Nomor Lot Kontrol (Master Data) *
                    </label>
                    {currentParam?.controlMaterialId && (
                      <button
                        type="button"
                        onClick={() => {
                          const matched = controls.find(c => c.id === currentParam.controlMaterialId);
                          if (matched) {
                            setLotNumber(matched.lotNumber);
                            setSelectedLevel(matched.level);
                          }
                        }}
                        className="text-[10px] text-emerald-700 hover:underline font-semibold"
                        title="Otomatis pilih lot yang terhubung di Master Data Parameter"
                      >
                        Reset Lot Parameter
                      </button>
                    )}
                  </div>
                  <select
                    value={controls.some(c => c.lotNumber === lotNumber) ? lotNumber : 'CUSTOM'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        // Keep current lotNumber string or set empty for manual input
                      } else {
                        const matched = controls.find(c => c.lotNumber === val);
                        if (matched) {
                          setLotNumber(matched.lotNumber);
                          setSelectedLevel(matched.level);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-semibold focus:border-emerald-500 focus:outline-none bg-white"
                  >
                    {controls.map(c => {
                      const isParamDefault = c.id === currentParam?.controlMaterialId;
                      return (
                        <option key={c.id} value={c.lotNumber}>
                          {c.lotNumber} - {c.name} ({c.level}){isParamDefault ? ' ★ [Master Default]' : ''} · Exp: {c.expirationDate}
                        </option>
                      );
                    })}
                    <option value="CUSTOM">+ Lot Baru / Input Manual Lainnya...</option>
                  </select>
                </div>
              </div>

              {/* Secondary custom lot input if user selected CUSTOM */}
              {!controls.some(c => c.lotNumber === lotNumber) && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
                  <label className="block font-semibold text-amber-900">Input Manual No Lot Khusus / Baru:</label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ketikkan Nomor Lot..."
                    required
                    className="w-full rounded-lg border border-amber-300 px-3 py-1.5 font-mono text-xs font-bold bg-white text-slate-900"
                  />
                </div>
              )}

              {/* Synchronization Indicator Badge */}
              {activeControlMaterial && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
                    <span>
                      <strong>Tersinkron Master Data:</strong> {activeControlMaterial.name} ({activeControlMaterial.manufacturer})
                    </span>
                    <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      Lot: {activeControlMaterial.lotNumber} · Exp: {activeControlMaterial.expirationDate}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Value Entry with Target Guide */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
                <span className="font-semibold text-slate-700">
                  Hasil Pengukuran Alat ({currentParam?.unit}) *
                </span>
                {currentParam && (
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-600">
                      Mean: <strong>{currentParam.targetMean}</strong> ± SD: <strong>{currentParam.targetSD}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[#0B5FA5] font-bold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                      Target Range (LCL/UCL): {currentParam.minAcceptable !== undefined && currentParam.minAcceptable !== null
                        ? Number(currentParam.minAcceptable).toFixed(currentParam.decimalPlaces)
                        : (currentParam.targetMean - 3 * currentParam.targetSD).toFixed(currentParam.decimalPlaces)} - {currentParam.maxAcceptable !== undefined && currentParam.maxAcceptable !== null
                        ? Number(currentParam.maxAcceptable).toFixed(currentParam.decimalPlaces)
                        : (currentParam.targetMean + 3 * currentParam.targetSD).toFixed(currentParam.decimalPlaces)} {currentParam.unit}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder={`Masukkan nilai angka (contoh: ${currentParam?.targetMean})`}
                  required
                  className="w-full rounded-lg border-2 border-slate-300 px-4 py-2.5 text-lg font-bold font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
                <span className="absolute right-4 top-3 text-xs font-semibold text-slate-400">
                  {currentParam?.unit}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Tambahan / Catatan Operasional
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan kondisi reagen, pergantian botol, atau verifikasi suhu instrumen..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Duplicate Warning Alert */}
            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2.5 shadow-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-medium leading-relaxed">{duplicateWarning}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={!inputValue || isSubmitting}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-sm transition-all ${
                  !inputValue || isSubmitting
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan & Mengalihkan ke Menu Awal...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Hasil QC</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Real-Time Westgard & Statistical Evaluation HUD (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-sm text-slate-900">
                  Evaluasi Statistik Real-Time
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Otomatis
              </span>
            </div>

            {liveAnalysis ? (
              <div className="space-y-4">
                {/* Status Hero Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  liveAnalysis.status === 'pass'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : liveAnalysis.status === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-3">
                    {liveAnalysis.status === 'pass' && (
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    )}
                    {liveAnalysis.status === 'warning' && (
                      <AlertTriangle className="h-8 w-8 text-amber-600" />
                    )}
                    {liveAnalysis.status === 'reject' && (
                      <XCircle className="h-8 w-8 text-rose-600" />
                    )}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider">
                        Status Quality Control
                      </p>
                      <h3 className="text-lg font-bold capitalize">
                        {liveAnalysis.status === 'pass'
                          ? 'NORMAL (ACCEPT)'
                          : liveAnalysis.status === 'warning'
                          ? 'WARNING (PERINGATAN)'
                          : 'REJECT (OUT OF CONTROL)'}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-xs text-slate-500">Deviasi SD</p>
                    <p className="text-base font-bold">{liveAnalysis.sdPosition}</p>
                  </div>
                </div>

                {/* Math Breakdown Table */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 font-mono">
                    <p className="text-[10px] text-slate-500 uppercase">Nilai Input</p>
                    <p className="text-base font-bold text-slate-900">{liveAnalysis.value} {currentParam.unit}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 font-mono">
                    <p className="text-[10px] text-slate-500 uppercase">Target Mean</p>
                    <p className="text-base font-bold text-slate-900">{liveAnalysis.mean} {currentParam.unit}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 font-mono">
                    <p className="text-[10px] text-slate-500 uppercase">Target SD</p>
                    <p className="text-base font-bold text-slate-900">{liveAnalysis.sd}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 font-mono">
                    <p className="text-[10px] text-slate-500 uppercase">Z-Score Hitung</p>
                    <p className={`text-base font-bold ${Math.abs(liveAnalysis.zScore) > 2 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {liveAnalysis.zScore}
                    </p>
                  </div>
                </div>

                {/* Westgard Violations List */}
                {liveAnalysis.violations.length > 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Pelanggaran Westgard Teridentifikasi:</span>
                    </div>
                    {liveAnalysis.violations.map((v, i) => (
                      <div key={i} className="text-xs text-rose-800 bg-white/70 p-2 rounded-lg border border-rose-100">
                        <p className="font-bold">{v.ruleName} ({v.type.toUpperCase()})</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">{v.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-50/60 border border-emerald-200/60 p-3 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Tidak ada aturan Westgard yang terlanggar. Data kontrol memenuhi kriteria penerimaan.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Calculator className="h-8 w-8 text-slate-300 mx-auto" />
                <p>Masukkan nilai hasil pemeriksaan untuk melihat evaluasi Westgard dan Z-Score secara instan.</p>
              </div>
            )}

            {/* Post-Save Follow-up Actions */}
            {isSaved && lastSavedResult && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Hasil berhasil disimpan ke database! ID: {lastSavedResult.id}</span>
                </div>

                {lastSavedResult.status !== 'pass' && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('non-conformity', { fromQc: lastSavedResult })}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Buat Laporan Ketidaksesuaian (NC)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('capa', { fromQc: lastSavedResult })}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Eskalasi ke CAPA (Corrective Action)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <QCBatchUploadPanel
          instruments={instruments}
          parameters={parameters}
          controls={controls}
          existingResults={existingResults}
          onResultAdded={onResultAdded}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
