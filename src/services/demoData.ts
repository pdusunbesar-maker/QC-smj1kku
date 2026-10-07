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
  User 
} from '../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from '../utils/qcCalculations';

export const INITIAL_LAB_INFO: LaboratoryInfo = {
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
  address: 'Jl. Provinsi Sukadana - Teluk Batang KM. 3, Desa Harapan Mulia, Kec. Sukadana, Kab. Kayong Utara, Kalimantan Barat 78852',
  phone: '(0534) 770123 / Ext. 108',
  email: 'rsudsmj1.kku@gmail.com',
  accreditation: 'KARS Paripurna Bintang 5',
  logoUrl: '/Lambang_Daerah_Kab._Kayong_Utara.png',
  logoRightUrl: '',
};

export const SYSTEM_PERMISSIONS = [
  { key: 'input_qc', name: 'Input Hasil QC', description: 'Mencatat dan menyimpan hasil pemeriksaan kontrol harian', category: 'QC Operations' as const },
  { key: 'review_qc', name: 'Review & Validasi QC', description: 'Menyetujui (Accept), menolak (Reject), atau meminta investigasi hasil QC', category: 'Quality Review' as const },
  { key: 'manage_capa', name: 'Manajemen CAPA & RCA', description: 'Menerbitkan, memperbarui tindakan korektif/preventif, dan verifikasi efektivitas', category: 'CAPA & RCA' as const },
  { key: 'manage_master', name: 'Kelola Master Data', description: 'Menambah, mengedit, dan menghapus instrumen, parameter, dan bahan kontrol', category: 'Master & System' as const },
  { key: 'manage_users', name: 'Kelola Hak Akses Pengguna', description: 'Menambah, mengedit, dan menghapus pengguna dan konfigurasi izin peran', category: 'Master & System' as const },
  { key: 'export_reports', name: 'Ekspor & Cetak Laporan', description: 'Mencetak dokumen resmi ber-KOP dan ekspor data ke Excel/CSV', category: 'QC Operations' as const },
];

export const INITIAL_ROLES = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Akses penuh ke seluruh modul, konfigurasi instrumen, audit trail, dan manajemen hak akses pengguna',
    permissions: ['input_qc', 'review_qc', 'manage_capa', 'manage_master', 'manage_users', 'export_reports'],
    isSystem: true,
  },
  {
    id: 'supervisor',
    name: 'Supervisor / PJ Mutu',
    description: 'Verifikasi hasil QC, disposisi approval/reject, investigasi RCA, verifikasi efektivitas CAPA, dan laporan mutu',
    permissions: ['input_qc', 'review_qc', 'manage_capa', 'export_reports'],
    isSystem: true,
  },
  {
    id: 'analis',
    name: 'Ahli Teknologi Laboratorium Medik (ATLM)',
    description: 'Input hasil pengujian kontrol mutu, pemantauan grafik Levey-Jennings, penerbitan laporan ketidaksesuaian',
    permissions: ['input_qc', 'manage_capa', 'export_reports'],
    isSystem: true,
  },
  {
    id: 'viewer',
    name: 'Viewer (Read-Only)',
    description: 'Hak akses pantau dashboard, grafik kontrol mutu, dan laporan tanpa izin mengubah data',
    permissions: ['export_reports'],
    isSystem: true,
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'dr. Hendra Wijaya, Sp.PK',
    email: 'hendra.wijaya@rsudsmj.id',
    password: 'password123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    nip: '19800512 200801 1 008',
    department: 'Penanggung Jawab Laboratorium',
    isActive: true,
    createdAt: '2026-01-10',
  },
  {
    id: 'user-supervisor',
    name: 'Siti Rahmawati, S.Tr.Kes',
    email: 'siti.rahmawati@rsudsmj.id',
    password: 'password123',
    role: 'supervisor',
    avatar: 'https://images.unsplash.com/photo-1594824813572-132d733737b3?w=150&auto=format&fit=crop&q=80',
    nip: '19880315 201101 2 004',
    department: 'Penanggung Jawab Mutu (PJ Mutu)',
    isActive: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'user-analis',
    name: 'Budi Pratama, A.Md.AK',
    email: 'budi.pratama@rsudsmj.id',
    password: 'password123',
    role: 'analis',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    nip: '19930720 201802 1 003',
    department: 'Ahli Teknologi Laboratorium Medik (ATLM)',
    isActive: true,
    createdAt: '2026-02-01',
  },
  {
    id: 'user-viewer',
    name: 'Maya Andriani, S.Kep',
    email: 'maya.andriani@rsudsmj.id',
    password: 'password123',
    role: 'viewer',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    nip: '19950910 202001 2 005',
    department: 'Tim Mutu & Akreditasi Rumah Sakit',
    isActive: true,
    createdAt: '2026-03-01',
  }
];

