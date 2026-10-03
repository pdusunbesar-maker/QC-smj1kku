import {
  LaboratoryInfo,
  Instrument,
  ControlMaterial,
  Parameter,
  QCResult,
  NonConformity,
  CAPA,
  AuditLog,
  AppNotification,
  WestgardRuleConfig,
  User,
  RoleDefinition,
} from '../types';
import {
  INITIAL_LAB_INFO,
  INITIAL_USERS,
  INITIAL_ROLES,
  INITIAL_INSTRUMENTS,
  INITIAL_CONTROL_MATERIALS,
  INITIAL_PARAMETERS,
  generateDemoQCResults,
  INITIAL_NON_CONFORMITIES,
  INITIAL_CAPAS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './demoData';
import { DEFAULT_WESTGARD_RULES } from '../utils/qcCalculations';
import { getSupabase } from './supabase';

const KEYS = {
  LAB_INFO: 'lqcms_lab_info_v1',
  USERS: 'lqcms_users_v1',
  ROLES: 'lqcms_roles_v1',
  CURRENT_USER: 'lqcms_current_user_v1',
  INSTRUMENTS: 'lqcms_instruments_v1',
  CONTROL_MATERIALS: 'lqcms_controls_v1',
  PARAMETERS: 'lqcms_params_v1',
  WESTGARD_RULES: 'lqcms_westgard_rules_v1',
  QC_RESULTS: 'lqcms_qc_results_v1',
  NON_CONFORMITIES: 'lqcms_non_conformities_v1',
  CAPA: 'lqcms_capa_v1',
  AUDIT_LOGS: 'lqcms_audit_logs_v1',
  NOTIFICATIONS: 'lqcms_notifications_v1',
};

// Generic safe storage helper
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

// Data Mappers: TypeScript (camelCase) <-> Supabase PostgreSQL (snake_case)
function mapLabToDb(info: LaboratoryInfo) {
  return {
    id: info.id || 'lab-rsud-smj1',
    name: info.name,
    hospital_name: info.hospitalName,
    regency: info.regency,
    province: info.province,
    room_unit: info.roomUnit,
    head_of_lab: info.headOfLab,
    head_nip: info.headNip,
    address: info.address,
    phone: info.phone,
    email: info.email,
    accreditation: info.accreditation,
    logo_url: info.logoUrl,
  };
}

function mapDbToLab(row: any): LaboratoryInfo {
  return {
    id: row.id,
    name: row.name,
    hospitalName: row.hospital_name || row.hospitalName,
    regency: row.regency,
    province: row.province,
    roomUnit: row.room_unit || row.roomUnit,
    headOfLab: row.head_of_lab || row.headOfLab,
    headNip: row.head_nip || row.headNip,
    address: row.address,
    phone: row.phone,
    email: row.email,
    accreditation: row.accreditation,
    logoUrl: row.logo_url || row.logoUrl,
  };
}

function mapUserToDb(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    nip: u.nip,
    department: u.department,
    avatar: u.avatar,
    is_active: u.isActive ?? true,
  };
}

function mapDbToUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    nip: row.nip,
    department: row.department,
    avatar: row.avatar,
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at || row.createdAt,
  };
}

function mapInstrumentToDb(i: Instrument) {
  return {
    id: i.id,
    name: i.name,
    code: i.code,
    brand: i.brand,
    model: i.model,
    serial_number: i.serialNumber,
    unit: i.unit,
    location: i.location,
    status: i.status,
    last_calibration_date: i.lastCalibrationDate || null,
    next_calibration_date: i.nextCalibrationDate || null,
    last_maintenance_date: i.lastMaintenanceDate || null,
    next_maintenance_date: i.nextMaintenanceDate || null,
  };
}

function mapDbToInstrument(row: any): Instrument {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number || row.serialNumber,
    unit: row.unit,
    location: row.location,
    status: row.status,
    lastCalibrationDate: row.last_calibration_date || row.lastCalibrationDate || '',
    nextCalibrationDate: row.next_calibration_date || row.nextCalibrationDate || '',
    lastMaintenanceDate: row.last_maintenance_date || row.lastMaintenanceDate || '',
    nextMaintenanceDate: row.next_maintenance_date || row.nextMaintenanceDate || '',
  };
}

function mapControlToDb(c: ControlMaterial) {
  return {
    id: c.id,
    name: c.name,
    manufacturer: c.manufacturer,
    level: c.level,
    lot_number: c.lotNumber,
    expiration_date: c.expirationDate,
    storage_condition: c.storageCondition,
    status: c.status,
  };
}

