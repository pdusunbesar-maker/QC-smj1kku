import { QCResult, QCStatistics, WestgardRuleConfig, WestgardViolation } from '../types';

export const DEFAULT_WESTGARD_RULES: WestgardRuleConfig[] = [
  {
    key: '1_2s',
    name: 'Aturan 1:2s',
    shortDesc: '1 hasil di luar ±2SD',
    description: 'Satu nilai kontrol berada di luar rentang Mean ± 2SD.',
    type: 'warning',
    enabled: true,
    recommendation: 'Aturan peringatan (Warning). Periksa tren grafik, reagen, dan kondisi alat. Boleh dilanjutkan jika aturan Westgard lain tidak terlanggar.'
  },
  {
    key: '1_3s',
    name: 'Aturan 1:3s',
    shortDesc: '1 hasil di luar ±3SD',
    description: 'Satu nilai kontrol berada di luar rentang Mean ± 3SD.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Kemungkinan kesalahan acak (random error) atau pergeseran besar. Jangan rilis hasil pasien! Ulangi tes dengan kontrol baru atau kalibrasi ulang.'
  },
  {
    key: '2_2s',
    name: 'Aturan 2:2s',
    shortDesc: '2 hasil berturut-turut di luar ±2SD sisi sama',
    description: 'Dua hasil kontrol berturut-turut berada di sisi yang sama dan melebihi ±2SD.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi kesalahan sistematik (systematic error). Periksa kalibrasi instrumen, lot reagen, atau temperatur inkubator.'
  },
  {
    key: 'R_4s',
    name: 'Aturan R:4s',
    shortDesc: 'Selisih 2 hasil berturut-turut ≥ 4SD',
    description: 'Satu hasil melebihi +2SD dan hasil berikutnya/bersebelahan melebihi -2SD (rentang selisih ≥ 4SD).',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi kuat kesalahan acak (random error). Periksa gelembung udara, pipetting, atau kestabilan listrik/optik alat.'
  },
  {
    key: '4_1s',
    name: 'Aturan 4:1s',
    shortDesc: '4 hasil berturut-turut di luar ±1SD sisi sama',
    description: 'Empat hasil kontrol berturut-turut berada di sisi yang sama dan melebihi ±1SD.',
    type: 'reject',
    enabled: true,
    recommendation: 'REJECT! Indikasi pergeseran sistematik (systematic shift). Segera lakukan pemeliharaan instrumen atau kalibrasi ulang parameter.'
  },
  {
    key: '10x',
    name: 'Aturan 10x',
    shortDesc: '10 hasil berturut-turut pada sisi mean yang sama',
    description: 'Sepuluh hasil kontrol berturut-turut berada di sisi yang sama terhadap Mean.',
    type: 'warning',
    enabled: true,
    recommendation: 'WARNING / REVIEW! Indikasi pergeseran sistematik bertahap (systematic drift). Lakukan investigasi reagen dan evaluasi kalibrasi.'
  }
];

/**
 * Calculate Z-Score: (value - mean) / SD
 */
export function calculateZScore(value: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return Number(((value - mean) / sd).toFixed(3));
}

/**
 * Format SD Position string
 */
export function formatSDPosition(zScore: number): string {
  const sign = zScore >= 0 ? '+' : '';
  return `${sign}${zScore.toFixed(2)} SD`;
}

/**
 * Calculate comprehensive QC Statistics
 */
export function calculateQCStatistics(
  results: QCResult[],
  targetMean: number,
  targetSD: number,
  targetCV: number
): QCStatistics {
  const count = results.length;
  if (count === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      sd: 0,
      cv: 0,
      targetMean,
      targetSD,
      targetCV,
      passCount: 0,
      warningCount: 0,
      rejectCount: 0,
    };
  }

  const values = results.map(r => r.value).sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  // Median
  let median = 0;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = (values[mid - 1] + values[mid]) / 2;
  } else {
    median = values[mid];
  }

  // Sample Standard Deviation (N - 1) if count > 1
  let sd = 0;
  if (count > 1) {
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1);
    sd = Math.sqrt(variance);
  } else {
    sd = targetSD;
  }

  // Coefficient of Variation: (SD / Mean) * 100
  const cv = mean !== 0 ? (sd / mean) * 100 : 0;

  const min = values[0];
  const max = values[count - 1];

  let passCount = 0;
  let warningCount = 0;
  let rejectCount = 0;

  results.forEach(r => {
    if (r.status === 'pass') passCount++;
    else if (r.status === 'warning') warningCount++;
    else if (r.status === 'reject') rejectCount++;
  });

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    sd: Number(sd.toFixed(3)),
    cv: Number(cv.toFixed(2)),
    targetMean,
    targetSD,
    targetCV,
    passCount,
    warningCount,
    rejectCount,
  };
}

/**
 * Evaluate Westgard Rules for a single QC Result given historical sequence
 * resultsHistory should be ordered chronologically (oldest to newest), with current at the end
 */
