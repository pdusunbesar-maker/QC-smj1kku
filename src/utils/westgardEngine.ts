/**
 * WESTGARD MULTIRULE STATISTICAL QUALITY CONTROL (SQC) ENGINE
 * 
 * Mesin Evaluasi Mutu Laboratorium Klinik yang Deterministik, Akurat, dan Teruji
 * Berdasarkan prinsip Dr. James O. Westgard & Standar ISO 15189 / CLSI C24-A4.
 * 
 * Karakteristik Inti:
 * 1. 100% Deterministik secara matematis: evaluasi murni berbasis data numerik aktual (tidak menggunakan AI, visual, atau perkiraan).
 * 2. Tanpa Pembulatan Awal: Skor-Z dihitung dengan presisi penuh IEEE-754 sebelum perbandingan aturan.
 * 3. Status Run Lengkap: NORMAL, WARNING, REJECT, INDETERMINATE (tidak pernah mengembalikan NORMAL jika pemeriksaan belum lengkap/valid).
 * 4. Isolasi Data Ketat: Mencegah kontaminasi data antar instrumen, parameter, metode, unit, atau lot kontrol yang berbeda.
 * 5. Evaluasi R4s yang Benar: R4s dievaluasi secara Within-Run pada batch pemeriksaan yang sama, bukan sembarang waktu berbeda.
 * 6. Bukti Numerik Lengkap: Setiap aturan yang terpicu menghasilkan objek bukti numerik (WestgardNumericalProof).
 * 7. Dukungan Modular: Mendukung aturan klasik (1:2s, 1:3s, 2:2s, R:4s, 4:1s, 10x) serta modular (8x, 7T).
 */

import { WestgardRuleConfig, WestgardRuleKey, WestgardViolation } from '../types';
import { getWestgardContextualGuidance } from './westgardGuidance';

/** Batas toleransi floating-point presisi numerik */
export const EPSILON = 1e-9;

/** Status resmi hasil evaluasi QC run */
export type RunStatus = 'NORMAL' | 'WARNING' | 'REJECT' | 'INDETERMINATE';

/** Struktur input titik data QC untuk evaluasi Westgard */
export interface QCPointInput {
  id: string;
  value: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  timestamp: number; // epoch ms
  instrumentId: string;
  instrumentName?: string;
  parameterId: string;
  parameterName?: string;
  unit: string;
  controlLevel: 'Level 1' | 'Level 2' | 'Level 3';
  lotNumber: string;
  targetMean: number;
  targetSD: number;
  /** Pengelompokan sesi analitik / run yang sama (opsional, untuk deteksi within-run R4s & 2_2s) */
  runSessionId?: string;
}

/** Detail bukti numerik untuk setiap aturan yang terpicu */
export interface WestgardNumericalProof {
  ruleKey: WestgardRuleKey;
  ruleName: string;
  category: 'WARNING' | 'REJECT';
  conditionFormula: string;
  evaluatedThreshold: string;
  actualObservation: string;
  observedDeltaOrCount: number;
  isWithinRun: boolean;
  pointsInvolved: {
    id: string;
    timestamp: number;
    dateTime: string;
    controlLevel: string;
    lotNumber: string;
    measuredValue: number;
    targetMean: number;
    targetSD: number;
    unroundedZScore: number;
    formattedZScore: string;
  }[];
  evaluationTimestamp: string;
}

export interface NonTriggeredRuleDetail {
  ruleKey: WestgardRuleKey;
  ruleName: string;
  type: 'warning' | 'reject';
  proofFormula: string;
  safeObservation: string;
}

export interface UnevaluatedRuleDetail {
  ruleKey: WestgardRuleKey;
  ruleName: string;
  type: 'warning' | 'reject';
  requiredCondition: string;
  currentCondition: string;
  reason: string;
}

/** Hasil lengkap evaluasi Westgard Engine */
export interface WestgardEvaluationResult {
  runStatus: RunStatus;
  isEvaluated: boolean;
  indeterminateReason?: string;
  unroundedZScore: number | null;
  formattedZScore: string;
  violations: WestgardViolation[];
  numericalProofs: WestgardNumericalProof[];
  activeRulesEvaluated: string[];
  historicalPointsUsed: number;
  dataSeriesId: string;
  triggeredRules?: WestgardRuleKey[];
  nonTriggeredRules?: NonTriggeredRuleDetail[];
  unevaluatedRules?: UnevaluatedRuleDetail[];
  patientSampleRecommendation?: 'HOLD' | 'PROCEED' | 'HOLD_PENDING_INVESTIGATION';
}

/**
 * Konfigurasi aturan Westgard default (Multirule Skema Klasik & ISO 15189)
 */
