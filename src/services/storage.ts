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
// Data Mappers: TypeScript (camelCase) <-> Supabase PostgreSQL (snake_case)
function mapLabToDbFull(info: LaboratoryInfo) {
  return {
    id: info.id || 'lab-rsud-smj1',
    name: info.name,
    hospital_name: info.hospitalName,
    health_service: info.healthService || DEFAULT_LAB.healthService,
    regency: info.regency,
    province: info.province || DEFAULT_LAB.province,
    room_unit: info.roomUnit || DEFAULT_LAB.roomUnit,
    head_of_lab: info.headOfLab,
    head_nip: info.headNip,
    head_of_quality: info.headOfQuality || 'Siti Rahmawati, S.Tr.Kes',
    quality_nip: info.qualityNip || '19850914 201001 2 015',
    address: info.address,
    phone: info.phone,
    email: info.email,
    accreditation: info.accreditation,
    logo_url: info.logoUrl,
    logo_right_url: info.logoRightUrl || null,
    updated_at: info.updatedAt || new Date().toISOString(),
  };
}

function mapLabToDbBase(info: LaboratoryInfo) {
  return {
    id: info.id || 'lab-rsud-smj1',
    name: info.name,
    hospital_name: info.hospitalName,
    health_service: info.healthService || DEFAULT_LAB.healthService,
    regency: info.regency,
    province: info.province || DEFAULT_LAB.province,
    room_unit: info.roomUnit || DEFAULT_LAB.roomUnit,
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
    updatedAt: row.updated_at || row.updatedAt,
    isCustomSaved: true,
  };
}

export function isValidUserAvatar(avatar?: string | null): boolean {
  if (!avatar || typeof avatar !== 'string') return false;
  const trimmed = avatar.trim();
  if (!trimmed) return false;
  // Eliminate all demo model pictures (unsplash, pravatar, randomuser, etc.)
  if (
    trimmed.includes('unsplash.com') ||
    trimmed.includes('images.unsplash') ||
    trimmed.includes('pravatar.cc') ||
    trimmed.includes('randomuser.me') ||
    trimmed.includes('placeholder')
  ) {
    return false;
  }
  // User-uploaded photos are standard base64 data URLs: data:image/...
  if (trimmed.startsWith('data:image/')) return true;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function cleanDemoAvatars(userList: User[]): User[] {
  return userList.map(u => {
    if (u.avatar && !isValidUserAvatar(u.avatar)) {
      return { ...u, avatar: undefined };
    }
    return u;
  });
}

function mapUserToDb(u: User) {
  const avatar = isValidUserAvatar(u.avatar) ? u.avatar : null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    nip: u.nip || null,
    department: u.department || null,
    avatar: avatar,
    is_active: u.isActive ?? true,
    password: u.password || 'password123',
  };
}