function mapDbToControl(row: any): ControlMaterial {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    level: row.level,
    lotNumber: row.lot_number || row.lotNumber,
    expirationDate: row.expiration_date || row.expirationDate,
    storageCondition: row.storage_condition || row.storageCondition,
    status: row.status,
  };
}

function mapParamToDb(p: Parameter) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    method: p.method,
    instrument_id: p.instrumentId || null,
    control_material_id: p.controlMaterialId || null,
    target_mean: p.targetMean,
    target_sd: p.targetSD,
    target_cv: p.targetCV,
    min_acceptable: p.minAcceptable,
    max_acceptable: p.maxAcceptable,
    decimal_places: p.decimalPlaces,
  };
}

function mapDbToParam(row: any): Parameter {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    method: row.method,
    instrumentId: row.instrument_id || row.instrumentId || '',
    controlMaterialId: row.control_material_id || row.controlMaterialId || '',
    targetMean: Number(row.target_mean ?? row.targetMean),
    targetSD: Number(row.target_sd ?? row.targetSD),
    targetCV: Number(row.target_cv ?? row.targetCV),
    minAcceptable: Number(row.min_acceptable ?? row.minAcceptable),
    maxAcceptable: Number(row.max_acceptable ?? row.maxAcceptable),
    decimalPlaces: Number(row.decimal_places ?? row.decimalPlaces ?? 1),
  };
}

function mapQCResultToDb(r: QCResult) {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    timestamp: r.timestamp || Date.now(),
    operator_id: r.operatorId || null,
    operator_name: r.operatorName || 'Petugas ATLM',
    instrument_id: r.instrumentId || null,
    instrument_name: r.instrumentName || 'Instrumen Lab',
    parameter_id: r.parameterId,
    parameter_name: r.parameterName,
    parameter_code: r.parameterCode,
    control_level: r.controlLevel,
    lot_number: r.lotNumber,
    value: r.value,
    unit: r.unit,
    mean: r.mean,
    sd: r.sd,
    z_score: r.zScore,
    sd_position: r.sdPosition,
    status: r.status,
    violations: r.violations || [],
    notes: r.notes || null,
    is_demo: r.isDemo || false,
    review_status: r.reviewStatus || 'pending',
    reviewed_by: r.reviewedBy || null,
    reviewed_by_name: r.reviewedByName || null,
    reviewed_at: r.reviewedAt || null,
    review_comment: r.reviewComment || null,
    linked_non_conformity_id: r.linkedNonConformityId || null,
    linked_capa_id: r.linkedCapaId || null,
  };
}

function mapDbToQCResult(row: any): QCResult {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    timestamp: Number(row.timestamp) || Date.now(),
    operatorId: row.operator_id || row.operatorId || '',
    operatorName: row.operator_name || row.operatorName || '',
    instrumentId: row.instrument_id || row.instrumentId || '',
    instrumentName: row.instrument_name || row.instrumentName || '',
    parameterId: row.parameter_id || row.parameterId,
    parameterName: row.parameter_name || row.parameterName,
    parameterCode: row.parameter_code || row.parameterCode,
    controlLevel: row.control_level || row.controlLevel,
    lotNumber: row.lot_number || row.lotNumber,
    value: Number(row.value),
    unit: row.unit,
    mean: Number(row.mean),
    sd: Number(row.sd),
    zScore: Number(row.z_score ?? row.zScore),
    sdPosition: row.sd_position || row.sdPosition,
    status: row.status,
    violations: Array.isArray(row.violations) ? row.violations : [],
    notes: row.notes || undefined,
    isDemo: row.is_demo ?? row.isDemo ?? false,
    reviewStatus: row.review_status || row.reviewStatus || 'pending',
    reviewedBy: row.reviewed_by || row.reviewedBy,
    reviewedByName: row.reviewed_by_name || row.reviewedByName,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    reviewComment: row.review_comment || row.reviewComment,
    linkedNonConformityId: row.linked_non_conformity_id || row.linkedNonConformityId,
    linkedCapaId: row.linked_capa_id || row.linkedCapaId,
  };
}

function mapNCToDb(nc: NonConformity) {
  return {
    id: nc.id,
    date: nc.date,
    time: nc.time,
    unit: nc.unit,
    instrument_id: nc.instrumentId || null,
    instrument_name: nc.instrumentName,
    parameter_id: nc.parameterId || null,
    parameter_name: nc.parameterName,
    qc_result_id: nc.qcResultId || null,
    westgard_rule: nc.westgardRule || null,
    severity: nc.severity,
    category: nc.category,
    description: nc.description,
    impact: nc.impact,
    initial_analysis: nc.initialAnalysis,
    immediate_action: nc.immediateAction,
    reported_by: nc.reportedBy || null,
    reported_by_name: nc.reportedByName,
    status: nc.status,
    resolved_at: nc.resolvedAt || null,
    linked_capa_id: nc.linkedCapaId || null,
  };
}