export const DEFAULT_ENGINE_RULES: WestgardRuleConfig[] = [
  {
    key: '1_2s',
    name: 'Aturan 1:2s (Warning Rule)',
    shortDesc: '1 hasil melebihi ±2SD',
    description: 'Satu nilai kontrol berada di luar rentang Mean ± 2SD. Berfungsi sebagai peringatan (screening rule).',
    type: 'warning',
    enabled: true,
    recommendation: 'Peringatan awal (Warning). Lanjutkan evaluasi aturan penolakan lainnya. Jika aturan penolakan tidak terlanggar, hasil run dapat diterima dengan pemantauan.'
  },
  {
    key: '1_3s',
    name: 'Aturan 1:3s (Reject Rule)',
    shortDesc: '1 hasil melebihi ±3SD',
    description: 'Satu nilai kontrol berada di luar rentang Mean ± 3SD.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Kemungkinan kesalahan acak (random error) akut atau pergeseran besar. Seluruh hasil pasien pada batch ini tidak boleh dirilis. Lakukan investigasi dan re-run kontrol baru.'
  },
  {
    key: '2_2s',
    name: 'Aturan 2:2s (Reject Rule)',
    shortDesc: '2 hasil berturut-turut melebihi ±2SD pada sisi yang sama',
    description: 'Dua hasil kontrol berturut-turut (within-material atau across-materials dalam run yang sama) melebihi batas ±2SD pada sisi yang sama terhadap Mean.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi kuat kesalahan sistematik (systematic error). Periksa kalibrasi instrumen, kestabilan lot reagen, atau temperatur inkubasi.'
  },
  {
    key: 'R_4s',
    name: 'Aturan R:4s (Within-Run Reject Rule)',
    shortDesc: 'Rentang selisih hasil dalam 1 run ≥ 4SD',
    description: 'Dalam run analitik yang sama, satu level kontrol melebihi +2SD dan level lain melebihi -2SD (rentang selisih z-score ≥ 4SD).',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi kesalahan acak akut dalam batch (random error). Periksa gelembung udara, jarum pipetting (sample/reagent probe), kestabilan optik fotometer, atau homogenisasi bahan kontrol.'
  },
  {
    key: '4_1s',
    name: 'Aturan 4:1s (Reject Rule)',
    shortDesc: '4 hasil berturut-turut melebihi ±1SD pada sisi yang sama',
    description: 'Empat hasil kontrol berturut-turut melebihi ±1SD pada sisi yang sama terhadap Mean.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi pergeseran sistematik (systematic shift). Evaluasi faktor kalibrasi dan kondisi on-board reagen.'
  },
  {
    key: '10x',
    name: 'Aturan 10x (Reject Rule)',
    shortDesc: '10 hasil berturut-turut pada sisi Mean yang sama',
    description: 'Sepuluh hasil kontrol berturut-turut berada pada sisi yang sama terhadap Mean (seluruhnya positif atau seluruhnya negatif).',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT / INVESTIGASI! Indikasi pergeseran sistematik bertahap (systematic drift/bias). Lakukan kalibrasi ulang dan verifikasi reagen.'
  },
  {
    key: '8x',
    name: 'Aturan 8x (Reject Rule)',
    shortDesc: '8 hasil berturut-turut pada sisi Mean yang sama',
    description: 'Delapan hasil kontrol berturut-turut berada pada sisi yang sama terhadap Mean (varian sensitif ISO 15189).',
    type: 'reject',
    enabled: false,
    recommendation: 'REJECT / PERINGATAN SISTEMATIK! Deteksi dini pergeseran sistematik sebelum mencapai 10 titik.'
  },
  {
    key: '7T',
    name: 'Aturan 7T (Trend Rule)',
    shortDesc: '7 hasil berturut-turut terus meningkat atau terus menurun',
    description: 'Tujuh hasil kontrol berturut-turut menunjukkan tren monoton (selalu naik atau selalu turun secara konsisten).',
    type: 'reject',
    enabled: false,
    recommendation: 'REJECT / TREND! Indikasi degradasi reagen secara gradual, penguapan pelarut, atau penuaan lampu fotometer.'
  }
];

/**
 * 1. Hitung Skor-Z Murni (Deterministik & Tanpa Pembulatan Awal)
 * Rumus: z = (x - mean) / SD
 * 
 * @param value Nilai hasil pengukuran QC
 * @param targetMean Target rata-rata (X-bar) dari bahan kontrol
 * @param targetSD Target standar deviasi (SD) dari bahan kontrol
 * @returns Skor-Z unrounded (presisi floating-point penuh)
 */
export function calculateDeterministicZScore(
  value: number,
  targetMean: number,
  targetSD: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Nilai pemeriksaan QC (value) tidak valid atau NaN.');
  }
  if (typeof targetMean !== 'number' || isNaN(targetMean)) {
    throw new Error('Target Mean tidak valid atau NaN.');
  }
  if (typeof targetSD !== 'number' || isNaN(targetSD) || targetSD <= 0) {
    throw new Error(`Target SD tidak valid: harus bernilai positif > 0 (diberikan: ${targetSD}).`);
  }

  // Perhitungan murni IEEE-754 tanpa toFixed / pembulatan awal
  return (value - targetMean) / targetSD;
}

/**
 * Format string display skor-Z untuk UI (misal: "+1.42 SD", "-2.05 SD", "0.00 SD")
 * CATATAN: Fungsi ini HANYA digunakan untuk presentasi teks di antarmuka, TIDAK untuk evaluasi aturan.
 */
export function formatZScoreDisplay(zScore: number | null | undefined): string {
  if (zScore === null || zScore === undefined || isNaN(zScore)) {
    return '-';
  }
  // Toleransi mendekati nol
  if (Math.abs(zScore) < 0.005) {
    return '0.00 SD';
  }
  const sign = zScore > 0 ? '+' : '';
  return `${sign}${zScore.toFixed(2)} SD`;
}

/**
 * Validasi Komparabilitas Data:
 * Memastikan data historis yang digunakan sebanding (instrumen sama, parameter sama, unit sama).
 */
export function validateComparability(
  current: QCPointInput,
  history: QCPointInput[]
): { valid: boolean; reason?: string } {
  for (let i = 0; i < history.length; i++) {
    const pt = history[i];
    if (pt.parameterId !== current.parameterId) {
      return {
        valid: false,
        reason: `Ketidaksesuaian Parameter: Titik '${pt.id}' (${pt.parameterId}) tidak sebanding dengan '${current.id}' (${current.parameterId}).`
      };
    }
    if (pt.instrumentId !== current.instrumentId) {
      return {
        valid: false,
        reason: `Ketidaksesuaian Instrumen: Titik '${pt.id}' berasal dari instrumen '${pt.instrumentId}', sedangkan titik yang diuji '${current.instrumentId}'.`
      };
    }
    if (pt.unit && current.unit && pt.unit.trim().toLowerCase() !== current.unit.trim().toLowerCase()) {
      return {
        valid: false,
        reason: `Ketidaksesuaian Unit: Titik '${pt.id}' (${pt.unit}) memiliki satuan berbeda dengan '${current.id}' (${current.unit}).`
      };
    }
  }
  return { valid: true };
}