export const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'inst-cst240',
    name: 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
    code: 'CST-240',
    brand: 'Dirui Industrial',
    model: 'CS-T240 Auto-Chemistry Analyzer',
    serialNumber: 'SN-DIRUI-CST240-8819',
    unit: 'Patologi Klinik - Kimia Klinik',
    location: 'Meja Kimia Darah CST-240',
    status: 'active',
    lastCalibrationDate: '2026-09-01',
    nextCalibrationDate: '2027-03-01',
    lastMaintenanceDate: '2026-09-25',
    nextMaintenanceDate: '2026-10-25'
  },
  {
    id: 'inst-dirui-3980',
    name: 'Dirui Dimih 3980 Automated Analyzer',
    code: 'DIMIH-3980',
    brand: 'Dirui Industrial',
    model: 'Dimih 3980 Series',
    serialNumber: 'SN-DIRUI-3980-4512',
    unit: 'Patologi Klinik - Laboratorium Khusus',
    location: 'Meja Analisis Dimih 3980',
    status: 'active',
    lastCalibrationDate: '2026-08-20',
    nextCalibrationDate: '2027-02-20',
    lastMaintenanceDate: '2026-09-18',
    nextMaintenanceDate: '2026-10-18'
  },
  {
    id: 'inst-chem-a',
    name: 'Chemistry Analyzer A (Cobas c311)',
    code: 'CHEM-A',
    brand: 'Roche Diagnostics',
    model: 'Cobas c311 Auto-Chemistry',
    serialNumber: 'SN-ROCHE-2023-90812',
    unit: 'Patologi Klinik - Kimia Klinik',
    location: 'Meja Kimia Darah Utama',
    status: 'active',
    lastCalibrationDate: '2026-09-01',
    nextCalibrationDate: '2027-03-01',
    lastMaintenanceDate: '2026-09-25',
    nextMaintenanceDate: '2026-10-25'
  },
  {
    id: 'inst-hema-a',
    name: 'Hematology Analyzer 5-Diff (Sysmex XN-550)',
    code: 'HEMA-A',
    brand: 'Sysmex Corporation',
    model: 'XN-550 Automated Hematology',
    serialNumber: 'SN-SYSMEX-77810',
    unit: 'Patologi Klinik - Hematologi',
    location: 'Meja Hematologi Rutin',
    status: 'active',
    lastCalibrationDate: '2026-08-15',
    nextCalibrationDate: '2027-02-15',
    lastMaintenanceDate: '2026-09-28',
    nextMaintenanceDate: '2026-10-28'
  },
  {
    id: 'inst-immu-a',
    name: 'Immunology Analyzer (Cobas e411)',
    code: 'IMMU-A',
    brand: 'Roche Diagnostics',
    model: 'Cobas e411 ECLIA System',
    serialNumber: 'SN-ROCHE-ECLIA-4402',
    unit: 'Patologi Klinik - Imunologi Serologi',
    location: 'Ruang Imunoserologi',
    status: 'active',
    lastCalibrationDate: '2026-07-10',
    nextCalibrationDate: '2027-01-10',
    lastMaintenanceDate: '2026-09-20',
    nextMaintenanceDate: '2026-10-20'
  }
];