function mapDbToUser(row: any): User {
  const rawAvatar = row.avatar;
  const avatar = isValidUserAvatar(rawAvatar) ? rawAvatar : undefined;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'analis',
    nip: row.nip || '',
    department: row.department || 'Instalasi Patologi Klinik',
    avatar: avatar,
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

function mapParamToDb(p: any) {
  const targetMean = Number(p.targetMean ?? p.target_mean ?? 0);
  const targetSd = Number(p.targetSD ?? p.targetSd ?? p.target_sd ?? 0);
  const targetCv = Number(p.targetCV ?? p.targetCv ?? p.target_cv ?? 0);
  const minAcceptable = Number(p.minAcceptable ?? p.min_acceptable ?? (targetMean - 3 * targetSd));
  const maxAcceptable = Number(p.maxAcceptable ?? p.max_acceptable ?? (targetMean + 3 * targetSd));
  const decimalPlaces = Number(p.decimalPlaces ?? p.decimal_places ?? 1);

  return {
    id: p.id || `param-${Date.now().toString().slice(-4)}`,
    code: p.code || p.id || 'PARAM',
    name: p.name || 'Parameter Pemeriksaan',
    unit: p.unit || '',
    method: p.method || '',
    instrument_id: p.instrumentId || p.instrument_id || null,
    control_material_id: p.controlMaterialId || p.control_material_id || null,
    target_mean: isNaN(targetMean) ? 0 : targetMean,
    target_sd: isNaN(targetSd) ? 0 : targetSd,
    target_cv: isNaN(targetCv) ? 0 : targetCv,
    min_acceptable: isNaN(minAcceptable) ? 0 : minAcceptable,
    max_acceptable: isNaN(maxAcceptable) ? 0 : maxAcceptable,
    decimal_places: isNaN(decimalPlaces) ? 1 : decimalPlaces,
    is_active: p.isActive ?? p.is_active ?? true,
  };
}

function mapDbToParam(row: any): Parameter {
  const targetMean = Number(row.target_mean ?? row.targetMean ?? 0);
  const targetSd = Number(row.target_sd ?? row.targetSd ?? row.targetSD ?? 0);
  const targetCv = Number(row.target_cv ?? row.targetCv ?? row.targetCV ?? 0);
  const minAcceptable = Number(row.min_acceptable ?? row.minAcceptable ?? (targetMean - 3 * targetSd));
  const maxAcceptable = Number(row.max_acceptable ?? row.maxAcceptable ?? (targetMean + 3 * targetSd));
  const decimalPlaces = Number(row.decimal_places ?? row.decimalPlaces ?? 1);

  return {
    id: row.id,
    code: row.code || row.id,
    name: row.name,
    unit: row.unit || '',
    method: row.method || '',
    instrumentId: row.instrument_id || row.instrumentId || '',
    controlMaterialId: row.control_material_id || row.controlMaterialId || '',
    targetMean: isNaN(targetMean) ? 0 : targetMean,
    targetSD: isNaN(targetSd) ? 0 : targetSd,
    targetSd: isNaN(targetSd) ? 0 : targetSd,
    targetCV: isNaN(targetCv) ? 0 : targetCv,
    targetCv: isNaN(targetCv) ? 0 : targetCv,
    minAcceptable: isNaN(minAcceptable) ? 0 : minAcceptable,
    maxAcceptable: isNaN(maxAcceptable) ? 0 : maxAcceptable,
    decimal_places: isNaN(decimalPlaces) ? 1 : decimalPlaces,
    decimalPlaces: isNaN(decimalPlaces) ? 1 : decimalPlaces,
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
    actionExecutionDate: row.action_execution_date || row.actionExecutionDate,
    actionExecutionTime: row.action_execution_time || row.actionExecutionTime,
    actionExecutedBy: row.action_executed_by || row.actionExecutedBy,
    actionExecutedByName: row.action_executed_by_name || row.actionExecutedByName,
    postActionQcResult: row.post_action_qc_result || row.postActionQcResult,
    resolutionAction: row.resolution_action || row.resolutionAction,
    resolutionNotes: row.resolution_notes || row.resolutionNotes,
    resolvedAt: row.resolved_at || row.resolvedAt,
    resolvedBy: row.resolved_by || row.resolvedBy,
    resolvedByName: row.resolved_by_name || row.resolvedByName,
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

const CACHE_KEYS = {
  USERS: 'lqcms_cache_users_v2',
  ROLES: 'lqcms_cache_roles_v2',
  LAB_INFO: 'lqcms_cache_lab_info_v2',
  INSTRUMENTS: 'lqcms_cache_instruments_v2',
  CONTROLS: 'lqcms_cache_controls_v2',
  PARAMETERS: 'lqcms_cache_parameters_v2',
  QC_RESULTS: 'lqcms_cache_qc_results_v2',
  NON_CONFORMITIES: 'lqcms_cache_nc_v2',
  CAPAS: 'lqcms_cache_capas_v2',
  AUDIT_LOGS: 'lqcms_cache_audit_logs_v2',
  NOTIFICATIONS: 'lqcms_cache_notifications_v2',
  QC_LOTS: 'lqcms_cache_qc_lots_v2',
  QC_HEMATOLOGI: 'lqcms_cache_qc_hematologi_v2',
  WESTGARD_RULES: 'lqcms_cache_westgard_rules_v2',
};

function readLocalCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeLocalCache(key: string, data: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

export const PERSISTENT_KOP_KEY = 'lqcms_kop_surat_saved_v1';

function getInitialLabInfo(): LaboratoryInfo {
  const customSaved = readLocalCache<LaboratoryInfo | null>(PERSISTENT_KOP_KEY, null);
  if (customSaved && customSaved.hospitalName) {
    return { ...DEFAULT_LAB, ...customSaved, isCustomSaved: true };
  }
  const cached = readLocalCache<LaboratoryInfo | null>(CACHE_KEYS.LAB_INFO, null);
  if (cached && cached.hospitalName) {
    return { ...DEFAULT_LAB, ...cached };
  }
  return DEFAULT_LAB;
}

let realtimeSubscription: any = null;

export class StorageService {
  // Synchronous local cache for instant menu hydration + background Supabase sync
  private static labInfo: LaboratoryInfo = getInitialLabInfo();
  private static users: User[] = cleanDemoAvatars(readLocalCache(CACHE_KEYS.USERS, []));
  private static roles: RoleDefinition[] = readLocalCache(CACHE_KEYS.ROLES, []);
  private static currentUser: User = { id: 'usr-admin', name: 'Admin Lab', email: 'admin@rsudsmj1.kku.go.id', role: 'admin', permissions: [] };
  private static instruments: Instrument[] = readLocalCache(CACHE_KEYS.INSTRUMENTS, []);
  private static controlMaterials: ControlMaterial[] = readLocalCache(CACHE_KEYS.CONTROLS, []);
  private static parameters: Parameter[] = readLocalCache(CACHE_KEYS.PARAMETERS, []);
  private static westgardRules: WestgardRuleConfig[] = readLocalCache(CACHE_KEYS.WESTGARD_RULES, DEFAULT_WESTGARD_RULES);
  private static qcResults: QCResult[] = readLocalCache(CACHE_KEYS.QC_RESULTS, []);
  private static nonConformities: NonConformity[] = readLocalCache(CACHE_KEYS.NON_CONFORMITIES, []);
  private static capas: CAPA[] = readLocalCache(CACHE_KEYS.CAPAS, []);
  private static auditLogs: AuditLog[] = readLocalCache(CACHE_KEYS.AUDIT_LOGS, []);
  private static notifications: AppNotification[] = readLocalCache(CACHE_KEYS.NOTIFICATIONS, []);
  private static qcLots: QCLot[] = readLocalCache(CACHE_KEYS.QC_LOTS, []);
  private static qcHematologi: QCHematologi[] = readLocalCache(CACHE_KEYS.QC_HEMATOLOGI, []);
  private static deletedQcIds: string[] = [];
  private static deletedInstIds: string[] = [];
  private static deletedCtrlIds: string[] = [];
  private static deletedParamIds: string[] = [];
  private static syncPromise: Promise<{ success: boolean; count: number; message: string }> | null = null;
  private static realtimeDebounceTimer: any = null;

  private static initSeedData() {
    const sb = getSupabase();
    // Only inject fallback demo users if there is completely NO data and Supabase is not configured
    if (this.users.length === 0 && !sb) {
      this.users = [
        { 
          id: 'usr-admin', 
          name: 'dr. Hendra Wijaya, Sp.PK', 
          email: 'admin@rsudsmj1.kku.go.id', 
          role: 'admin', 
          nip: '19800512 200801 1 008', 
          department: 'Penanggung Jawab Laboratorium', 
          isActive: true, 
          password: 'password123',
          avatar: undefined,
        },
        { 
          id: 'usr-sup', 
          name: 'Siti Rahmawati, S.Tr.Kes', 
          email: 'siti@rsudsmj1.kku.go.id', 
          role: 'supervisor', 
          nip: '19850914 201001 2 015', 
          department: 'Penanggung Jawab Mutu (PJ Mutu)', 
          isActive: true, 
          password: 'password123',
          avatar: undefined,
        },
        { 
          id: 'usr-analis', 
          name: 'Budi Pratama, A.Md.AK', 
          email: 'budi@rsudsmj1.kku.go.id', 
          role: 'analis', 
          nip: '19930720 201802 1 003', 
          department: 'Ahli Teknologi Laboratorium Medik (ATLM)', 
          isActive: true, 
          password: 'password123',
          avatar: undefined,
        },
        { 
          id: 'usr-viewer', 
          name: 'Maya Andriani, S.Kep', 
          email: 'maya@rsudsmj1.kku.go.id', 
          role: 'viewer', 
          nip: '19950910 202001 2 005', 
          department: 'Tim Mutu & Akreditasi Rumah Sakit', 
          isActive: true, 
          password: 'password123',
          avatar: undefined,
        },
      ];
      writeLocalCache(CACHE_KEYS.USERS, this.users);
    }
    if (this.roles.length === 0) {
      this.roles = [
        { id: 'admin', name: 'Administrator', description: 'Akses penuh seluruh sistem & konfigurasi', permissions: ['input_qc', 'verify_qc', 'view_reports', 'manage_capa', 'manage_nc', 'view_audit', 'manage_users', 'manage_master'], isSystem: true },
        { id: 'supervisor', name: 'Supervisor / Penanggung Jawab', description: 'Validasi QC, CAPA, & Tinjauan Mutu', permissions: ['input_qc', 'verify_qc', 'view_reports', 'manage_capa', 'manage_nc', 'view_audit'], isSystem: true },
        { id: 'analis', name: 'Analis / ATLM', description: 'Input harian QC & Pemeriksaan', permissions: ['input_qc', 'view_reports', 'manage_nc'], isSystem: true },
        { id: 'viewer', name: 'Viewer / Auditor', description: 'Akses baca laporan & grafik', permissions: ['view_reports'], isSystem: true },
      ];
      writeLocalCache(CACHE_KEYS.ROLES, this.roles);
    }
    if (this.instruments.length === 0 && !sb) {
      this.instruments = [
        { id: 'inst-01', name: 'Sysmex XN-550', code: 'HEM-01', brand: 'Sysmex', model: 'XN-550', serialNumber: '12345', unit: 'Hematologi', location: 'Laboratorium Sentral', status: 'active' },
        { id: 'inst-02', name: 'Mindray BS-240', code: 'BIO-01', brand: 'Mindray', model: 'BS-240', serialNumber: '67890', unit: 'Kimia Klinik', location: 'Laboratorium Sentral', status: 'active' },
        { id: 'inst-03', name: 'Roche Cobas e411', code: 'IMM-01', brand: 'Roche', model: 'Cobas e411', serialNumber: '54321', unit: 'Imunologi', location: 'Laboratorium Sentral', status: 'active' },
      ];
      writeLocalCache(CACHE_KEYS.INSTRUMENTS, this.instruments);
    }
    if (this.controlMaterials.length === 0 && !sb) {
      this.controlMaterials = [
        { id: 'ctrl-01', name: 'Sysmex e-CHECK (XN)', manufacturer: 'Sysmex', level: 'Level 1', lotNumber: 'E23041', expirationDate: '2026-12-31', storageCondition: '2°C - 8°C', status: 'active' },
        { id: 'ctrl-02', name: 'Sysmex e-CHECK (XN)', manufacturer: 'Sysmex', level: 'Level 2', lotNumber: 'E23042', expirationDate: '2026-12-31', storageCondition: '2°C - 8°C', status: 'active' },
        { id: 'ctrl-03', name: 'Mindray Control Normal', manufacturer: 'Mindray', level: 'Normal', lotNumber: 'MC2401N', expirationDate: '2026-10-30', storageCondition: '2°C - 8°C', status: 'active' },
      ];
      writeLocalCache(CACHE_KEYS.CONTROLS, this.controlMaterials);
    }
    if (this.parameters.length === 0 && !sb) {
      this.parameters = [
        { id: 'param-01', code: 'HB', name: 'Hemoglobin', unit: 'g/dL', method: 'SLS-Hemoglobin', instrumentId: 'inst-01', controlMaterialId: 'ctrl-01', targetMean: 14.2, targetSd: 0.35, targetCv: 2.5, minAcceptable: 13.1, maxAcceptable: 15.3, decimalPlaces: 1, isActive: true },
        { id: 'param-02', code: 'WBC', name: 'Leukosit', unit: '10^3/uL', method: 'Flow Cytometry', instrumentId: 'inst-01', controlMaterialId: 'ctrl-01', targetMean: 7.5, targetSd: 0.40, targetCv: 5.3, minAcceptable: 6.3, maxAcceptable: 8.7, decimalPlaces: 2, isActive: true },
        { id: 'param-03', code: 'PLT', name: 'Trombosit', unit: '10^3/uL', method: 'Impedance', instrumentId: 'inst-01', controlMaterialId: 'ctrl-01', targetMean: 250, targetSd: 12.5, targetCv: 5.0, minAcceptable: 210, maxAcceptable: 290, decimalPlaces: 0, isActive: true },
        { id: 'param-04', code: 'GLU', name: 'Glukosa Darah', unit: 'mg/dL', method: 'Hexokinase', instrumentId: 'inst-02', controlMaterialId: 'ctrl-03', targetMean: 100, targetSd: 3.2, targetCv: 3.2, minAcceptable: 90, maxAcceptable: 110, decimalPlaces: 1, isActive: true },
        { id: 'param-05', code: 'URE', name: 'Ureum', unit: 'mg/dL', method: 'Urease-GLDH', instrumentId: 'inst-02', controlMaterialId: 'ctrl-03', targetMean: 35, targetSd: 1.8, targetCv: 5.1, minAcceptable: 29, maxAcceptable: 41, decimalPlaces: 1, isActive: true },
        { id: 'param-06', code: 'CRE', name: 'Kreatinin', unit: 'mg/dL', method: 'Jaffe Kinetic', instrumentId: 'inst-02', controlMaterialId: 'ctrl-03', targetMean: 0.9, targetSd: 0.05, targetCv: 5.5, minAcceptable: 0.75, maxAcceptable: 1.05, decimalPlaces: 2, isActive: true },
      ];
      writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
    }
  }

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
    if (typeof window !== 'undefined') {
      Object.values(CACHE_KEYS).forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });
    }
    this.initSeedData();
    this.notifyDataChanged('all');
  }

  // --- Lightning-Fast Real-Time Parallel Sync & Hydration from Supabase ---
  static async syncFromSupabase(onSynced?: () => void): Promise<{ success: boolean; count: number; message: string }> {
    const sb = getSupabase();
    if (!sb) {
      this.initSeedData();
      this.notifyDataChanged('all');
      if (onSynced) onSynced();
      return { success: false, count: 0, message: 'Supabase belum dikonfigurasi. Menggunakan data lokal.' };
    }

    // Deduplicate in-flight sync requests so menu transitions and components don't spam duplicate network floods
    if (this.syncPromise) {
      return this.syncPromise.then((res) => {
        if (onSynced) onSynced();
        return res;
      });
    }

    this.syncPromise = (async () => {
      try {
        let totalCount = 0;

        // Fetch ALL tables simultaneously in parallel for instant sub-second response
        const [
          qcRes,
          instRes,
          ctrlRes,
          paramRes,
          ncRes,
          capaRes,
          userRes,
          roleRes,
          labRes,
          auditRes,
          notifRes,
          westgardRes
        ] = await Promise.allSettled([
          sb.from('qc_results').select('*').is('deleted_at', null).order('date', { ascending: false }),
          sb.from('instruments').select('*').is('deleted_at', null),
          sb.from('control_materials').select('*').is('deleted_at', null),
          sb.from('test_parameters').select('*').is('deleted_at', null),
          sb.from('non_conformities').select('*').is('deleted_at', null),
          sb.from('capa').select('*').is('deleted_at', null),
          sb.from('app_users').select('*'),
          sb.from('roles').select('*'),
          sb.from('laboratories').select('*').limit(1),
          sb.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100),
          sb.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50),
          sb.from('westgard_rules').select('*'),
        ]);

        // 1. QC Results
        if (qcRes.status === 'fulfilled' && !qcRes.value.error && qcRes.value.data) {
          this.qcResults = qcRes.value.data.map(mapDbToQCResult);
          totalCount += this.qcResults.length;
          writeLocalCache(CACHE_KEYS.QC_RESULTS, this.qcResults);
        }

        // 2. Instruments
        if (instRes.status === 'fulfilled' && !instRes.value.error && instRes.value.data) {
          this.instruments = instRes.value.data.map(mapDbToInstrument);
          totalCount += this.instruments.length;
          writeLocalCache(CACHE_KEYS.INSTRUMENTS, this.instruments);
        }

        // 3. Control Materials
        if (ctrlRes.status === 'fulfilled' && !ctrlRes.value.error && ctrlRes.value.data) {
          this.controlMaterials = ctrlRes.value.data.map(mapDbToControl);
          totalCount += this.controlMaterials.length;
          writeLocalCache(CACHE_KEYS.CONTROLS, this.controlMaterials);
        }

        // 4. Test Parameters
        if (paramRes.status === 'fulfilled' && !paramRes.value.error && paramRes.value.data) {
          const remoteRows = paramRes.value.data;
          if (remoteRows.length > 0) {
            const remoteParams = remoteRows.map(mapDbToParam);
            const remoteIds = new Set(remoteParams.map(p => p.id));
            // Retain local-only parameters that were created or edited locally and not deleted
            const localOnly = this.parameters.filter(
              p => !remoteIds.has(p.id) && !this.deletedParamIds.includes(p.id) && !p.deletedAt
            );
            if (localOnly.length > 0 && sb) {
              // Upload local-only parameters to Supabase so remote stays completely synced
              sb.from('test_parameters').upsert(localOnly.map(mapParamToDb)).then();
            }
            this.parameters = [...remoteParams, ...localOnly];
            totalCount += this.parameters.length;
            writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
          } else {
            // Database Supabase is empty:
            // "Pertahankan data lokal dan otomatis unggah ke Supabase"
            if (this.parameters.length > 0) {
              const activeParams = this.parameters.filter(p => !this.deletedParamIds.includes(p.id) && !p.deletedAt);
              if (activeParams.length > 0) {
                totalCount += activeParams.length;
                writeLocalCache(CACHE_KEYS.PARAMETERS, activeParams);
                if (sb) {
                  sb.from('test_parameters').upsert(activeParams.map(mapParamToDb)).then(({ error }) => {
                    if (error) console.warn('Supabase auto-upload local parameters error:', error);
                    else console.log('Sukses auto-upload parameter pemeriksaan lokal ke Supabase');
                  });
                }
              }
            } else {
              // Both remote and local are empty: populate defaults and auto-upload
              this.initSeedData();
              if (this.parameters.length > 0) {
                totalCount += this.parameters.length;
                writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
                if (sb) {
                  sb.from('test_parameters').upsert(this.parameters.map(mapParamToDb)).then();
                }
              }
            }
          }
        }

        // 5. Non-Conformities
        if (ncRes.status === 'fulfilled' && !ncRes.value.error && ncRes.value.data) {
          this.nonConformities = ncRes.value.data.map(mapDbToNC);
          totalCount += this.nonConformities.length;
          writeLocalCache(CACHE_KEYS.NON_CONFORMITIES, this.nonConformities);
        }

        // 6. CAPA
        if (capaRes.status === 'fulfilled' && !capaRes.value.error && capaRes.value.data) {
          this.capas = capaRes.value.data.map(mapDbToCAPA);
          totalCount += this.capas.length;
          writeLocalCache(CACHE_KEYS.CAPAS, this.capas);
        }

        // 7. Users
        if (userRes.status === 'fulfilled' && !userRes.value.error && userRes.value.data) {
          this.users = userRes.value.data.map(mapDbToUser);
          totalCount += this.users.length;
          writeLocalCache(CACHE_KEYS.USERS, this.users);
        }

        // 7b. Roles
        if (roleRes.status === 'fulfilled' && !roleRes.value.error && roleRes.value.data) {
          this.roles = roleRes.value.data.map(mapDbToRole);
          totalCount += this.roles.length;
          writeLocalCache(CACHE_KEYS.ROLES, this.roles);
        }

        // 8. Laboratories (Kop Surat & Penanggung Jawab)
        if (labRes.status === 'fulfilled' && !labRes.value.error && labRes.value.data && labRes.value.data.length > 0) {
          const remoteLab = mapDbToLab(labRes.value.data[0]);
          const localCustom = readLocalCache<LaboratoryInfo | null>(PERSISTENT_KOP_KEY, null);

          if (localCustom && localCustom.isCustomSaved) {
            const localTime = new Date(localCustom.updatedAt || 0).getTime();
            const remoteTime = new Date(labRes.value.data[0].updated_at || labRes.value.data[0].updatedAt || 0).getTime();

            if (remoteTime > localTime) {
              // Remote edit from another session is newer
              this.labInfo = { ...DEFAULT_LAB, ...remoteLab, isCustomSaved: true };
              writeLocalCache(CACHE_KEYS.LAB_INFO, this.labInfo);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(PERSISTENT_KOP_KEY, JSON.stringify(this.labInfo));
                } catch (e) {}
              }
            } else {
              // Local custom kop is newer or equal, preserve it and never overwrite with stale default
              this.labInfo = { ...DEFAULT_LAB, ...localCustom, isCustomSaved: true };
              writeLocalCache(CACHE_KEYS.LAB_INFO, this.labInfo);
              // Push local custom kop to remote if remote was outdated
              if (remoteTime < localTime && sb) {
                sb.from('laboratories').update(mapLabToDbFull(this.labInfo)).eq('id', labRes.value.data[0].id).then();
              }
            }
          } else {
            this.labInfo = remoteLab;
            writeLocalCache(CACHE_KEYS.LAB_INFO, this.labInfo);
          }
        }

        // 9. Audit Logs
        if (auditRes.status === 'fulfilled' && !auditRes.value.error && auditRes.value.data) {
          this.auditLogs = auditRes.value.data.map(mapDbToAudit);
          writeLocalCache(CACHE_KEYS.AUDIT_LOGS, this.auditLogs);
        }

        // 10. Notifications
        if (notifRes.status === 'fulfilled' && !notifRes.value.error && notifRes.value.data) {
          this.notifications = notifRes.value.data.map(mapDbToNotif);
          writeLocalCache(CACHE_KEYS.NOTIFICATIONS, this.notifications);
        }

        // 11. Westgard Rules Configuration
        if (westgardRes.status === 'fulfilled' && !westgardRes.value.error && westgardRes.value.data) {
          if (westgardRes.value.data.length > 0) {
            this.westgardRules = westgardRes.value.data.map((r: any) => ({
              key: r.key,
              name: r.name,
              shortDesc: r.short_desc || r.shortDesc || '',
              description: r.description || '',
              type: r.type,
              enabled: r.enabled ?? true,
              recommendation: r.recommendation || '',
            }));
            writeLocalCache(CACHE_KEYS.WESTGARD_RULES, this.westgardRules);
          } else if (sb && this.westgardRules.length > 0) {
            writeLocalCache(CACHE_KEYS.WESTGARD_RULES, this.westgardRules);
            sb.from('westgard_rules').upsert(this.westgardRules.map(r => ({
              key: r.key,
              name: r.name,
              short_desc: r.shortDesc,
              description: r.description,
              type: r.type,
              enabled: r.enabled,
              recommendation: r.recommendation,
            }))).then();
          }
        }

        // If local cache was completely empty and remote database is empty, seed initial defaults safely
        if (this.users.length === 0 && this.instruments.length === 0) {
          this.initSeedData();
        }

        this.notifyDataChanged('all');
        if (onSynced) onSynced();

        return { success: true, count: totalCount, message: 'Sinkronisasi dari Supabase berhasil!' };
      } catch (err: any) {
        console.warn('Supabase sync warning (using cached data):', err);
        this.notifyDataChanged('all');
        if (onSynced) onSynced();
        return { success: false, count: 0, message: err.message || 'Gagal sinkronisasi dari Supabase (menggunakan cache lokal).' };
      } finally {
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
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

      // Single subscription channel with 250ms debounce to avoid sync floods
      const triggerDebouncedSync = () => {
        if (this.realtimeDebounceTimer) {
          clearTimeout(this.realtimeDebounceTimer);
        }
        this.realtimeDebounceTimer = setTimeout(() => {
          StorageService.syncFromSupabase(onDataChanged);
        }, 250);
      };

      realtimeSubscription = sb
        .channel('lqcms-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          () => {
            triggerDebouncedSync();
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
      try {
        if (!type || type === 'all' || type === 'users') writeLocalCache(CACHE_KEYS.USERS, this.users);
        if (!type || type === 'all' || type === 'roles') writeLocalCache(CACHE_KEYS.ROLES, this.roles);
        if (!type || type === 'all' || type === 'lab_info') {
          writeLocalCache(CACHE_KEYS.LAB_INFO, this.labInfo);
          if (this.labInfo.isCustomSaved) {
            try {
              localStorage.setItem(PERSISTENT_KOP_KEY, JSON.stringify(this.labInfo));
            } catch (e) {}
          }
        }
        if (!type || type === 'all' || type === 'instruments') writeLocalCache(CACHE_KEYS.INSTRUMENTS, this.instruments);
        if (!type || type === 'all' || type === 'controls') writeLocalCache(CACHE_KEYS.CONTROLS, this.controlMaterials);
        if (!type || type === 'all' || type === 'parameters') writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
        if (!type || type === 'all' || type === 'qc_results') writeLocalCache(CACHE_KEYS.QC_RESULTS, this.qcResults);
        if (!type || type === 'all' || type === 'non_conformities') writeLocalCache(CACHE_KEYS.NON_CONFORMITIES, this.nonConformities);
        if (!type || type === 'all' || type === 'capas') writeLocalCache(CACHE_KEYS.CAPAS, this.capas);
        if (!type || type === 'all' || type === 'audit') writeLocalCache(CACHE_KEYS.AUDIT_LOGS, this.auditLogs);
        if (!type || type === 'all' || type === 'notifications') writeLocalCache(CACHE_KEYS.NOTIFICATIONS, this.notifications);
        if (!type || type === 'all' || type === 'westgard') writeLocalCache(CACHE_KEYS.WESTGARD_RULES, this.westgardRules);
        localStorage.setItem('lqcms_last_sync_timestamp', Date.now().toString());
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('lqcms_data_updated', { detail: { type } }));
    }
  }

  // --- Laboratory Info (Kop Surat Laporan Resmi) ---
  static getLabInfo(): LaboratoryInfo {
    return this.labInfo;
  }

  static async updateLabInfo(info: LaboratoryInfo): Promise<{ success: boolean; message?: string }> {
    const updatedLab: LaboratoryInfo = {
      ...DEFAULT_LAB,
      ...this.labInfo,
      ...info,
      updatedAt: new Date().toISOString(),
      isCustomSaved: true,
    };
    this.labInfo = updatedLab;

    // Immediately persist locally across both storage keys
    writeLocalCache(CACHE_KEYS.LAB_INFO, this.labInfo);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PERSISTENT_KOP_KEY, JSON.stringify(this.labInfo));
      } catch (e) {
        console.warn('LocalStorage save kop warning:', e);
      }
    }

    this.notifyDataChanged('lab_info');

    const sb = getSupabase();
    if (sb) {
      try {
        const payload = mapLabToDbFull(this.labInfo);
        // Find existing record in laboratories table to update its specific row
        const { data: existingRows } = await sb.from('laboratories').select('id').limit(1);
        if (existingRows && existingRows.length > 0) {
          const rowId = existingRows[0].id;
          payload.id = rowId;
          this.labInfo.id = rowId;
          const { error: updateErr } = await sb.from('laboratories').update(payload).eq('id', rowId);
          if (updateErr) {
            console.warn('Supabase update laboratories failed, trying upsert:', updateErr);
            await sb.from('laboratories').upsert(payload);
          }
        } else {
          const { error: upsertErr } = await sb.from('laboratories').upsert(payload);
          if (upsertErr) console.error('Supabase updateLabInfo upsert error:', upsertErr);
        }
      } catch (err) {
        console.error('Supabase updateLabInfo network error:', err);
      }
    }

    return { success: true };
  }

  // --- Users & Roles ---
  static getUsers(): User[] {
    return this.users;
  }

  static async saveUser(user: User): Promise<{ success: boolean; message?: string }> {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);

    if (this.currentUser && (this.currentUser.id === user.id || this.currentUser.email === user.email)) {
      this.currentUser = { ...this.currentUser, ...user };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lqcms_current_user_v1', JSON.stringify(this.currentUser));
        } catch (e) {}
      }
    }
    this.notifyDataChanged('users');

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('app_users').upsert(mapUserToDb(user));
        if (error) {
          console.error('Supabase saveUser error:', error);
          return { success: false, message: error.message };
        }
        return { success: true };
      } catch (err: any) {
        console.error('Supabase saveUser network error:', err);
        return { success: false, message: err?.message || 'Gagal menyimpan data pengguna ke Supabase.' };
      }
    }
    return { success: true };
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
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('lqcms_current_user_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            const fresh = this.users.find(u => u.id === parsed.id || u.email === parsed.email);
            if (fresh) {
              this.currentUser = fresh;
              return fresh;
            }
            this.currentUser = parsed;
            return parsed;
          }
        }
      } catch (e) {}
    }
    return this.currentUser;
  }

  static setCurrentUser(user: User): void {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lqcms_current_user_v1', JSON.stringify(user));
      } catch (e) {}
    }
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

  static async saveParameter(param: Parameter): Promise<{ success: boolean; syncedToSupabase: boolean; error?: string }> {
    const id = param.id || `param-${Date.now().toString().slice(-4)}`;
    const targetMean = Number(param.targetMean ?? 0);
    const targetSD = Number(param.targetSD ?? (param as any).targetSd ?? 0);
    const targetCV = Number(param.targetCV ?? (param as any).targetCv ?? 0);
    const minAcceptable = Number(param.minAcceptable ?? (targetMean - 3 * targetSD));
    const maxAcceptable = Number(param.maxAcceptable ?? (targetMean + 3 * targetSD));
    const decimalPlaces = Number(param.decimalPlaces ?? (param as any).decimal_places ?? 1);

    const normalizedParam: Parameter = {
      ...param,
      id,
      code: (param.code || id).trim().toUpperCase(),
      name: (param.name || 'Parameter').trim(),
      unit: (param.unit || '').trim(),
      method: (param.method || '').trim(),
      instrumentId: param.instrumentId || '',
      controlMaterialId: param.controlMaterialId || '',
      targetMean: isNaN(targetMean) ? 0 : targetMean,
      targetSD: isNaN(targetSD) ? 0 : targetSD,
      targetSd: isNaN(targetSD) ? 0 : targetSD,
      targetCV: isNaN(targetCV) ? 0 : targetCV,
      targetCv: isNaN(targetCV) ? 0 : targetCV,
      minAcceptable: isNaN(minAcceptable) ? 0 : minAcceptable,
      maxAcceptable: isNaN(maxAcceptable) ? 0 : maxAcceptable,
      decimalPlaces: isNaN(decimalPlaces) ? 1 : decimalPlaces,
      isActive: (param as any).isActive ?? true,
    };

    // Remove from deleted list if re-added
    this.deletedParamIds = this.deletedParamIds.filter(dId => dId !== id);

    const idx = this.parameters.findIndex(p => p.id === id);
    if (idx >= 0) this.parameters[idx] = normalizedParam;
    else this.parameters.push(normalizedParam);

    writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
    this.notifyDataChanged('parameters');

    let syncedToSupabase = false;
    let errorMessage: string | undefined;

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').upsert(mapParamToDb(normalizedParam));
        if (error) {
          console.error('Supabase saveParameter error:', error);
          errorMessage = error.message;
        } else {
          syncedToSupabase = true;
        }
      } catch (err: any) {
        console.error('Supabase saveParameter network error:', err);
        errorMessage = err?.message || 'Gagal koneksi ke server Supabase';
      }
    }

    await this.logAudit('UPDATE_MASTER_DATA', `Menyimpan parameter pemeriksaan: ${normalizedParam.name} (${normalizedParam.code})`);

    return { success: true, syncedToSupabase, error: errorMessage };
  }

  static async saveParameters(params: Parameter[]): Promise<{ updatedCount: number; createdCount: number; syncedToSupabase: boolean; error?: string }> {
    let updatedCount = 0;
    let createdCount = 0;

    params.forEach(param => {
      const id = param.id || `param-${Date.now().toString().slice(-4)}`;
      const targetMean = Number(param.targetMean ?? 0);
      const targetSD = Number(param.targetSD ?? (param as any).targetSd ?? 0);
      const targetCV = Number(param.targetCV ?? (param as any).targetCv ?? 0);
      const minAcceptable = Number(param.minAcceptable ?? (targetMean - 3 * targetSD));
      const maxAcceptable = Number(param.maxAcceptable ?? (targetMean + 3 * targetSD));
      const decimalPlaces = Number(param.decimalPlaces ?? (param as any).decimal_places ?? 1);

      const normalizedParam: Parameter = {
        ...param,
        id,
        code: (param.code || id).trim().toUpperCase(),
        name: (param.name || 'Parameter').trim(),
        unit: (param.unit || '').trim(),
        method: (param.method || '').trim(),
        instrumentId: param.instrumentId || '',
        controlMaterialId: param.controlMaterialId || '',
        targetMean: isNaN(targetMean) ? 0 : targetMean,
        targetSD: isNaN(targetSD) ? 0 : targetSD,
        targetSd: isNaN(targetSD) ? 0 : targetSD,
        targetCV: isNaN(targetCV) ? 0 : targetCV,
        targetCv: isNaN(targetCV) ? 0 : targetCV,
        minAcceptable: isNaN(minAcceptable) ? 0 : minAcceptable,
        maxAcceptable: isNaN(maxAcceptable) ? 0 : maxAcceptable,
        decimalPlaces: isNaN(decimalPlaces) ? 1 : decimalPlaces,
        isActive: (param as any).isActive ?? true,
      };

      const idx = this.parameters.findIndex(p => p.id === normalizedParam.id || (p.code.toLowerCase() === normalizedParam.code.toLowerCase() && p.instrumentId === normalizedParam.instrumentId));
      if (idx >= 0) {
        this.parameters[idx] = { ...this.parameters[idx], ...normalizedParam, id: this.parameters[idx].id };
        updatedCount++;
      } else {
        this.parameters.push(normalizedParam);
        createdCount++;
      }
    });

    writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
    this.notifyDataChanged('parameters');

    let syncedToSupabase = false;
    let errorMessage: string | undefined;

    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').upsert(this.parameters.map(mapParamToDb));
        if (error) {
          console.error('Supabase saveParameters bulk error:', error);
          errorMessage = error.message;
        } else {
          syncedToSupabase = true;
        }
      } catch (err: any) {
        console.error('Supabase saveParameters bulk network error:', err);
        errorMessage = err?.message || 'Gagal koneksi sinkronisasi parameter ke Supabase';
      }
    }
    await this.logAudit('UPDATE_MASTER_DATA', `Mengimpor ${params.length} parameter QC (${createdCount} baru, ${updatedCount} diperbarui).`);

    return { updatedCount, createdCount, syncedToSupabase, error: errorMessage };
  }

  static async deleteParameter(id: string): Promise<{ success: boolean; syncedToSupabase: boolean }> {
    const param = this.parameters.find(p => p.id === id);
    this.parameters = this.parameters.filter(p => p.id !== id);
    if (!this.deletedParamIds.includes(id)) this.deletedParamIds.push(id);
    writeLocalCache(CACHE_KEYS.PARAMETERS, this.parameters);
    this.notifyDataChanged('parameters');

    let syncedToSupabase = false;
    const sb = getSupabase();
    if (sb) {
      try {
        const { error } = await sb.from('test_parameters').delete().eq('id', id);
        if (error) console.error('Supabase deleteParameter error:', error);
        else syncedToSupabase = true;
      } catch (err) {
        console.error('Supabase deleteParameter network error:', err);
      }
    }
    if (param) {
      await this.logAudit('UPDATE_MASTER_DATA', `Menghapus parameter pemeriksaan: ${param.name} [${param.code}]`);
    }
    return { success: true, syncedToSupabase };
  }

  // --- Westgard Rules ---
  static getWestgardRules(): WestgardRuleConfig[] {
    return this.westgardRules;
  }

  static async saveWestgardRules(rules: WestgardRuleConfig[]): Promise<{ success: boolean }> {
    this.westgardRules = rules;
    writeLocalCache(CACHE_KEYS.WESTGARD_RULES, this.westgardRules);
    this.notifyDataChanged('westgard');

    const sb = getSupabase();
    if (sb) {
      try {
        const rows = rules.map(r => ({
          key: r.key,
          name: r.name,
          short_desc: r.shortDesc,
          description: r.description,
          type: r.type,
          enabled: r.enabled,
          recommendation: r.recommendation,
        }));
        await sb.from('westgard_rules').upsert(rows);
      } catch (err) {
        console.error('Supabase saveWestgardRules error:', err);
      }
    }
    return { success: true };
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
