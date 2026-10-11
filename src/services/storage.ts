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
  QCLot,
  QCHematologi,
} from '../types';
import { DEFAULT_WESTGARD_RULES } from '../utils/qcCalculations';
import { getSupabase } from './supabase';

const DEFAULT_LAB: LaboratoryInfo = {
  id: 'lab-rsud-smj1',
  name: 'INSTALASI PATOLOGI KLINIK & LABORATORIUM TERPADU',
  hospitalName: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
  healthService: 'DINAS KESEHATAN DAN KELUARGA BERENCANA',
  regency: 'PEMERINTAH KABUPATEN KAYONG UTARA',
  province: 'Kalimantan Barat',
  roomUnit: 'Laboratorium Sentral Lantai 1',
  headOfLab: 'dr. Hendra Wijaya, Sp.PK',
  headNip: '19800512 200801 1 008',
  headOfQuality: 'Siti Rahmawati, S.Tr.Kes',
  qualityNip: '19850914 201001 2 015',
  address: 'Jl. Provinsi Sukadana - Teluk Batang KM. 3, Desa Harapan Mulia, Kec. Sukadana, Kab. Kayong Utara 78852',
  phone: '(0534) 770123 / Ext. 108',
  email: 'rsudsmj1.kku@gmail.com',
  accreditation: 'KARS Paripurna Bintang 5',
  logoUrl: '/Lambang_Daerah_Kab._Kayong_Utara.png',
  logoRightUrl: '',
};

// Data Mappers: TypeScript (camelCase) <-> Supabase PostgreSQL (snake_case)
function mapLabToDbFull(info: LaboratoryInfo) {
  return {
    id: info.id || 'lab-rsud-smj1',
    name: info.name,
    hospital_name: info.hospitalName,
    regency: info.regency,
    province: info.province,
    room_unit: info.roomUnit,
    head_of_lab: info.headOfLab,
    head_nip: info.headNip,
    head_of_quality: info.headOfQuality || 'Siti Rahmawati, S.Tr.Kes',
    quality_nip: info.qualityNip || '19850914 201001 2 015',
    address: info.address,
    phone: info.phone,
    email: info.email,
    accreditation: info.accreditation,
    logo_url: info.logoUrl,
  };
}

function mapLabToDbBase(info: LaboratoryInfo) {
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
    id: row.id || 'lab-rsud-smj1',
    name: row.name || DEFAULT_LAB.name,
    hospitalName: row.hospital_name || row.hospitalName || DEFAULT_LAB.hospitalName,
    healthService: row.health_service || row.healthService || DEFAULT_LAB.healthService,
    regency: row.regency || DEFAULT_LAB.regency,
    province: row.province || DEFAULT_LAB.province,
    roomUnit: row.room_unit || row.roomUnit || DEFAULT_LAB.roomUnit,
    headOfLab: row.head_of_lab || row.headOfLab || DEFAULT_LAB.headOfLab,
    headNip: row.head_nip || row.headNip || DEFAULT_LAB.headNip,
    headOfQuality: row.head_of_quality || row.headOfQuality || DEFAULT_LAB.headOfQuality,
    qualityNip: row.quality_nip || row.qualityNip || DEFAULT_LAB.qualityNip,
    address: row.address || DEFAULT_LAB.address,
    phone: row.phone || DEFAULT_LAB.phone,
    email: row.email || DEFAULT_LAB.email,
    accreditation: row.accreditation || DEFAULT_LAB.accreditation,
    logoUrl: row.logo_url || row.logoUrl || DEFAULT_LAB.logoUrl,
    logoRightUrl: row.logo_right_url || row.logoRightUrl || '',
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
    password: u.password || 'password123',
  };
}

function mapDbToUser(row: any): User {
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'analis',
    nip: row.nip || '',
    department: row.department || 'Instalasi Patologi Klinik',
    avatar: row.avatar,
    isActive: row.is_active ?? row.isActive ?? true,
    password: row.password || row.pass || 'password123',
    createdAt: row.created_at || row.createdAt,
  };
}

function mapRoleToDb(r: RoleDefinition) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions || [],
    is_system: r.isSystem ?? false,
  };
}

function mapDbToRole(row: any): RoleDefinition {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isSystem: row.is_system ?? row.isSystem ?? false,
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
    deletedAt: row.deleted_at || row.deletedAt || undefined,
  };
}

