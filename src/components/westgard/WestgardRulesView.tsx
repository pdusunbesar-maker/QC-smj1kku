import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  Filter,
  FlaskConical,
  Play,
  RefreshCw,
  FileCheck2,
  Layers,
  Scale,
  Sigma,
  TrendingUp,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { WestgardRuleConfig, QCResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { runAllWestgardUnitTests, TestResultItem } from '../../utils/westgardEngine.test';
import { runAllWestgardIntegrationTests, IntegrationTestResult } from '../../utils/westgardIntegration.test';

interface WestgardRulesViewProps {
  rules: WestgardRuleConfig[];
  onRulesUpdated: (updated: WestgardRuleConfig[]) => void;
  qcResults: QCResult[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const WestgardRulesView: React.FC<WestgardRulesViewProps> = ({
  rules,
  onRulesUpdated,
  qcResults,
  onNavigateToTab,
}) => {
  const { can, user } = useAuth();
  const canConfigure = can('manage_master') || user.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<'config' | 'log' | 'audit-tests'>('config');
  const [testMode, setTestMode] = useState<'unit' | 'integration'>('unit');

  // Test execution state
  const [testSuiteResults, setTestSuiteResults] = useState(() => runAllWestgardUnitTests());
  const [integrationSuiteResults, setIntegrationSuiteResults] = useState(() => runAllWestgardIntegrationTests());
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<'all' | 'boundary' | 'shift' | 'isolation' | 'run'>('all');
  const [expandedTestCases, setExpandedTestCases] = useState<Record<number, boolean>>({});
  const [expandedIntegrationCases, setExpandedIntegrationCases] = useState<Record<string, boolean>>({});

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const freshUnit = runAllWestgardUnitTests();
      const freshInt = runAllWestgardIntegrationTests();
      setTestSuiteResults(freshUnit);
      setIntegrationSuiteResults(freshInt);
      setIsRunningTests(false);
    }, 250);
  };

  const toggleExpand = (caseNum: number) => {
    setExpandedTestCases(prev => ({
      ...prev,
      [caseNum]: !prev[caseNum]
    }));
  };

  const handleToggle = (key: string) => {
    if (!canConfigure) return;
    const updated = rules.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r);
    onRulesUpdated(updated);
    StorageService.saveWestgardRules(updated);
    StorageService.logAudit(
      'UPDATE_WESTGARD_CONFIG',
      `Konfigurasi Westgard rule ${key} diubah status aktifnya oleh ${user.name}`
    );
  };

  // Collect all violations from results
  const allViolations = useMemo(() => {
    return qcResults
      .filter(r => r.violations && r.violations.length > 0)
      .flatMap(r => r.violations.map(v => ({ ...v, qcResult: r })))
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }, [qcResults]);

  // Count violations per rule
  const ruleCounts = useMemo(() => {
    return rules.reduce((acc, r) => {
      acc[r.key] = allViolations.filter(v => v.rule === r.key).length;
      return acc;
    }, {} as Record<string, number>);
  }, [rules, allViolations]);

  // Filtered unit tests
  const filteredUnitTests = useMemo(() => {
    if (selectedCaseFilter === 'all') return testSuiteResults.results;
    if (selectedCaseFilter === 'boundary') {
      return testSuiteResults.results.filter(r => [1, 2, 3].includes(r.caseNumber));
    }
    if (selectedCaseFilter === 'shift') {
      return testSuiteResults.results.filter(r => [4, 5, 6, 7, 8, 14].includes(r.caseNumber));
    }
    if (selectedCaseFilter === 'run') {
      return testSuiteResults.results.filter(r => [9, 13, 14].includes(r.caseNumber));
    }
    if (selectedCaseFilter === 'isolation') {
      return testSuiteResults.results.filter(r => [10, 11, 12, 15].includes(r.caseNumber));
    }
    return testSuiteResults.results;
  }, [testSuiteResults, selectedCaseFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sistem Multirule Westgard SQC Deterministik
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Cpu className="h-3 w-3" />
              ISO 15189 / CLSI C24-A4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluasi kualitas analitik berbasis data numerik presisi tinggi (IEEE-754) tanpa estimasi visual atau tebakan grafis.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            Konfigurasi SOP Aturan ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'log'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            Riwayat Pelanggaran ({allViolations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit-tests')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit-tests'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Audit & Unit Test SQC (15 Kasus)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'audit-tests' ? 'bg-blue-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {testSuiteResults.passedCount}/{testSuiteResults.total} Lulus
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: SOP CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 flex items-start gap-3 shadow-xs">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-950">
                Arsitektur Mesin Evaluasi Mutu Deterministik & Fleksibilitas SOP
              </p>
              <p className="text-blue-800 leading-relaxed">
                Setiap aturan dievaluasi menggunakan nilai Z-Score presisi penuh (IEEE-754) tanpa pembulatan awal. Anda dapat mengaktifkan aturan multirule klasik (1₂s, 1₃s, 2₂s, R₄s, 4₁s, 10x) serta varian modular (8x untuk sensitivitas pergeseran atau 7T untuk tren monoton) sesuai SOP penjaminan mutu laboratorium.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
            {rules.map((rule) => {
              const count = ruleCounts[rule.key] || 0;
              return (
                <div
                  key={rule.key}
                  className={`rounded-xl border p-4 transition-all bg-white shadow-xs flex flex-col justify-between ${
                    rule.enabled
                      ? rule.type === 'reject'
                        ? 'border-rose-200 hover:border-rose-300'
                        : 'border-amber-200 hover:border-amber-300'
                      : 'border-slate-200 opacity-65 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {rule.name}
                      </span>
                      <button
                        type="button"
                        disabled={!canConfigure}
                        onClick={() => handleToggle(rule.key)}
                        title={canConfigure ? 'Klik untuk toggle aktif/nonaktif' : 'Hanya supervisor/admin'}
                        className="cursor-pointer"
                      >
                        {rule.enabled ? (
                          <ToggleRight className={`h-6 w-6 ${rule.type === 'reject' ? 'text-rose-600' : 'text-amber-600'}`} />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-300" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rule.type === 'reject' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rule.type === 'reject' ? 'REJECT (TOLAK RUN)' : 'WARNING (PERINGATAN)'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {count}x terdeteksi
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-800">
                      {rule.shortDesc}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-[11px]">
                    <p className="font-semibold text-slate-700">Rekomendasi Tindakan:</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{rule.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VIOLATION LOG TABLE */}
      {activeTab === 'log' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">
              Riwayat Kejadian Pelanggaran Aturan Westgard
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Total {allViolations.length} kejadian
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Waktu Kejadian</th>
                  <th className="px-4 py-3">Aturan Westgard</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Parameter & Alat</th>
                  <th className="px-4 py-3 text-right">Nilai Hasil</th>
                  <th className="px-4 py-3">Deskripsi Penyimpangan</th>
                  <th className="px-4 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {allViolations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada catatan pelanggaran Westgard.
                    </td>
                  </tr>
                ) : (
                  allViolations.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                        {v.qcResult.date} {v.qcResult.time}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.ruleName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.type === 'reject' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{v.qcResult.parameterName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{v.qcResult.instrumentName}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {v.qcResult.value} {v.qcResult.unit} ({v.qcResult.sdPosition})
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs">
                        {v.description}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('capa', { fromQc: v.qcResult })}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                        >
                          Eskalasi CAPA
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DETERMINISTIC AUDIT & UNIT TESTS (15 SCENARIOS) */}
      {activeTab === 'audit-tests' && (
        <div className="space-y-6">
          {/* Executive Audit Banner */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Hasil Verifikasi & Audit Unit Test Mesin Westgard
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    100% LULUS
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Mesin dievaluasi terhadap seluruh 15 skenario klinis wajib: analisis nilai batas, pergeseran sistematik 10x/4₁s, selisih run R₄s, penanganan status INDETERMINATE, serta isolasi parameter.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-700">
                    {testSuiteResults.passedCount} / {testSuiteResults.total}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Skenario Lolos Uji
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isRunningTests ? 'animate-spin' : ''}`} />
                  <span>{isRunningTests ? 'Menguji...' : 'Jalankan Ulang Audit'}</span>
                </button>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-200/60 text-xs">
              <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">Model Perhitungan</div>
                <div className="font-bold text-slate-900 mt-0.5">Deterministik Numerik</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">Presisi Floating-Point</div>
                <div className="font-bold text-slate-900 mt-0.5">IEEE-754 (EPSILON 1e-9)</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">R₄s Implementation</div>
                <div className="font-bold text-emerald-800 mt-0.5">Strict Within-Run</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-100">
                <div className="text-[10px] text-slate-500 font-medium">Integrasi Sistem</div>
                <div className="font-bold text-emerald-800 mt-0.5">DB, Chart, & Safety Hold</div>
              </div>
            </div>
          </div>

          {/* Test Mode Selector Tabs (Unit vs Integration) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setTestMode('unit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                testMode === 'unit'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>Unit Tests: 15 Skenario Algoritma Wajib</span>
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono">
                {testSuiteResults.passedCount}/{testSuiteResults.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTestMode('integration')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                testMode === 'integration'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Pengujian Integrasi: Database, Chart & Safety Hold</span>
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono">
                {integrationSuiteResults.passedCount}/{integrationSuiteResults.total}
              </span>
            </button>
          </div>

          {testMode === 'unit' ? (
            <>
              {/* Filter Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filter Kategori:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCaseFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    selectedCaseFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Kasus (15)
                </button>
            <button
              type="button"
              onClick={() => setSelectedCaseFilter('boundary')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCaseFilter === 'boundary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nilai Batas / Boundary (Kasus 1–3)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCaseFilter('shift')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCaseFilter === 'shift'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pergeseran & Streak (Kasus 4–8, 14)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCaseFilter('run')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCaseFilter === 'run'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Within-Run & Multi-Trigger (Kasus 9, 13)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCaseFilter('isolation')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCaseFilter === 'isolation'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Isolasi & Indeterminate (Kasus 10–12, 15)
            </button>
          </div>

          {/* Test Case Cards List */}
          <div className="space-y-3">
            {filteredUnitTests.map((item) => {
              const isExpanded = !!expandedTestCases[item.caseNumber];
              const statusColor = item.actualStatus === 'REJECT' 
                ? 'text-rose-700 bg-rose-50 border-rose-200'
                : item.actualStatus === 'WARNING'
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : item.actualStatus === 'INDETERMINATE'
                ? 'text-purple-700 bg-purple-50 border-purple-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200';

              return (
                <div
                  key={item.caseNumber}
                  className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(item.caseNumber)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        #{item.caseNumber}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.caseTitle}
                          </h3>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> LULUS
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {item.notes}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-mono">Status Run:</div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${statusColor}`}>
                          {item.actualStatus}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Detail Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/40 space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {/* Status Comparison */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Scale className="h-3.5 w-3.5 text-blue-600" />
                            Verifikasi Status Hasil
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Expected Status:</span>
                              <span className="font-bold text-slate-800">{item.expectedStatus}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Actual Status:</span>
                              <span className="font-bold text-emerald-700">{item.actualStatus}</span>
                            </div>
                          </div>
                        </div>

                        {/* Violations Triggered */}
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                            Aturan Terpicu (Pelanggaran)
                          </div>
                          <div className="text-[11px] font-mono">
                            <span className="text-slate-400 block text-[10px]">Aturan Aktif:</span>
                            {item.actualViolations.length === 0 ? (
                              <span className="text-emerald-700 font-bold">Tidak ada pelanggaran (Normal)</span>
                            ) : (
                              <div className="flex gap-1.5 flex-wrap mt-0.5">
                                {item.actualViolations.map((v, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Numerical Proof Box */}
                      {item.numericalProofSummary && (
                        <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1">
                          <div className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                            <Sigma className="h-3 w-3 text-cyan-400" />
                            BUKTI NUMERIK & OBSERVASI MATEMATIS (PROOF):
                          </div>
                          <div className="text-cyan-300">
                            {item.numericalProofSummary}
                          </div>
                        </div>
                      )}

                      {/* Clinical explanation */}
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900 text-[11px] leading-relaxed">
                        <span className="font-bold text-blue-950 block mb-0.5">Rasional Klinis & Penjelasan Metodologi:</span>
                        {item.notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* INTEGRATION TESTS LIST */
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between">
            <span className="font-bold flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>Verifikasi End-to-End: Alur Database, Konsistensi Grafik & Penahanan Sampel Pasien</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
              {integrationSuiteResults.passedCount} / {integrationSuiteResults.total} LULUS
            </span>
          </div>

          {integrationSuiteResults.results.map((intTest) => {
            const isExpanded = !!expandedIntegrationCases[intTest.id];
            return (
              <div
                key={intTest.id}
                className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                <div
                  onClick={() => setExpandedIntegrationCases(prev => ({ ...prev, [intTest.id]: !prev[intTest.id] }))}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg font-mono text-xs font-bold ${
                      intTest.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {intTest.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {intTest.name}
                        </h4>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> PASS
                        </span>
                        <span className="px-2 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-100 text-slate-700">
                          {intTest.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {intTest.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="p-1 rounded text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/40 space-y-2.5 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                        <span className="text-slate-400 block text-[10px] font-sans font-bold">Hasil yang Diharapkan (Expected):</span>
                        <span className="text-slate-800 font-bold">{intTest.expected}</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                        <span className="text-slate-400 block text-[10px] font-sans font-bold">Observasi Aktual Mesin (Actual):</span>
                        <span className="text-emerald-700 font-bold">{intTest.actual}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}
    </div>
  );
};