export const INITIAL_CONTROL_MATERIALS: ControlMaterial[] = [
  {
    id: 'ctrl-cst-1',
    name: 'Dirui Chemistry Control Normal (Level 1)',
    manufacturer: 'Dirui Industrial',
    level: 'Level 1',
    lotNumber: 'LOT-CST1-2026A',
    expirationDate: '2027-08-31',
    storageCondition: '2°C - 8°C (Lyophilized)',
    status: 'active'
  },
  {
    id: 'ctrl-pnu-1',
    name: 'PreciControl ClinChem Multi 1 (Normal)',
    manufacturer: 'Roche Diagnostics',
    level: 'Level 1',
    lotNumber: 'LOT-CCM1-2026A',
    expirationDate: '2027-06-30',
    storageCondition: '2°C - 8°C (Lyophilized)',
    status: 'active'
  },
  {
    id: 'ctrl-pnu-2',
    name: 'PreciControl ClinChem Multi 2 (Pathological)',
    manufacturer: 'Roche Diagnostics',
    level: 'Level 2',
    lotNumber: 'LOT-CCM2-2026B',
    expirationDate: '2027-06-30',
    storageCondition: '2°C - 8°C (Lyophilized)',
    status: 'active'
  },
  {
    id: 'ctrl-hema-8c',
    name: 'Eightcheck-3WP (Normal)',
    manufacturer: 'Sysmex Corporation',
    level: 'Level 1',
    lotNumber: 'LOT-EC8C-9912',
    expirationDate: '2026-12-15',
    storageCondition: '2°C - 8°C',
    status: 'active'
  }
];