function mapControlToDb(m: ControlMaterial) {
  return {
    id: m.id,
    name: m.name,
    manufacturer: m.manufacturer,
    level: m.level,
    lot_number: m.lotNumber,
    expiration_date: m.expirationDate,
    storage_condition: m.storageCondition || '2°C - 8°C (Lyophilized)',
    status: m.status || 'active',
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
    storageCondition: row.storage_condition || row.storageCondition || '2°C - 8°C (Lyophilized)',
    status: row.status || 'active',
    deletedAt: row.deleted_at || row.deletedAt || undefined,
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
    target_mean: Number(p.targetMean),
    target_sd: Number(p.targetSd),
    target_cv: Number(p.targetCv),
    min_acceptable: Number(p.minAcceptable),
    max_acceptable: Number(p.maxAcceptable),
    decimal_places: Number(p.decimalPlaces ?? 1),
    is_active: p.isActive ?? true,
  };
}

function mapDbToParam(row: any): Parameter {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    method: row.method,
    instrumentId: row.instrument_id || row.instrumentId,
    controlMaterialId: row.control_material_id || row.controlMaterialId,
    targetMean: Number(row.target_mean ?? row.targetMean),
    targetSd: Number(row.target_sd ?? row.targetSd),
    targetCv: Number(row.target_cv ?? row.targetCv),
    minAcceptable: Number(row.min_acceptable ?? row.minAcceptable),
    maxAcceptable: Number(row.max_acceptable ?? row.maxAcceptable),
    decimal_places: row.decimal_places,
    decimalPlaces: row.decimal_places ?? row.decimalPlaces ?? 1,
    isActive: row.is_active ?? row.isActive ?? true,
    deletedAt: row.deleted_at || row.deletedAt || undefined,
  };
}

function mapQCResultToDb(r: QCResult) {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    timestamp: r.timestamp || Date.now(),
    operator_id: r.operatorId || null,
    operator_name: r.operatorName,
    instrument_id: r.instrumentId || null,
    instrument_name: r.instrumentName,
    parameter_id: r.parameterId,
    parameter_name: r.parameterName,
    parameter_code: r.parameterCode,
    control_level: r.controlLevel,
    lot_number: r.lotNumber,
    value: Number(r.value),
    unit: r.unit,
    mean: Number(r.mean),
    sd: Number(r.sd),
    z_score: Number(r.zScore),
    sd_position: r.sdPosition,
    status: r.status,
    violations: r.violations || [],
    notes: r.notes || null,
    is_demo: r.isDemo || false,
    is_deleted: r.isDeleted || false,
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
    timestamp: row.timestamp || Date.now(),
    operatorId: row.operator_id || row.operatorId,
    operatorName: row.operator_name || row.operatorName,
    instrumentId: row.instrument_id || row.instrumentId,
    instrumentName: row.instrument_name || row.instrumentName,
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
    notes: row.notes,
    isDemo: row.is_demo ?? row.isDemo ?? false,
    isDeleted: row.is_deleted ?? row.isDeleted ?? false,
    reviewStatus: row.review_status || row.reviewStatus || 'pending',
    reviewedBy: row.reviewed_by || row.reviewedBy,
    reviewedByName: row.reviewed_by_name || row.reviewedByName,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    reviewComment: row.review_comment || row.reviewComment,
    linkedNonConformityId: row.linked_non_conformity_id || row.linkedNonConformityId,
    linkedCapaId: row.linked_capa_id || row.linkedCapaId,
    deletedAt: row.deleted_at || row.deletedAt || undefined,
  };
}

function mapNCToDb(n: NonConformity) {
  return {
    id: n.id,
    date: n.date,
    time: n.time,
    unit: n.unit,
    instrument_id: n.instrumentId || null,
    instrument_name: n.instrumentName,
    parameter_id: n.parameterId || null,
    parameter_name: n.parameterName,
    qc_result_id: n.qcResultId || null,
    westgard_rule: n.westgardRule || null,
    severity: n.severity,
    category: n.category,
    description: n.description,
    impact: n.impact,
    initial_analysis: n.initialAnalysis,
    immediate_action: n.immediateAction,
    reported_by: n.reportedBy || null,
    reported_by_name: n.reportedByName,
    status: n.status || 'open',
    resolved_at: n.resolvedAt || null,
    linked_capa_id: n.linkedCapaId || null,
  };
}

