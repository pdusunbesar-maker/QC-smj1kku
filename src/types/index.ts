export type UserRole = 'admin' | 'supervisor' | 'analis' | 'viewer' | string;

export interface RolePermission {
  key: string;
  name: string;
  description: string;
  category: 'QC Operations' | 'Quality Review' | 'CAPA & RCA' | 'Master & System';
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  avatar?: string;
  nip?: string;
  department?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface LaboratoryInfo {
  id: string;
  name: string;
  hospitalName: string;
  regency: string;
  province: string;
  roomUnit: string;
  headOfLab: string;
  headNip: string;
  address: string;
  phone: string;
  email: string;
  accreditation: string;
  logoUrl: string;
}

export interface Instrument {
  id: string;
  name: string;
  code: string;
  brand: string;
  model: string;
  serialNumber: string;
  unit: string;
  location: string;
  status: 'active' | 'maintenance' | 'inactive';
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

export interface ControlMaterial {
  id: string;
  name: string;
  manufacturer: string;
  level: 'Level 1' | 'Level 2' | 'Level 3';
  lotNumber: string;
  expirationDate: string;
  storageCondition: string;
  status: 'active' | 'expired' | 'depleted';
}

export interface Parameter {
  id: string;
  code: string;
  name: string;
  unit: string;
  method: string;
  instrumentId: string;
  controlMaterialId: string;
  targetMean: number;
  targetSD: number;
  targetCV: number; // in %
  minAcceptable: number;
  maxAcceptable: number;
  decimalPlaces: number;
}

export type WestgardRuleKey = '1_2s' | '1_3s' | '2_2s' | 'R_4s' | '4_1s' | '10x';

export interface WestgardRuleConfig {
  key: WestgardRuleKey;
  name: string;
  shortDesc: string;
  description: string;
  type: 'warning' | 'reject';
  enabled: boolean;
  recommendation: string;
}

export type QCStatus = 'pass' | 'warning' | 'reject' | 'fail';

export interface WestgardViolation {
  rule: WestgardRuleKey;
  ruleName: string;
  type: 'warning' | 'reject';
  description: string;
  pointsInvolved: string[]; // QC Result IDs
  detectedAt: string;
}

export interface QCResult {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number;
  operatorId: string;
  operatorName: string;
  instrumentId: string;
  instrumentName: string;
  parameterId: string;
  parameterName: string;
  parameterCode: string;
  controlLevel: 'Level 1' | 'Level 2' | 'Level 3';
  lotNumber: string;
  value: number;
  unit: string;
  mean: number;
  sd: number;
  zScore: number;
  sdPosition: string; // e.g., "+1.4 SD", "-2.2 SD"
  status: QCStatus;
  violations: WestgardViolation[];
  notes?: string;
  isDemo?: boolean;
  
  // Review metadata
  reviewStatus: 'pending' | 'accepted' | 'rejected' | 'investigation_required';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewComment?: string;
  linkedNonConformityId?: string;
  linkedCapaId?: string;
}

export interface QCStatistics {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  sd: number;
  cv: number;
  targetMean: number;
  targetSD: number;
  targetCV: number;
  passCount: number;
  warningCount: number;
  rejectCount: number;
}

export interface NonConformity {
  id: string; // e.g., NC-2026-001
  date: string;
  time: string;
  unit: string;
  instrumentId: string;
  instrumentName: string;
  parameterId: string;
  parameterName: string;
  qcResultId?: string;
  westgardRule?: string;
  severity: 'minor' | 'major' | 'critical';
  category: 'Westgard Violation' | 'Reagent Drift' | 'Instrument Error' | 'Operator Technique' | 'Calibration Shift' | 'preanalytic' | 'analytic' | 'postanalytic' | 'equipment' | 'reagent' | 'Other';
  description: string;
  impact: string;
  initialAnalysis: string;
  immediateAction: string;
  reportedBy: string;
  reportedByName: string;
  status: 'open' | 'under_review' | 'resolved' | 'escalated_to_capa';
  resolvedAt?: string;
  linkedCapaId?: string;
}

export interface FishboneData {
  man: string[];
  machine: string[];
  method: string[];
  material: string[];
  measurement: string[];
  environment: string[];
}

export interface FiveWhyData {
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  rootCauseConclusion: string;
}

export type CAPAStatus = 
  | 'open' 
  | 'investigation' 
  | 'action_in_progress' 
  | 'pending_verification' 
  | 'closed' 
  | 'overdue';

export interface CAPAActionItem {
  id: string;
  description: string;
  pic: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  completedDate?: string;
  notes?: string;
}

export interface CAPA {
  id: string; // e.g., CAPA-2026-001
  createdAt: string;
  source: 'QC Gagal' | 'Pelanggaran Westgard' | 'Non-Conformity' | 'Keluhan' | 'Temuan Audit' | 'Insiden Laboratorium';
  department: string;
  pic: string;
  problemStatement: string;
  nonConformityDescription: string;
  supportingEvidence?: string;
  
  // RCA
  rcaMethod: '5 Why' | 'Fishbone (Ishikawa)' | 'Kombinasi 5 Why & Fishbone';
  fishbone: FishboneData;
  fiveWhy: FiveWhyData;
  identifiedRootCause: string;
  
  // Actions
  correctiveActions: CAPAActionItem[];
  preventiveActions: CAPAActionItem[];
  
  // Verification
  verificationMethod?: string;
  verificationResult?: string;
  verificationDate?: string;
  verifier?: string;
  verifierName?: string;
  effectiveness: 'pending' | 'effective' | 'not_effective';
  
  status: CAPAStatus;
  overallDueDate: string;
  closedAt?: string;
  linkedQcResultId?: string;
  linkedNonConformityId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 
    | 'LOGIN' 
    | 'LOGOUT' 
    | 'INPUT_QC' 
    | 'EDIT_QC' 
    | 'UPDATE_QC_RESULT'
    | 'DELETE_QC_RESULT'
    | 'REVIEW_QC'
    | 'REVIEW_ACCEPT_QC' 
    | 'REVIEW_REJECT_QC' 
    | 'CREATE_NON_CONFORMITY' 
    | 'CREATE_NC'
    | 'UPDATE_NC'
    | 'DELETE_NC'
    | 'RESOLVE_NC'
    | 'CREATE_CAPA' 
    | 'UPDATE_CAPA' 
    | 'DELETE_CAPA'
    | 'CLOSE_CAPA' 
    | 'EXPORT_REPORT' 
    | 'UPDATE_MASTER_DATA'
    | 'UPDATE_WESTGARD_CONFIG';
  details: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  linkTab?: string;
  linkId?: string;
  read: boolean;
}