export const INITIAL_PARAMETERS: Parameter[] = [
  // CST-240 Chemistry Parameters
  {
    id: 'param-cst-glu',
    code: 'GLU',
    name: 'Glucose (Glukosa Darah CST-240)',
    unit: 'mg/dL',
    method: 'Hexokinase / GOD-PAP',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 100.0,
    targetSD: 3.5,
    targetCV: 3.5,
    minAcceptable: 89.5,
    maxAcceptable: 110.5,
    decimalPlaces: 1
  },
  {
    id: 'param-cst-chol',
    code: 'CHOL',
    name: 'Cholesterol Total (CST-240)',
    unit: 'mg/dL',
    method: 'CHOD-PAP Enzymatic',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 160.0,
    targetSD: 5.2,
    targetCV: 3.25,
    minAcceptable: 144.4,
    maxAcceptable: 175.6,
    decimalPlaces: 1
  },
  {
    id: 'param-cst-urea',
    code: 'UREA',
    name: 'Urea / Ureum (CST-240)',
    unit: 'mg/dL',
    method: 'Urease GLDH Kinetic',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 38.0,
    targetSD: 1.6,
    targetCV: 4.21,
    minAcceptable: 33.2,
    maxAcceptable: 42.8,
    decimalPlaces: 1
  },
  {
    id: 'param-cst-creat',
    code: 'CREAT',
    name: 'Creatinine (CST-240)',
    unit: 'mg/dL',
    method: 'Jaffe Modified Kinetic',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 1.25,
    targetSD: 0.06,
    targetCV: 4.8,
    minAcceptable: 1.07,
    maxAcceptable: 1.43,
    decimalPlaces: 2
  },
  {
    id: 'param-cst-sgot',
    code: 'SGOT',
    name: 'SGOT / AST (CST-240)',
    unit: 'U/L',
    method: 'IFCC UV with Pyridoxal Phosphate',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 35.0,
    targetSD: 1.8,
    targetCV: 5.14,
    minAcceptable: 29.6,
    maxAcceptable: 40.4,
    decimalPlaces: 1
  },
  {
    id: 'param-cst-sgpt',
    code: 'SGPT',
    name: 'SGPT / ALT (CST-240)',
    unit: 'U/L',
    method: 'IFCC UV without Pyridoxal Phosphate',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 32.0,
    targetSD: 1.7,
    targetCV: 5.31,
    minAcceptable: 26.9,
    maxAcceptable: 37.1,
    decimalPlaces: 1
  },
  {
    id: 'param-cst-ua',
    code: 'UA',
    name: 'Uric Acid / Asam Urat (CST-240)',
    unit: 'mg/dL',
    method: 'Uricase PAP',
    instrumentId: 'inst-cst240',
    controlMaterialId: 'ctrl-cst-1',
    targetMean: 5.2,
    targetSD: 0.25,
    targetCV: 4.8,
    minAcceptable: 4.45,
    maxAcceptable: 5.95,
    decimalPlaces: 2
  },

  // Dirui Dimih 3980 Specific Parameters
  {
    id: 'param-dimih-hgb',
    code: 'HGB-DIMIH',
    name: 'Hemoglobin (Dirui Dimih 3980)',
    unit: 'g/dL',
    method: 'Photometric SLS Cyanide-Free',
    instrumentId: 'inst-dirui-3980',
    controlMaterialId: 'ctrl-hema-8c',
    targetMean: 13.5,
    targetSD: 0.4,
    targetCV: 2.96,
    minAcceptable: 12.3,
    maxAcceptable: 14.7,
    decimalPlaces: 1
  },
  {
    id: 'param-dimih-wbc',
    code: 'WBC-DIMIH',
    name: 'Leukosit / WBC (Dirui Dimih 3980)',
    unit: '10^3/uL',
    method: 'Electrical Impedance',
    instrumentId: 'inst-dirui-3980',
    controlMaterialId: 'ctrl-hema-8c',
    targetMean: 7.2,
    targetSD: 0.5,
    targetCV: 6.94,
    minAcceptable: 5.7,
    maxAcceptable: 8.7,
    decimalPlaces: 1
  },
  {
    id: 'param-dimih-plt',
    code: 'PLT-DIMIH',
    name: 'Trombosit / PLT (Dirui Dimih 3980)',
    unit: '10^3/uL',
    method: 'Electrical Impedance Focus Flow',
    instrumentId: 'inst-dirui-3980',
    controlMaterialId: 'ctrl-hema-8c',
    targetMean: 245,
    targetSD: 15,
    targetCV: 6.12,
    minAcceptable: 200,
    maxAcceptable: 290,
    decimalPlaces: 0
  },

  // Cobas c311 Parameters
  {
    id: 'param-glu',
    code: 'GLU',
    name: 'Glucose (Glukosa Darah Cobas c311)',
    unit: 'mg/dL',
    method: 'Heksokinase / UV enzymatic',
    instrumentId: 'inst-chem-a',
    controlMaterialId: 'ctrl-pnu-1',
    targetMean: 100.0,
    targetSD: 3.5,
    targetCV: 3.5,
    minAcceptable: 89.5,
    maxAcceptable: 110.5,
    decimalPlaces: 1
  },
  {
    id: 'param-chol',
    code: 'CHOL',
    name: 'Cholesterol Total (Cobas c311)',
    unit: 'mg/dL',
    method: 'CHOD-PAP Enzymatic Colorimetric',
    instrumentId: 'inst-chem-a',
    controlMaterialId: 'ctrl-pnu-1',
    targetMean: 160.0,
    targetSD: 5.2,
    targetCV: 3.25,
    minAcceptable: 144.4,
    maxAcceptable: 175.6,
    decimalPlaces: 1
  },
  {
    id: 'param-urea',
    code: 'UREA',
    name: 'Urea / Ureum Darah (Cobas c311)',
    unit: 'mg/dL',
    method: 'Urease / GLDH Kinetic UV',
    instrumentId: 'inst-chem-a',
    controlMaterialId: 'ctrl-pnu-1',
    targetMean: 38.0,
    targetSD: 1.6,
    targetCV: 4.21,
    minAcceptable: 33.2,
    maxAcceptable: 42.8,
    decimalPlaces: 1
  },
  {
    id: 'param-creat',
    code: 'CREAT',
    name: 'Creatinine / Kreatinin Serum (Cobas c311)',
    unit: 'mg/dL',
    method: 'Jaffe rate-blanked compensated',
    instrumentId: 'inst-chem-a',
    controlMaterialId: 'ctrl-pnu-1',
    targetMean: 1.25,
    targetSD: 0.06,
    targetCV: 4.8,
    minAcceptable: 1.07,
    maxAcceptable: 1.43,
    decimalPlaces: 2
  }
];