function mapDbToNC(row: any): NonConformity {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    unit: row.unit,
    instrumentId: row.instrument_id || row.instrumentId || '',
    instrumentName: row.instrument_name || row.instrumentName || '',
    parameterId: row.parameter_id || row.parameterId || '',
    parameterName: row.parameter_name || row.parameterName || '',
    qcResultId: row.qc_result_id || row.qcResultId,
    westgardRule: row.westgard_rule || row.westgardRule,
    severity: row.severity,
    category: row.category,
    description: row.description,
    impact: row.impact,
    initialAnalysis: row.initial_analysis || row.initialAnalysis,
    immediateAction: row.immediate_action || row.immediateAction,
    reportedBy: row.reported_by || row.reportedBy,
    reportedByName: row.reported_by_name || row.reportedByName,
    status: row.status,
    resolvedAt: row.resolved_at || row.resolvedAt,
    linkedCapaId: row.linked_capa_id || row.linkedCapaId,
  };
}

function mapCAPAToDb(c: CAPA) {
  return {
    id: c.id,
    created_at: c.createdAt,
    source: c.source,
    department: c.department,
    pic: c.pic,
    problem_statement: c.problemStatement,
    non_conformity_description: c.nonConformityDescription,
    supporting_evidence: c.supportingEvidence || null,
    rca_method: c.rcaMethod || 'Kombinasi 5 Why & Fishbone',
    fishbone: c.fishbone || { man: [], machine: [], method: [], material: [], measurement: [], environment: [] },
    five_why: c.fiveWhy || { why1: '', why2: '', why3: '', why4: '', why5: '', rootCauseConclusion: '' },
    identified_root_cause: c.identifiedRootCause || null,
    corrective_actions: c.correctiveActions || [],
    preventive_actions: c.preventiveActions || [],
    verification_method: c.verificationMethod || null,
    verification_result: c.verificationResult || null,
    verification_date: c.verificationDate || null,
    verifier: c.verifier || null,
    verifier_name: c.verifierName || null,
    effectiveness: c.effectiveness || 'pending',
    status: c.status,
    overall_due_date: c.overallDueDate,
    closed_at: c.closedAt || null,
    linked_qc_result_id: c.linkedQcResultId || null,
    linked_non_conformity_id: c.linkedNonConformityId || null,
  };
}

function mapDbToCAPA(row: any): CAPA {
  return {
    id: row.id,
    createdAt: row.created_at || row.createdAt,
    source: row.source,
    department: row.department,
    pic: row.pic,
    problemStatement: row.problem_statement || row.problemStatement,
    nonConformityDescription: row.non_conformity_description || row.nonConformityDescription,
    supportingEvidence: row.supporting_evidence || row.supportingEvidence,
    rcaMethod: row.rca_method || row.rcaMethod || 'Kombinasi 5 Why & Fishbone',
    fishbone: row.fishbone || { man: [], machine: [], method: [], material: [], measurement: [], environment: [] },
    fiveWhy: row.five_why || row.fiveWhy || { why1: '', why2: '', why3: '', why4: '', why5: '', rootCauseConclusion: '' },
    identifiedRootCause: row.identified_root_cause || row.identifiedRootCause || '',
    correctiveActions: Array.isArray(row.corrective_actions) ? row.corrective_actions : [],
    preventiveActions: Array.isArray(row.preventive_actions) ? row.preventive_actions : [],
    verificationMethod: row.verification_method || row.verificationMethod,
    verificationResult: row.verification_result || row.verificationResult,
    verificationDate: row.verification_date || row.verificationDate,
    verifier: row.verifier,
    verifierName: row.verifier_name || row.verifierName,
    effectiveness: row.effectiveness || 'pending',
    status: row.status,
    overallDueDate: row.overall_due_date || row.overallDueDate,
    closedAt: row.closed_at || row.closedAt,
    linkedQcResultId: row.linked_qc_result_id || row.linkedQcResultId,
    linkedNonConformityId: row.linked_non_conformity_id || row.linkedNonConformityId,
  };
}

function mapAuditToDb(a: AuditLog) {
  return {
    id: a.id,
    timestamp: a.timestamp,
    user_id: a.userId,
    user_name: a.userName,
    user_role: a.userRole,
    action: a.action,
    details: a.details,
    previous_data: a.previousData || null,
    new_data: a.newData || null,
    ip_address: a.ipAddress || '127.0.0.1',
    user_agent: a.userAgent || navigator.userAgent,
  };
}