export function evaluateWestgardRules(
  currentResult: {
    id: string;
    value: number;
    mean: number;
    sd: number;
    zScore: number;
  },
  previousResults: QCResult[],
  activeRules: WestgardRuleConfig[] = DEFAULT_WESTGARD_RULES
): {
  status: 'pass' | 'warning' | 'reject';
  violations: WestgardViolation[];
} {
  const violations: WestgardViolation[] = [];
  const rulesMap = new Map(activeRules.map(r => [r.key, r]));

  const z = currentResult.zScore;
  const now = new Date().toISOString();

  // Combine history + current point
  const allPoints = [
    ...previousResults.map(p => ({ id: p.id, zScore: p.zScore })),
    { id: currentResult.id, zScore: z }
  ];

  const len = allPoints.length;

  // 1. Rule 1-3s: |z| > 3 (Reject)
  if (rulesMap.get('1_3s')?.enabled && Math.abs(z) > 3) {
    violations.push({
      rule: '1_3s',
      ruleName: '1:3s Violation',
      type: 'reject',
      description: `Nilai Z-score ${z > 0 ? '+' : ''}${z.toFixed(2)} melebihi ±3SD`,
      pointsInvolved: [currentResult.id],
      detectedAt: now,
    });
  }

  // 2. Rule 2-2s: 2 consecutive points > +2SD OR 2 consecutive points < -2SD (Reject)
  if (rulesMap.get('2_2s')?.enabled && len >= 2) {
    const prevZ = allPoints[len - 2].zScore;
    if ((z > 2 && prevZ > 2) || (z < -2 && prevZ < -2)) {
      violations.push({
        rule: '2_2s',
        ruleName: '2:2s Violation',
        type: 'reject',
        description: `Dua hasil berurutan (${prevZ.toFixed(2)} SD & ${z.toFixed(2)} SD) melebihi batas ±2SD pada sisi yang sama`,
        pointsInvolved: [allPoints[len - 2].id, currentResult.id],
        detectedAt: now,
      });
    }
  }

  // 3. Rule R-4s: Difference between 2 consecutive points >= 4SD (Reject)
  if (rulesMap.get('R_4s')?.enabled && len >= 2) {
    const prevZ = allPoints[len - 2].zScore;
    if (Math.abs(z - prevZ) >= 4) {
      violations.push({
        rule: 'R_4s',
        ruleName: 'R:4s Violation',
        type: 'reject',
        description: `Rentang selisih 2 hasil berurutan adalah ${Math.abs(z - prevZ).toFixed(2)} SD (≥ 4SD)`,
        pointsInvolved: [allPoints[len - 2].id, currentResult.id],
        detectedAt: now,
      });
    }
  }

  // 4. Rule 4-1s: 4 consecutive points > +1SD OR 4 consecutive points < -1SD (Reject)
  if (rulesMap.get('4_1s')?.enabled && len >= 4) {
    const last4 = allPoints.slice(len - 4);
    const allHigh = last4.every(p => p.zScore > 1);
    const allLow = last4.every(p => p.zScore < -1);
    if (allHigh || allLow) {
      violations.push({
        rule: '4_1s',
        ruleName: '4:1s Violation',
        type: 'reject',
        description: `Empat hasil berurutan melebihi ±1SD pada sisi ${allHigh ? 'atas (+)' : 'bawah (-)'}`,
        pointsInvolved: last4.map(p => p.id),
        detectedAt: now,
      });
    }
  }

  // 5. Rule 10x: 10 consecutive points on same side of mean (Warning/Review)
  if (rulesMap.get('10x')?.enabled && len >= 10) {
    const last10 = allPoints.slice(len - 10);
    const allAboveMean = last10.every(p => p.zScore > 0);
    const allBelowMean = last10.every(p => p.zScore < 0);
    if (allAboveMean || allBelowMean) {
      violations.push({
        rule: '10x',
        ruleName: '10x Violation',
        type: 'warning',
        description: `Sepuluh hasil berurutan berada di sisi ${allAboveMean ? 'atas (+)' : 'bawah (-)'} Mean`,
        pointsInvolved: last10.map(p => p.id),
        detectedAt: now,
      });
    }
  }

  // 6. Rule 1-2s: |z| > 2 (Warning)
  // Evaluated if no reject rules apply or as warning
  if (rulesMap.get('1_2s')?.enabled && Math.abs(z) > 2) {
    const alreadyHasReject = violations.some(v => v.type === 'reject');
    if (!alreadyHasReject) {
      violations.push({
        rule: '1_2s',
        ruleName: '1:2s Warning',
        type: 'warning',
        description: `Hasil berada di luar ±2SD (${z > 0 ? '+' : ''}${z.toFixed(2)} SD)`,
        pointsInvolved: [currentResult.id],
        detectedAt: now,
      });
    }
  }

  // Determine overall status
  const hasReject = violations.some(v => v.type === 'reject');
  const hasWarning = violations.some(v => v.type === 'warning');

  let status: 'pass' | 'warning' | 'reject' = 'pass';
  if (hasReject) {
    status = 'reject';
  } else if (hasWarning) {
    status = 'warning';
  }

  return { status, violations };
}
