import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  X, 
  CheckCircle2, 
  FolderGit2, 
  Calendar, 
  Search, 
  Filter, 
  FileText, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  Save,
  ArrowRight,
  Check,
  RotateCcw,
  Printer,
  ShieldCheck,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { NonConformity, Instrument, Parameter, QCResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { getLocalDateString, getLocalTimeString } from '../../utils/dateUtils';
import { getWestgardContextualGuidance, detectAnalyzerType } from '../../utils/westgardGuidance';

interface NonConformityViewProps {
  nonConformities: NonConformity[];
  instruments: Instrument[];
  parameters: Parameter[];
  qcResults: QCResult[];
  initialData?: { fromQc?: QCResult };
  onNCAdded: (nc: NonConformity) => void;
  onNCUpdated: (nc: NonConformity) => void;
  onNCDeleted?: (id: string) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const NonConformityView: React.FC<NonConformityViewProps> = ({
  nonConformities,
  instruments,
  parameters,
  qcResults,
  initialData,
  onNCAdded,
  onNCUpdated,
  onNCDeleted,
  onNavigateToTab,
}) => {
  const { user, can } = useAuth();
  const [showModal, setShowModal] = useState(!!initialData?.fromQc);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);

  // Workflow Action Form State
  const [ncActionForm, setNcActionForm] = useState({
    actionExecutedByName: user.name,
    actionExecutionDate: getLocalDateString(),
    actionExecutionTime: getLocalTimeString(),
    resolutionAction: '',
    postActionQcResult: '',
    resolutionNotes: '',
  });

  const handleSelectNC = (nc: NonConformity) => {
    setSelectedNC(nc);
    setNcActionForm({
      actionExecutedByName: nc.actionExecutedByName || user.name,
      actionExecutionDate: nc.actionExecutionDate || getLocalDateString(),
      actionExecutionTime: nc.actionExecutionTime || getLocalTimeString(),
      resolutionAction: nc.resolutionAction || nc.immediateAction || '',
      postActionQcResult: nc.postActionQcResult || '',
      resolutionNotes: nc.resolutionNotes || '',
    });
  };

  // Edit NC Modal State
  const [editingNC, setEditingNC] = useState<NonConformity | null>(null);
  const [editNCForm, setEditNCForm] = useState<Partial<NonConformity>>({});

  // Delete NC State
  const [ncToDelete, setNcToDelete] = useState<NonConformity | null>(null);

  // Form State for creating new NC
  const defaultInst = initialData?.fromQc 
    ? instruments.find(i => i.id === initialData.fromQc?.instrumentId) || instruments[0]
    : instruments[0];
  const defaultParam = initialData?.fromQc
    ? parameters.find(p => p.id === initialData.fromQc?.parameterId) || parameters[0]
    : parameters[0];

  const defaultGuidance = useMemo(() => {
    return getWestgardContextualGuidance(
      (initialData?.fromQc?.violations?.[0]?.rule as any) || '1_3s',
      initialData?.fromQc?.violations?.[0]?.ruleName || 'Pelanggaran Aturan Westgard',
      'reject',
      defaultInst?.name,
      defaultParam?.name,
      initialData?.fromQc?.zScore
    );
  }, [defaultInst?.name, defaultParam?.name]);

  const [date, setDate] = useState(initialData?.fromQc?.date || getLocalDateString());
  const [time, setTime] = useState(initialData?.fromQc?.time || getLocalTimeString());
  const [unit, setUnit] = useState('Patologi Klinik - Kimia Klinik');
  const [instrumentId, setInstrumentId] = useState(defaultInst?.id || '');
  const [parameterId, setParameterId] = useState(defaultParam?.id || '');
  const [qcResultId, setQcResultId] = useState(initialData?.fromQc?.id || '');
  const [westgardRule, setWestgardRule] = useState(
    initialData?.fromQc?.violations?.[0]?.ruleName || ''
  );
  const [severity, setSeverity] = useState<NonConformity['severity']>('major');
  const [category, setCategory] = useState<NonConformity['category']>('analytic');
  const [description, setDescription] = useState(
    initialData?.fromQc
      ? `Hasil QC parameter ${initialData.fromQc.parameterName} pada ${initialData.fromQc.instrumentName} melanggar aturan Westgard: ${initialData.fromQc.violations?.map(v => v.ruleName).join(', ')}. Nilai terukur: ${initialData.fromQc.value} ${initialData.fromQc.unit} (${initialData.fromQc.sdPosition}).`
      : ''
  );
  const [impact, setImpact] = useState(
    initialData?.fromQc?.violations?.[0]?.impact ||
    defaultGuidance.impact ||
    'Pemeriksaan klinis pasien ditunda sementara hingga kalibrasi ulang tervalidasi.'
  );
  const [initialAnalysis, setInitialAnalysis] = useState(
    initialData?.fromQc?.violations?.[0]?.probableCauses?.join('. ') ||
    defaultGuidance.probableCauses.slice(0, 3).join('. ') ||
    'Diduga terjadi pergeseran reagen / pembentukan gelembung pada probe instrumen.'
  );
  const [immediateAction, setImmediateAction] = useState(
    initialData?.fromQc?.violations?.[0]?.correctiveActions?.join('. ') ||
    [...defaultGuidance.correctiveActions.slice(0, 2), ...defaultGuidance.preventiveActions.slice(0, 1)].join('. ') ||
    'Melakukan re-run kontrol baru dan re-homogenisasi botol reagen.'
  );

  const [actionFormError, setActionFormError] = useState<string | null>(null);

  // Secara otomatis membaca instrumen dan parameter terpilih untuk mengisi dampak,
  // kemungkinan penyebab, serta tindakan korektif dan pencegahan spesifik instrumen
  useEffect(() => {
    const inst = instruments.find(i => i.id === instrumentId);
    const param = parameters.find(p => p.id === parameterId);
    if (inst && param) {
      const guidance = getWestgardContextualGuidance(
        '1_3s',
        westgardRule || 'Pelanggaran Aturan Westgard',
        'reject',
        inst.name,
        param.name,
        initialData?.fromQc?.zScore
      );

      setImpact(guidance.impact);
      setInitialAnalysis(guidance.probableCauses.slice(0, 3).join('. '));
      setImmediateAction(
        [
          ...guidance.correctiveActions.slice(0, 2),
          ...guidance.preventiveActions.slice(0, 1)
        ].join('. ')
      );

      if (!description || description.startsWith('Hasil QC parameter') || description.startsWith('Hasil pemeriksaan QC untuk parameter')) {
        setDescription(
          `Hasil pemeriksaan QC untuk parameter ${param.name} pada instrumen ${inst.name} (${inst.model || inst.brand || ''}) melanggar aturan kontrol mutu ${westgardRule || 'Westgard'}. Nilai pengukuran menyimpang dan memerlukan tindakan perbaikan.`
        );
      }
    }
  }, [instrumentId, parameterId, westgardRule]);

  const canManage = can('manage_capa') || user.role === 'admin' || user.role === 'supervisor';

  const filteredNC = nonConformities.filter(nc => {
    const st = (nc.status || 'open').toLowerCase();
    if (statusFilter !== 'all') {
      if (statusFilter === 'open') {
        if (st !== 'open') return false;
      } else if (statusFilter === 'in_progress') {
        if (st !== 'under_investigation' && st !== 'under_review' && st !== 'in_progress') return false;
      } else if (statusFilter === 'resolved') {
        if (st !== 'resolved') return false;
      } else if (statusFilter === 'escalated_to_capa') {
        if (st !== 'escalated_to_capa' && !nc.linkedCapaId) return false;
      }
    }
    if (severityFilter !== 'all' && nc.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        nc.id.toLowerCase().includes(q) ||
        nc.parameterName.toLowerCase().includes(q) ||
        nc.description.toLowerCase().includes(q) ||
        nc.reportedByName.toLowerCase().includes(q) ||
        (nc.resolutionAction && nc.resolutionAction.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateNC = (e: React.FormEvent) => {
    e.preventDefault();
    const inst = instruments.find(i => i.id === instrumentId);
    const param = parameters.find(p => p.id === parameterId);

    const newNC: NonConformity = {
      id: `NC-${new Date().getFullYear()}-${String(nonConformities.length + 1).padStart(3, '0')}`,
      date,
      time,
      unit,
      instrumentId,
      instrumentName: inst?.name || 'Instrumen Lab Sentral',
      parameterId,
      parameterName: param?.name || 'Parameter Pemeriksaan',
      qcResultId: qcResultId || undefined,
      westgardRule: westgardRule || undefined,
      severity,
      category,
      description,
      impact,
      initialAnalysis,
      immediateAction,
      reportedBy: user.id,
      reportedByName: user.name,
      status: 'open',
    };

    StorageService.saveNonConformity(newNC);
    StorageService.logAudit(
      'CREATE_NC',
      `Menerbitkan laporan ketidaksesuaian ${newNC.id} (${newNC.parameterName}) oleh ${user.name}`,
      newNC
    );

    onNCAdded(newNC);
    setShowModal(false);
  };

  const handleOpenEditNC = (nc: NonConformity) => {
    setEditingNC(nc);
    setEditNCForm({ ...nc });
  };

  const handleSaveEditNC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNC) return;

    const updated: NonConformity = {
      ...editingNC,
      ...editNCForm,
    } as NonConformity;

    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'UPDATE_NC',
      `Mengubah laporan ketidaksesuaian #${updated.id} (${updated.parameterName}) oleh ${user.name}`,
      updated,
      editingNC
    );

    onNCUpdated(updated);
    if (selectedNC?.id === updated.id) {
      setSelectedNC(updated);
    }
    setEditingNC(null);
  };

  const handleConfirmDeleteNC = () => {
    if (!ncToDelete) return;
    StorageService.deleteNonConformity(ncToDelete.id);
    StorageService.logAudit(
      'DELETE_NC',
      `Menghapus laporan ketidaksesuaian #${ncToDelete.id} (${ncToDelete.parameterName}) oleh ${user.name}`,
      null,
      ncToDelete
    );

    if (onNCDeleted) {
      onNCDeleted(ncToDelete.id);
    } else {
      onNCUpdated(ncToDelete);
    }
    if (selectedNC?.id === ncToDelete.id) {
      setSelectedNC(null);
    }
    setNcToDelete(null);
  };

  const handleStartNCAction = (nc: NonConformity) => {
    const updated: NonConformity = {
      ...nc,
      status: 'under_investigation',
      actionExecutedByName: ncActionForm.actionExecutedByName || user.name,
      actionExecutionDate: ncActionForm.actionExecutionDate || getLocalDateString(),
      actionExecutionTime: ncActionForm.actionExecutionTime || getLocalTimeString(),
      resolutionAction: ncActionForm.resolutionAction || nc.immediateAction || '',
    };
    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'START_NC_ACTION',
      `Memulai tindakan perbaikan penyimpangan #${nc.id} (${nc.parameterName}) oleh ${user.name}`,
      updated,
      nc
    );
    onNCUpdated(updated);
    setSelectedNC(updated);
  };

  const handleSaveNCActionProgress = (nc: NonConformity) => {
    const updated: NonConformity = {
      ...nc,
      status: 'under_investigation',
      actionExecutedByName: ncActionForm.actionExecutedByName,
      actionExecutionDate: ncActionForm.actionExecutionDate,
      actionExecutionTime: ncActionForm.actionExecutionTime,
      resolutionAction: ncActionForm.resolutionAction,
      postActionQcResult: ncActionForm.postActionQcResult,
      resolutionNotes: ncActionForm.resolutionNotes,
    };
    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'UPDATE_NC_ACTION',
      `Menyimpan progres tindakan perbaikan #${nc.id} oleh ${user.name}`,
      updated,
      nc
    );
    onNCUpdated(updated);
    setSelectedNC(updated);
  };

  const handleCompleteNC = (nc: NonConformity) => {
    if (!ncActionForm.resolutionAction.trim()) {
      setActionFormError('Mohon isi uraian tindakan perbaikan yang telah dilaksanakan sebelum menandai selesai.');
      return;
    }
    setActionFormError(null);

    const updated: NonConformity = {
      ...nc,
      status: 'resolved',
      actionExecutedByName: ncActionForm.actionExecutedByName || user.name,
      actionExecutionDate: ncActionForm.actionExecutionDate || getLocalDateString(),
      actionExecutionTime: ncActionForm.actionExecutionTime || getLocalTimeString(),
      resolutionAction: ncActionForm.resolutionAction,
      postActionQcResult: ncActionForm.postActionQcResult,
      resolutionNotes: ncActionForm.resolutionNotes,
      resolvedAt: `${getLocalDateString()} ${getLocalTimeString()}`,
      resolvedBy: user.id,
      resolvedByName: user.name,
    };
    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'RESOLVE_NC',
      `Menyelesaikan penyimpangan #${nc.id} (${nc.parameterName}) dengan status Selesai / Resolved oleh ${user.name}`,
      updated,
      nc
    );
    onNCUpdated(updated);
    setSelectedNC(updated);
  };

  const handleReopenNC = (nc: NonConformity) => {
    const updated: NonConformity = {
      ...nc,
      status: 'under_investigation',
      resolvedAt: undefined,
      resolvedBy: undefined,
      resolvedByName: undefined,
    };
    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'REOPEN_NC',
      `Membuka kembali laporan penyimpangan #${nc.id} untuk evaluasi perbaikan lanjutan oleh ${user.name}`,
      updated,
      nc
    );
    onNCUpdated(updated);
    setSelectedNC(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Ketidaksesuaian Mutu (Non-Conformity)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan insiden mutu, kegagalan kontrol, analisis dampak klinis, penanganan segera, koreksi data, dan penghapusan laporan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Laporan NC Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Workflow Status Filter Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'open', label: '1. Open (Baru)' },
              { id: 'in_progress', label: '2. Sedang Dilaksanakan' },
              { id: 'resolved', label: '3. Selesai (Resolved)' },
              { id: 'escalated_to_capa', label: '4. Eskalasi ke CAPA' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, parameter, tindakan, pelapor..."
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium text-[11px] mr-1">Tingkat Keparahan:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'critical', label: 'Kritis (Critical)' },
            { id: 'major', label: 'Mayor (Major)' },
            { id: 'minor', label: 'Minor' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                severityFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of NC Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNC.map((nc) => {
          const isCritical = nc.severity === 'critical';
          const isMajor = nc.severity === 'major';
          const isResolved = nc.status === 'resolved';
          const isUnderInvestigation = nc.status === 'under_investigation' || nc.status === 'under_review';
          const isEscalated = nc.status === 'escalated_to_capa' || !!nc.linkedCapaId;

          return (
            <div
              key={nc.id}
              className={`rounded-xl border bg-white p-4 shadow-xs transition-all flex flex-col justify-between ${
                isResolved
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : isCritical 
                  ? 'border-rose-300' 
                  : isMajor 
                  ? 'border-amber-300' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {nc.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800'
                        : isMajor
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {nc.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isEscalated
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : isUnderInvestigation
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {isResolved
                        ? 'Selesai'
                        : isEscalated
                        ? 'Eskalasi CAPA'
                        : isUnderInvestigation
                        ? 'Dilaksanakan'
                        : 'Open'}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{nc.parameterName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {nc.instrumentName} · {nc.date} {nc.time}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-xs text-slate-600">
                  <p className="line-clamp-2 leading-relaxed">{nc.description}</p>
                </div>

                {nc.westgardRule && (
                  <div className="text-[11px] font-mono text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                    Westgard: {nc.westgardRule}
                  </div>
                )}

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p><strong>Pelapor:</strong> {nc.reportedByName}</p>
                  {isResolved ? (
                    <p className="text-emerald-700 font-semibold font-mono">
                      ✓ Diselesaikan: {nc.resolvedAt} ({nc.resolvedByName || nc.reportedByName})
                    </p>
                  ) : nc.resolutionAction ? (
                    <p className="text-blue-700 font-mono line-clamp-1">
                      ▶ Tindakan: {nc.resolutionAction}
                    </p>
                  ) : (
                    <p><strong>Tindakan Segera:</strong> {nc.immediateAction || '-'}</p>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectNC(nc)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      isResolved
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : isUnderInvestigation
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Selesai (Lihat)</span>
                      </>
                    ) : isUnderInvestigation ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        <span>Lanjutkan Tindakan</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Laksanakan Tindakan</span>
                      </>
                    )}
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditNC(nc)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Laporan NC"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNcToDelete(nc)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Laporan NC"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {nc.status !== 'escalated_to_capa' && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('capa', { fromNC: nc })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                  >
                    <FolderGit2 className="h-3.5 w-3.5" />
                    <span>Eskalasi</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Create NC Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Formulir Laporan Ketidaksesuaian Mutu (Non-Conformity)
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNC} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instrumen *</label>
                  <select
                    value={instrumentId}
                    onChange={(e) => setInstrumentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    {instruments.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parameter Pemeriksaan *</label>
                  <select
                    value={parameterId}
                    onChange={(e) => setParameterId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    {parameters.map(p => (
                      <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Keparahan *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white font-semibold"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major (Mayor)</option>
                    <option value="critical">Critical (Kritis)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Masalah</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="preanalytic">Pra-Analitik</option>
                    <option value="analytic">Analitik</option>
                    <option value="postanalytic">Pasca-Analitik</option>
                    <option value="equipment">Instrumen / Alat</option>
                    <option value="reagent">Reagen / Kontrol</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aturan Westgard</label>
                  <input
                    type="text"
                    value={westgardRule}
                    onChange={(e) => setWestgardRule(e.target.value)}
                    placeholder="Contoh: 1:3s, 2:2s"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Masalah / Kejadian *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Jelaskan secara detail ketidaksesuaian yang ditemukan..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dampak Klinis Terhadap Pasien</label>
                  <textarea
                    rows={2}
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tindakan Segera (Immediate Action)</label>
                  <textarea
                    rows={2}
                    value={immediateAction}
                    onChange={(e) => setImmediateAction(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors"
                >
                  Simpan Laporan NC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit NC Modal */}
      {editingNC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit Laporan Ketidaksesuaian #{editingNC.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {editingNC.parameterName} · {editingNC.date} {editingNC.time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingNC(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditNC} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Keparahan</label>
                  <select
                    value={editNCForm.severity || 'major'}
                    onChange={(e) => setEditNCForm({ ...editNCForm, severity: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white font-semibold"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major (Mayor)</option>
                    <option value="critical">Critical (Kritis)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Laporan</label>
                  <select
                    value={editNCForm.status || 'open'}
                    onChange={(e) => setEditNCForm({ ...editNCForm, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white font-semibold"
                  >
                    <option value="open">Open (Terbuka)</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="escalated_to_capa">Escalated to CAPA</option>
                    <option value="resolved">Resolved (Selesai)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aturan Westgard</label>
                  <input
                    type="text"
                    value={editNCForm.westgardRule || ''}
                    onChange={(e) => setEditNCForm({ ...editNCForm, westgardRule: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Masalah / Temuan *</label>
                <textarea
                  rows={3}
                  value={editNCForm.description || ''}
                  onChange={(e) => setEditNCForm({ ...editNCForm, description: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dampak Klinis</label>
                  <textarea
                    rows={2}
                    value={editNCForm.impact || ''}
                    onChange={(e) => setEditNCForm({ ...editNCForm, impact: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tindakan Segera</label>
                  <textarea
                    rows={2}
                    value={editNCForm.immediateAction || ''}
                    onChange={(e) => setEditNCForm({ ...editNCForm, immediateAction: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Analisis Awal Akar Masalah</label>
                <textarea
                  rows={2}
                  value={editNCForm.initialAnalysis || ''}
                  onChange={(e) => setEditNCForm({ ...editNCForm, initialAnalysis: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNC(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Detail & Workflow NC Modal */}
      {selectedNC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 my-6 max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 ${
                  selectedNC.status === 'resolved'
                    ? 'bg-emerald-600'
                    : selectedNC.status === 'under_investigation' || selectedNC.status === 'under_review'
                    ? 'bg-blue-600'
                    : 'bg-amber-600'
                }`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                      Alur Penanganan Penyimpangan #{selectedNC.id}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedNC.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : selectedNC.status === 'escalated_to_capa'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : selectedNC.status === 'under_investigation'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {selectedNC.status === 'resolved'
                        ? 'Selesai (Resolved)'
                        : selectedNC.status === 'under_investigation'
                        ? 'Sedang Dilaksanakan'
                        : selectedNC.status === 'escalated_to_capa'
                        ? 'Eskalasi ke CAPA'
                        : 'Open / Baru'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedNC.parameterName} · {selectedNC.instrumentName} · {selectedNC.date} {selectedNC.time}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNC(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Workflow Stepper Bar */}
            <div className="p-3 bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {/* Step 1: Open */}
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  selectedNC.status === 'open'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs'
                    : 'bg-white/80 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedNC.status === 'open' ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>1</span>
                    <span>1. Dilaporkan (Open)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5">Insiden Tercatat</span>
                </div>

                {/* Step 2: Under Investigation / In Progress */}
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  selectedNC.status === 'under_investigation' || selectedNC.status === 'under_review'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                    : 'bg-white/80 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedNC.status === 'under_investigation' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>2</span>
                    <span>2. Dilaksanakan (In Progress)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5">Tindakan Perbaikan</span>
                </div>

                {/* Step 3: Resolved */}
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  selectedNC.status === 'resolved'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs'
                    : 'bg-white/80 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-1">
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      selectedNC.status === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>3</span>
                    <span>3. Selesai (Resolved)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5">Kontrol QC Normal</span>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Incident Details Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-700 font-semibold border-b border-slate-200/80 pb-2">
                  <span>Informasi Kejadian & Dampak</span>
                  <span className="font-mono text-[11px] text-slate-500">Pelapor: <strong>{selectedNC.reportedByName}</strong></span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Uraian Penyimpangan:</span>
                    <p className="font-medium mt-0.5">{selectedNC.description}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dampak Klinis Hasil Pasien:</span>
                    <p className="font-medium mt-0.5 text-rose-700">{selectedNC.impact}</p>
                  </div>
                </div>
                {selectedNC.westgardRule && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                    Pelanggaran Aturan: {selectedNC.westgardRule}
                  </div>
                )}
              </div>

              {/* Deteksi Otomatis & Rekomendasi Khusus Instrumen */}
              {(() => {
                const guidance = getWestgardContextualGuidance(
                  '1_3s',
                  selectedNC.westgardRule || 'Pelanggaran Aturan Westgard',
                  'reject',
                  selectedNC.instrumentName,
                  selectedNC.parameterName
                );

                return (
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-3.5 space-y-2.5 text-xs shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-blue-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <span className="font-bold text-blue-950 block">
                            Deteksi Otomatis & Rekomendasi Khusus Alat: {selectedNC.instrumentName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Parameter: {selectedNC.parameterName} · Kategori: {guidance.analyzerTypeName}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 w-fit">
                        {guidance.analyzerTypeName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      {/* Probable Causes */}
                      <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          <span>⚠️ Kemungkinan Penyebab pada {selectedNC.instrumentName}:</span>
                        </p>
                        <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                          {guidance.probableCauses.slice(0, 3).map((cause, ci) => (
                            <li key={ci}>{cause}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Corrective & Preventive Guidance */}
                      <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100 space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          <span>🛠️ Tindakan Dianjurkan (Klik untuk Tambahkan):</span>
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          {[...guidance.correctiveActions.slice(0, 2), ...guidance.preventiveActions.slice(0, 2)].map((rec, ri) => (
                            <button
                              key={ri}
                              type="button"
                              onClick={() => {
                                const cur = ncActionForm.resolutionAction;
                                const newVal = cur ? `${cur}; ${rec}` : rec;
                                setNcActionForm({ ...ncActionForm, resolutionAction: newVal });
                              }}
                              className="text-left text-[10px] p-1.5 rounded bg-blue-50/70 hover:bg-blue-100 text-blue-900 font-medium transition-colors cursor-pointer border border-blue-200 flex items-start gap-1"
                              title="Klik untuk menambahkan rekomendasi ini ke formulir tindakan"
                            >
                              <Plus className="h-3 w-3 shrink-0 mt-0.5 text-blue-600" />
                              <span>{rec}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Specific Section: Resolved vs Action in Progress */}
              {selectedNC.status === 'resolved' ? (
                /* Completed Summary Card */
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>PENYIMPANGAN TELAH SELESAI DITANGANI DAN DIVERIFIKASI</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                      Selesai: {selectedNC.resolvedAt}
                    </span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-lg border border-emerald-200 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Tindakan Perbaikan yang Telah Dilaksanakan:</span>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedNC.resolutionAction || selectedNC.immediateAction}</p>
                    </div>

                    {selectedNC.postActionQcResult && (
                      <div>
                        <span className="text-slate-500 block text-[11px]">Hasil Evaluasi / Re-run QC Kontrol:</span>
                        <p className="font-semibold text-emerald-800 font-mono mt-0.5">
                          ✓ {selectedNC.postActionQcResult}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <span>Pelaksana Tindakan: <strong>{selectedNC.actionExecutedByName || selectedNC.resolvedByName || user.name}</strong></span>
                      <span>Disetujui: <strong>{selectedNC.resolvedByName || user.name}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Cetak Berita Acara</span>
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleReopenNC(selectedNC)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Buka Kembali (Reopen)</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Action Implementation Form */
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Pelaksanaan Tindakan Perbaikan Langsung
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        Catat langkah koreksi yang dilaksanakan dan uji ulang QC sebelum menutup penyimpangan.
                      </p>
                    </div>

                    {selectedNC.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => handleStartNCAction(selectedNC)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Mulai Pelaksanaan</span>
                      </button>
                    )}
                  </div>

                  {actionFormError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{actionFormError}</span>
                    </div>
                  )}

                  {/* Quick Action Chips */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Template Tindakan Cepat (Klik untuk memilih):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Kalibrasi ulang parameter dan re-run kontrol',
                        'Ganti vial kontrol baru (lot baru)',
                        'Pembersihan jarum probe dan kuvet ukur',
                        'Flushing saluran hidrolik dan de-bubble',
                        'Ganti botol reagen baru dan homogenisasi',
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const cur = ncActionForm.resolutionAction;
                            const newVal = cur ? `${cur}; ${chip}` : chip;
                            setNcActionForm({ ...ncActionForm, resolutionAction: newVal });
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer border border-slate-200"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execution Form Fields */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Tindakan Perbaikan yang Dilaksanakan *
                      </label>
                      <textarea
                        rows={2}
                        value={ncActionForm.resolutionAction}
                        onChange={(e) => setNcActionForm({ ...ncActionForm, resolutionAction: e.target.value })}
                        required
                        placeholder="Uraikan tindakan perbaikan yang telah/sedang dilaksanakan..."
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Hasil Evaluasi / Re-run Kontrol Pasca Perbaikan (Quality Check)
                      </label>
                      <input
                        type="text"
                        value={ncActionForm.postActionQcResult}
                        onChange={(e) => setNcActionForm({ ...ncActionForm, postActionQcResult: e.target.value })}
                        placeholder="Contoh: Kontrol level 1 re-run diperoleh 101.5 mg/dL, target 100.0 mg/dL, Z-Score +0.6 SD (In-Control)"
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Petugas Pelaksana</label>
                        <input
                          type="text"
                          value={ncActionForm.actionExecutedByName}
                          onChange={(e) => setNcActionForm({ ...ncActionForm, actionExecutedByName: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tanggal Pelaksanaan</label>
                        <input
                          type="date"
                          value={ncActionForm.actionExecutionDate}
                          onChange={(e) => setNcActionForm({ ...ncActionForm, actionExecutionDate: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Jam Pelaksanaan</label>
                        <input
                          type="time"
                          value={ncActionForm.actionExecutionTime}
                          onChange={(e) => setNcActionForm({ ...ncActionForm, actionExecutionTime: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                      <input
                        type="text"
                        value={ncActionForm.resolutionNotes}
                        onChange={(e) => setNcActionForm({ ...ncActionForm, resolutionNotes: e.target.value })}
                        placeholder="Catatan tambahan untuk penanggung jawab mutu..."
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* Transition Buttons inside Action Area */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveNCActionProgress(selectedNC)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Simpan Progres Tindakan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteNC(selectedNC)}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Selesaikan & Tutup Penyimpangan (Tandai Selesai / Resolved)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNC(null);
                        handleOpenEditNC(selectedNC);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNC(null);
                        setNcToDelete(selectedNC);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedNC.status !== 'escalated_to_capa' && !selectedNC.linkedCapaId && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetNC = selectedNC;
                      setSelectedNC(null);
                      onNavigateToTab('capa', { fromNC: targetNC });
                    }}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                  >
                    <FolderGit2 className="h-4 w-4" />
                    <span>Eskalasi ke Dokumen CAPA</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNC(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete NC Modal */}
      {ncToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Konfirmasi Hapus Laporan NC
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: #{ncToDelete.id}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-2">
              <p className="text-slate-800">
                Apakah Anda yakin ingin menghapus laporan ketidaksesuaian parameter <strong>"{ncToDelete.parameterName}"</strong> tanggal <strong>{ncToDelete.date}</strong>?
              </p>
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                ⚠️ Laporan yang dihapus akan dicatat dalam Audit Trail demi kepatuhan ISO 15189.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNcToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNC}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Hapus Laporan NC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
