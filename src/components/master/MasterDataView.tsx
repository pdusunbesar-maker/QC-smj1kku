import React, { useState } from 'react';
import { 
  Building2, 
  Wrench, 
  FlaskConical, 
  Layers, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  CheckCircle2, 
  X,
  Shield,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { LaboratoryInfo, Instrument, Parameter, ControlMaterial } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';

interface MasterDataViewProps {
  labInfo: LaboratoryInfo;
  instruments: Instrument[];
  parameters: Parameter[];
  controls: ControlMaterial[];
  onLabInfoUpdated: (info: LaboratoryInfo) => void;
  onInstrumentsUpdated: (instruments: Instrument[]) => void;
  onParametersUpdated: (parameters: Parameter[]) => void;
  onControlsUpdated: (controls: ControlMaterial[]) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  labInfo,
  instruments,
  parameters,
  controls,
  onLabInfoUpdated,
  onInstrumentsUpdated,
  onParametersUpdated,
  onControlsUpdated,
}) => {
  const { user, can } = useAuth();
  const canEdit = can('manage_master');

  const [activeTab, setActiveTab] = useState<'lab' | 'instruments' | 'parameters' | 'controls'>('lab');

  // Lab Edit state
  const [labForm, setLabForm] = useState<LaboratoryInfo>(labInfo);
  const [labSaved, setLabSaved] = useState(false);

  // Sync with prop changes
  React.useEffect(() => {
    setLabForm(labInfo);
  }, [labInfo]);

  // Instrument Modal
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [instForm, setInstForm] = useState<Partial<Instrument>>({
    name: '',
    code: '',
    brand: '',
    model: '',
    serialNumber: '',
    unit: 'Patologi Klinik',
    location: 'Lab Sentral',
    status: 'active',
    lastCalibrationDate: '2026-09-01',
    nextCalibrationDate: '2027-03-01',
    lastMaintenanceDate: '2026-09-25',
    nextMaintenanceDate: '2026-10-25',
  });

  // Parameter Modal
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [paramForm, setParamForm] = useState<Partial<Parameter>>({
    name: '',
    code: '',
    unit: 'mg/dL',
    method: '',
    instrumentId: instruments[0]?.id || '',
    controlMaterialId: controls[0]?.id || '',
    targetMean: 100,
    targetSD: 3.5,
    targetCV: 3.5,
    minAcceptable: 89.5,
    maxAcceptable: 110.5,
    decimalPlaces: 1,
  });

  // Control Modal
  const [showControlModal, setShowControlModal] = useState(false);
  const [editingControl, setEditingControl] = useState<ControlMaterial | null>(null);
  const [controlForm, setControlForm] = useState<Partial<ControlMaterial>>({
    name: '',
    manufacturer: 'Roche Diagnostics',
    level: 'Level 1',
    lotNumber: '',
    expirationDate: '2027-06-30',
    storageCondition: '2°C - 8°C',
    status: 'active',
  });

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'instrument' | 'parameter' | 'control';
    id: string;
    name: string;
    warning?: string;
  } | null>(null);

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'instrument') {
      StorageService.deleteInstrument(itemToDelete.id);
      onInstrumentsUpdated(StorageService.getInstruments());
    } else if (itemToDelete.type === 'parameter') {
      StorageService.deleteParameter(itemToDelete.id);
      onParametersUpdated(StorageService.getParameters());
    } else if (itemToDelete.type === 'control') {
      StorageService.deleteControlMaterial(itemToDelete.id);
      onControlsUpdated(StorageService.getControlMaterials());
    }
    setItemToDelete(null);
  };

  // Save Lab Profile
  const handleSaveLab = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateLabInfo(labForm);
    StorageService.logAudit('UPDATE_MASTER_DATA', `Memperbarui profil laboratorium RSUD SMJ I`);
    onLabInfoUpdated(labForm);
    setLabSaved(true);
    setTimeout(() => setLabSaved(false), 3000);
  };

  // Save Instrument
  const handleSaveInstrument = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingInstrument?.id || `inst-${Date.now().toString().slice(-4)}`;
    const fullInst: Instrument = {
      ...(instForm as Instrument),
      id,
    };
    StorageService.saveInstrument(fullInst);
    onInstrumentsUpdated(StorageService.getInstruments());
    setShowInstrumentModal(false);
    setEditingInstrument(null);
  };

  // Save Parameter
  const handleSaveParameter = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingParameter?.id || `param-${Date.now().toString().slice(-4)}`;
    const mean = Number(paramForm.targetMean) || 0;
    const sd = Number(paramForm.targetSD) || 0;
    const dec = paramForm.decimalPlaces !== undefined ? Number(paramForm.decimalPlaces) : 1;
    const minAcc = paramForm.minAcceptable !== undefined && !isNaN(Number(paramForm.minAcceptable))
      ? Number(paramForm.minAcceptable)
      : Number((mean - 3 * sd).toFixed(dec));
    const maxAcc = paramForm.maxAcceptable !== undefined && !isNaN(Number(paramForm.maxAcceptable))
      ? Number(paramForm.maxAcceptable)
      : Number((mean + 3 * sd).toFixed(dec));

    const fullParam: Parameter = {
      ...(paramForm as Parameter),
      id,
      minAcceptable: minAcc,
      maxAcceptable: maxAcc,
      decimalPlaces: dec,
    };
    StorageService.saveParameter(fullParam);
    onParametersUpdated(StorageService.getParameters());
    setShowParameterModal(false);
    setEditingParameter(null);
  };

  // Save Control Material
  const handleSaveControl = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingControl?.id || `ctrl-${Date.now().toString().slice(-4)}`;
    const fullCtrl: ControlMaterial = {
      ...(controlForm as ControlMaterial),
      id,
    };
    StorageService.saveControlMaterial(fullCtrl);
    onControlsUpdated(StorageService.getControlMaterials());
    setShowControlModal(false);
    setEditingControl(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Master Data Laboratorium Patologi Klinik
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan profil institusi, instrumen analitik, parameter pemeriksaan, dan lot bahan kontrol mutu.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600 overflow-x-auto">
          {[
            { id: 'lab', label: 'Profil Laboratorium', icon: Building2 },
            { id: 'instruments', label: `Instrumen (${instruments.length})`, icon: Wrench },
            { id: 'parameters', label: `Parameter (${parameters.length})`, icon: FlaskConical },
            { id: 'controls', label: `Bahan Kontrol (${controls.length})`, icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-600 shrink-0" />
          <span>
            Mode Peninjauan: Perubahan master data hanya dapat disimpan oleh pengguna dengan peran <strong>Administrator</strong>.
          </span>
        </div>
      )}

      {/* Tab 1: Laboratory Profile */}
      {activeTab === 'lab' && (
        <form onSubmit={handleSaveLab} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <img
              src={labForm.logoUrl || '/logo_kayong_utara.png'}
              alt="Logo Resmi"
              className="h-16 w-auto object-contain"
            />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{labForm.hospitalName}</h3>
              <p className="text-slate-500 font-medium">{labForm.name}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{labForm.regency}, {labForm.province}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Rumah Sakit</label>
              <input
                type="text"
                value={labForm.hospitalName}
                onChange={(e) => setLabForm({ ...labForm, hospitalName: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Unit / Instalasi</label>
              <input
                type="text"
                value={labForm.name}
                onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Penanggung Jawab Laboratorium</label>
              <input
                type="text"
                value={labForm.headOfLab}
                onChange={(e) => setLabForm({ ...labForm, headOfLab: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Penanggung Jawab Lab</label>
              <input
                type="text"
                value={labForm.headNip}
                onChange={(e) => setLabForm({ ...labForm, headNip: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Penanggung Jawab Mutu</label>
              <input
                type="text"
                value={labForm.headOfQuality || ''}
                onChange={(e) => setLabForm({ ...labForm, headOfQuality: e.target.value })}
                disabled={!canEdit}
                placeholder="Contoh: Siti Rahmawati, S.Tr.Kes"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Penanggung Jawab Mutu</label>
              <input
                type="text"
                value={labForm.qualityNip || ''}
                onChange={(e) => setLabForm({ ...labForm, qualityNip: e.target.value })}
                disabled={!canEdit}
                placeholder="Contoh: 19850914 201001 2 015"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={labForm.address}
                onChange={(e) => setLabForm({ ...labForm, address: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status Akreditasi</label>
              <input
                type="text"
                value={labForm.accreditation}
                onChange={(e) => setLabForm({ ...labForm, accreditation: e.target.value })}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:bg-slate-50"
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              {labSaved && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Profil berhasil disimpan!</span>
                </span>
              )}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Instruments Table */}
      {activeTab === 'instruments' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900">
              Daftar Instrumen Analitik Terdaftar
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingInstrument(null);
                  setInstForm({
                    name: '',
                    code: '',
                    brand: '',
                    model: '',
                    serialNumber: '',
                    unit: 'Patologi Klinik',
                    location: 'Lab Sentral',
                    status: 'active',
                    lastCalibrationDate: '2026-09-01',
                    nextCalibrationDate: '2027-03-01',
                    lastMaintenanceDate: '2026-09-25',
                    nextMaintenanceDate: '2026-10-25',
                  });
                  setShowInstrumentModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Alat</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama Alat & Kode</th>
                  <th className="px-4 py-3">Merk / Model</th>
                  <th className="px-4 py-3 font-mono">Serial Number</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 font-mono">Jadwal Kalibrasi</th>
                  <th className="px-4 py-3 font-mono">Maintenance</th>
                  {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {instruments.map(inst => (
                  <tr key={inst.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{inst.name}</div>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                        {inst.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{inst.brand}</div>
                      <div className="text-[11px] text-slate-400">{inst.model}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{inst.serialNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{inst.location}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{inst.nextCalibrationDate}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{inst.nextMaintenanceDate}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInstrument(inst);
                              setInstForm(inst);
                              setShowInstrumentModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Data Instrumen"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const linkedCount = parameters.filter(p => p.instrumentId === inst.id).length;
                              setItemToDelete({
                                type: 'instrument',
                                id: inst.id,
                                name: `${inst.name} (${inst.code})`,
                                warning: linkedCount > 0 ? `Terdapat ${linkedCount} parameter pemeriksaan yang terhubung dengan alat ini.` : undefined
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus Instrumen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Parameters Table */}
      {activeTab === 'parameters' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900">
              Daftar Parameter Pemeriksaan & Target Kontrol
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingParameter(null);
                  setParamForm({
                    name: '',
                    code: '',
                    unit: 'mg/dL',
                    method: '',
                    instrumentId: instruments[0]?.id || '',
                    controlMaterialId: controls[0]?.id || '',
                    targetMean: 100,
                    targetSD: 3.5,
                    targetCV: 3.5,
                    minAcceptable: 89.5,
                    maxAcceptable: 110.5,
                    decimalPlaces: 1,
                  });
                  setShowParameterModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Parameter</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Parameter & Kode</th>
                  <th className="px-4 py-3">Metode Pemeriksaan</th>
                  <th className="px-4 py-3">Instrumen</th>
                  <th className="px-4 py-3 text-right font-mono">Target Mean</th>
                  <th className="px-4 py-3 text-right font-mono">Target SD</th>
                  <th className="px-4 py-3 text-right font-mono">Target CV%</th>
                  <th className="px-4 py-3 font-mono">Rentang ±2SD</th>
                  <th className="px-4 py-3 font-mono">Target Range (LCL/UCL)</th>
                  {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {parameters.map(p => {
                  const inst = instruments.find(i => i.id === p.instrumentId);
                  const lclVal = p.minAcceptable !== undefined && p.minAcceptable !== null
                    ? Number(p.minAcceptable).toFixed(p.decimalPlaces)
                    : (p.targetMean - 3 * p.targetSD).toFixed(p.decimalPlaces);
                  const uclVal = p.maxAcceptable !== undefined && p.maxAcceptable !== null
                    ? Number(p.maxAcceptable).toFixed(p.decimalPlaces)
                    : (p.targetMean + 3 * p.targetSD).toFixed(p.decimalPlaces);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{p.name}</div>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 rounded">
                          {p.code} ({p.unit})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.method}</td>
                      <td className="px-4 py-3 text-slate-600 text-[11px]">{inst?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{p.targetMean}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{p.targetSD}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">{p.targetCV}%</td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                        {(p.targetMean - 2 * p.targetSD).toFixed(p.decimalPlaces)} - {(p.targetMean + 2 * p.targetSD).toFixed(p.decimalPlaces)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-1 font-bold text-xs whitespace-nowrap">
                          <span className="text-[#0B5FA5]">{lclVal}</span>
                          <span className="text-slate-400 font-normal">s/d</span>
                          <span className="text-[#0B5FA5]">{uclVal}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{p.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                          LCL: {lclVal} · UCL: {uclVal}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingParameter(p);
                                setParamForm(p);
                                setShowParameterModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit Data Parameter"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setItemToDelete({
                                  type: 'parameter',
                                  id: p.id,
                                  name: `${p.name} [${p.code}]`,
                                  warning: 'Menghapus parameter ini akan menghilangkannya dari daftar penginputan QC harian.'
                                });
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="Hapus Parameter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Control Materials Table */}
      {activeTab === 'controls' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-900">
              Daftar Bahan Kontrol & Nomor Lot Aktif
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingControl(null);
                  setControlForm({
                    name: '',
                    manufacturer: 'Roche Diagnostics',
                    level: 'Level 1',
                    lotNumber: '',
                    expirationDate: '2027-06-30',
                    storageCondition: '2°C - 8°C',
                    status: 'active',
                  });
                  setShowControlModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Bahan Kontrol</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama Bahan Kontrol</th>
                  <th className="px-4 py-3">Level Kontrol</th>
                  <th className="px-4 py-3 font-mono">Nomor Lot</th>
                  <th className="px-4 py-3">Produsen</th>
                  <th className="px-4 py-3 font-mono">Kedaluwarsa (Exp)</th>
                  <th className="px-4 py-3">Penyimpanan</th>
                  <th className="px-4 py-3">Status</th>
                  {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {controls.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {c.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.lotNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{c.manufacturer}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{c.expirationDate}</td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">{c.storageCondition}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingControl(c);
                              setControlForm(c);
                              setShowControlModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Bahan Kontrol"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const linkedParams = parameters.filter(p => p.controlMaterialId === c.id).length;
                              setItemToDelete({
                                type: 'control',
                                id: c.id,
                                name: `${c.name} (Lot: ${c.lotNumber})`,
                                warning: linkedParams > 0 ? `Terdapat ${linkedParams} parameter pemeriksaan yang menggunakan bahan kontrol ini.` : undefined
                              });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus Bahan Kontrol"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instrument Edit Modal */}
      {showInstrumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingInstrument ? 'Edit Instrumen' : 'Tambah Instrumen Laboratorium'}
              </h3>
              <button
                type="button"
                onClick={() => setShowInstrumentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstrument} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Alat *</label>
                  <input
                    type="text"
                    value={instForm.name}
                    onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Singkat *</label>
                  <input
                    type="text"
                    value={instForm.code}
                    onChange={(e) => setInstForm({ ...instForm, code: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merk / Brand *</label>
                  <input
                    type="text"
                    value={instForm.brand}
                    onChange={(e) => setInstForm({ ...instForm, brand: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model / Tipe *</label>
                  <input
                    type="text"
                    value={instForm.model}
                    onChange={(e) => setInstForm({ ...instForm, model: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    value={instForm.serialNumber}
                    onChange={(e) => setInstForm({ ...instForm, serialNumber: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi Meja / Ruang *</label>
                  <input
                    type="text"
                    value={instForm.location}
                    onChange={(e) => setInstForm({ ...instForm, location: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kalibrasi Berikutnya</label>
                  <input
                    type="date"
                    value={instForm.nextCalibrationDate}
                    onChange={(e) => setInstForm({ ...instForm, nextCalibrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maintenance Berikutnya</label>
                  <input
                    type="date"
                    value={instForm.nextMaintenanceDate}
                    onChange={(e) => setInstForm({ ...instForm, nextMaintenanceDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInstrumentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Simpan Instrumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parameter Edit Modal */}
      {showParameterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingParameter ? 'Edit Parameter' : 'Tambah Parameter Pemeriksaan'}
              </h3>
              <button
                type="button"
                onClick={() => setShowParameterModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParameter} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Parameter *</label>
                  <input
                    type="text"
                    value={paramForm.name}
                    onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                    required
                    placeholder="Contoh: Glucose"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode *</label>
                  <input
                    type="text"
                    value={paramForm.code}
                    onChange={(e) => setParamForm({ ...paramForm, code: e.target.value })}
                    required
                    placeholder="GLU"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan (Unit) *</label>
                  <input
                    type="text"
                    value={paramForm.unit}
                    onChange={(e) => setParamForm({ ...paramForm, unit: e.target.value })}
                    required
                    placeholder="mg/dL"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instrumen *</label>
                  <select
                    value={paramForm.instrumentId}
                    onChange={(e) => setParamForm({ ...paramForm, instrumentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    {instruments.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Metode Pemeriksaan *</label>
                <input
                  type="text"
                  value={paramForm.method}
                  onChange={(e) => setParamForm({ ...paramForm, method: e.target.value })}
                  required
                  placeholder="Contoh: Heksokinase / UV enzymatic"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Mean *</label>
                  <input
                    type="number"
                    step="any"
                    value={paramForm.targetMean}
                    onChange={(e) => setParamForm({ ...paramForm, targetMean: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target SD *</label>
                  <input
                    type="number"
                    step="any"
                    value={paramForm.targetSD}
                    onChange={(e) => setParamForm({ ...paramForm, targetSD: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target CV% *</label>
                  <input
                    type="number"
                    step="any"
                    value={paramForm.targetCV}
                    onChange={(e) => setParamForm({ ...paramForm, targetCV: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Target Range (LCL / UCL) & Precision */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    Batas Toleransi QC / Target Range (LCL - UCL)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Rentang kendali analitik (±3SD)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 text-[11px]">
                        Batas Bawah / LCL (Min Acceptable)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const mean = Number(paramForm.targetMean) || 0;
                          const sd = Number(paramForm.targetSD) || 0;
                          const dec = paramForm.decimalPlaces ?? 1;
                          setParamForm({ ...paramForm, minAcceptable: Number((mean - 3 * sd).toFixed(dec)) });
                        }}
                        className="text-[10px] text-blue-700 hover:underline font-mono"
                        title="Hitung otomatis Mean - 3SD"
                      >
                        Auto (-3SD)
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={paramForm.minAcceptable ?? ''}
                      onChange={(e) => setParamForm({ ...paramForm, minAcceptable: parseFloat(e.target.value) || 0 })}
                      placeholder="Nilai LCL"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 text-[11px]">
                        Batas Atas / UCL (Max Acceptable)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const mean = Number(paramForm.targetMean) || 0;
                          const sd = Number(paramForm.targetSD) || 0;
                          const dec = paramForm.decimalPlaces ?? 1;
                          setParamForm({ ...paramForm, maxAcceptable: Number((mean + 3 * sd).toFixed(dec)) });
                        }}
                        className="text-[10px] text-blue-700 hover:underline font-mono"
                        title="Hitung otomatis Mean + 3SD"
                      >
                        Auto (+3SD)
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={paramForm.maxAcceptable ?? ''}
                      onChange={(e) => setParamForm({ ...paramForm, maxAcceptable: parseFloat(e.target.value) || 0 })}
                      placeholder="Nilai UCL"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-slate-700">
                    Presisi Angka Desimal (Digit di Belakang Koma):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={paramForm.decimalPlaces ?? 1}
                    onChange={(e) => setParamForm({ ...paramForm, decimalPlaces: parseInt(e.target.value) || 0 })}
                    className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-center bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowParameterModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Simpan Parameter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Control Material Edit Modal */}
      {showControlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingControl ? 'Edit Bahan Kontrol' : 'Tambah Bahan Kontrol Mutu'}
              </h3>
              <button
                type="button"
                onClick={() => setShowControlModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveControl} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kontrol *</label>
                <input
                  type="text"
                  value={controlForm.name}
                  onChange={(e) => setControlForm({ ...controlForm, name: e.target.value })}
                  required
                  placeholder="Contoh: PreciControl ClinChem Multi 1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Level *</label>
                  <select
                    value={controlForm.level}
                    onChange={(e) => setControlForm({ ...controlForm, level: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  >
                    <option value="Level 1">Level 1 (Normal)</option>
                    <option value="Level 2">Level 2 (Patologis)</option>
                    <option value="Level 3">Level 3 (Low / Khusus)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Lot *</label>
                  <input
                    type="text"
                    value={controlForm.lotNumber}
                    onChange={(e) => setControlForm({ ...controlForm, lotNumber: e.target.value })}
                    required
                    placeholder="LOT-CCM1-2026A"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Produsen / Manufaktur</label>
                  <input
                    type="text"
                    value={controlForm.manufacturer}
                    onChange={(e) => setControlForm({ ...controlForm, manufacturer: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kedaluwarsa (Exp)</label>
                  <input
                    type="date"
                    value={controlForm.expirationDate}
                    onChange={(e) => setControlForm({ ...controlForm, expirationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowControlModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  Simpan Bahan Kontrol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Konfirmasi Hapus {itemToDelete.type === 'instrument' ? 'Instrumen' : itemToDelete.type === 'parameter' ? 'Parameter' : 'Bahan Kontrol'}
                </h3>
                <p className="text-[11px] text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-2">
              <p className="text-slate-800">
                Apakah Anda yakin ingin menghapus <strong>"{itemToDelete.name}"</strong> dari master data laboratorium?
              </p>
              {itemToDelete.warning && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  ⚠️ {itemToDelete.warning}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