function mapDbToAudit(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id || row.userId,
    userName: row.user_name || row.userName,
    userRole: row.user_role || row.userRole,
    action: row.action,
    details: row.details,
    previousData: row.previous_data || row.previousData,
    newData: row.new_data || row.newData,
    ipAddress: row.ip_address || row.ipAddress,
    userAgent: row.user_agent || row.userAgent,
  };
}

let realtimeSubscription: any = null;

export class StorageService {
  // Initialize storage if empty
  static init(): void {
    if (!localStorage.getItem(KEYS.LAB_INFO)) {
      setStored(KEYS.LAB_INFO, INITIAL_LAB_INFO);
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      setStored(KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(KEYS.ROLES)) {
      setStored(KEYS.ROLES, INITIAL_ROLES);
    }
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      setStored(KEYS.CURRENT_USER, INITIAL_USERS[0]); // default admin
    }
    if (!localStorage.getItem(KEYS.INSTRUMENTS)) {
      setStored(KEYS.INSTRUMENTS, INITIAL_INSTRUMENTS);
    }
    if (!localStorage.getItem(KEYS.CONTROL_MATERIALS)) {
      setStored(KEYS.CONTROL_MATERIALS, INITIAL_CONTROL_MATERIALS);
    }
    if (!localStorage.getItem(KEYS.PARAMETERS)) {
      setStored(KEYS.PARAMETERS, INITIAL_PARAMETERS);
    }
    if (!localStorage.getItem(KEYS.WESTGARD_RULES)) {
      setStored(KEYS.WESTGARD_RULES, DEFAULT_WESTGARD_RULES);
    }
    if (!localStorage.getItem(KEYS.QC_RESULTS)) {
      setStored(KEYS.QC_RESULTS, generateDemoQCResults());
    }
    if (!localStorage.getItem(KEYS.NON_CONFORMITIES)) {
      setStored(KEYS.NON_CONFORMITIES, INITIAL_NON_CONFORMITIES);
    }
    if (!localStorage.getItem(KEYS.CAPA)) {
      setStored(KEYS.CAPA, INITIAL_CAPAS);
    }
    if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
      setStored(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    }
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
      setStored(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    }
  }

  static resetToDemo(): void {
    setStored(KEYS.LAB_INFO, INITIAL_LAB_INFO);
    setStored(KEYS.USERS, INITIAL_USERS);
    setStored(KEYS.INSTRUMENTS, INITIAL_INSTRUMENTS);
    setStored(KEYS.CONTROL_MATERIALS, INITIAL_CONTROL_MATERIALS);
    setStored(KEYS.PARAMETERS, INITIAL_PARAMETERS);
    setStored(KEYS.WESTGARD_RULES, DEFAULT_WESTGARD_RULES);
    setStored(KEYS.QC_RESULTS, generateDemoQCResults());
    setStored(KEYS.NON_CONFORMITIES, INITIAL_NON_CONFORMITIES);
    setStored(KEYS.CAPA, INITIAL_CAPAS);
    setStored(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setStored(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  // --- Real-Time Sync & Hydration from Supabase ---
  static async syncFromSupabase(onSynced?: () => void): Promise<{ success: boolean; count: number; message: string }> {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, count: 0, message: 'Supabase belum dikonfigurasi.' };
    }

    try {
      // 1. Fetch QC Results
      const { data: qcData, error: qcErr } = await sb.from('qc_results').select('*').order('date', { ascending: false });
      if (!qcErr && qcData && qcData.length > 0) {
        const mapped = qcData.map(mapDbToQCResult);
        setStored(KEYS.QC_RESULTS, mapped);
      }

      // 2. Fetch Instruments
      const { data: instData, error: instErr } = await sb.from('instruments').select('*');
      if (!instErr && instData && instData.length > 0) {
        const mapped = instData.map(mapDbToInstrument);
        setStored(KEYS.INSTRUMENTS, mapped);
      }

      // 3. Fetch Control Materials
      const { data: ctrlData, error: ctrlErr } = await sb.from('control_materials').select('*');
      if (!ctrlErr && ctrlData && ctrlData.length > 0) {
        const mapped = ctrlData.map(mapDbToControl);
        setStored(KEYS.CONTROL_MATERIALS, mapped);
      }

      // 4. Fetch Test Parameters
      const { data: paramData, error: paramErr } = await sb.from('test_parameters').select('*');
      if (!paramErr && paramData && paramData.length > 0) {
        const mapped = paramData.map(mapDbToParam);
        setStored(KEYS.PARAMETERS, mapped);
      }

      // 5. Fetch Non Conformities
      const { data: ncData, error: ncErr } = await sb.from('non_conformities').select('*').order('date', { ascending: false });
      if (!ncErr && ncData && ncData.length > 0) {
        const mapped = ncData.map(mapDbToNC);
        setStored(KEYS.NON_CONFORMITIES, mapped);
      }

      // 6. Fetch CAPA
      const { data: capaData, error: capaErr } = await sb.from('capa').select('*').order('created_at', { ascending: false });
      if (!capaErr && capaData && capaData.length > 0) {
        const mapped = capaData.map(mapDbToCAPA);
        setStored(KEYS.CAPA, mapped);
      }

      // 7. Fetch Lab Profile
      const { data: labData, error: labErr } = await sb.from('laboratories').select('*').limit(1);
      if (!labErr && labData && labData[0]) {
        setStored(KEYS.LAB_INFO, mapDbToLab(labData[0]));
      }

      // 8. Fetch App Users
      const { data: userData, error: userErr } = await sb.from('app_users').select('*');
      if (!userErr && userData && userData.length > 0) {
        const mapped = userData.map(mapDbToUser);
        setStored(KEYS.USERS, mapped);
      }

      // 9. Fetch Audit Logs
      const { data: auditData, error: auditErr } = await sb.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (!auditErr && auditData && auditData.length > 0) {
        const mapped = auditData.map(mapDbToAudit);
        setStored(KEYS.AUDIT_LOGS, mapped);
      }

      if (onSynced) onSynced();
      return { 
        success: true, 
        count: (qcData?.length || 0), 
        message: 'Sinkronisasi data dari database Supabase berhasil!' 
      };
    } catch (err: any) {
      console.error('Error syncing from Supabase:', err);
      return { success: false, count: 0, message: err.message || 'Gagal sinkronisasi data dari Supabase.' };
    }
  }

  // --- Push All Local Data to Supabase ---
  static async pushAllToSupabase(): Promise<{ success: boolean; message: string }> {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, message: 'Koneksi Supabase belum dikonfigurasi.' };
    }

