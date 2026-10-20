import React, { useState } from 'react';
import { CAPA, CAPAActionItem, CAPAStatus } from '../../types';
import { 
  X, 
  FolderGit2, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  ExternalLink,
  ArrowRight,
  Plus,
  Save,
  Check,
  RotateCcw,
  Printer,
  FileText,
  User,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { getLocalDateString, getLocalTimeString } from '../../utils/dateUtils';

interface CAPADetailViewProps {
  capa: CAPA;
  onClose: () => void;
  onEdit: (capa: CAPA) => void;
  onDelete: (capa: CAPA) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
  onCapaUpdated?: (updated: CAPA) => void;
}

export const CAPADetailView: React.FC<CAPADetailViewProps> = ({ 
  capa: initialCapa, 
  onClose, 
  onEdit, 
  onDelete, 
  onNavigateToTab,
  onCapaUpdated 
}) => {
  const { user, can } = useAuth();
  const [currentCapa, setCurrentCapa] = useState<CAPA>(initialCapa);
  const [activeTab, setActiveTab] = useState<'overview' | 'corrective' | 'preventive' | 'rca' | 'containment' | 'effectiveness' | 'print'>('overview');

  // Form for adding new action item
  const [newActionType, setNewActionType] = useState<'corrective' | 'preventive'>('corrective');
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionPic, setNewActionPic] = useState(user.name);
  const [newActionDueDate, setNewActionDueDate] = useState(getLocalDateString());
  const [showAddActionModal, setShowAddActionModal] = useState(false);

  // Form for editing action note
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionNotesInput, setActionNotesInput] = useState('');
  const [actionCompletedDateInput, setActionCompletedDateInput] = useState(getLocalDateString());

  // Form for Immediate Containment
  const [containmentAction, setContainmentAction] = useState('');
  const [containmentTakenBy, setContainmentTakenBy] = useState(user.name);

  // Form for Effectiveness Verification
  const [effStatus, setEffStatus] = useState<CAPA['effectiveness']>(currentCapa.effectiveness || 'effective');
  const [effMethod, setEffMethod] = useState(currentCapa.verificationMethod || 'Pemantauan grafik Levey-Jennings selama 14 hari berturut-turut pasca perbaikan dan evaluasi presisi kontrol.');
  const [effResult, setEffResult] = useState(currentCapa.verificationResult || 'Hasil kontrol harian konsisten dalam rentang ±1 SD, tidak ada pelanggaran Westgard, akurasi & presisi telah kembali optimal.');
  const [effVerifier, setEffVerifier] = useState(currentCapa.verifierName || user.name);
  const [effDate, setEffDate] = useState(currentCapa.verificationDate || getLocalDateString());

  const canManage = can('manage_capa') || user.role === 'admin' || user.role === 'supervisor';

  // Helper to persist updates
  const saveUpdatedCapa = (updated: CAPA, auditAction: string, auditDetail: string) => {
    setCurrentCapa(updated);
    StorageService.saveCAPA(updated);
    StorageService.logAudit(
      auditAction,
      `${auditDetail} (CAPA #${updated.id}) oleh ${user.name}`,
      updated
    );
    if (onCapaUpdated) {
      onCapaUpdated(updated);
    }
  };

  // Status mapping
  const normalizedStatus = (currentCapa.status || 'open').toLowerCase();
  const isClosed = normalizedStatus === 'closed';
  const isPendingVerification = normalizedStatus === 'pending_verification' || normalizedStatus === 'waiting_review';
  const isInProgress = normalizedStatus === 'action_in_progress' || normalizedStatus === 'investigation' || normalizedStatus === 'in_progress';
  const isOpen = normalizedStatus === 'open' || normalizedStatus === 'draft';

  // Action calculations
  const corrective = currentCapa.correctiveActions || [];
  const preventive = currentCapa.preventiveActions || [];
  const allActions = [...corrective, ...preventive];
  const completedActions = allActions.filter(a => a.status === 'completed');
  const progressPercent = allActions.length > 0 ? Math.round((completedActions.length / allActions.length) * 100) : 0;

  // Workflow Handlers
  const handleStartInvestigation = () => {
    const updated: CAPA = {
      ...currentCapa,
      status: 'action_in_progress',
    };
    saveUpdatedCapa(updated, 'UPDATE_CAPA_WORKFLOW', 'Memulai investigasi dan pelaksanaan tindakan perbaikan');
    setActiveTab('corrective');
  };

  const handleRequestVerification = () => {
    const updated: CAPA = {
      ...currentCapa,
      status: 'pending_verification',
    };
    saveUpdatedCapa(updated, 'UPDATE_CAPA_WORKFLOW', 'Mengajukan dokumen CAPA ke tahap verifikasi efektivitas');
    setActiveTab('effectiveness');
  };

  const handleVerifyAndClose = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isEffective = effStatus === 'effective';
    const updated: CAPA = {
      ...currentCapa,
      effectiveness: effStatus,
      verificationMethod: effMethod,
      verificationResult: effResult,
      verificationDate: effDate,
      verifier: user.id,
      verifierName: effVerifier,
      status: isEffective ? 'closed' : 'action_in_progress',
      closedAt: isEffective ? `${effDate} ${getLocalTimeString()}` : undefined,
    };

    saveUpdatedCapa(
      updated,
      isEffective ? 'CLOSE_CAPA' : 'UPDATE_CAPA_WORKFLOW',
      isEffective 
        ? `Menutup dan menyelesaikan CAPA (Hasil: Efektif)`
        : `Verifikasi CAPA dievaluasi '${effStatus}', dikembalikan ke tahap tindakan`
    );
    if (isEffective) {
      setActiveTab('overview');
    }
  };

  const handleReopenCapa = () => {
    const updated: CAPA = {
      ...currentCapa,
      status: 'action_in_progress',
      closedAt: undefined,
      effectiveness: 'pending',
    };
    saveUpdatedCapa(updated, 'REOPEN_CAPA', 'Membuka kembali dokumen CAPA untuk evaluasi lanjutan');
    setActiveTab('overview');
  };

  // Action status toggles
  const handleToggleActionStatus = (type: 'corrective' | 'preventive', actionId: string) => {
    const targetList = type === 'corrective' ? [...corrective] : [...preventive];
    const itemIndex = targetList.findIndex(a => a.id === actionId);
    if (itemIndex === -1) return;

    const currentItem = targetList[itemIndex];
    let nextStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
    let completedDate = currentItem.completedDate;

    if (currentItem.status === 'pending') {
      nextStatus = 'in_progress';
    } else if (currentItem.status === 'in_progress') {
      nextStatus = 'completed';
      completedDate = getLocalDateString();
    } else {
      nextStatus = 'pending';
      completedDate = undefined;
    }

    targetList[itemIndex] = {
      ...currentItem,
      status: nextStatus,
      completedDate,
    };

    const updated: CAPA = {
      ...currentCapa,
      [type === 'corrective' ? 'correctiveActions' : 'preventiveActions']: targetList,
    };

    saveUpdatedCapa(
      updated, 
      'UPDATE_CAPA_ACTION', 
      `Mengubah status tindakan ${type === 'corrective' ? 'korektif' : 'preventif'} #${actionId} menjadi '${nextStatus}'`
    );
  };

  // Add Action Item
  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionDesc.trim()) return;

    const newItem: CAPAActionItem = {
      id: `${newActionType === 'corrective' ? 'ca' : 'pa'}-${Date.now()}`,
      description: newActionDesc.trim(),
      pic: newActionPic.trim() || user.name,
      dueDate: newActionDueDate || getLocalDateString(),
      status: 'pending',
    };

    const updated: CAPA = {
      ...currentCapa,
      [newActionType === 'corrective' ? 'correctiveActions' : 'preventiveActions']: [
        ...(newActionType === 'corrective' ? corrective : preventive),
        newItem
      ]
    };

    saveUpdatedCapa(
      updated, 
      'ADD_CAPA_ACTION', 
      `Menambahkan butir tindakan ${newActionType === 'corrective' ? 'korektif' : 'preventif'}: "${newItem.description}"`
    );

    setNewActionDesc('');
    setShowAddActionModal(false);
  };

  // Save Action Notes
  const handleSaveActionNotes = (type: 'corrective' | 'preventive', actionId: string) => {
    const targetList = type === 'corrective' ? [...corrective] : [...preventive];
    const itemIndex = targetList.findIndex(a => a.id === actionId);
    if (itemIndex === -1) return;

    targetList[itemIndex] = {
      ...targetList[itemIndex],
      notes: actionNotesInput,
      completedDate: actionCompletedDateInput || targetList[itemIndex].completedDate,
      status: 'completed',
    };

    const updated: CAPA = {
      ...currentCapa,
      [type === 'corrective' ? 'correctiveActions' : 'preventiveActions']: targetList,
    };

    saveUpdatedCapa(
      updated, 
      'UPDATE_CAPA_ACTION_NOTES', 
      `Menyimpan catatan hasil pelaksanaan tindakan #${actionId}`
    );

    setEditingActionId(null);
  };

  // Add containment action
  const handleAddContainment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!containmentAction.trim()) return;

    const newContainment = {
      actionTaken: containmentAction.trim(),
      takenBy: containmentTakenBy || user.name,
      dateTime: `${getLocalDateString()} ${getLocalTimeString()}`
    };

    const updated: CAPA = {
      ...currentCapa,
      immediateContainment: [...(currentCapa.immediateContainment || []), newContainment]
    };

    saveUpdatedCapa(updated, 'ADD_CAPA_CONTAINMENT', `Mencatat tindakan penanggulangan segera: "${newContainment.actionTaken}"`);
    setContainmentAction('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl my-6 max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 ${
              isClosed 
                ? 'bg-emerald-600' 
                : isPendingVerification 
                ? 'bg-indigo-600' 
                : isInProgress 
                ? 'bg-amber-600' 
                : 'bg-slate-700'
            }`}>
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                  Dokumen CAPA #{currentCapa.id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isClosed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isPendingVerification
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    : isInProgress
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-800 border border-slate-300'
                }`}>
                  {normalizedStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Sumber: <strong>{currentCapa.source}</strong> · Prioritas: <strong className="text-rose-600">{currentCapa.priority || 'HIGH'}</strong> · Batas Waktu: <strong>{currentCapa.overallDueDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(currentCapa)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Edit Dokumen"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(currentCapa)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Hapus Dokumen"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* WORKFLOW LIFECYCLE STEPPER (Open -> In Progress -> Verification -> Closed) */}
        <div className="my-4 p-3.5 bg-gradient-to-r from-slate-50 via-slate-100/70 to-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Siklus Alur Penanganan CAPA (ISO 15189)
            </span>
            <span className="font-mono text-slate-500">
              Progres Tindakan: <strong>{completedActions.length}/{allActions.length} Selesai ({progressPercent}%)</strong>
            </span>
          </div>

          {/* Stepper Steps */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Step 1: Open */}
            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
              isOpen 
                ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-2xs' 
                : 'bg-white/80 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1">
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isOpen ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>1</span>
                <span>Open (Terbit)</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5">Masalah Diidentifikasi</span>
            </div>

            {/* Step 2: In Progress */}
            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
              isInProgress 
                ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs' 
                : completedActions.length > 0 && (isPendingVerification || isClosed)
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-white/80 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1">
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isInProgress ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>2</span>
                <span>Dilaksanakan</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5">Tindakan Berjalan</span>
            </div>

            {/* Step 3: Pending Verification */}
            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
              isPendingVerification 
                ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-2xs' 
                : 'bg-white/80 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1">
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isPendingVerification ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>3</span>
                <span>Verifikasi</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5">Uji Efektivitas QC</span>
            </div>

            {/* Step 4: Closed */}
            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
              isClosed 
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-2xs' 
                : 'bg-white/80 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1">
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isClosed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>4</span>
                <span>Selesai (Closed)</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-0.5">Tuntas & Terbukti</span>
            </div>
          </div>

          {/* Quick Workflow Action Button based on Current State */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              {isOpen && <span>Dokumen masih berstatus <strong>OPEN</strong>. Klik tombol untuk memulai pelaksanaan tindakan.</span>}
              {isInProgress && <span>Status <strong>SEDANG DILAKSANAKAN</strong>. Laksanakan butir tindakan korektif & preventif hingga selesai.</span>}
              {isPendingVerification && <span>Status <strong>MENUNGGU VERIFIKASI</strong>. Evaluasi data mutu dan verifikasi efektivitas untuk menutup dokumen.</span>}
              {isClosed && <span className="text-emerald-800 font-semibold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Dokumen CAPA telah selesai ditutup pada {currentCapa.closedAt || currentCapa.verificationDate}.</span>}
            </div>

            <div className="flex items-center gap-2">
              {isOpen && (
                <button
                  type="button"
                  onClick={handleStartInvestigation}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Mulai Pelaksanaan Tindakan</span>
                </button>
              )}

              {isInProgress && (
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Ajukan ke Verifikasi Efektivitas</span>
                </button>
              )}

              {isPendingVerification && (
                <button
                  type="button"
                  onClick={() => setActiveTab('effectiveness')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Isi Form Verifikasi & Tutup CAPA</span>
                </button>
              )}

              {isClosed && canManage && (
                <button
                  type="button"
                  onClick={handleReopenCapa}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Buka kembali dokumen jika terdeteksi masalah berulang"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Buka Kembali (Reopen)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 mb-4 text-xs font-semibold">
          {[
            { id: 'overview', label: '1. Ringkasan & Alur' },
            { id: 'corrective', label: `2. Tindakan Korektif (${corrective.length})` },
            { id: 'preventive', label: `3. Tindakan Preventif (${preventive.length})` },
            { id: 'rca', label: '4. Investigasi & RCA' },
            { id: 'containment', label: `5. Penanggulangan (${currentCapa.immediateContainment?.length || 0})` },
            { id: 'effectiveness', label: '6. Verifikasi & Penutupan' },
            { id: 'print', label: '7. Pratinjau Cetak ISO' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB CONTENTS (Scrollable area) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-mono">Problem Statement</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{currentCapa.problemStatement}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-mono">Departemen / Unit</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{currentCapa.department}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-mono">Penanggung Jawab (PIC)</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{currentCapa.pic}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-mono">Batas Waktu Penyelesaian</span>
                  <p className="font-bold text-indigo-700 font-mono mt-0.5">{currentCapa.overallDueDate}</p>
                </div>
              </div>

              {/* Description & Evidence */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-slate-500" />
                  Uraian Ketidaksesuaian / Penyimpangan
                </h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {currentCapa.nonConformityDescription}
                </p>
                {currentCapa.supportingEvidence && (
                  <p className="text-[11px] text-slate-500">
                    <strong>Bukti Pendukung:</strong> {currentCapa.supportingEvidence}
                  </p>
                )}
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-900 uppercase">Tindakan Korektif</span>
                  <div className="text-xl font-mono font-bold text-blue-900 mt-1">
                    {corrective.filter(c => c.status === 'completed').length} / {corrective.length}
                  </div>
                  <p className="text-[10px] text-blue-700 mt-0.5">Tindakan perbaikan langsung</p>
                </div>

                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <span className="text-[11px] font-bold text-purple-900 uppercase">Tindakan Preventif</span>
                  <div className="text-xl font-mono font-bold text-purple-900 mt-1">
                    {preventive.filter(p => p.status === 'completed').length} / {preventive.length}
                  </div>
                  <p className="text-[10px] text-purple-700 mt-0.5">Pencegahan masalah berulang</p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">Status Efektivitas</span>
                  <div className="text-sm font-bold text-emerald-900 mt-1 capitalize">
                    {currentCapa.effectiveness || 'Menunggu Verifikasi'}
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {currentCapa.verifierName ? `Diverifikasi: ${currentCapa.verifierName}` : 'Belum diverifikasi'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CORRECTIVE ACTIONS */}
          {activeTab === 'corrective' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Daftar Tindakan Korektif (Corrective Actions)</h4>
                  <p className="text-slate-500">Tindakan langsung untuk mengoreksi ketidaksesuaian yang sedang terjadi.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewActionType('corrective');
                    setShowAddActionModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Tindakan Korektif</span>
                </button>
              </div>

              {corrective.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                  Belum ada butir tindakan korektif. Klik tombol di atas untuk menambahkan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {corrective.map((item, idx) => {
                    const isDone = item.status === 'completed';
                    const inProg = item.status === 'in_progress';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDone 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : inProg 
                            ? 'bg-blue-50/50 border-blue-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isDone 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : inProg 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.status.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                PIC: <strong>{item.pic}</strong> · Target: <strong>{item.dueDate}</strong>
                              </span>
                              {item.completedDate && (
                                <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                                  ✓ Selesai: {item.completedDate}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 text-sm">{item.description}</p>
                            {item.notes && (
                              <p className="text-slate-600 bg-white/80 p-2 rounded border border-slate-200 font-mono text-[11px]">
                                Catatan Hasil: {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Action Status Controls */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleActionStatus('corrective', item.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                                isDone
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : inProg
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Selesai Dilaksanakan</span>
                                </>
                              ) : inProg ? (
                                <>
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Sedang Dilaksanakan</span>
                                </>
                              ) : (
                                <>
                                  <span>Mulai Laksanakan</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingActionId(item.id);
                                setActionNotesInput(item.notes || '');
                                setActionCompletedDateInput(item.completedDate || getLocalDateString());
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                              title="Tulis Catatan Pelaksanaan"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Note Editor */}
                        {editingActionId === item.id && (
                          <div className="mt-3 pt-3 border-t border-slate-200 bg-white p-3 rounded-lg border space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">Catat Hasil Pelaksanaan Tindakan:</span>
                              <input
                                type="date"
                                value={actionCompletedDateInput}
                                onChange={(e) => setActionCompletedDateInput(e.target.value)}
                                className="border rounded px-2 py-1 text-xs font-mono"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={actionNotesInput}
                              onChange={(e) => setActionNotesInput(e.target.value)}
                              placeholder="Contoh: Kalibrasi ulang berhasil, slope 0.998, kontrol level 1 terukur 102.1 mg/dL dalam rentang target."
                              className="w-full rounded border border-slate-200 p-2 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingActionId(null)}
                                className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveActionNotes('corrective', item.id)}
                                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                              >
                                Simpan Catatan & Tandai Selesai
                              </button>
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

          {/* TAB 3: PREVENTIVE ACTIONS */}
          {activeTab === 'preventive' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Daftar Tindakan Preventif (Preventive Actions)</h4>
                  <p className="text-slate-500">Tindakan pencegahan jangka panjang agar ketidaksesuaian serupa tidak terulang kembali.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewActionType('preventive');
                    setShowAddActionModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Tindakan Preventif</span>
                </button>
              </div>

              {preventive.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                  Belum ada butir tindakan preventif. Klik tombol di atas untuk menambahkan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {preventive.map((item, idx) => {
                    const isDone = item.status === 'completed';
                    const inProg = item.status === 'in_progress';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDone 
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : inProg 
                            ? 'bg-blue-50/50 border-blue-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isDone 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : inProg 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.status.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                PIC: <strong>{item.pic}</strong> · Target: <strong>{item.dueDate}</strong>
                              </span>
                              {item.completedDate && (
                                <span className="text-[11px] text-emerald-700 font-mono font-semibold">
                                  ✓ Selesai: {item.completedDate}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 text-sm">{item.description}</p>
                            {item.notes && (
                              <p className="text-slate-600 bg-white/80 p-2 rounded border border-slate-200 font-mono text-[11px]">
                                Catatan Hasil: {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Action Status Controls */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleActionStatus('preventive', item.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                                isDone
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : inProg
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Selesai Dilaksanakan</span>
                                </>
                              ) : inProg ? (
                                <>
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Sedang Dilaksanakan</span>
                                </>
                              ) : (
                                <>
                                  <span>Mulai Laksanakan</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingActionId(item.id);
                                setActionNotesInput(item.notes || '');
                                setActionCompletedDateInput(item.completedDate || getLocalDateString());
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                              title="Tulis Catatan Pelaksanaan"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Note Editor */}
                        {editingActionId === item.id && (
                          <div className="mt-3 pt-3 border-t border-slate-200 bg-white p-3 rounded-lg border space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">Catat Hasil Pelaksanaan Tindakan:</span>
                              <input
                                type="date"
                                value={actionCompletedDateInput}
                                onChange={(e) => setActionCompletedDateInput(e.target.value)}
                                className="border rounded px-2 py-1 text-xs font-mono"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={actionNotesInput}
                              onChange={(e) => setActionNotesInput(e.target.value)}
                              placeholder="Contoh: Jadwal pemeliharaan mingguan telah diperbarui di logbook instrumen, SOP telah disosialisasikan ke staf."
                              className="w-full rounded border border-slate-200 p-2 text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingActionId(null)}
                                className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveActionNotes('preventive', item.id)}
                                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                              >
                                Simpan Catatan & Tandai Selesai
                              </button>
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

          {/* TAB 4: ROOT CAUSE ANALYSIS (RCA) */}
          {activeTab === 'rca' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Analisis Akar Masalah (Root Cause Analysis)</h4>
                  <p className="text-slate-500">Metode: <strong>{currentCapa.rcaMethod || 'Kombinasi 5 Why & Fishbone'}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToTab('rca', { capaId: currentCapa.id });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1.5 transition-colors border border-indigo-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Editor Diagram Fishbone & 5-Why Penuh</span>
                </button>
              </div>

              {/* Root Cause Conclusion */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800">Kesimpulan Akar Masalah (Identified Root Cause):</label>
                <p className="text-slate-800 font-semibold bg-white p-3 rounded-lg border border-slate-200">
                  {currentCapa.identifiedRootCause || 'Belum dirumuskan. Buka tab RCA untuk memetakan diagram 5-Why dan Fishbone Ishikawa.'}
                </p>
              </div>

              {/* 5-Why Snapshot */}
              {currentCapa.fiveWhy && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900">Ringkasan Analisis 5-Why:</h5>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-700">
                    {currentCapa.fiveWhy.why1 && <p><strong>Why 1:</strong> {currentCapa.fiveWhy.why1}</p>}
                    {currentCapa.fiveWhy.why2 && <p><strong>Why 2:</strong> {currentCapa.fiveWhy.why2}</p>}
                    {currentCapa.fiveWhy.why3 && <p><strong>Why 3:</strong> {currentCapa.fiveWhy.why3}</p>}
                    {currentCapa.fiveWhy.why4 && <p><strong>Why 4:</strong> {currentCapa.fiveWhy.why4}</p>}
                    {currentCapa.fiveWhy.why5 && <p><strong>Why 5:</strong> {currentCapa.fiveWhy.why5}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IMMEDIATE CONTAINMENT */}
          {activeTab === 'containment' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Tindakan Penanggulangan Cepat (Immediate Containment)</h4>
                  <p className="text-slate-500">Tindakan segera untuk mengamankan sampel pasien dan mencegah hasil salah terdistribusi.</p>
                </div>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddContainment} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800">Catat Tindakan Darurat Baru:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={containmentAction}
                    onChange={(e) => setContainmentAction(e.target.value)}
                    placeholder="Contoh: Hold hasil tes pasien jam 08:00-09:30, isolasi botol reagen lot lama..."
                    required
                    className="sm:col-span-2 rounded border border-slate-200 p-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={containmentTakenBy}
                      onChange={(e) => setContainmentTakenBy(e.target.value)}
                      placeholder="Petugas pelaksana"
                      className="rounded border border-slate-200 p-2 text-xs flex-1"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </form>

              {/* List */}
              <div className="space-y-2">
                {(currentCapa.immediateContainment || []).map((c, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{c.actionTaken}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">Dilakukan oleh: {c.takenBy} · {c.dateTime}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: EFFECTIVENESS & CLOSING */}
          {activeTab === 'effectiveness' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl border bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-indigo-200">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Verifikasi Efektivitas Tindakan Perbaikan & Pencegahan (ISO 15189)
                </h4>
                <p className="text-slate-500 mt-1">
                  Evaluasi menyeluruh apakah tindakan korektif dan preventif berhasil menyelesaikan akar masalah dan menjamin mutu hasil laboratorium stabil dalam kontrol.
                </p>
              </div>

              {isClosed ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>DOKUMEN CAPA RESMI DITUTUP (CLOSED & VERIFIED EFFECTIVE)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-emerald-200 font-mono">
                    <div><strong>Status Efektivitas:</strong> {currentCapa.effectiveness?.toUpperCase()}</div>
                    <div><strong>Tanggal Penutupan:</strong> {currentCapa.closedAt || currentCapa.verificationDate}</div>
                    <div><strong>Verifikator:</strong> {currentCapa.verifierName || 'Supervisor Lab'}</div>
                    <div><strong>Metode:</strong> {currentCapa.verificationMethod}</div>
                  </div>
                  <p><strong>Hasil Verifikasi:</strong> {currentCapa.verificationResult}</p>
                  
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('print')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Cetak Berita Acara CAPA</span>
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={handleReopenCapa}
                        className="px-4 py-2 rounded-xl border border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-semibold"
                      >
                        Buka Kembali (Reopen)
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVerifyAndClose} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Status Evaluasi Efektivitas *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'effective', label: 'Efektif (Tutup CAPA)', desc: 'Akar masalah tuntas teratasi', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                        { id: 'partially_effective', label: 'Efektif Sebagian', desc: 'Perlu tindakan tambahan', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                        { id: 'not_effective', label: 'Tidak Efektif', desc: 'Perlu perumusan ulang RCA', color: 'border-rose-500 bg-rose-50 text-rose-900' },
                      ].map(opt => (
                        <div
                          key={opt.id}
                          onClick={() => setEffStatus(opt.id as any)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            effStatus === opt.id ? opt.color : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold">{opt.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Metode Verifikasi Mutu *
                    </label>
                    <input
                      type="text"
                      value={effMethod}
                      onChange={(e) => setEffMethod(e.target.value)}
                      required
                      placeholder="Contoh: Pemantauan QC Levey-Jennings 14 hari, uji presisi kontrol duplikat..."
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Rincian Hasil Pengujian & Verifikasi *
                    </label>
                    <textarea
                      rows={3}
                      value={effResult}
                      onChange={(e) => setEffResult(e.target.value)}
                      required
                      placeholder="Tuliskan bukti angka data kontrol, Z-score, status instrumen, dan jaminan klinis..."
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Verifikator (Penanggung Jawab)</label>
                      <input
                        type="text"
                        value={effVerifier}
                        onChange={(e) => setEffVerifier(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Tanggal Verifikasi</label>
                      <input
                        type="date"
                        value={effDate}
                        onChange={(e) => setEffDate(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verifikasi & Selesaikan Dokumen CAPA (CLOSED)</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 7: PRINT PREVIEW */}
          {activeTab === 'print' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Format Formulir Cetak Dokumen Mutu ISO 15189</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>

              {/* Printable sheet */}
              <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-4 font-serif text-slate-900">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h3 className="font-bold text-base tracking-wider uppercase">LABORATORIUM PATOLOGI KLINIK</h3>
                  <h4 className="font-bold text-lg uppercase tracking-tight">FORMULIR TINDAKAN KOREKTIF & PREVENTIF (CAPA)</h4>
                  <p className="text-[11px] font-sans text-slate-600">Standar Akreditasi ISO 15189:2022 Klausul 8.7</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-300 pb-3">
                  <div><strong>Nomor Dokumen:</strong> {currentCapa.id}</div>
                  <div><strong>Tanggal Terbit:</strong> {currentCapa.createdAt}</div>
                  <div><strong>Departemen / Unit:</strong> {currentCapa.department}</div>
                  <div><strong>PIC / Pelapor:</strong> {currentCapa.pic}</div>
                  <div><strong>Sumber Ketidaksesuaian:</strong> {currentCapa.source}</div>
                  <div><strong>Batas Waktu Penyelesaian:</strong> {currentCapa.overallDueDate}</div>
                </div>

                <div className="space-y-1 font-sans">
                  <strong>I. Uraian Masalah & Ketidaksesuaian:</strong>
                  <p className="p-2.5 bg-slate-50 border rounded text-xs">{currentCapa.nonConformityDescription}</p>
                </div>

                <div className="space-y-1 font-sans">
                  <strong>II. Kesimpulan Akar Masalah (RCA):</strong>
                  <p className="p-2.5 bg-slate-50 border rounded text-xs">{currentCapa.identifiedRootCause || '-'}</p>
                </div>

                <div className="space-y-2 font-sans">
                  <strong>III. Pelaksanaan Tindakan Korektif (Corrective Actions):</strong>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-1 text-left">No</th>
                        <th className="border border-slate-300 p-1 text-left">Tindakan Koreksi</th>
                        <th className="border border-slate-300 p-1 text-left">PIC</th>
                        <th className="border border-slate-300 p-1 text-left">Target</th>
                        <th className="border border-slate-300 p-1 text-left">Status</th>
                        <th className="border border-slate-300 p-1 text-left">Tanggal Selesai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrective.map((c, i) => (
                        <tr key={c.id}>
                          <td className="border border-slate-300 p-1 font-mono">{i + 1}</td>
                          <td className="border border-slate-300 p-1">{c.description}</td>
                          <td className="border border-slate-300 p-1">{c.pic}</td>
                          <td className="border border-slate-300 p-1 font-mono">{c.dueDate}</td>
                          <td className="border border-slate-300 p-1 font-bold uppercase">{c.status}</td>
                          <td className="border border-slate-300 p-1 font-mono">{c.completedDate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 font-sans">
                  <strong>IV. Pelaksanaan Tindakan Preventif (Preventive Actions):</strong>
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-1 text-left">No</th>
                        <th className="border border-slate-300 p-1 text-left">Tindakan Pencegahan</th>
                        <th className="border border-slate-300 p-1 text-left">PIC</th>
                        <th className="border border-slate-300 p-1 text-left">Target</th>
                        <th className="border border-slate-300 p-1 text-left">Status</th>
                        <th className="border border-slate-300 p-1 text-left">Tanggal Selesai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preventive.map((p, i) => (
                        <tr key={p.id}>
                          <td className="border border-slate-300 p-1 font-mono">{i + 1}</td>
                          <td className="border border-slate-300 p-1">{p.description}</td>
                          <td className="border border-slate-300 p-1">{p.pic}</td>
                          <td className="border border-slate-300 p-1 font-mono">{p.dueDate}</td>
                          <td className="border border-slate-300 p-1 font-bold uppercase">{p.status}</td>
                          <td className="border border-slate-300 p-1 font-mono">{p.completedDate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-300 font-sans space-y-1">
                  <strong>V. Hasil Evaluasi Efektivitas & Penutupan:</strong>
                  <div className="p-2.5 bg-slate-50 border rounded text-xs space-y-1">
                    <p><strong>Status Efektivitas:</strong> {currentCapa.effectiveness?.toUpperCase() || 'PENDING'}</p>
                    <p><strong>Metode Verifikasi:</strong> {currentCapa.verificationMethod || '-'}</p>
                    <p><strong>Hasil Pengujian:</strong> {currentCapa.verificationResult || '-'}</p>
                    <p><strong>Verifikator:</strong> {currentCapa.verifierName || '-'} ({currentCapa.verificationDate || '-'})</p>
                  </div>
                </div>

                {/* Signature box */}
                <div className="grid grid-cols-2 gap-8 pt-6 font-sans text-center text-xs">
                  <div>
                    <p className="text-slate-500 mb-12">Petugas Pembuat CAPA,</p>
                    <p className="font-bold underline">{currentCapa.pic}</p>
                    <p className="text-[11px] text-slate-500">Staf Analis Lab</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-12">Diverifikasi & Disetujui,</p>
                    <p className="font-bold underline">{currentCapa.verifierName || 'Manajer Mutu / Supervisor'}</p>
                    <p className="text-[11px] text-slate-500">Penanggung Jawab Laboratorium</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Tambah Tindakan Baru */}
        {showAddActionModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl border space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Tambah Tindakan {newActionType === 'corrective' ? 'Korektif' : 'Preventif'} Baru
                </h4>
                <button type="button" onClick={() => setShowAddActionModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddAction} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Rincian Tindakan *</label>
                  <textarea
                    rows={3}
                    value={newActionDesc}
                    onChange={(e) => setNewActionDesc(e.target.value)}
                    required
                    placeholder={newActionType === 'corrective' ? 'Contoh: Rekonstitusi kontrol baru, kalibrasi ulang panjang gelombang...' : 'Contoh: Tambahkan checklist harian pembersihan probe, review SOP bulanan...'}
                    className="w-full rounded-lg border p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">PIC Pelaksana *</label>
                    <input
                      type="text"
                      value={newActionPic}
                      onChange={(e) => setNewActionPic(e.target.value)}
                      required
                      className="w-full rounded-lg border p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Target Tanggal Selesai *</label>
                    <input
                      type="date"
                      value={newActionDueDate}
                      onChange={(e) => setNewActionDueDate(e.target.value)}
                      required
                      className="w-full rounded-lg border p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddActionModal(false)}
                    className="px-3 py-1.5 rounded-lg border"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Simpan Tindakan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