// Helper to generate 35 realistic chronological demo QC records
export function generateDemoQCResults(): QCResult[] {
  const results: QCResult[] = [];
  const targetMean = 100.0;
  const targetSD = 3.5;
  const unit = 'mg/dL';
  const paramId = 'param-glu';
  const paramCode = 'GLU';
  const paramName = 'Glucose (Glukosa Darah Sewaktu/Puasa)';
  const instrumentId = 'inst-chem-a';
  const instrumentName = 'Chemistry Analyzer A (Cobas c311)';
  const lot = 'LOT-CCM1-2026A';

  // Specific simulation values that demonstrate Westgard scenarios naturally
  // 35 days sequence:
  const rawValues = [
    100.2, 99.4, 101.1, 98.8, 100.5, 
    101.8, 99.1, 100.0, 98.2, 100.9, 
    102.3, 101.9, 102.1, 102.6, 102.4, // Run of slight shift
    102.8, 103.1, 107.4, 101.2, 99.8,  // #18 is 107.4 -> +2.11SD (1-2s warning)
    100.4, 101.0, 99.5, 111.5, 100.8,  // #24 is 111.5 -> +3.29SD (1-3s reject)
    99.2, 100.1, 107.8, 108.2, 100.5,  // #28 & #29 are 107.8 & 108.2 -> both > +2SD (2-2s reject)
    99.7, 100.2, 101.1, 99.9, 100.4
  ];

  const startDate = new Date(2026, 8, 1); // 2026-09-01

  for (let i = 0; i < rawValues.length; i++) {
    const val = rawValues[i];
    const z = calculateZScore(val, targetMean, targetSD);
    const pos = formatSDPosition(z);
    const currentDate = new Date(startDate.getTime() + i * 24 * 3600 * 1000);
    const dateStr = currentDate.toISOString().split('T')[0];
    const timeStr = '07:30';

    const id = `QC-DEMO-GLU-${String(i + 1).padStart(3, '0')}`;

    // Evaluate Westgard against past demo points
    const { status, violations } = evaluateWestgardRules(
      { id, value: val, mean: targetMean, sd: targetSD, zScore: z },
      results,
      DEFAULT_WESTGARD_RULES
    );

    let reviewStatus: QCResult['reviewStatus'] = 'accepted';
    let reviewComment: string | undefined = 'Hasil QC memenuhi spesifikasi kontrol analitik.';
    let reviewedBy: string | undefined = 'user-supervisor';
    let reviewedByName: string | undefined = 'Siti Rahmawati, S.Tr.Kes';
    let reviewedAt: string | undefined = `${dateStr} 08:15:00`;
    let linkedNc: string | undefined = undefined;
    let linkedCapa: string | undefined = undefined;

    if (status === 'reject') {
      if (i === 23) {
        // Point #24: 1-3s
        reviewStatus = 'rejected';
        reviewComment = 'QC di-reject karena melanggar aturan 1:3s. Dilakukan pencucian kuvet dan rerun kontrol.';
      } else if (i === 28) {
        // Point #29: 2-2s
        reviewStatus = 'investigation_required';
        reviewComment = 'Pelanggaran berulang 2:2s. Diterbitkan Non-Conformity dan dieskalasi ke CAPA.';
        linkedNc = 'NC-2026-001';
        linkedCapa = 'CAPA-2026-001';
      }
    } else if (status === 'warning') {
      reviewStatus = 'pending';
      reviewComment = 'Peringatan 1:2s terdeteksi. Dipantau ketat untuk run pemeriksaan pasien.';
      reviewedBy = undefined;
      reviewedByName = undefined;
      reviewedAt = undefined;
    }

    results.push({
      id,
      date: dateStr,
      time: timeStr,
      timestamp: currentDate.getTime(),
      operatorId: 'user-analis',
      operatorName: 'Budi Pratama, A.Md.AK',
      instrumentId,
      instrumentName,
      parameterId: paramId,
      parameterName: paramName,
      parameterCode: paramCode,
      controlLevel: 'Level 1',
      lotNumber: lot,
      value: val,
      unit,
      mean: targetMean,
      sd: targetSD,
      zScore: z,
      sdPosition: pos,
      status,
      violations,
      notes: `Pemeriksaan QC Harian Rutin Shift Pagi`,
      isDemo: false,
      reviewStatus,
      reviewedBy,
      reviewedByName,
      reviewedAt,
      reviewComment,
      linkedNonConformityId: linkedNc,
      linkedCapaId: linkedCapa,
    });
  }

  // Also add 10 demo points for Cholesterol Level 1
  const cholValues = [158.5, 161.2, 159.0, 162.4, 160.1, 157.9, 161.8, 160.5, 163.0, 159.4];
  const cholParam = INITIAL_PARAMETERS[1];
  for (let j = 0; j < cholValues.length; j++) {
    const val = cholValues[j];
    const z = calculateZScore(val, cholParam.targetMean, cholParam.targetSD);
    const currentDate = new Date(2026, 8, 20 + j);
    const dateStr = currentDate.toISOString().split('T')[0];
    const id = `QC-DEMO-CHOL-${String(j + 1).padStart(3, '0')}`;

    results.push({
      id,
      date: dateStr,
      time: '07:45',
      timestamp: currentDate.getTime(),
      operatorId: 'user-analis',
      operatorName: 'Budi Pratama, A.Md.AK',
      instrumentId: cholParam.instrumentId,
      instrumentName,
      parameterId: cholParam.id,
      parameterName: cholParam.name,
      parameterCode: cholParam.code,
      controlLevel: 'Level 1',
      lotNumber: 'LOT-CCM1-2026A',
      value: val,
      unit: cholParam.unit,
      mean: cholParam.targetMean,
      sd: cholParam.targetSD,
      zScore: z,
      sdPosition: formatSDPosition(z),
      status: 'pass',
      violations: [],
      notes: 'Pemeriksaan rutin kontrol Kimia Darah',
      isDemo: false,
      reviewStatus: 'accepted',
      reviewedBy: 'user-supervisor',
      reviewedByName: 'Siti Rahmawati, S.Tr.Kes',
      reviewedAt: `${dateStr} 08:30:00`,
      reviewComment: 'Hasil QC dalam rentang normal ±1SD.',
    });
  }

  return results;
}