    try {
      // 1. Lab Profile
      await sb.from('laboratories').upsert(mapLabToDb(this.getLabInfo()));

      // 2. Users & Roles
      const users = this.getUsers().map(mapUserToDb);
      if (users.length > 0) await sb.from('app_users').upsert(users);

      // 3. Instruments
      const instruments = this.getInstruments().map(mapInstrumentToDb);
      if (instruments.length > 0) await sb.from('instruments').upsert(instruments);

      // 4. Control Materials
      const controls = this.getControlMaterials().map(mapControlToDb);
      if (controls.length > 0) await sb.from('control_materials').upsert(controls);

      // 5. Parameters
      const params = this.getParameters().map(mapParamToDb);
      if (params.length > 0) await sb.from('test_parameters').upsert(params);

      // 6. QC Results
      const qcResults = this.getQCResults().map(mapQCResultToDb);
      if (qcResults.length > 0) await sb.from('qc_results').upsert(qcResults);

      // 7. Non-Conformities
      const ncs = this.getNonConformities().map(mapNCToDb);
      if (ncs.length > 0) await sb.from('non_conformities').upsert(ncs);

      // 8. CAPA
      const capas = this.getCAPAs().map(mapCAPAToDb);
      if (capas.length > 0) await sb.from('capa').upsert(capas);

      // 9. Audit Logs
      const logs = this.getAuditLogs().slice(0, 100).map(mapAuditToDb);
      if (logs.length > 0) await sb.from('audit_logs').upsert(logs);

      return { success: true, message: 'Seluruh data laboratorium berhasil diunggah dan disinkronkan ke Supabase!' };
    } catch (err: any) {
      console.error('Error pushing data to Supabase:', err);
      return { success: false, message: err.message || 'Gagal mengunggah data ke Supabase.' };
    }
  }

  // --- Real-time Subscription Listener ---
  static subscribeToRealtime(onDataChanged: () => void): () => void {
    const sb = getSupabase();
    if (!sb) return () => {};

    try {
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }

      realtimeSubscription = sb
        .channel('lqcms-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          async (payload) => {
            const table = payload.table;
            const eventType = payload.eventType; // 'INSERT' | 'UPDATE' | 'DELETE'

            if (table === 'qc_results') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<QCResult[]>(KEYS.QC_RESULTS, []).filter(r => r.id !== payload.old.id);
                setStored(KEYS.QC_RESULTS, list);
              } else if (payload.new) {
                const item = mapDbToQCResult(payload.new);
                const list = getStored<QCResult[]>(KEYS.QC_RESULTS, []);
                const idx = list.findIndex(r => r.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.unshift(item);
                setStored(KEYS.QC_RESULTS, list);
              }
            } else if (table === 'instruments') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<Instrument[]>(KEYS.INSTRUMENTS, []).filter(i => i.id !== payload.old.id);
                setStored(KEYS.INSTRUMENTS, list);
              } else if (payload.new) {
                const item = mapDbToInstrument(payload.new);
                const list = getStored<Instrument[]>(KEYS.INSTRUMENTS, []);
                const idx = list.findIndex(i => i.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.push(item);
                setStored(KEYS.INSTRUMENTS, list);
              }
            } else if (table === 'test_parameters') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<Parameter[]>(KEYS.PARAMETERS, []).filter(p => p.id !== payload.old.id);
                setStored(KEYS.PARAMETERS, list);
              } else if (payload.new) {
                const item = mapDbToParam(payload.new);
                const list = getStored<Parameter[]>(KEYS.PARAMETERS, []);
                const idx = list.findIndex(p => p.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.push(item);
                setStored(KEYS.PARAMETERS, list);
              }
            } else if (table === 'control_materials') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<ControlMaterial[]>(KEYS.CONTROL_MATERIALS, []).filter(c => c.id !== payload.old.id);
                setStored(KEYS.CONTROL_MATERIALS, list);
              } else if (payload.new) {
                const item = mapDbToControl(payload.new);
                const list = getStored<ControlMaterial[]>(KEYS.CONTROL_MATERIALS, []);
                const idx = list.findIndex(c => c.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.push(item);
                setStored(KEYS.CONTROL_MATERIALS, list);
              }
            } else if (table === 'non_conformities') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<NonConformity[]>(KEYS.NON_CONFORMITIES, []).filter(n => n.id !== payload.old.id);
                setStored(KEYS.NON_CONFORMITIES, list);
              } else if (payload.new) {
                const item = mapDbToNC(payload.new);
                const list = getStored<NonConformity[]>(KEYS.NON_CONFORMITIES, []);
                const idx = list.findIndex(n => n.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.unshift(item);
                setStored(KEYS.NON_CONFORMITIES, list);
              }
            } else if (table === 'capa') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<CAPA[]>(KEYS.CAPA, []).filter(c => c.id !== payload.old.id);
                setStored(KEYS.CAPA, list);
              } else if (payload.new) {
                const item = mapDbToCAPA(payload.new);
                const list = getStored<CAPA[]>(KEYS.CAPA, []);
                const idx = list.findIndex(c => c.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.unshift(item);
                setStored(KEYS.CAPA, list);
              }
            } else if (table === 'laboratories') {
              if (payload.new) {
                setStored(KEYS.LAB_INFO, mapDbToLab(payload.new));
              }
            } else if (table === 'app_users') {
              if (eventType === 'DELETE' && payload.old?.id) {
                const list = getStored<User[]>(KEYS.USERS, []).filter(u => u.id !== payload.old.id);
                setStored(KEYS.USERS, list);
              } else if (payload.new) {
                const item = mapDbToUser(payload.new);
                const list = getStored<User[]>(KEYS.USERS, []);
                const idx = list.findIndex(u => u.id === item.id);
                if (idx >= 0) list[idx] = item;
                else list.push(item);
                setStored(KEYS.USERS, list);
              }
            }

            onDataChanged();
          }
        )
        .subscribe();

      return () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
        }
      };
    } catch (e) {
      console.error('Failed to subscribe to realtime changes:', e);
      return () => {};
    }
  }

  // --- Laboratory Info ---
  static getLabInfo(): LaboratoryInfo {
    return getStored<LaboratoryInfo>(KEYS.LAB_INFO, INITIAL_LAB_INFO);
  }

  static updateLabInfo(info: LaboratoryInfo): void {
    setStored(KEYS.LAB_INFO, info);
    const sb = getSupabase();
    if (sb) {
      sb.from('laboratories')
        .upsert(mapLabToDb(info))
        .then(({ error }) => {
          if (error) console.error('Supabase updateLabInfo error:', error);
        });
    }
  }

  // --- Users & Current Auth ---
  static getUsers(): User[] {
    return getStored<User[]>(KEYS.USERS, INITIAL_USERS);
  }

  static saveUser(user: User): void {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    setStored(KEYS.USERS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('app_users')
        .upsert(mapUserToDb(user))
        .then(({ error }) => {
          if (error) console.error('Supabase saveUser error:', error);
        });
    }
  }

  static deleteUser(id: string): void {
    const list = this.getUsers().filter(u => u.id !== id);
    setStored(KEYS.USERS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('app_users')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteUser error:', error);
        });
    }
  }

  // --- Roles & Permissions ---
  static getRoles(): RoleDefinition[] {
    const roles = getStored<RoleDefinition[]>(KEYS.ROLES, INITIAL_ROLES);
    const analisRole = roles.find(r => r.id === 'analis');
    if (analisRole && analisRole.name !== 'Ahli Teknologi Laboratorium Medik (ATLM)') {
      analisRole.name = 'Ahli Teknologi Laboratorium Medik (ATLM)';
      setStored(KEYS.ROLES, roles);
    }
    return roles;
  }

  static saveRole(role: RoleDefinition): void {
    const list = this.getRoles();
    const idx = list.findIndex(r => r.id === role.id);
    if (idx >= 0) {
      list[idx] = role;
    } else {
      list.push(role);
    }
    setStored(KEYS.ROLES, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('roles')
        .upsert({
          id: role.id,
          name: role.name,
          description: role.description,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase saveRole error:', error);
        });
    }
  }

  static deleteRole(id: string): void {
    const list = this.getRoles().filter(r => r.id !== id);
    setStored(KEYS.ROLES, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('roles')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteRole error:', error);
        });
    }
  }

  static getCurrentUser(): User {
    return getStored<User>(KEYS.CURRENT_USER, INITIAL_USERS[0]);
  }

  static setCurrentUser(user: User): void {
    setStored(KEYS.CURRENT_USER, user);
  }

  // --- Instruments ---
  static getInstruments(): Instrument[] {
    return getStored<Instrument[]>(KEYS.INSTRUMENTS, INITIAL_INSTRUMENTS);
  }

  static saveInstrument(instrument: Instrument): void {
    const list = this.getInstruments();
    const idx = list.findIndex(i => i.id === instrument.id);
    if (idx >= 0) {
      list[idx] = instrument;
    } else {
      list.push(instrument);
    }
    setStored(KEYS.INSTRUMENTS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('instruments')
        .upsert(mapInstrumentToDb(instrument))
        .then(({ error }) => {
          if (error) console.error('Supabase saveInstrument error:', error);
        });
    }
  }

  static deleteInstrument(id: string): void {
    const target = this.getInstruments().find(i => i.id === id);
    const list = this.getInstruments().filter(i => i.id !== id);
    setStored(KEYS.INSTRUMENTS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('instruments')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteInstrument error:', error);
        });
    }

    if (target) {
      this.logAudit('UPDATE_MASTER_DATA', `Menghapus instrumen: ${target.name} (${target.code})`);
    }
  }

  // --- Control Materials ---
  static getControlMaterials(): ControlMaterial[] {
    return getStored<ControlMaterial[]>(KEYS.CONTROL_MATERIALS, INITIAL_CONTROL_MATERIALS);
  }

  static saveControlMaterial(material: ControlMaterial): void {
    const list = this.getControlMaterials();
    const idx = list.findIndex(m => m.id === material.id);
    if (idx >= 0) list[idx] = material;
    else list.push(material);
    setStored(KEYS.CONTROL_MATERIALS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('control_materials')
        .upsert(mapControlToDb(material))
        .then(({ error }) => {
          if (error) console.error('Supabase saveControlMaterial error:', error);
        });
    }
  }

  static deleteControlMaterial(id: string): void {
    const target = this.getControlMaterials().find(m => m.id === id);
    const list = this.getControlMaterials().filter(m => m.id !== id);
    setStored(KEYS.CONTROL_MATERIALS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('control_materials')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteControlMaterial error:', error);
        });
    }

    if (target) {
      this.logAudit('UPDATE_MASTER_DATA', `Menghapus bahan kontrol: ${target.name} (Lot: ${target.lotNumber})`);
    }
  }

  // --- Parameters ---
  static getParameters(): Parameter[] {
    return getStored<Parameter[]>(KEYS.PARAMETERS, INITIAL_PARAMETERS);
  }

  static saveParameter(param: Parameter): void {
    const list = this.getParameters();
    const idx = list.findIndex(p => p.id === param.id);
    if (idx >= 0) list[idx] = param;
    else list.push(param);
    setStored(KEYS.PARAMETERS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('test_parameters')
        .upsert(mapParamToDb(param))
        .then(({ error }) => {
          if (error) console.error('Supabase saveParameter error:', error);
        });
    }
  }

  static deleteParameter(id: string): void {
    const target = this.getParameters().find(p => p.id === id);
    const list = this.getParameters().filter(p => p.id !== id);
    setStored(KEYS.PARAMETERS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('test_parameters')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteParameter error:', error);
        });
    }

    if (target) {
      this.logAudit('UPDATE_MASTER_DATA', `Menghapus parameter pemeriksaan: ${target.name} [${target.code}]`);
    }
  }

  // --- Westgard Rules ---
  static getWestgardRules(): WestgardRuleConfig[] {
    return getStored<WestgardRuleConfig[]>(KEYS.WESTGARD_RULES, DEFAULT_WESTGARD_RULES);
  }

  static saveWestgardRules(rules: WestgardRuleConfig[]): void {
    setStored(KEYS.WESTGARD_RULES, rules);
  }

  // --- QC Results ---
  static getQCResults(): QCResult[] {
    return getStored<QCResult[]>(KEYS.QC_RESULTS, []);
  }

  static saveQCResult(result: QCResult): void {
    const list = this.getQCResults();
    const idx = list.findIndex(r => r.id === result.id);
    if (idx >= 0) list[idx] = result;
    else list.unshift(result);
    setStored(KEYS.QC_RESULTS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('qc_results')
        .upsert(mapQCResultToDb(result))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase saveQCResult error:', error);
          }
        });
    }
  }

  static deleteQCResult(id: string): void {
    const target = this.getQCResults().find(r => r.id === id);
    const list = this.getQCResults().filter(r => r.id !== id);
    setStored(KEYS.QC_RESULTS, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('qc_results')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteQCResult error:', error);
        });
    }

    if (target) {
      this.logAudit('DELETE_QC_RESULT', `Menghapus data hasil QC ${target.parameterName} (${target.value} ${target.unit}) tanggal ${target.date}`, null, target);
    }
  }

  // --- Non-Conformities ---
  static getNonConformities(): NonConformity[] {
    return getStored<NonConformity[]>(KEYS.NON_CONFORMITIES, INITIAL_NON_CONFORMITIES);
  }

  static deleteNonConformity(id: string): void {
    const target = this.getNonConformities().find(n => n.id === id);
    const list = this.getNonConformities().filter(n => n.id !== id);
    setStored(KEYS.NON_CONFORMITIES, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('non_conformities')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteNonConformity error:', error);
        });
    }

    if (target) {
      this.logAudit('DELETE_NC', `Menghapus laporan ketidaksesuaian ${target.id} (${target.parameterName})`, null, target);
    }
  }

  static saveNonConformity(nc: NonConformity): void {
    const list = this.getNonConformities();
    const idx = list.findIndex(n => n.id === nc.id);
    if (idx >= 0) list[idx] = nc;
    else list.unshift(nc);
    setStored(KEYS.NON_CONFORMITIES, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('non_conformities')
        .upsert(mapNCToDb(nc))
        .then(({ error }) => {
          if (error) console.error('Supabase saveNonConformity error:', error);
        });
    }
  }

  // --- CAPA ---
  static getCAPAs(): CAPA[] {
    return getStored<CAPA[]>(KEYS.CAPA, INITIAL_CAPAS);
  }

  static saveCAPA(capa: CAPA): void {
    const list = this.getCAPAs();
    const idx = list.findIndex(c => c.id === capa.id);
    if (idx >= 0) list[idx] = capa;
    else list.unshift(capa);
    setStored(KEYS.CAPA, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('capa')
        .upsert(mapCAPAToDb(capa))
        .then(({ error }) => {
          if (error) console.error('Supabase saveCAPA error:', error);
        });
    }
  }

  static deleteCAPA(id: string): void {
    const target = this.getCAPAs().find(c => c.id === id);
    const list = this.getCAPAs().filter(c => c.id !== id);
    setStored(KEYS.CAPA, list);

    const sb = getSupabase();
    if (sb) {
      sb.from('capa')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteCAPA error:', error);
        });
    }

    if (target) {
      this.logAudit('DELETE_CAPA', `Menghapus dokumen CAPA ${target.id} (${target.problemStatement.substring(0, 40)}...)`, null, target);
    }
  }

  // --- Audit Logs ---
  static getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  static logAudit(
    action: AuditLog['action'],
    details: string,
    newData?: any,
    previousData?: any
  ): void {
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      previousData,
      newData,
      ipAddress: '127.0.0.1 (Client Session)',
      userAgent: navigator.userAgent,
    };

    const logs = this.getAuditLogs();
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    setStored(KEYS.AUDIT_LOGS, logs);

    const sb = getSupabase();
    if (sb) {
      sb.from('audit_logs')
        .insert(mapAuditToDb(newLog))
        .then(({ error }) => {
          if (error) console.error('Supabase logAudit error:', error);
        });
    }
  }

  // --- Notifications ---
  static getNotifications(): AppNotification[] {
    return getStored<AppNotification[]>(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  static addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): void {
    const list = this.getNotifications();
    const item: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      read: false,
    };
    list.unshift(item);
    setStored(KEYS.NOTIFICATIONS, list);
  }

  static markNotificationRead(id: string): void {
    const list = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    setStored(KEYS.NOTIFICATIONS, list);
  }

  static markAllNotificationsRead(): void {
    const list = this.getNotifications().map(n => ({ ...n, read: true }));
    setStored(KEYS.NOTIFICATIONS, list);
  }
}

// Auto init once
StorageService.init();