function mapDbToNC(row: any): NonConformity {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    unit: row.unit,
    instrumentId: row.instrument_id || row.instrumentId,
    instrumentName: row.instrument_name || row.instrumentName,
    parameterId: row.parameter_id || row.parameterId,
    parameterName: row.parameter_name || row.parameterName,
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
    status: row.status || 'open',
    resolvedAt: row.resolved_at || row.resolvedAt,
    linkedCapaId: row.linked_capa_id || row.linkedCapaId,
    deletedAt: row.deleted_at || row.deletedAt || undefined,
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
    deletedAt: row.deleted_at || row.deletedAt || undefined,
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
    user_agent: a.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'),
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

function mapNotifToDb(n: AppNotification) {
  return {
    id: n.id,
    timestamp: n.timestamp,
    type: n.type,
    title: n.title,
    message: n.message,
    link_tab: n.linkTab || null,
    link_id: n.linkId || null,
    read: n.read ?? false,
  };
}

function mapDbToNotif(row: any): AppNotification {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at,
    type: row.type,
    title: row.title,
    message: row.message,
    linkTab: row.link_tab || row.linkTab,
    linkId: row.link_id || row.linkId,
    read: row.read ?? false,
  };
}

let realtimeSubscription: any = null;

export class StorageService {
  // In-memory cache synced directly with Supabase (Zero local storage/mock reliance)
  private static labInfo: LaboratoryInfo = DEFAULT_LAB;
  private static users: User[] = [];
  private static roles: RoleDefinition[] = [];
  private static currentUser: User = { id: 'usr-admin', name: 'Admin Lab', email: 'admin@rsudsmj1.kku.go.id', role: 'admin', permissions: [] };
  private static instruments: Instrument[] = [];
  private static controlMaterials: ControlMaterial[] = [];
  private static parameters: Parameter[] = [];
  private static westgardRules: WestgardRuleConfig[] = DEFAULT_WESTGARD_RULES;
  private static qcResults: QCResult[] = [];
  private static nonConformities: NonConformity[] = [];
  private static capas: CAPA[] = [];
  private static auditLogs: AuditLog[] = [];
  private static notifications: AppNotification[] = [];
  private static qcLots: QCLot[] = [];
  private static qcHematologi: QCHematologi[] = [];
  private static deletedQcIds: string[] = [];
  private static deletedInstIds: string[] = [];
  private static deletedCtrlIds: string[] = [];
  private static deletedParamIds: string[] = [];

  static async init(): Promise<void> {
    await this.syncFromSupabase();
  }

  static async resetToDemo(): Promise<void> {
    await this.clearAllData();
  }

  static async clearAllData(): Promise<void> {
    this.labInfo = DEFAULT_LAB;
    this.users = [];
    this.roles = [];
    this.instruments = [];
    this.controlMaterials = [];
    this.parameters = [];
    this.qcResults = [];
    this.nonConformities = [];
    this.capas = [];
    this.auditLogs = [];
    this.notifications = [];
    this.qcLots = [];
    this.qcHematologi = [];
    this.deletedQcIds = [];
    this.deletedInstIds = [];
    this.deletedCtrlIds = [];
    this.deletedParamIds = [];
    this.notifyDataChanged('all');
  }