export const INITIAL_NON_CONFORMITIES: NonConformity[] = [
  {
    id: 'NC-2026-001',
    date: '2026-09-29',
    time: '08:10',
    unit: 'Patologi Klinik - Kimia Klinik',
    instrumentId: 'inst-chem-a',
    instrumentName: 'Chemistry Analyzer A (Cobas c311)',
    parameterId: 'param-glu',
    parameterName: 'Glucose (Glukosa Darah Sewaktu/Puasa)',
    qcResultId: 'QC-DEMO-GLU-029',
    westgardRule: '2:2s (Dua hasil berturut-turut melebihi +2SD)',
    severity: 'major',
    category: 'Westgard Violation',
    description: 'Pemeriksaan bahan kontrol Glucose Level 1 pada tanggal 28 dan 29 September berturut-turut menunjukkan nilai 107.8 mg/dL (+2.23SD) dan 108.2 mg/dL (+2.34SD), melanggar aturan Westgard 2:2s (Reject).',
    impact: 'Pemeriksaan sampel pasien ditunda sementara selama 45 menit sampai reagen dan kalibrasi terverifikasi ulang.',
    initialAnalysis: 'Diduga terjadi penguapan minor pada botol reagen Glucose R1 yang terbuka lebih dari 3 minggu atau pergeseran kurva kalibrasi.',
    immediateAction: 'Penghentian running sampel pasien Glucose, penggantian cassette reagen dengan lot baru, dan kalibrasi ulang parameter Glucose.',
    reportedBy: 'user-analis',
    reportedByName: 'Budi Pratama, A.Md.AK',
    status: 'escalated_to_capa',
    resolvedAt: '2026-09-29 11:30:00',
    linkedCapaId: 'CAPA-2026-001'
  }
];

