import React, { useState, useMemo } from 'react';
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
  Info
} from 'lucide-react';
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
}

export const QCInputView: React.FC<QCInputViewProps> = ({
  instruments,
  parameters,
  controls,
  existingResults,
  onResultAdded,
  onNavigateToTab,
}) => {
  const { user } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState(instruments[0]?.id || '');
  const [selectedParameterId, setSelectedParameterId] = useState(parameters[0]?.id || '');
  const [selectedLevel, setSelectedLevel] = useState<'Level 1' | 'Level 2' | 'Level 3'>('Level 1');
  const [lotNumber, setLotNumber] = useState('LOT-CCM1-2026A');
  const [inputValue, setInputValue] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
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
    if (!liveAnalysis || !currentParam) return;

    const val = liveAnalysis.value;
    const id = `QC-${Date.now().toString().slice(-6)}`;
    const fullDate = `${date}T${time}:00`;

    const newResult: QCResult = {
      id,
      date,
      time,
      timestamp: new Date(fullDate).getTime(),
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
  };

  const handleResetForm = () => {
    setInputValue('');
    setNotes('');
    setIsSaved(false);
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
                  {availableParameters.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.code}] - Target Mean: {p.targetMean} {p.unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Control Material Level & Lot */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Level Bahan Kontrol *
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Level 1">Level 1 (Normal)</option>
                  <option value="Level 2">Level 2 (Patologis / High)</option>
                  <option value="Level 3">Level 3 (Low / Khusus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Lot Kontrol *
                </label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Contoh: LOT-CCM1-2026A"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Value Entry with Target Guide */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Hasil Pengukuran Alat ({currentParam?.unit}) *
                </span>
                <span className="font-mono text-slate-500">
                  Target: Mean {currentParam?.targetMean} ± SD {currentParam?.targetSD} (Rentang ±2SD: {(currentParam?.targetMean - 2 * currentParam?.targetSD).toFixed(1)} - {(currentParam?.targetMean + 2 * currentParam?.targetSD).toFixed(1)})
                </span>
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

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={!inputValue}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
                  !inputValue
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>Simpan Hasil QC</span>
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
    </div>
  );
};