  // --- Real-Time Sync & Hydration from Supabase ---
  static async syncFromSupabase(onSynced?: () => void): Promise<{ success: boolean; count: number; message: string }> {
    const sb = getSupabase();
    if (!sb) {
      return { success: false, count: 0, message: 'Supabase belum dikonfigurasi.' };
    }

    try {
      let totalCount = 0;

      // 1. QC Results
      const { data: qcData, error: qcErr } = await sb.from('qc_results').select('*').is('deleted_at', null).order('date', { ascending: false });
      if (!qcErr && qcData) {
        this.qcResults = qcData.map(mapDbToQCResult);
        totalCount += this.qcResults.length;
      }

      // 2. Instruments
      const { data: instData, error: instErr } = await sb.from('instruments').select('*').is('deleted_at', null);
      if (!instErr && instData) {
        this.instruments = instData.map(mapDbToInstrument);
        totalCount += this.instruments.length;
      }

      // 3. Control Materials
      const { data: ctrlData, error: ctrlErr } = await sb.from('control_materials').select('*').is('deleted_at', null);
      if (!ctrlErr && ctrlData) {
        this.controlMaterials = ctrlData.map(mapDbToControl);
        totalCount += this.controlMaterials.length;
      }

      // 4. Parameters
      const { data: paramData, error: paramErr } = await sb.from('test_parameters').select('*').is('deleted_at', null);
      if (!paramErr && paramData) {
        this.parameters = paramData.map(mapDbToParam);
        totalCount += this.parameters.length;
      }

      // 5. Non-Conformities
      const { data: ncData, error: ncErr } = await sb.from('non_conformities').select('*').is('deleted_at', null);
      if (!ncErr && ncData) {
        this.nonConformities = ncData.map(mapDbToNC);
        totalCount += this.nonConformities.length;
      }

      // 6. CAPA
      const { data: capaData, error: capaErr } = await sb.from('capa').select('*').is('deleted_at', null);
      if (!capaErr && capaData) {
        this.capas = capaData.map(mapDbToCAPA);
        totalCount += this.capas.length;
      }

      // 7. Users
      const { data: userData, error: userErr } = await sb.from('app_users').select('*');
      if (!userErr && userData) {
        this.users = userData.map(mapDbToUser);
        totalCount += this.users.length;
      }

      // 7b. Roles
      const { data: roleData, error: roleErr } = await sb.from('roles').select('*');
      if (!roleErr && roleData) {
        this.roles = roleData.map(mapDbToRole);
        totalCount += this.roles.length;
      }

      // 8. Laboratories
      const { data: labData, error: labErr } = await sb.from('laboratories').select('*').limit(1);
      if (!labErr && labData && labData.length > 0) {
        this.labInfo = mapDbToLab(labData[0]);
      }

      // 9. Audit Logs
      const { data: auditData, error: auditErr } = await sb.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (!auditErr && auditData) {
        this.auditLogs = auditData.map(mapDbToAudit);
      }

      // 10. Notifications
      const { data: notifData, error: notifErr } = await sb.from('notifications').select('*').order('timestamp', { ascending: false });
      if (!notifErr && notifData) {
        this.notifications = notifData.map(mapDbToNotif);
      }

      this.notifyDataChanged('all');
      if (onSynced) onSynced();

      return { success: true, count: totalCount, message: 'Sinkronisasi dari Supabase berhasil!' };
    } catch (err: any) {
      console.error('Error in syncFromSupabase:', err);
      return { success: false, count: 0, message: err.message || 'Gagal sinkronisasi dari Supabase.' };
    }
  }

