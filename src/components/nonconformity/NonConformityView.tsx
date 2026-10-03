import React, { useState } from 'react';
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
  Save
} from 'lucide-react';
import { NonConformity, Instrument, Parameter, QCResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

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
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);

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

  const [date, setDate] = useState(initialData?.fromQc?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.fromQc?.time || '08:00');
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
      ? `Hasil QC parameter ${initialData.fromQc.parameterName} melanggar aturan Westgard: ${initialData.fromQc.violations?.map(v => v.ruleName).join(', ')}. Nilai terukur: ${initialData.fromQc.value} ${initialData.fromQc.unit} (${initialData.fromQc.sdPosition}).`
      : ''
  );
  const [impact, setImpact] = useState('Pemeriksaan klinis pasien ditunda sementara hingga kalibrasi ulang tervalidasi.');
  const [initialAnalysis, setInitialAnalysis] = useState('Diduga terjadi pergeseran reagen / pembentukan gelembung pada probe instrumen.');
  const [immediateAction, setImmediateAction] = useState('Melakukan re-run kontrol baru dan re-homogenisasi botol reagen.');

  const canManage = can('manage_capa') || user.role === 'admin' || user.role === 'supervisor';

  const filteredNC = nonConformities.filter(nc => {
    if (severityFilter !== 'all' && nc.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        nc.id.toLowerCase().includes(q) ||
        nc.parameterName.toLowerCase().includes(q) ||
        nc.description.toLowerCase().includes(q) ||
        nc.reportedByName.toLowerCase().includes(q)
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

  const handleResolveNC = (nc: NonConformity) => {
    const updated: NonConformity = {
      ...nc,
      status: 'resolved',
      resolvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    StorageService.saveNonConformity(updated);
    StorageService.logAudit(
      'RESOLVE_NC',
      `Menyelesaikan laporan ketidaksesuaian #${nc.id} oleh ${user.name}`,
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Tingkat' },
            { id: 'critical', label: 'Kritis (Critical)' },
            { id: 'major', label: 'Mayor (Major)' },
            { id: 'minor', label: 'Minor' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                severityFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
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
            placeholder="Cari ID, parameter, pelapor..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of NC Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNC.map((nc) => {
          const isCritical = nc.severity === 'critical';
          const isMajor = nc.severity === 'major';

          return (
            <div
              key={nc.id}
              className={`rounded-xl border bg-white p-4 shadow-xs transition-all flex flex-col justify-between ${
                isCritical 
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                      nc.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : nc.status === 'escalated_to_capa'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {nc.status.replace(/_/g, ' ')}
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

                <div className="text-[11px] text-slate-500">
                  <p><strong>Pelapor:</strong> {nc.reportedByName}</p>
                  <p><strong>Tindakan Segera:</strong> {nc.immediateAction || '-'}</p>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedNC(nc)}
                    className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-md font-medium"
                  >
                    Detail
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditNC(nc)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit Laporan NC"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNcToDelete(nc)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
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

      {/* 3. Detail NC Modal */}
      {selectedNC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Detail Penyimpangan #{selectedNC.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedNC.parameterName} · {selectedNC.date} {selectedNC.time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNC(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <p><strong>Deskripsi:</strong> {selectedNC.description}</p>
                <p><strong>Dampak:</strong> {selectedNC.impact}</p>
                <p><strong>Tindakan Segera:</strong> {selectedNC.immediateAction}</p>
                <p><strong>Analisis Awal:</strong> {selectedNC.initialAnalysis}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Pelapor: {selectedNC.reportedByName}</span>
                <span>Status: {selectedNC.status}</span>
              </div>
            </div>

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
                {selectedNC.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolveNC(selectedNC)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                  >
                    Tandai Selesai (Resolved)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNC(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium"
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