/**
 * Opsi konfigurasi mesin Westgard
 */
export interface WestgardEngineOptions {
  activeRules?: WestgardRuleConfig[];
  /** Apakah aturan 2:2s mengizinkan perbandingan across-materials dalam 1 run yang sama */
  allowAcrossLevels2_2s?: boolean;
  /** Toleransi batas numerik (default: 1e-9) */
  boundaryTolerance?: number;
  /** Level bahan kontrol lain yang dijalankan pada analytical run / sesi yang sama (untuk within-run R4s & 2_2s) */
  sameRunOtherLevels?: QCPointInput[];
}

/**
 * 2. MESIN EVALUASI WESTGARD MULTIRULE DETERMINISTIK
 * 
 * Melakukan audit matematis lengkap terhadap titik QC aktif dan riwayatnya.
 * Mengembalikan seluruh aturan yang terpicu beserta bukti numerik (proof), tanpa bias visual.
 */
export function evaluateDeterministicWestgard(
  currentPoint: QCPointInput,
  historicalPoints: QCPointInput[],
  options: WestgardEngineOptions = {}
): WestgardEvaluationResult {
  const activeRulesList = options.activeRules || DEFAULT_ENGINE_RULES;
  const rulesMap = new Map<string, WestgardRuleConfig>(activeRulesList.map(r => [r.key, r]));
  const eps = options.boundaryTolerance !== undefined ? options.boundaryTolerance : EPSILON;
  const nowIso = new Date().toISOString();

  const dataSeriesId = `${currentPoint.instrumentId}_${currentPoint.parameterId}_${currentPoint.controlLevel}_${currentPoint.lotNumber}`;

  // 1. Validasi Pra-Syarat Dasar: Parameter & Standar Deviasi
  if (
    currentPoint.targetSD === undefined ||
    currentPoint.targetSD === null ||
    isNaN(currentPoint.targetSD) ||
    currentPoint.targetSD <= 0
  ) {
    return {
      runStatus: 'INDETERMINATE',
      isEvaluated: false,
      indeterminateReason: `Target SD tidak valid (${currentPoint.targetSD}). Evaluasi Westgard membutuhkan nilai target SD > 0.`,
      unroundedZScore: null,
      formattedZScore: '-',
      violations: [],
      numericalProofs: [],
      activeRulesEvaluated: [],
      historicalPointsUsed: 0,
      dataSeriesId,
    };
  }

  if (
    currentPoint.targetMean === undefined ||
    currentPoint.targetMean === null ||
    isNaN(currentPoint.targetMean)
  ) {
    return {
      runStatus: 'INDETERMINATE',
      isEvaluated: false,
      indeterminateReason: 'Target Mean tidak valid atau tidak terdefinisi.',
      unroundedZScore: null,
      formattedZScore: '-',
      violations: [],
      numericalProofs: [],
      activeRulesEvaluated: [],
      historicalPointsUsed: 0,
      dataSeriesId,
    };
  }

  if (
    currentPoint.value === undefined ||
    currentPoint.value === null ||
    isNaN(currentPoint.value)
  ) {
    return {
      runStatus: 'INDETERMINATE',
      isEvaluated: false,
      indeterminateReason: 'Nilai hasil pemeriksaan QC (value) tidak valid atau kosong.',
      unroundedZScore: null,
      formattedZScore: '-',
      violations: [],
      numericalProofs: [],
      activeRulesEvaluated: [],
      historicalPointsUsed: 0,
      dataSeriesId,
    };
  }

  // 2. Hitung Skor-Z Murni Titik Saat Ini
  let currentZ: number;
  try {
    currentZ = calculateDeterministicZScore(currentPoint.value, currentPoint.targetMean, currentPoint.targetSD);
  } catch (err: any) {
    return {
      runStatus: 'INDETERMINATE',
      isEvaluated: false,
      indeterminateReason: err?.message || 'Gagal menghitung skor-z.',
      unroundedZScore: null,
      formattedZScore: '-',
      violations: [],
      numericalProofs: [],
      activeRulesEvaluated: [],
      historicalPointsUsed: 0,
      dataSeriesId,
    };
  }

  const formattedCurrentZ = formatZScoreDisplay(currentZ);

  // 3. Filter & Validasi Data Historis
  // Aturan multi-run berurutan (2:2s within-material, 4:1s, 10x, 8x, 7T) HANYA berlaku untuk:
  // - Instrumen yang sama
  // - Parameter yang sama
  // - Level kontrol yang sama
  // - Lot kontrol yang sama (pergantian lot mereset tren akumulasi karena mean & SD baru)
  const validHistory = historicalPoints
    .filter(p => {
      // Hilangkan titik yang persis sama dengan titik aktif saat ini (anti-duplicate collision)
      if (p.id === currentPoint.id) return false;
      // Harus sama instrumen, parameter, level kontrol, dan nomor lot
      if (p.instrumentId !== currentPoint.instrumentId) return false;
      if (p.parameterId !== currentPoint.parameterId) return false;
      if (p.controlLevel !== currentPoint.controlLevel) return false;
      if (p.lotNumber && currentPoint.lotNumber && p.lotNumber !== currentPoint.lotNumber) return false;
      // Nilai dan SD harus valid
      if (typeof p.value !== 'number' || isNaN(p.value)) return false;
      if (typeof p.targetSD !== 'number' || isNaN(p.targetSD) || p.targetSD <= 0) return false;
      if (typeof p.targetMean !== 'number' || isNaN(p.targetMean)) return false;
      return true;
    })
    // Urutkan secara kronologis berdasarkan timestamp (paling lama ke paling baru)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Periksa apakah ada titik duplikat dengan timestamp & nilai yang identik
  const seenTimestamps = new Set<number>();
  for (const pt of validHistory) {
    seenTimestamps.add(pt.timestamp);
  }

  // Bentuk deret poin lengkap (history + current) untuk evaluasi deret waktu
  const seriesPoints: {
    input: QCPointInput;
    z: number;
  }[] = [
    ...validHistory.map(p => ({
      input: p,
      z: calculateDeterministicZScore(p.value, p.targetMean, p.targetSD)
    })),
    {
      input: currentPoint,
      z: currentZ
    }
  ];

  const seriesLen = seriesPoints.length;
  const violations: WestgardViolation[] = [];
  const numericalProofs: WestgardNumericalProof[] = [];
  const activeRulesEvaluated: string[] = [];
  const triggeredRules: WestgardRuleKey[] = [];
  const nonTriggeredRules: NonTriggeredRuleDetail[] = [];
  const unevaluatedRules: UnevaluatedRuleDetail[] = [];

  const instName = currentPoint.instrumentName || 'Instrumen Laboratorium';
  const paramName = currentPoint.parameterName || 'Parameter QC';
  const paramUnit = currentPoint.unit || '';

  // Helper untuk membangun objek bukti numerik & violation
  const recordViolation = (
    ruleKey: WestgardRuleKey,
    category: 'WARNING' | 'REJECT',
    conditionFormula: string,
    evaluatedThreshold: string,
    actualObservation: string,
    observedDeltaOrCount: number,
    involved: { input: QCPointInput; z: number }[],
    isWithinRun: boolean,
    customDesc?: string
  ) => {
    if (!triggeredRules.includes(ruleKey)) {
      triggeredRules.push(ruleKey);
    }

    const config = rulesMap.get(ruleKey);
    const ruleName = config?.name || `Aturan ${ruleKey}`;
    const desc = customDesc || `${ruleName}: ${actualObservation}`;

    const pointsInvolvedSnapshot = involved.map(p => ({
      id: p.input.id,
      timestamp: p.input.timestamp,
      dateTime: `${p.input.date}${p.input.time ? ' ' + p.input.time : ''}`,
      controlLevel: p.input.controlLevel,
      lotNumber: p.input.lotNumber,
      measuredValue: p.input.value,
      targetMean: p.input.targetMean,
      targetSD: p.input.targetSD,
      unroundedZScore: p.z,
      formattedZScore: formatZScoreDisplay(p.z)
    }));

    const proof: WestgardNumericalProof = {
      ruleKey,
      ruleName,
      category,
      conditionFormula,
      evaluatedThreshold,
      actualObservation,
      observedDeltaOrCount,
      isWithinRun,
      pointsInvolved: pointsInvolvedSnapshot,
      evaluationTimestamp: nowIso
    };

    numericalProofs.push(proof);

    const guidance = getWestgardContextualGuidance(
      ruleKey,
      ruleName,
      category === 'REJECT' ? 'reject' : 'warning',
      instName,
      paramName,
      currentZ,
      actualObservation
    );

    violations.push({
      rule: ruleKey,
      ruleName,
      type: category === 'REJECT' ? 'reject' : 'warning',
      description: desc,
      pointsInvolved: involved.map(p => p.input.id),
      detectedAt: nowIso,
      instrumentName: guidance.instrumentName,
      parameterName: guidance.parameterName,
      parameterUnit: paramUnit,
      impact: guidance.impact,
      probableCauses: guidance.probableCauses,
      correctiveActions: guidance.correctiveActions,
      preventiveActions: guidance.preventiveActions
    });
  };

  // =========================================================================
  // EVALUASI ATURAN 1:3s (Reject Rule — Kesalahan Acak / Pergeseran Masif)
  // Definisi: Satu hasil QC berada di luar batas ±3.0 SD (|z| > 3.0)
  // =========================================================================
  if (rulesMap.get('1_3s')?.enabled) {
    activeRulesEvaluated.push('1_3s');
    // Perbandingan numerik deterministik tanpa pembulatan awal
    if (Math.abs(currentZ) > 3.0 + eps) {
      recordViolation(
        '1_3s',
        'REJECT',
        '|z| > 3.0',
        '±3.000 SD',
        `Nilai Z-score ${formattedCurrentZ} (${currentPoint.value} ${paramUnit}) melampaui batas kritis ±3SD`,
        Math.abs(currentZ),
        [{ input: currentPoint, z: currentZ }],
        false
      );
    } else {
      nonTriggeredRules.push({
        ruleKey: '1_3s',
        ruleName: 'Aturan 1:3s (Reject Rule)',
        type: 'reject',
        proofFormula: '|z| <= 3.000',
        safeObservation: `Nilai Z-score ${formattedCurrentZ} berada di dalam rentang batas kritis ±3.0 SD`
      });
    }
  }

  // =========================================================================
  // EVALUASI ATURAN R:4s (Within-Run Reject Rule — Kesalahan Acak Akut)
  // Definisi: Dalam RUN ANALITIK YANG SAMA, selisih antar level kontrol ≥ 4.0 SD
  // dengan satu kontrol > +2SD dan kontrol lain < -2SD.
  // =========================================================================
  if (rulesMap.get('R_4s')?.enabled) {
    activeRulesEvaluated.push('R_4s');

    // Kumpulkan seluruh titik kontrol dalam analitik run / sesi yang sama
    const runBatchPoints: { input: QCPointInput; z: number }[] = [
      { input: currentPoint, z: currentZ }
    ];

    if (options.sameRunOtherLevels && options.sameRunOtherLevels.length > 0) {
      for (const otherPt of options.sameRunOtherLevels) {
        if (
          otherPt.id !== currentPoint.id &&
          otherPt.parameterId === currentPoint.parameterId &&
          otherPt.instrumentId === currentPoint.instrumentId &&
          otherPt.targetSD > 0
        ) {
          const otherZ = calculateDeterministicZScore(otherPt.value, otherPt.targetMean, otherPt.targetSD);
          runBatchPoints.push({ input: otherPt, z: otherZ });
        }
      }
    }

    // Evaluasi jika terdapat minimal 2 level dalam run yang sama
    if (runBatchPoints.length >= 2) {
      let maxZPoint = runBatchPoints[0];
      let minZPoint = runBatchPoints[0];

      for (let i = 1; i < runBatchPoints.length; i++) {
        if (runBatchPoints[i].z > maxZPoint.z) maxZPoint = runBatchPoints[i];
        if (runBatchPoints[i].z < minZPoint.z) minZPoint = runBatchPoints[i];
      }

      const span = maxZPoint.z - minZPoint.z;
      // Syarat R:4s: Rentang selisih ≥ 4SD, DAN satu titik melebihi +2SD serta satu titik melebihi -2SD
      const spansBothSides = (maxZPoint.z > 2.0 - eps) && (minZPoint.z < -2.0 + eps);
      if (span >= 4.0 - eps && spansBothSides) {
        recordViolation(
          'R_4s',
          'REJECT',
          '(z_max - z_min) >= 4.0 AND z_max > +2.0 AND z_min < -2.0 (Dalam 1 Run)',
          'Rentang selisih 4.000 SD',
          `Rentang antar level pada run yang sama adalah ${span.toFixed(2)} SD (${maxZPoint.input.controlLevel}: ${formatZScoreDisplay(maxZPoint.z)} vs ${minZPoint.input.controlLevel}: ${formatZScoreDisplay(minZPoint.z)})`,
          span,
          [maxZPoint, minZPoint],
          true
        );
      } else {
        nonTriggeredRules.push({
          ruleKey: 'R_4s',
          ruleName: 'Aturan R:4s (Within-Run Reject)',
          type: 'reject',
          proofFormula: 'Rentang selisih antar-level (z_max - z_min) < 4.000 SD dalam 1 run',
          safeObservation: `Rentang selisih antar-level dalam run ini aman: ${span.toFixed(2)} SD (< 4.0 SD)`
        });
      }
    } else {
      unevaluatedRules.push({
        ruleKey: 'R_4s',
        ruleName: 'Aturan R:4s (Within-Run Reject)',
        type: 'reject',
        requiredCondition: 'Minimal 2 level kontrol berbeda dievaluasi dalam 1 run yang sama',
        currentCondition: `Hanya ada ${runBatchPoints.length} level dalam run ini`,
        reason: 'Aturan R:4s dievaluasi antar level bahan kontrol pada run analitik yang sama'
      });
    }
  }

  // =========================================================================
  // EVALUASI ATURAN 2:2s (Reject Rule — Pergeseran Sistematik)
  // Definisi: Dua hasil berturut-turut melebihi ±2.0 SD pada sisi yang sama.
  // =========================================================================
  if (rulesMap.get('2_2s')?.enabled) {
    activeRulesEvaluated.push('2_2s');
    let triggered2_2s = false;

    // A. Skema Within-Material (2 run berturut-turut pada level kontrol yang sama)
    if (seriesLen >= 2) {
      const p1 = seriesPoints[seriesLen - 2];
      const p2 = seriesPoints[seriesLen - 1]; // currentPoint

      const bothHigh = (p1.z > 2.0 + eps) && (p2.z > 2.0 + eps);
      const bothLow = (p1.z < -2.0 - eps) && (p2.z < -2.0 - eps);

      if (bothHigh || bothLow) {
        recordViolation(
          '2_2s',
          'REJECT',
          '(z1 > +2.0 AND z2 > +2.0) OR (z1 < -2.0 AND z2 < -2.0)',
          '±2.000 SD pada sisi yang sama',
          `Dua hasil berurutan (${formatZScoreDisplay(p1.z)} & ${formatZScoreDisplay(p2.z)}) melebihi batas 2SD pada sisi ${bothHigh ? 'atas (+)' : 'bawah (-)'}`,
          2,
          [p1, p2],
          false
        );
        triggered2_2s = true;
      }
    }

    // B. Skema Across-Materials (2 level berbeda dalam 1 run yang sama keduanya > +2SD atau < -2SD)
    if (!triggered2_2s && options.allowAcrossLevels2_2s && options.sameRunOtherLevels && options.sameRunOtherLevels.length > 0) {
      for (const otherPt of options.sameRunOtherLevels) {
        if (
          otherPt.id !== currentPoint.id &&
          otherPt.controlLevel !== currentPoint.controlLevel &&
          otherPt.parameterId === currentPoint.parameterId &&
          otherPt.instrumentId === currentPoint.instrumentId &&
          otherPt.targetSD > 0
        ) {
          const otherZ = calculateDeterministicZScore(otherPt.value, otherPt.targetMean, otherPt.targetSD);
          const bothHigh = (currentZ > 2.0 + eps) && (otherZ > 2.0 + eps);
          const bothLow = (currentZ < -2.0 - eps) && (otherZ < -2.0 - eps);

          if (bothHigh || bothLow) {
            recordViolation(
              '2_2s',
              'REJECT',
              'Across-Materials: (z_A > +2.0 AND z_B > +2.0) OR (z_A < -2.0 AND z_B < -2.0)',
              '±2.000 SD pada kedua level dalam 1 run',
              `Dua level kontrol berbeda dalam run yang sama (${currentPoint.controlLevel}: ${formattedCurrentZ} & ${otherPt.controlLevel}: ${formatZScoreDisplay(otherZ)}) keduanya melampaui 2SD pada sisi ${bothHigh ? 'atas (+)' : 'bawah (-)'}`,
              2,
              [{ input: currentPoint, z: currentZ }, { input: otherPt, z: otherZ }],
              true
            );
            triggered2_2s = true;
            break;
          }
        }
      }
    }

    if (!triggered2_2s) {
      if (seriesLen >= 2) {
        nonTriggeredRules.push({
          ruleKey: '2_2s',
          ruleName: 'Aturan 2:2s (Reject Rule)',
          type: 'reject',
          proofFormula: 'Tidak ada 2 hasil berurutan melebihi ±2.0 SD searah',
          safeObservation: `Dua hasil terakhir (${formatZScoreDisplay(seriesPoints[seriesLen - 2].z)} & ${formattedCurrentZ}) tidak melanggar ambang batas 2SD searah`
        });
      } else {
        unevaluatedRules.push({
          ruleKey: '2_2s',
          ruleName: 'Aturan 2:2s (Reject Rule)',
          type: 'reject',
          requiredCondition: 'Minimal 2 hasil berturut-turut pada bahan yang sama',
          currentCondition: `Saat ini hanya ada ${seriesLen} hasil`,
          reason: 'Data belum cukup untuk evaluasi 2:2s berurutan'
        });
      }
    }
  }

  // =========================================================================
  // EVALUASI ATURAN 4:1s (Reject Rule — Pergeseran Sistematik / Shift)
  // Definisi: 4 hasil berturut-turut melebihi ±1.0 SD pada sisi yang sama.
  // =========================================================================
  if (rulesMap.get('4_1s')?.enabled) {
    activeRulesEvaluated.push('4_1s');
    if (seriesLen >= 4) {
      const last4 = seriesPoints.slice(seriesLen - 4);
      const allHigh = last4.every(p => p.z > 1.0 + eps);
      const allLow = last4.every(p => p.z < -1.0 - eps);

      if (allHigh || allLow) {
        recordViolation(
          '4_1s',
          'REJECT',
          '4 consecutive results exceeding ±1.0 SD on the same side',
          '±1.000 SD (4 titik berturut-turut)',
          `Empat hasil berturut-turut (${last4.map(p => formatZScoreDisplay(p.z)).join(', ')}) melampaui 1SD pada sisi ${allHigh ? 'atas (+)' : 'bawah (-)'}`,
          4,
          last4,
          false
        );
      } else {
        nonTriggeredRules.push({
          ruleKey: '4_1s',
          ruleName: 'Aturan 4:1s (Reject Rule)',
          type: 'reject',
          proofFormula: 'Tidak ada 4 hasil berturut-turut melebihi ±1.0 SD searah',
          safeObservation: 'Empat hasil terakhir tidak melampaui batas 1SD pada sisi yang sama'
        });
      }
    } else {
      unevaluatedRules.push({
        ruleKey: '4_1s',
        ruleName: 'Aturan 4:1s (Reject Rule)',
        type: 'reject',
        requiredCondition: 'Minimal 4 hasil berturut-turut',
        currentCondition: `Saat ini ada ${seriesLen} hasil`,
        reason: `Memerlukan 4 hasil berurutan (kurang ${4 - seriesLen} titik)`
      });
    }
  }

  // =========================================================================
  // EVALUASI ATURAN 10x (Reject / Systematic Shift)
  // Definisi: 10 hasil berturut-turut jatuh pada sisi mean yang sama (z > 0 atau z < 0).
  // CATATAN: Titik tepat di mean (z == 0) mereset hitungan streak.
  // =========================================================================
  if (rulesMap.get('10x')?.enabled) {
    activeRulesEvaluated.push('10x');
    if (seriesLen >= 10) {
      const last10 = seriesPoints.slice(seriesLen - 10);
      const allPositive = last10.every(p => p.z > 0.0 + eps);
      const allNegative = last10.every(p => p.z < -0.0 - eps);

      if (allPositive || allNegative) {
        const configType = rulesMap.get('10x')?.type || 'reject';
        recordViolation(
          '10x',
          configType === 'warning' ? 'WARNING' : 'REJECT',
          '10 consecutive results on the same side of the mean (z > 0 OR z < 0)',
          'Sisi Mean yang sama (10 titik)',
          `Sepuluh hasil kontrol berturut-turut berada di sisi ${allPositive ? 'atas (+)' : 'bawah (-)'} Mean tanpa memotong garis tengah`,
          10,
          last10,
          false
        );
      } else {
        nonTriggeredRules.push({
          ruleKey: '10x',
          ruleName: 'Aturan 10x (Reject Rule)',
          type: 'reject',
          proofFormula: 'Hasil tersebar di kedua sisi Mean (tidak ada 10 titik berurutan di 1 sisi)',
          safeObservation: 'Sepuluh hasil terakhir tidak bergeser secara terus menerus pada satu sisi mean'
        });
      }
    } else {
      unevaluatedRules.push({
        ruleKey: '10x',
        ruleName: 'Aturan 10x (Reject Rule)',
        type: 'reject',
        requiredCondition: 'Minimal 10 hasil berturut-turut',
        currentCondition: `Saat ini ada ${seriesLen} hasil`,
        reason: `Memerlukan 10 hasil berurutan (kurang ${10 - seriesLen} titik)`
      });
    }
  }

  // =========================================================================
  // EVALUASI MODULAR: ATURAN 8x (Reject / ISO 15189 Modern SQC)
  // Definisi: 8 hasil berturut-turut jatuh pada sisi mean yang sama.
  // =========================================================================
  if (rulesMap.get('8x')?.enabled) {
    activeRulesEvaluated.push('8x');
    if (seriesLen >= 8) {
      const last8 = seriesPoints.slice(seriesLen - 8);
      const allPositive = last8.every(p => p.z > 0.0 + eps);
      const allNegative = last8.every(p => p.z < -0.0 - eps);

      if (allPositive || allNegative) {
        const configType = rulesMap.get('8x')?.type || 'reject';
        recordViolation(
          '8x',
          configType === 'warning' ? 'WARNING' : 'REJECT',
          '8 consecutive results on the same side of the mean (z > 0 OR z < 0)',
          'Sisi Mean yang sama (8 titik)',
          `Delapan hasil kontrol berturut-turut berada di sisi ${allPositive ? 'atas (+)' : 'bawah (-)'} Mean`,
          8,
          last8,
          false
        );
      } else {
        nonTriggeredRules.push({
          ruleKey: '8x',
          ruleName: 'Aturan 8x (Reject Rule)',
          type: 'reject',
          proofFormula: 'Tidak ada 8 hasil berurutan pada satu sisi Mean',
          safeObservation: 'Delapan hasil terakhir tersebar aman di sekitar mean'
        });
      }
    } else {
      unevaluatedRules.push({
        ruleKey: '8x',
        ruleName: 'Aturan 8x (Reject Rule)',
        type: 'reject',
        requiredCondition: 'Minimal 8 hasil berturut-turut',
        currentCondition: `Saat ini ada ${seriesLen} hasil`,
        reason: `Memerlukan 8 hasil berurutan (kurang ${8 - seriesLen} titik)`
      });
    }
  }

  // =========================================================================
  // EVALUASI MODULAR: ATURAN 7T (Trend Monotonik)
  // Definisi: 7 hasil berturut-turut menunjukkan tren peningkatan atau penurunan yang ketat
  // =========================================================================
  if (rulesMap.get('7T')?.enabled) {
    activeRulesEvaluated.push('7T');
    if (seriesLen >= 7) {
      const last7 = seriesPoints.slice(seriesLen - 7);
      let isStrictlyIncreasing = true;
      let isStrictlyDecreasing = true;

      for (let i = 1; i < last7.length; i++) {
        if (last7[i].z <= last7[i - 1].z + eps) {
          isStrictlyIncreasing = false;
        }
        if (last7[i].z >= last7[i - 1].z - eps) {
          isStrictlyDecreasing = false;
        }
      }

      if (isStrictlyIncreasing || isStrictlyDecreasing) {
        const configType = rulesMap.get('7T')?.type || 'reject';
        recordViolation(
          '7T',
          configType === 'warning' ? 'WARNING' : 'REJECT',
          '7 consecutive results showing continuous increasing or decreasing trend',
          'Tren 7 titik berurutan',
          `Tujuh hasil kontrol berturut-turut menunjukkan tren pergeseran yang konsisten ${isStrictlyIncreasing ? 'MENINGKAT (Trending UP)' : 'MENURUN (Trending DOWN)'}`,
          7,
          last7,
          false
        );
      } else {
        nonTriggeredRules.push({
          ruleKey: '7T',
          ruleName: 'Aturan 7T (Trend Rule)',
          type: rulesMap.get('7T')?.type || 'reject',
          proofFormula: 'Tidak ada tren monotonik 7 titik berturut-turut',
          safeObservation: 'Tujuh hasil terakhir tidak menunjukkan pola peningkatan atau penurunan terus-menerus'
        });
      }
    } else {
      unevaluatedRules.push({
        ruleKey: '7T',
        ruleName: 'Aturan 7T (Trend Rule)',
        type: rulesMap.get('7T')?.type || 'reject',
        requiredCondition: 'Minimal 7 hasil berturut-turut',
        currentCondition: `Saat ini ada ${seriesLen} hasil`,
        reason: `Memerlukan 7 hasil berurutan (kurang ${7 - seriesLen} titik)`
      });
    }
  }

  // =========================================================================
  // EVALUASI ATURAN 1:2s (Warning Rule)
  // Definisi: Satu hasil QC berada di luar batas ±2.0 SD (|z| > 2.0).
  // Dalam skema multirule klasik:
  // - 1:2s adalah aturan peringatan (screening rule).
  // - Jika aturan penolakan (1:3s, 2:2s, R:4s, 4:1s, 10x) terpicu, run otomatis REJECT.
  // - 1:2s dievaluasi dan dicatat sebagai WARNING bukti numerik.
  // =========================================================================
  if (rulesMap.get('1_2s')?.enabled) {
    activeRulesEvaluated.push('1_2s');
    if (Math.abs(currentZ) > 2.0 + eps) {
      recordViolation(
        '1_2s',
        'WARNING',
        '|z| > 2.0',
        '±2.000 SD',
        `Nilai Z-score ${formattedCurrentZ} (${currentPoint.value} ${paramUnit}) berada di zona peringatan ±2SD`,
        Math.abs(currentZ),
        [{ input: currentPoint, z: currentZ }],
        false
      );
    } else {
      nonTriggeredRules.push({
        ruleKey: '1_2s',
        ruleName: 'Aturan 1:2s (Warning Rule)',
        type: 'warning',
        proofFormula: '|z| <= 2.000',
        safeObservation: `Nilai Z-score ${formattedCurrentZ} berada di dalam batas aman screening ±2SD`
      });
    }
  }

  // =========================================================================
  // PENENTUAN STATUS RUN AKHIR & REKOMENDASI SAMPEL PASIEN
  // =========================================================================
  const hasReject = violations.some(v => v.type === 'reject');
  const hasWarning = violations.some(v => v.type === 'warning');

  let runStatus: RunStatus = 'NORMAL';
  if (hasReject) {
    runStatus = 'REJECT';
  } else if (hasWarning) {
    runStatus = 'WARNING';
  }

  let patientSampleRecommendation: 'HOLD' | 'PROCEED' | 'HOLD_PENDING_INVESTIGATION' = 'PROCEED';
  if (runStatus === 'REJECT') {
    patientSampleRecommendation = 'HOLD';
  } else if (runStatus === 'WARNING') {
    patientSampleRecommendation = 'HOLD_PENDING_INVESTIGATION';
  } else if (runStatus === 'INDETERMINATE') {
    patientSampleRecommendation = 'HOLD';
  }

  return {
    runStatus,
    isEvaluated: true,
    unroundedZScore: currentZ,
    formattedZScore: formattedCurrentZ,
    violations,
    numericalProofs,
    activeRulesEvaluated,
    historicalPointsUsed: validHistory.length,
    dataSeriesId,
    triggeredRules,
    nonTriggeredRules,
    unevaluatedRules,
    patientSampleRecommendation
  };
}

