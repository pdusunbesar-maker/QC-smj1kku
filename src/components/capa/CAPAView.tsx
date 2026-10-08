import React, { useState } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  FileCheck, 
  ShieldCheck, 
  X,
  ExternalLink,
  Edit3,
  Trash2,
  AlertTriangle,
  Save
} from 'lucide-react';
import { CAPADetailView } from './CAPADetailView';
import { CAPA, QCResult, NonConformity } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

interface CAPAViewProps {
  capas: CAPA[];
  initialData?: { fromQc?: QCResult; fromNC?: NonConformity; prefill?: any };
  onCapaAdded: (newCapa: CAPA) => void;
  onCapaUpdated: (updated: CAPA) => void;
  onCapaDeleted?: (id: string) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const CAPAView: React.FC<CAPAViewProps> = ({
  capas,
  initialData,
  onCapaAdded,
  onCapaUpdated,
  onCapaDeleted,
  onNavigateToTab,
}) => {
  const { user, can } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(!!initialData?.fromQc || !!initialData?.fromNC || !!initialData?.prefill);
  const [selectedCapa, setSelectedCapa] = useState<CAPA | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit CAPA Modal State
  const [editingCapa, setEditingCapa] = useState<CAPA | null>(null);
  const [editCapaForm, setEditCapaForm] = useState<Partial<CAPA>>({});

  // Delete CAPA State
  const [capaToDelete, setCapaToDelete] = useState<CAPA | null>(null);

  // Form State for new CAPA
  const todayStr = new Date().toISOString().split('T')[0];
  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  const [source, setSource] = useState<CAPA['source']>(
    initialData?.prefill?.source || (initialData?.fromQc ? 'Pelanggaran Westgard' : initialData?.fromNC ? 'Non-Conformity' : 'QC Gagal')
  );
  const [department, setDepartment] = useState(initialData?.prefill?.department || 'Instalasi Patologi Klinik - Kimia Darah');
  const [pic, setPic] = useState(initialData?.prefill?.pic || user.name);
  const [problemStatement, setProblemStatement] = useState(
    initialData?.prefill?.problemStatement || (
    initialData?.fromQc
      ? `Pelanggaran aturan QC pada ${initialData.fromQc.parameterName} (${initialData.fromQc.sdPosition})`
      : initialData?.fromNC
      ? `Ketidaksesuaian mutu #${initialData.fromNC.id}: ${initialData.fromNC.description}`
      : '')
  );
  const [nonConformityDescription, setNonConformityDescription] = useState(
    initialData?.prefill?.nonConformityDescription || (
    initialData?.fromQc
      ? `Terjadi pelanggaran aturan Westgard: ${initialData.fromQc.violations?.map(v => v.ruleName).join(', ')}. Target: ${initialData.fromQc.mean}, Hasil terukur: ${initialData.fromQc.value} ${initialData.fromQc.unit}.`
      : initialData?.fromNC
      ? initialData.fromNC.description
      : '')
  );
  const [supportingEvidence, setSupportingEvidence] = useState('Grafik Levey-Jennings dan rekam suhu instrumen');
  const [overallDueDate, setOverallDueDate] = useState(nextTwoWeeks);

  const canManage = can('manage_capa') || user.role === 'admin' || user.role === 'supervisor';
  const todayMs = new Date().setHours(0,0,0,0);

  const filteredCapas = capas.filter(c => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const isOverdue = new Date(c.overallDueDate).getTime() < todayMs && c.status !== 'closed';
        if (!isOverdue) return false;
      } else if (c.status !== statusFilter) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.problemStatement.toLowerCase().includes(q) ||
        c.pic.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateCapa = (e: React.FormEvent) => {
    e.preventDefault();

    const newCapa: CAPA = {
      id: `CAPA-${new Date().getFullYear()}-${String(capas.length + 1).padStart(3, '0')}`,
      createdAt: todayStr,
      source,
      department,
      pic,
      problemStatement,
      nonConformityDescription,
      supportingEvidence,
      rcaMethod: 'Kombinasi 5 Why & Fishbone',
      fishbone: initialData?.prefill?.fishbone || {
        man: [],
        machine: [],
        method: [],
        material: [],
        measurement: [],
        environment: [],
      },
      fiveWhy: {
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        rootCauseConclusion: '',
      },
      identifiedRootCause: '',
      correctiveActions: [
        {
          id: `ca-${Date.now()}-1`,
          description: 'Kalibrasi ulang parameter dan re-run kontrol baru',
          pic,
          dueDate: overallDueDate,
          status: 'pending',
        }
      ],
      preventiveActions: [
        {
          id: `pa-${Date.now()}-1`,
          description: 'Periksa jadwal pergantian reagen dan evaluasi suhu penyimpanan',
          pic,
          dueDate: overallDueDate,
          status: 'pending',
        }
      ],
      status: 'open',
      effectiveness: 'pending',
      overallDueDate,
      linkedQcResultId: initialData?.fromQc?.id,
      linkedNonConformityId: initialData?.prefill?.linkedNonConformityId || initialData?.fromNC?.id,
    };

    StorageService.saveCAPA(newCapa);
    StorageService.logAudit(
      'CREATE_CAPA',
      `Menerbitkan dokumen CAPA baru ${newCapa.id} (${newCapa.problemStatement}) oleh ${user.name}`,
      newCapa
    );

    onCapaAdded(newCapa);
    setShowCreateModal(false);
  };

  const handleOpenEditCapa = (c: CAPA) => {
    setEditingCapa(c);
    setEditCapaForm({ ...c });
  };

  const handleSaveEditCapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCapa) return;