export const INITIAL_CAPAS: CAPA[] = [
  {
    id: 'CAPA-2026-001',
    createdAt: '2026-09-29',
    source: 'Pelanggaran Westgard',
    department: 'Instalasi Patologi Klinik - Subunit Kimia Klinik',
    pic: 'Siti Rahmawati, S.Tr.Kes (PJ Mutu)',
    problemStatement: 'Terjadi pergeseran sistematik positif (Systematic Positive Shift) pada parameter Glucose alat Cobas c311 yang memicu pelanggaran aturan Westgard 2:2s selama dua hari berturut-turut.',
    nonConformityDescription: 'Hasil QC Level 1 tanggal 28/09 (107.8 mg/dL) dan 29/09 (108.2 mg/dL) keduanya berada di atas +2SD terhadap target mean 100.0 mg/dL.',
    supportingEvidence: 'Grafik Levey-Jennings tanggal 25-29 September 2026, logbook kalibrasi instrumen, dan rekam suhu kulkas reagen.',
    rcaMethod: 'Kombinasi 5 Why & Fishbone',
    fishbone: {
      man: [
        'Petugas tidak melakukan homogenisasi reagen baru saat pergantian',
        'Teknik pemipetan kontrol lyophilizat sedikit bervariasi antar Ahli Teknologi Laboratorium Medik (ATLM)'
      ],
      machine: [
        'Jarum reagen probe 1 terdapat sedikit deposit kristal garam buffer',
        'Lampu fotometer mendekati batas umur 1.800 jam operasional'
      ],
      method: [
        'SOP pergantian reagen belum mewajibkan re-kalibrasi langsung jika lot sama tetapi beda botol'
      ],
      material: [
        'Reagen Glukosa R1/R2 pada botol lama telah mendekati expired on-board (28 hari)',
        'Bahan kontrol lyophilizat telah dibuka hari ke-5'
      ],
      measurement: [
        'Faktor kalibrator K-factor bergeser 3.2% dibanding baseline bulanan'
      ],
      environment: [
        'Suhu ruangan sempat naik ke 25.8°C akibat AC laboratorium mati mendadak pada 27 September'
      ]
    },
    fiveWhy: {
      why1: 'Mengapa hasil kontrol Glucose Level 1 bergeser lebih tinggi dari +2SD? Karena konsentrasi reagen meningkat akibat penguapan on-board.',
      why2: 'Mengapa reagen mengalami penguapan? Karena cassette reagen berada di kompartemen pendingin on-board selama lebih dari 25 hari dan tutup botol kurang rapat.',
      why3: 'Mengapa cassette dibiarkan lebih dari batas optimal? Karena monitoring stabilitas on-board reagen hanya dicatat secara manual di buku log.',
      why4: 'Mengapa pencatatan manual tidak terdeteksi sebelum pergeseran terjadi? Karena tidak ada penanda visual (alert tag) pada software LIS/QC saat reagen mendekati expired on-board.',
      why5: 'Mengapa belum ada sistem peringatan dini? Karena SOP manajemen reagen belum mengintegrasikan penghitungan hari buka reagen secara otomatis.',
      rootCauseConclusion: 'Kombinasi antara evaporasi reagen on-board melebihi 25 hari dan deviasi faktor kalibrasi yang tidak segera terdeteksi akibat sistem tracking manual.'
    },
    identifiedRootCause: 'Evaporasi reagen on-board Cobas c311 yang melebihi masa stabilitas operasional serta akumulasi residu pada probe pipet.',
    correctiveActions: [
      {
        id: 'ca-1',
        description: 'Lakukan pembersihan menyeluruh (decontamination wash) pada sample probe dan reagent probe Cobas c311.',
        pic: 'Budi Pratama, A.Md.AK',
        dueDate: '2026-09-29',
        status: 'completed',
        completedDate: '2026-09-29',
        notes: 'Selesai pukul 09:30. Probe bersih dan flow liquid kembali normal.'
      },
      {
        id: 'ca-2',
        description: 'Buka cassette reagen Glucose baru dan larutkan vial kontrol PreciControl CCM1 yang baru.',
        pic: 'Budi Pratama, A.Md.AK',
        dueDate: '2026-09-29',
        status: 'completed',
        completedDate: '2026-09-29',
        notes: 'Reagen baru lot LOT-GLU-909 dipasang, kontrol baru dilarutkan tepat 30 menit.'
      },
      {
        id: 'ca-3',
        description: 'Jalankan full calibration 2-point dengan Calibrator f.a.s. dan running ulang QC Level 1 & Level 2.',
        pic: 'Siti Rahmawati, S.Tr.Kes',
        dueDate: '2026-09-29',
        status: 'completed',
        completedDate: '2026-09-29',
        notes: 'Hasil QC ulang: Level 1 = 100.5 mg/dL (+0.14 SD), Level 2 = 241.0 mg/dL (+0.12 SD). Lolos kriteria penerimaan.'
      }
    ],
    preventiveActions: [
      {
        id: 'pa-1',
        description: 'Perbarui checklist harian untuk menandai stiker tanggal buka (open vial date) dan batas maksimum on-board 20 hari untuk seluruh reagen kimia klinik.',
        pic: 'Siti Rahmawati, S.Tr.Kes',
        dueDate: '2026-10-05',
        status: 'in_progress',
        notes: 'Draf checklist sedang direview PJ Mutu.'
      },
      {
        id: 'pa-2',
        description: 'Jadwalkan maintenance mingguan probe wash & cell blank measurement setiap Senin pagi sebelum QC harian.',
        pic: 'Budi Pratama, A.Md.AK',
        dueDate: '2026-10-10',
        status: 'pending',
        notes: 'Dimasukkan dalam jadwal rutin maintenance Oktober 2026.'
      }
    ],
    verificationMethod: 'Pemantauan grafik Levey-Jennings Glucose selama 7 hari berturut-turut pasca perbaikan dan verifikasi nilai CV% tetap di bawah 3.5%.',
    verificationResult: 'Selama 4 hari terakhir (30 Sep - 3 Okt), nilai QC Glucose stabil di rentang 99.7 - 101.1 mg/dL (|Z| < 0.5 SD). Tidak ada aturan Westgard yang terlanggar.',
    verificationDate: '2026-10-03',
    verifier: 'user-admin',
    verifierName: 'dr. Hendra Wijaya, Sp.PK',
    effectiveness: 'effective',
    status: 'action_in_progress',
    overallDueDate: '2026-10-15',
    linkedQcResultId: 'QC-DEMO-GLU-029',
    linkedNonConformityId: 'NC-2026-001'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-02 07:25:10',
    userId: 'user-analis',
    userName: 'Budi Pratama, A.Md.AK',
    userRole: 'analis',
    action: 'LOGIN',
    details: 'Pengguna berhasil masuk ke sistem L-QCMS',
    ipAddress: '192.168.10.45',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-10-02 07:31:40',
    userId: 'user-analis',
    userName: 'Budi Pratama, A.Md.AK',
    userRole: 'analis',
    action: 'INPUT_QC',
    details: 'Input QC Glukosa Level 1 nilai 100.4 mg/dL (Z-Score: +0.11 SD). Status: PASS',
    newData: { parameter: 'GLU', value: 100.4, status: 'pass' }
  },
  {
    id: 'AUD-003',
    timestamp: '2026-09-29 08:15:20',
    userId: 'user-analis',
    userName: 'Budi Pratama, A.Md.AK',
    userRole: 'analis',
    action: 'CREATE_NON_CONFORMITY',
    details: 'Menerbitkan laporan ketidaksesuaian NC-2026-001 terkait pelanggaran Westgard 2:2s Glucose',
    newData: { ncId: 'NC-2026-001', severity: 'major' }
  },
  {
    id: 'AUD-004',
    timestamp: '2026-09-29 09:00:15',
    userId: 'user-supervisor',
    userName: 'Siti Rahmawati, S.Tr.Kes',
    userRole: 'supervisor',
    action: 'CREATE_CAPA',
    details: 'Membuat dokumen CAPA-2026-001 untuk pergeseran sistematik parameter Glucose',
    newData: { capaId: 'CAPA-2026-001', status: 'open' }
  },
  {
    id: 'AUD-005',
    timestamp: '2026-09-29 14:20:00',
    userId: 'user-admin',
    userName: 'dr. Hendra Wijaya, Sp.PK',
    userRole: 'admin',
    action: 'REVIEW_REJECT_QC',
    details: 'Konfirmasi Reject QC Run #029 dan menyetujui rencana tindakan perbaikan CAPA-2026-001',
    newData: { qcId: 'QC-DEMO-GLU-029', reviewStatus: 'investigation_required' }
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    timestamp: '2026-10-02 08:00:00',
    type: 'warning',
    title: 'Review QC Menunggu',
    message: 'Terdapat 1 hasil pemeriksaan QC Glukosa dalam status Warning yang membutuhkan verifikasi Supervisor.',
    linkTab: 'qc-review',
    read: false
  },
  {
    id: 'notif-2',
    timestamp: '2026-09-29 08:12:00',
    type: 'danger',
    title: 'Pelanggaran Westgard 2:2s',
    message: 'Hasil QC Glucose Level 1 tanggal 28-29 September melanggar aturan 2:2s (REJECT).',
    linkTab: 'westgard',
    read: false
  },
  {
    id: 'notif-3',
    timestamp: '2026-09-29 09:30:00',
    type: 'info',
    title: 'CAPA Baru Diterbitkan',
    message: 'CAPA-2026-001 terkait pergeseran kontrol kimia darah telah dibuat dan dalam penanganan.',
    linkTab: 'capa',
    read: true
  },
  {
    id: 'notif-4',
    timestamp: '2026-09-25 10:00:00',
    type: 'warning',
    title: 'Jadwal Pemeliharaan Instrumen',
    message: 'Chemistry Analyzer A (Cobas c311) mendekati jadwal pemeliharaan bulanan pada 25 Oktober 2026.',
    linkTab: 'master-data',
    read: true
  }
];