/**
 * Evaluasi seluruh dataset QC untuk parameter dan level kontrol tertentu.
 * Mengambil run terbaru sebagai titik aktif dan seluruh run sebelumnya sebagai riwayat kronologis.
 */
export function evaluateDatasetWestgard(
  results: QCResult[],
  parameter: Parameter,
  controlLevel?: string,
  lotNumber?: string,
  options: WestgardEngineOptions = {}
): WestgardEvaluationResult {
  let filtered = results.filter(r => r.parameterId === parameter.id && !r.isDeleted && !r.deletedAt);
  if (controlLevel && controlLevel !== 'all') {
    filtered = filtered.filter(r => r.controlLevel === controlLevel);
  }
  if (lotNumber) {
    filtered = filtered.filter(r => r.lotNumber === lotNumber);
  }

  // Sort chronologically ascending
  const sorted = [...filtered].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (sorted.length === 0) {
    return {
      runStatus: 'INDETERMINATE',
      isEvaluated: false,
      indeterminateReason: `Belum ada data pemeriksaan QC untuk parameter ${parameter.name} (${parameter.code}).`,
      unroundedZScore: null,
      formattedZScore: '-',
      violations: [],
      numericalProofs: [],
      activeRulesEvaluated: [],
      historicalPointsUsed: 0,
      dataSeriesId: `${parameter.instrumentId}_${parameter.id}`,
      triggeredRules: [],
      nonTriggeredRules: [],
      unevaluatedRules: [],
      patientSampleRecommendation: 'HOLD'
    };
  }

  const latest = sorted[sorted.length - 1];
  const history = sorted.slice(0, sorted.length - 1);

  const curPoint: QCPointInput = {
    id: latest.id,
    value: latest.value,
    date: latest.date,
    time: latest.time,
    timestamp: latest.timestamp || new Date(`${latest.date}T${latest.time || '12:00'}:00`).getTime(),
    instrumentId: latest.instrumentId || parameter.instrumentId,
    instrumentName: latest.instrumentName || 'Instrumen',
    parameterId: latest.parameterId,
    parameterName: latest.parameterName,
    unit: latest.unit || parameter.unit,
    controlLevel: latest.controlLevel,
    lotNumber: latest.lotNumber,
    targetMean: latest.mean || parameter.targetMean,
    targetSD: latest.sd || parameter.targetSD,
  };

  const histPoints: QCPointInput[] = history.map(r => ({
    id: r.id,
    value: r.value,
    date: r.date,
    time: r.time,
    timestamp: r.timestamp || new Date(`${r.date}T${r.time || '12:00'}:00`).getTime(),
    instrumentId: r.instrumentId || parameter.instrumentId,
    instrumentName: r.instrumentName,
    parameterId: r.parameterId,
    parameterName: r.parameterName,
    unit: r.unit || parameter.unit,
    controlLevel: r.controlLevel,
    lotNumber: r.lotNumber,
    targetMean: r.mean || parameter.targetMean,
    targetSD: r.sd || parameter.targetSD,
  }));

  // Also collect same run other levels if available
  const sameRunOtherLevels: QCPointInput[] = results
    .filter(r => 
      !r.isDeleted && !r.deletedAt &&
      r.parameterId === parameter.id &&
      r.date === latest.date &&
      r.controlLevel !== latest.controlLevel &&
      r.instrumentId === latest.instrumentId
    )
    .map(r => ({
      id: r.id,
      value: r.value,
      date: r.date,
      time: r.time,
      timestamp: r.timestamp || new Date(`${r.date}T${r.time || '12:00'}:00`).getTime(),
      instrumentId: r.instrumentId || parameter.instrumentId,
      instrumentName: r.instrumentName,
      parameterId: r.parameterId,
      parameterName: r.parameterName,
      unit: r.unit || parameter.unit,
      controlLevel: r.controlLevel,
      lotNumber: r.lotNumber,
      targetMean: r.mean || parameter.targetMean,
      targetSD: r.sd || parameter.targetSD,
    }));

  return evaluateDeterministicWestgard(curPoint, histPoints, {
    ...options,
    sameRunOtherLevels: options.sameRunOtherLevels || sameRunOtherLevels
  });
}