    const updated: CAPA = {
      ...editingCapa,
      ...editCapaForm,
    } as CAPA;

    StorageService.saveCAPA(updated);
    StorageService.logAudit(
      'UPDATE_CAPA',
      `Mengubah dokumen CAPA #${updated.id} (${updated.problemStatement.substring(0, 40)}...) oleh ${user.name}`,
      updated,
      editingCapa
    );

    onCapaUpdated(updated);
    if (selectedCapa?.id === updated.id) {
      setSelectedCapa(updated);
    }
    setEditingCapa(null);
  };

  const handleConfirmDeleteCapa = () => {
    if (!capaToDelete) return;
    StorageService.deleteCAPA(capaToDelete.id);
    StorageService.logAudit(
      'DELETE_CAPA',
      `Menghapus dokumen CAPA #${capaToDelete.id} oleh ${user.name}`,
      null,
      capaToDelete
    );

    if (onCapaDeleted) {
      onCapaDeleted(capaToDelete.id);
    } else {
      onCapaUpdated(capaToDelete);
    }
    if (selectedCapa?.id === capaToDelete.id) {
      setSelectedCapa(null);
    }
    setCapaToDelete(null);
  };

  const handleVerifyEffectiveness = (
    capa: CAPA,
    effectiveness: CAPA['effectiveness'],
    method: string,
    result: string
  ) => {
    const isEff = effectiveness === 'effective';
    const updated: CAPA = {
      ...capa,
      effectiveness,
      verificationMethod: method,
      verificationResult: result,
      verificationDate: todayStr,
      verifier: user.id,
      verifierName: user.name,
      status: isEff ? 'closed' : 'open',
      closedAt: isEff ? new Date().toISOString().replace('T', ' ').substring(0, 19) : undefined,
    };

    StorageService.saveCAPA(updated);
    StorageService.logAudit(
      'CLOSE_CAPA',
      `Verifikasi efektivitas CAPA ${capa.id}: Status=${updated.status}, Efektivitas=${effectiveness}`,
      updated
    );

    onCapaUpdated(updated);
    if (selectedCapa?.id === capa.id) setSelectedCapa(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Corrective and Preventive Action (CAPA)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen siklus penanganan mutu: identifikasi masalah → investigasi RCA → tindakan korektif & preventif → verifikasi efektivitas penutupan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Dokumen CAPA Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'open', label: 'Open' },
            { id: 'action_in_progress', label: 'In Progress' },
            { id: 'pending_verification', label: 'Verifikasi' },
            { id: 'overdue', label: 'Overdue (Terlewat)' },
            { id: 'closed', label: 'Closed (Selesai)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                statusFilter === tab.id
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
            placeholder="Cari ID CAPA, PIC, masalah..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* CAPA Cards List */}
      <div className="space-y-4">
        {filteredCapas.map((capa) => {
          const isOverdue = new Date(capa.overallDueDate).getTime() < todayMs && capa.status !== 'closed';
          const completedCA = capa.correctiveActions.filter(a => a.status === 'completed').length;
          const completedPA = capa.preventiveActions.filter(a => a.status === 'completed').length;
          const totalActions = capa.correctiveActions.length + capa.preventiveActions.length;
          const completedTotal = completedCA + completedPA;
          const progressPercent = totalActions > 0 ? Math.round((completedTotal / totalActions) * 100) : 0;

          return (
            <div
              key={capa.id}
              className={`rounded-xl border bg-white p-5 shadow-xs transition-all ${
                isOverdue ? 'border-rose-300' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-indigo-950">
                      {capa.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {capa.source}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      capa.status === 'closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-800'
                        : capa.status === 'pending_verification'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isOverdue ? 'OVERDUE' : capa.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    {capa.problemStatement}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>PIC: <strong>{capa.pic}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Target: {capa.overallDueDate}</span>
                    </div>
                    <div className="text-slate-400">
                      Unit: {capa.department}
                    </div>
                  </div>
                </div>

                {/* Progress bar & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-full sm:w-48 text-right">
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-slate-500">Tindakan:</span>
                      <span className="font-bold text-slate-900">{completedTotal}/{totalActions} ({progressPercent}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('rca', { capaId: capa.id })}
                      className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="Buka Diagram Akar Masalah"
                    >
                      RCA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCapa(capa)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Kelola
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCapa(capa)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Dokumen CAPA"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCapaToDelete(capa)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Dokumen CAPA"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Create CAPA Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Inisiasi Dokumen CAPA Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCapa} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sumber CAPA *</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="Pelanggaran Westgard">Pelanggaran Aturan Westgard</option>
                    <option value="QC Gagal">QC Gagal / Out of Spec</option>
                    <option value="Non-Conformity">Laporan Non-Conformity</option>
                    <option value="Temuan Audit">Temuan Audit Internal/Eksternal</option>
                    <option value="Keluhan">Keluhan Klinisi / Pasien</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Departemen / Unit *</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Masalah / Judul CAPA *</label>
                <input
                  type="text"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  required
                  placeholder="Contoh: Terjadi pergeseran sistematik pada parameter Glucose CST-240..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uraian Detail Ketidaksesuaian</label>
                <textarea
                  rows={2}
                  value={nonConformityDescription}
                  onChange={(e) => setNonConformityDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penanggung Jawab (PIC) *</label>
                  <input
                    type="text"
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Selesai (Due Date) *</label>
                  <input
                    type="date"
                    value={overallDueDate}
                    onChange={(e) => setOverallDueDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bukti Pendukung</label>
                <input
                  type="text"
                  value={supportingEvidence}
                  onChange={(e) => setSupportingEvidence(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                >
                  Buat Dokumen CAPA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit CAPA Modal */}
      {editingCapa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit Dokumen CAPA #{editingCapa.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui informasi sasaran mutu dan rencana tindakan korektif
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCapa(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCapa} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status CAPA</label>
                  <select
                    value={editCapaForm.status || 'open'}
                    onChange={(e) => setEditCapaForm({ ...editCapaForm, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white font-semibold"
                  >
                    <option value="open">Open (Terbuka)</option>
                    <option value="action_in_progress">Action in Progress</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="closed">Closed (Selesai)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Selesai (Due Date)</label>
                  <input
                    type="date"
                    value={editCapaForm.overallDueDate || ''}
                    onChange={(e) => setEditCapaForm({ ...editCapaForm, overallDueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul / Pernyataan Masalah *</label>
                <input
                  type="text"
                  value={editCapaForm.problemStatement || ''}
                  onChange={(e) => setEditCapaForm({ ...editCapaForm, problemStatement: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Ketidaksesuaian</label>
                <textarea
                  rows={2}
                  value={editCapaForm.nonConformityDescription || ''}
                  onChange={(e) => setEditCapaForm({ ...editCapaForm, nonConformityDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIC (Penanggung Jawab)</label>
                  <input
                    type="text"
                    value={editCapaForm.pic || ''}
                    onChange={(e) => setEditCapaForm({ ...editCapaForm, pic: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Departemen / Unit</label>
                  <input
                    type="text"
                    value={editCapaForm.department || ''}
                    onChange={(e) => setEditCapaForm({ ...editCapaForm, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kesimpulan Akar Masalah (Root Cause)</label>
                <textarea
                  rows={2}
                  value={editCapaForm.identifiedRootCause || ''}
                  onChange={(e) => setEditCapaForm({ ...editCapaForm, identifiedRootCause: e.target.value })}
                  placeholder="Isi kesimpulan akar masalah dari hasil analisis RCA..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCapa(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Detail & Management Modal */}
      {selectedCapa && (
        <CAPADetailView
          capa={selectedCapa}
          onClose={() => setSelectedCapa(null)}
          onEdit={(c) => {
            setSelectedCapa(null);
            handleOpenEditCapa(c);
          }}
          onDelete={(c) => {
            setSelectedCapa(null);
            setCapaToDelete(c);
          }}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* 4. Delete CAPA Confirmation Modal */}
      {capaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Konfirmasi Hapus Dokumen CAPA
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: #{capaToDelete.id}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-2">
              <p className="text-slate-800">
                Apakah Anda yakin ingin menghapus dokumen CAPA <strong>"{capaToDelete.problemStatement}"</strong>?
              </p>
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                ⚠️ Seluruh histori rencana tindakan korektif dan diagram RCA terkait akan dihapus dari sistem.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCapaToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCapa}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Hapus Dokumen CAPA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