  static async pushAllToSupabase(): Promise<{ success: boolean; message: string }> {
    const sb = getSupabase();
    if (!sb) return { success: false, message: 'Supabase belum dikonfigurasi.' };

    try {
      await sb.from('laboratories').upsert(mapLabToDbFull(this.labInfo));
      if (this.users.length > 0) await sb.from('app_users').upsert(this.users.map(mapUserToDb));
      if (this.roles.length > 0) await sb.from('roles').upsert(this.roles.map(mapRoleToDb));
      if (this.instruments.length > 0) await sb.from('instruments').upsert(this.instruments.map(mapInstrumentToDb));
      if (this.controlMaterials.length > 0) await sb.from('control_materials').upsert(this.controlMaterials.map(mapControlToDb));
      if (this.parameters.length > 0) await sb.from('test_parameters').upsert(this.parameters.map(mapParamToDb));
      if (this.qcResults.length > 0) await sb.from('qc_results').upsert(this.qcResults.map(mapQCResultToDb));
      if (this.nonConformities.length > 0) await sb.from('non_conformities').upsert(this.nonConformities.map(mapNCToDb));
      if (this.capas.length > 0) await sb.from('capa').upsert(this.capas.map(mapCAPAToDb));
      if (this.auditLogs.length > 0) await sb.from('audit_logs').upsert(this.auditLogs.slice(0, 50).map(mapAuditToDb));

      return { success: true, message: 'Seluruh data berhasil diunggah ke Supabase!' };
    } catch (err: any) {
      console.error('pushAllToSupabase error:', err);
      return { success: false, message: err.message || 'Gagal mengunggah data ke Supabase.' };
    }
  }

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
          async () => {
            await StorageService.syncFromSupabase(onDataChanged);
          }
        )
        .subscribe();

      return () => {
        if (realtimeSubscription) {
          realtimeSubscription.unsubscribe();
        }
      };
    } catch (e) {
      console.error('Failed to subscribe to realtime:', e);
      return () => {};
    }
  }

  static notifyDataChanged(type?: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lqcms_data_updated', { detail: { type } }));
    }
  }

  // --- Laboratory Info ---
  static getLabInfo(): LaboratoryInfo {
    return this.labInfo;
  }

  static async updateLabInfo(info: LaboratoryInfo): Promise<void> {
    this.labInfo = { ...DEFAULT_LAB, ...info };
    this.notifyDataChanged('lab_info');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('laboratories').upsert(mapLabToDbFull(this.labInfo));
        if (error) console.error('Supabase updateLabInfo error:', error);
      } catch (err) {
        console.error('Supabase updateLabInfo network error:', err);
      }
    }
  }

  // --- Users & Roles ---
  static getUsers(): User[] {
    return this.users;
  }

  static async saveUser(user: User): Promise<void> {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
    this.notifyDataChanged('users');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('app_users').upsert(mapUserToDb(user));
        if (error) console.error('Supabase saveUser error:', error);
      } catch (err) {
        console.error('Supabase saveUser network error:', err);
      }
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    this.users = this.users.filter(u => u.id !== userId);
    this.notifyDataChanged('users');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('app_users').delete().eq('id', userId);
        if (error) console.error('Supabase deleteUser error:', error);
      } catch (err) {
        console.error('Supabase deleteUser network error:', err);
      }
    }
  }

  static getRoles(): RoleDefinition[] {
    const defaultRoles: RoleDefinition[] = [
      { id: 'admin', name: 'Administrator', description: 'Akses penuh seluruh sistem & konfigurasi', permissions: [], isSystem: true },
      { id: 'supervisor', name: 'Supervisor / Penanggung Jawab', description: 'Validasi QC, CAPA, & Tinjauan Mutu', permissions: ['input_qc', 'verify_qc', 'view_reports', 'manage_capa', 'manage_nc', 'view_audit'], isSystem: true },
      { id: 'analis', name: 'Analis / ATLM', description: 'Input harian QC & Pemeriksaan', permissions: ['input_qc', 'view_reports', 'manage_nc'], isSystem: true },
      { id: 'viewer', name: 'Viewer / Auditor', description: 'Akses baca laporan & grafik', permissions: ['view_reports'], isSystem: true },
    ];
    if (this.roles.length === 0) {
      return defaultRoles;
    }
    const existingIds = this.roles.map(r => r.id);
    const missingDefaults = defaultRoles.filter(d => !existingIds.includes(d.id));
    return [...missingDefaults, ...this.roles];
  }

  static async saveRole(role: RoleDefinition): Promise<void> {
    const idx = this.roles.findIndex(r => r.id === role.id);
    if (idx >= 0) this.roles[idx] = role;
    else this.roles.push(role);
    this.notifyDataChanged('roles');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('roles').upsert(mapRoleToDb(role));
        if (error) console.error('Supabase saveRole error:', error);
      } catch (err) {
        console.error('Supabase saveRole network error:', err);
      }
    }
    await this.logAudit('UPDATE_MASTER_DATA', `Menyimpan konfigurasi hak akses peran: ${role.name}`);
  }

  static async deleteRole(id: string): Promise<void> {
    const role = this.roles.find(r => r.id === id);
    this.roles = this.roles.filter(r => r.id !== id);
    this.notifyDataChanged('roles');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('roles').delete().eq('id', id);
        if (error) console.error('Supabase deleteRole error:', error);
      } catch (err) {
        console.error('Supabase deleteRole network error:', err);
      }
    }
    if (role) {
      await this.logAudit('UPDATE_MASTER_DATA', `Menghapus peran kustom: ${role.name}`);
    }
  }

  static getCurrentUser(): User {
    return this.currentUser;
  }

  static setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  // --- Instruments ---
  static getInstruments(): Instrument[] {
    return this.instruments.filter(i => !this.deletedInstIds.includes(i.id) && !i.deletedAt);
  }

  static async saveInstrument(instrument: Instrument): Promise<void> {
    const idx = this.instruments.findIndex(i => i.id === instrument.id);
    if (idx >= 0) this.instruments[idx] = instrument;
    else this.instruments.push(instrument);
    this.notifyDataChanged('instruments');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('instruments').upsert(mapInstrumentToDb(instrument));
        if (error) console.error('Supabase saveInstrument error:', error);
      } catch (err) {
        console.error('Supabase saveInstrument network error:', err);
      }
    }
    await this.logAudit('UPDATE_MASTER_DATA', `Menyimpan instrumen: ${instrument.name} (${instrument.code})`);
  }

  static async deleteInstrument(id: string): Promise<void> {
    const inst = this.instruments.find(i => i.id === id);
    this.instruments = this.instruments.filter(i => i.id !== id);
    if (!this.deletedInstIds.includes(id)) this.deletedInstIds.push(id);
    this.notifyDataChanged('instruments');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('instruments').delete().eq('id', id);
        if (error) console.error('Supabase deleteInstrument error:', error);
      } catch (err) {
        console.error('Supabase deleteInstrument network error:', err);
      }
    }
    if (inst) {
      await this.logAudit('UPDATE_MASTER_DATA', `Menghapus instrumen: ${inst.name} (${inst.code})`);
    }
  }

  // --- Control Materials ---
  static getControlMaterials(): ControlMaterial[] {
    return this.controlMaterials.filter(m => !this.deletedCtrlIds.includes(m.id) && !m.deletedAt);
  }

  static async saveControlMaterial(material: ControlMaterial): Promise<void> {
    const idx = this.controlMaterials.findIndex(m => m.id === material.id);
    if (idx >= 0) this.controlMaterials[idx] = material;
    else this.controlMaterials.push(material);
    this.notifyDataChanged('controls');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('control_materials').upsert(mapControlToDb(material));
        if (error) console.error('Supabase saveControlMaterial error:', error);
      } catch (err) {
        console.error('Supabase saveControlMaterial network error:', err);
      }
    }
    await this.logAudit('UPDATE_MASTER_DATA', `Menyimpan bahan kontrol: ${material.name} (Lot: ${material.lotNumber})`);
  }

  static async deleteControlMaterial(id: string): Promise<void> {
    const mat = this.controlMaterials.find(m => m.id === id);
    this.controlMaterials = this.controlMaterials.filter(m => m.id !== id);
    if (!this.deletedCtrlIds.includes(id)) this.deletedCtrlIds.push(id);
    this.notifyDataChanged('controls');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('control_materials').delete().eq('id', id);
        if (error) console.error('Supabase deleteControlMaterial error:', error);
      } catch (err) {
        console.error('Supabase deleteControlMaterial network error:', err);
      }
    }
    if (mat) {
      await this.logAudit('UPDATE_MASTER_DATA', `Menghapus bahan kontrol: ${mat.name} (Lot: ${mat.lotNumber})`);
    }
  }

  // --- Parameters ---
  static getParameters(): Parameter[] {
    return this.parameters.filter(p => !this.deletedParamIds.includes(p.id) && !p.deletedAt);
  }

  static async saveParameter(param: Parameter): Promise<void> {
    const idx = this.parameters.findIndex(p => p.id === param.id);
    if (idx >= 0) this.parameters[idx] = param;
    else this.parameters.push(param);
    this.notifyDataChanged('parameters');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').upsert(mapParamToDb(param));
        if (error) console.error('Supabase saveParameter error:', error);
      } catch (err) {
        console.error('Supabase saveParameter network error:', err);
      }
    }
  }

  static async saveParameters(params: Parameter[]): Promise<{ updatedCount: number; createdCount: number }> {
    let updatedCount = 0;
    let createdCount = 0;

    params.forEach(param => {
      const idx = this.parameters.findIndex(p => p.id === param.id || (p.code.toLowerCase() === param.code.toLowerCase() && p.instrumentId === param.instrumentId));
      if (idx >= 0) {
        this.parameters[idx] = { ...this.parameters[idx], ...param, id: this.parameters[idx].id };
        updatedCount++;
      } else {
        this.parameters.push(param);
        createdCount++;
      }
    });
    this.notifyDataChanged('parameters');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').upsert(this.parameters.map(mapParamToDb));
        if (error) console.error('Supabase saveParameters bulk error:', error);
      } catch (err) {
        console.error('Supabase saveParameters bulk network error:', err);
      }
    }
    await this.logAudit('UPDATE_MASTER_DATA', `Mengimpor ${params.length} parameter QC (${createdCount} baru, ${updatedCount} diperbarui).`);

    return { updatedCount, createdCount };
  }

  static async deleteParameter(id: string): Promise<void> {
    const param = this.parameters.find(p => p.id === id);
    this.parameters = this.parameters.filter(p => p.id !== id);
    if (!this.deletedParamIds.includes(id)) this.deletedParamIds.push(id);
    this.notifyDataChanged('parameters');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').delete().eq('id', id);
        if (error) console.error('Supabase deleteParameter error:', error);
      } catch (err) {
        console.error('Supabase deleteParameter network error:', err);
      }
    }
    if (param) {
      await this.logAudit('UPDATE_MASTER_DATA', `Menghapus parameter pemeriksaan: ${param.name} [${param.code}]`);
    }
  }

  // --- Westgard Rules ---
  static getWestgardRules(): WestgardRuleConfig[] {
    return this.westgardRules;
  }

  static saveWestgardRules(rules: WestgardRuleConfig[]): void {
    this.westgardRules = rules;
    this.notifyDataChanged('westgard');
  }

  static getDeletedQCIds(): string[] {
    return this.deletedQcIds;
  }

  static trackDeletedQCId(id: string): void {
    if (!this.deletedQcIds.includes(id)) this.deletedQcIds.push(id);
  }

  static getDeletedInstrumentIds(): string[] {
    return this.deletedInstIds;
  }

  static trackDeletedInstrumentId(id: string): void {
    if (!this.deletedInstIds.includes(id)) this.deletedInstIds.push(id);
  }

  static getDeletedControlIds(): string[] {
    return this.deletedCtrlIds;
  }

  static trackDeletedControlId(id: string): void {
    if (!this.deletedCtrlIds.includes(id)) this.deletedCtrlIds.push(id);
  }

  static getDeletedParameterIds(): string[] {
    return this.deletedParamIds;
  }

  static trackDeletedParameterId(id: string): void {
    if (!this.deletedParamIds.includes(id)) this.deletedParamIds.push(id);
  }

  // --- QC Results ---
  static getQCResults(): QCResult[] {
    return this.qcResults.filter(r => !this.deletedQcIds.includes(r.id) && !r.isDeleted && !(r as any).is_deleted && !r.deletedAt);
  }

  static async saveQCResult(result: QCResult): Promise<void> {
    let idx = this.qcResults.findIndex(r => r.id === result.id);
    if (idx < 0) {
      idx = this.qcResults.findIndex(r =>
        r.parameterId === result.parameterId &&
        r.instrumentId === result.instrumentId &&
        r.controlLevel === result.controlLevel &&
        r.date === result.date &&
        (r.time === result.time || (r.timestamp && result.timestamp && Math.abs(r.timestamp - result.timestamp) < 60000)) &&
        Number(r.value) === Number(result.value)
      );
    }

    if (idx >= 0) {
      this.qcResults[idx] = { ...this.qcResults[idx], ...result, id: this.qcResults[idx].id };
    } else {
      this.qcResults.unshift(result);
    }
    this.notifyDataChanged('qc_results');

    const sb = getSupabase();
    if (sb) {
      const target = idx >= 0 ? this.qcResults[idx] : result;
      const { error } = await sb.from('qc_results').upsert(mapQCResultToDb(target));
      if (error) console.error('Supabase saveQCResult error:', error);
    }
  }

  static async deleteQCResult(id: string): Promise<void> {
    this.qcResults = this.qcResults.filter(r => r.id !== id);
    if (!this.deletedQcIds.includes(id)) this.deletedQcIds.push(id);
    this.notifyDataChanged('qc_results');

    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('qc_results').update({ deleted_at: new Date().toISOString(), is_deleted: true }).eq('id', id);
      if (error) console.error('Supabase deleteQCResult error:', error);
    }
  }

  // --- Non-Conformities ---
  static getNonConformities(): NonConformity[] {
    return this.nonConformities.filter(n => !n.deletedAt);
  }

  static async saveNonConformity(nc: NonConformity): Promise<void> {
    const idx = this.nonConformities.findIndex(n => n.id === nc.id);
    if (idx >= 0) this.nonConformities[idx] = nc;
    else this.nonConformities.unshift(nc);
    this.notifyDataChanged('non_conformities');

    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('non_conformities').upsert(mapNCToDb(nc));
      if (error) console.error('Supabase saveNonConformity error:', error);
    }
  }

  static async deleteNonConformity(id: string): Promise<void> {
    this.nonConformities = this.nonConformities.filter(n => n.id !== id);
    this.notifyDataChanged('non_conformities');

    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('non_conformities').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) console.error('Supabase deleteNonConformity error:', error);
    }
  }

  // --- CAPA ---
  static getCAPAs(): CAPA[] {
    return this.capas.filter(c => !c.deletedAt);
  }

  static async saveCAPA(capa: CAPA): Promise<void> {
    const idx = this.capas.findIndex(c => c.id === capa.id);
    if (idx >= 0) this.capas[idx] = capa;
    else this.capas.unshift(capa);
    this.notifyDataChanged('capa');

    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('capa').upsert(mapCAPAToDb(capa));
      if (error) console.error('Supabase saveCAPA error:', error);
    }
  }

  static async deleteCAPA(id: string): Promise<void> {
    this.capas = this.capas.filter(c => c.id !== id);
    this.notifyDataChanged('capa');

    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('capa').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) console.error('Supabase deleteCAPA error:', error);
    }
  }

  // --- QC Lots ---
  static getQCLots(): QCLot[] {
    return this.qcLots;
  }

  static async saveQCLot(lot: QCLot): Promise<void> {
    const idx = this.qcLots.findIndex(l => l.id === lot.id);
    if (idx >= 0) this.qcLots[idx] = lot;
    else this.qcLots.push(lot);
    this.notifyDataChanged('qc_lots');
  }

  // --- QC Hematologi ---
  static getQCHematologi(): QCHematologi[] {
    return this.qcHematologi;
  }

  static async saveQCHematologi(item: QCHematologi): Promise<void> {
    this.qcHematologi.unshift(item);
    this.notifyDataChanged('qc_hematologi');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('qc_hematologi').upsert(mapQCHematologiToDb(item));
        if (error) console.error('Supabase saveQCHematologi error:', error);
      } catch (err) {
        console.error('Supabase saveQCHematologi network error:', err);
      }
    }
  }

  // --- Audit Logs ---
  static getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  static async logAudit(action: string, details: string, prevData?: any, newData?: any): Promise<void> {
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      id: 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      userId: user.id || 'usr-admin',
      userName: user.name || 'Admin Lab',
      userRole: user.role || 'admin',
      action,
      details,
      previousData: prevData,
      newData,
      ipAddress: '127.0.0.1',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'App',
    };

    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.notifyDataChanged('audit_logs');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('audit_logs').insert(mapAuditToDb(newLog));
        if (error) console.error('Supabase logAudit error:', error);
      } catch (err) {
        console.error('Supabase logAudit network error:', err);
      }
    }
  }

  // --- Notifications ---
  static getNotifications(): AppNotification[] {
    return this.notifications;
  }

  static async addNotification(notification: AppNotification): Promise<void> {
    this.notifications.unshift(notification);
    this.notifyDataChanged('notifications');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('notifications').upsert(mapNotifToDb(notification));
        if (error) console.error('Supabase addNotification error:', error);
      } catch (err) {
        console.error('Supabase addNotification network error:', err);
      }
    }
  }

  static async markNotificationAsRead(id: string): Promise<void> {
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx >= 0) {
      this.notifications[idx].read = true;
      this.notifyDataChanged('notifications');

      const sb = getSupabase();
      if (sb) {
        try {
          const { error } = await sb.from('notifications').update({ read: true }).eq('id', id);
          if (error) console.error('Supabase markNotificationAsRead error:', error);
        } catch (err) {
          console.error('Supabase markNotificationAsRead network error:', err);
        }
      }
    }
  }
}

// Auto-initialize storage service
StorageService.init();
