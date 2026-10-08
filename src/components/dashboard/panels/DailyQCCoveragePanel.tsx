import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ListTodo, 
  ArrowRight, 
  Camera, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  FileQuestion,
  Search
} from 'lucide-react';
import { QCResult, Parameter, Instrument } from '../../../types';

interface DailyQCCoveragePanelProps {
  qcResults: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const DailyQCCoveragePanel: React.FC<DailyQCCoveragePanelProps> = ({
  qcResults,
  parameters,
  instruments,
  onNavigateToTab,
}) => {
  // Today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute coverage metrics
  const coverageData = useMemo(() => {
    // Total active parameters expected
    const totalExpected = parameters.length;

    // Filter QC results executed today
    const todayResults = qcResults.filter(r => r.date === todayStr);

    // Group today's results by parameter ID
    const testedParamMap = new Map<string, QCResult[]>();
    todayResults.forEach(r => {
      const list = testedParamMap.get(r.parameterId) || [];
      list.push(r);
      testedParamMap.set(r.parameterId, list);
    });

    // Tested parameters list & count
    const testedParameters: Array<{
      parameter: Parameter;
      instrumentName: string;
      latestResult: QCResult;
      runCount: number;
    }> = [];

    // Missed parameters list
    const missedParameters: Array<{
      parameter: Parameter;
      instrumentName: string;
    }> = [];

    parameters.forEach(param => {
      const inst = instruments.find(i => i.id === param.instrumentId);
      const instName = inst ? inst.name : 'Alat Lab';

      const paramRuns = testedParamMap.get(param.id);

      if (paramRuns && paramRuns.length > 0) {
        // Parameter has been tested today
        const latest = paramRuns[paramRuns.length - 1];
        testedParameters.push({
          parameter: param,
          instrumentName: instName,
          latestResult: latest,
          runCount: paramRuns.length,
        });
      } else {
        // Parameter has NOT been tested today
        missedParameters.push({
          parameter: param,
          instrumentName: instName,
        });
      }
    });

    const testedCount = testedParameters.length;
    const missedCount = missedParameters.length;
    const completionPercentage = totalExpected > 0 ? Math.round((testedCount / totalExpected) * 100) : 0;

    return {
      todayStr,
      totalExpected,
      testedCount,
      missedCount,
      completionPercentage,
      testedParameters,
      missedParameters,
      todayTotalRuns: todayResults.length,
    };
  }, [qcResults, parameters, instruments, todayStr]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ListTodo className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Cakupan Pengujian QC Hari Ini (Tested vs Expected)
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono">
              Daily Compliance Check
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Identifikasi cepat parameter rutin yang belum diuji hari ini untuk mencegah pengujian sampel pasien tanpa kontrol.
          </p>
        </div>

        {/* Quick Nav Button */}
        <button
          type="button"
          onClick={() => onNavigateToTab('qc-scan')}
          className="flex items-center justify-center gap-2 h-9 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-center"
        >
          <Camera className="h-4 w-4" />
          <span>Scan Struk / Foto QC</span>
        </button>
      </div>

      {/* Completion Summary Bar & KPI Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Stats Box */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 border-b border-slate-700 pb-2">
            <span>PROGRESS CAPAIAN QC</span>
            <span>{coverageData.todayStr}</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {coverageData.testedCount}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-mono">
                /{coverageData.totalExpected}
              </span>
              <span className="ml-2 text-xs font-medium text-slate-300">Parameter Selesai</span>
            </div>

            <div className="text-right">
              <span className={`text-2xl font-extrabold font-mono ${
                coverageData.completionPercentage === 100 
                  ? 'text-emerald-400' 
                  : coverageData.completionPercentage >= 70 
                  ? 'text-amber-300' 
                  : 'text-rose-400'
              }`}>
                {coverageData.completionPercentage}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-3 w-full bg-slate-700/80 rounded-full overflow-hidden p-0.5 border border-slate-600">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  coverageData.completionPercentage === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                    : coverageData.completionPercentage >= 70 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                    : 'bg-gradient-to-r from-rose-500 to-red-400'
                }`}
                style={{ width: `${coverageData.completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{coverageData.testedCount} Teruji ({coverageData.todayTotalRuns} Run Total)</span>
              <span>{coverageData.missedCount} Belum Diuji</span>
            </div>
          </div>
        </div>

        {/* Right Status Banner */}
        <div className="lg:col-span-7">
          {coverageData.missedCount === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-950 flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm sm:text-base text-emerald-900 flex items-center gap-2">
                  <span>Semua Parameter QC Hari Ini Telah Diuji Lengkap!</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-extrabold">
                    100% Coverage
                  </span>
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Seluruh <strong>{coverageData.totalExpected} parameter</strong> laboratorium terdaftar telah memiliki catatan kontrol kualitas untuk hari ini ({coverageData.todayStr}). Sampel pasien aman diproses.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 text-amber-950 flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                    <span>{coverageData.missedCount} Parameter Belum Memiliki Data QC Hari Ini</span>
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Perhatikan parameter di bawah yang belum dijalankan kontrol mutunya hari ini. Lakukan pengerjaan QC sebelum melayani spesimen pasien.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('qc-input')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
              >
                <Plus className="h-4 w-4" />
                <span>Input QC Sekarang</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Grid: Missed Parameters vs Tested Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* Missed Tests Section (Left 6 Cols or Full if any missed) */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-amber-600" />
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Parameter Belum Diuji Hari Ini ({coverageData.missedCount})
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
              Perlu QC
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {coverageData.missedParameters.length > 0 ? (
              coverageData.missedParameters.map(({ parameter, instrumentName }) => (
                <div
                  key={parameter.id}
                  className="p-3 rounded-xl border border-amber-200/80 bg-white hover:border-amber-400 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {parameter.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {parameter.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {instrumentName} · Target: {parameter.targetMean} {parameter.unit}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab('qc-input', { parameterId: parameter.id })}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Uji QC</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-1.5 text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Tidak Ada Tes yang Terlewat
                </p>
                <p className="text-[11px]">
                  Seluruh parameter rutin laboratorium sudah terisi QC hari ini.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tested Today Section (Right 6 Cols) */}
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Parameter Sudah Diuji Hari Ini ({coverageData.testedCount})
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              Selesai
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {coverageData.testedParameters.length > 0 ? (
              coverageData.testedParameters.map(({ parameter, instrumentName, latestResult, runCount }) => (
                <div
                  key={parameter.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {parameter.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {parameter.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      Nilai Terakhir: <strong className="text-slate-800">{latestResult.value} {latestResult.unit}</strong> ({latestResult.sdPosition}) · {latestResult.time}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      latestResult.status === 'reject' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                        : latestResult.status === 'warning' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {latestResult.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => onNavigateToTab('levey-jennings', { parameterId: parameter.id })}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Lihat Levey-Jennings"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-1.5 text-slate-500">
                <Clock className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Belum Ada QC Dimulai Hari Ini
                </p>
                <p className="text-[11px]">
                  Gunakan tombol Input QC / Scan QC untuk memulai pengujian hari ini.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
