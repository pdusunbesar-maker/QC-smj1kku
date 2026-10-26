import { QCResult, QCStatistics, WestgardRuleConfig, WestgardViolation } from '../types';
import { getWestgardContextualGuidance } from './westgardGuidance';
import { 
  calculateDeterministicZScore, 
  evaluateDeterministicWestgard, 
  evaluateDatasetWestgard,
  QCPointInput, 
  RunStatus, 
  WestgardNumericalProof, 
  DEFAULT_ENGINE_RULES,
  WestgardEvaluationResult,
  NonTriggeredRuleDetail,
  UnevaluatedRuleDetail
} from './westgardEngine';

export { 
  evaluateDatasetWestgard,
  calculateDeterministicZScore,
  evaluateDeterministicWestgard,
  type WestgardEvaluationResult,
  type NonTriggeredRuleDetail,
  type UnevaluatedRuleDetail,
  type RunStatus,
  type WestgardNumericalProof
};

export const DEFAULT_WESTGARD_RULES: WestgardRuleConfig[] = DEFAULT_ENGINE_RULES;

/**
 * Calculate Z-Score: (value - mean) / SD
 * Retains full precision floating-point arithmetic without premature rounding.
 */
export function calculateZScore(value: number, mean: number, sd: number): number {
  if (sd === 0 || isNaN(sd) || sd <= 0) return 0;
  return (value - mean) / sd;
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
/**
 * Evaluate Westgard Rules deterministically for a single QC Result given historical sequence.
 * Delegates to evaluateDeterministicWestgard in westgardEngine.ts with full floating-point precision,
 * strict multi-rule validation, within-run R4s logic, and numerical proofs generation.
 */
export function evaluateWestgardRules(
  currentResult: {
    id: string;
    value: number;
    mean: number;
    sd: number;
    zScore?: number;
    instrumentId?: string;
    instrumentName?: string;
    parameterId?: string;
    parameterName?: string;
    parameterUnit?: string;
    controlLevel?: 'Level 1' | 'Level 2' | 'Level 3';
    lotNumber?: string;
    date?: string;
    time?: string;
    timestamp?: number;
    runSessionId?: string;
  },
  previousResults: QCResult[],
  activeRules: WestgardRuleConfig[] = DEFAULT_WESTGARD_RULES,
  options?: {
    sameRunOtherLevels?: QCResult[];
  }
): {
  status: 'pass' | 'warning' | 'reject' | 'indeterminate';
  runStatus: RunStatus;
  violations: WestgardViolation[];
  numericalProofs: WestgardNumericalProof[];
  evaluationResult: ReturnType<typeof evaluateDeterministicWestgard>;
} {
  const curDate = currentResult.date || new Date().toISOString().split('T')[0];
  const curTime = currentResult.time || '12:00';
  const curTimestamp = currentResult.timestamp || (currentResult.date ? new Date(`${curDate}T${curTime}:00`).getTime() : Date.now());

  const currentPoint: QCPointInput = {
    id: currentResult.id,
    value: currentResult.value,
    date: curDate,
    time: curTime,
    timestamp: curTimestamp,
    instrumentId: currentResult.instrumentId || previousResults[0]?.instrumentId || 'default-inst',
    instrumentName: currentResult.instrumentName || previousResults[0]?.instrumentName || 'Instrumen Laboratorium',
    parameterId: currentResult.parameterId || previousResults[0]?.parameterId || 'default-param',
    parameterName: currentResult.parameterName || previousResults[0]?.parameterName || 'Parameter QC',
    unit: currentResult.parameterUnit || previousResults[0]?.unit || '',
    controlLevel: currentResult.controlLevel || previousResults[0]?.controlLevel || 'Level 1',
    lotNumber: currentResult.lotNumber || previousResults[0]?.lotNumber || 'default-lot',
    targetMean: currentResult.mean,
    targetSD: currentResult.sd,
    runSessionId: currentResult.runSessionId,
  };

  const historicalPoints: QCPointInput[] = previousResults.map(r => ({
    id: r.id,
    value: r.value,
    date: r.date,
    time: r.time,
    timestamp: r.timestamp || new Date(`${r.date}T${r.time || '00:00'}:00`).getTime(),
    instrumentId: r.instrumentId,
    instrumentName: r.instrumentName,
    parameterId: r.parameterId,
    parameterName: r.parameterName,
    unit: r.unit,
    controlLevel: r.controlLevel,
    lotNumber: r.lotNumber,
    targetMean: r.mean,
    targetSD: r.sd,
  }));

  const otherLevels: QCPointInput[] = options?.sameRunOtherLevels
    ? options.sameRunOtherLevels.map(r => ({
        id: r.id,
        value: r.value,
        date: r.date,
        time: r.time,
        timestamp: r.timestamp || new Date(`${r.date}T${r.time || '00:00'}:00`).getTime(),
        instrumentId: r.instrumentId,
        instrumentName: r.instrumentName,
        parameterId: r.parameterId,
        parameterName: r.parameterName,
        unit: r.unit,
        controlLevel: r.controlLevel,
        lotNumber: r.lotNumber,
        targetMean: r.mean,
        targetSD: r.sd,
      }))
    : [];

  const evalResult = evaluateDeterministicWestgard(currentPoint, historicalPoints, {
    activeRules,
    sameRunOtherLevels: otherLevels,
  });

  let status: 'pass' | 'warning' | 'reject' | 'indeterminate' = 'pass';
  if (evalResult.runStatus === 'REJECT') {
    status = 'reject';
  } else if (evalResult.runStatus === 'WARNING') {
    status = 'warning';
  } else if (evalResult.runStatus === 'INDETERMINATE') {
    status = 'indeterminate';
  }

  return {
    status,
    runStatus: evalResult.runStatus,
    violations: evalResult.violations,
    numericalProofs: evalResult.numericalProofs,
    evaluationResult: evalResult,
  };
}

/**
 * Calculate linear trendline (y = mx + c) for a set of points
 */
export function calculateTrendline(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const c = (sumY - m * sumX) / n;
  return { m, c };
}

/**
 * Detect 6 consecutive increasing or decreasing data points
 */
export function detect6ConsecutiveTrends(values: number[]) {
  const trends: { start: number; end: number; type: 'up' | 'down' }[] = [];
  if (values.length < 6) return trends;

  let upCount = 1;
  let downCount = 1;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) {
      upCount++;
      downCount = 1;
    } else if (values[i] < values[i - 1]) {
      downCount++;
      upCount = 1;
    } else {
      upCount = 1;
      downCount = 1;
    }

    if (upCount === 6) {
      trends.push({ start: i - 5, end: i, type: 'up' });
      upCount = 5;
    } else if (downCount === 6) {
      trends.push({ start: i - 5, end: i, type: 'down' });
      downCount = 5;
    }
  }
  return trends;
}

export interface Shift10xDetection {
  start: number; // Start index pada plotted points
  end: number;   // End index pada plotted points
  count: number; // Jumlah titik berurutan (≥10)
  side: 'above' | 'below';
  directionText: string; // "+ Mean" atau "- Mean"
  pointIds: string[];
  startDate?: string;
  endDate?: string;
  meanDiff: number; // Rata-rata pergeseran nilai terhadap Target Mean
  meanBiasPercent: number; // Persentase bias rata-rata
  type: 'warning' | 'reject';
  title: string;
  description: string;
  instrumentName?: string;
  parameterName?: string;
  analyzerType?: string;
  analyzerTypeName?: string;
  instrumentImpact: string;
  probableCauses?: string[];
  correctiveActions?: string[];
  preventiveActions?: string[];
  recommendations: string[];
}

/**
 * Deteksi Otomatis Aturan Westgard '10x' (Sistematis) pada Levey-Jennings
 * Mengidentifikasi pergeseran tren akurasi instrumen (systematic shift / calibration drift).
 * Terpicu apabila minimal 10 hasil kontrol berturut-turut berada di sisi Mean yang sama.
 * Membaca otomatis instrumen dan parameter untuk menghasilkan dampak, kemungkinan penyebab,
 * serta rekomendasi tindakan korektif dan pencegahan yang spesifik sesuai instrumen.
 */
export function detect10xConsecutiveShifts(
  points: { id: string; date?: string; value: number; zScore?: number }[],
  targetMean: number,
  rawInstrumentName?: string,
  rawParameterName?: string,
  rawUnit?: string
): Shift10xDetection[] {
  const detections: Shift10xDetection[] = [];
  if (points.length < 10) return detections;

  let currentSide: 'above' | 'below' | null = null;
  let streakStart = 0;
  let currentStreak = 0;

  const pushDetection = (start: number, end: number, count: number, side: 'above' | 'below') => {
    const involved = points.slice(start, end + 1);
    const sumDiff = involved.reduce((acc, p) => acc + (p.value - targetMean), 0);
    const meanDiff = Number((sumDiff / count).toFixed(3));
    const meanBiasPercent = targetMean !== 0 ? Number(((meanDiff / targetMean) * 100).toFixed(2)) : 0;
    const directionText = side === 'above' ? 'Atas (+ Mean)' : 'Bawah (- Mean)';

    const guidance = getWestgardContextualGuidance(
      '10x',
      'Aturan Westgard 10x (Pergeseran Tren Akurasi)',
      'warning',
      rawInstrumentName,
      rawParameterName,
      meanDiff,
      `Pergeseran ${count} titik di sisi ${directionText}`
    );

    const instLabel = guidance.instrumentName || rawInstrumentName || 'Instrumen Laboratorium';
    const paramLabel = guidance.parameterName || rawParameterName || 'Parameter QC';

    detections.push({
      start,
      end,
      count,
      side,
      directionText,
      pointIds: involved.map(p => p.id),
      startDate: involved[0]?.date,
      endDate: involved[involved.length - 1]?.date,
      meanDiff,
      meanBiasPercent,
      type: 'warning',
      instrumentName: instLabel,
      parameterName: paramLabel,
      analyzerType: guidance.analyzerType,
      analyzerTypeName: guidance.analyzerTypeName,
      title: `Aturan Westgard 10x Terdeteksi pada ${instLabel} (${count} Titik di Sisi ${directionText})`,
      description: `Terdapat ${count} hasil QC berurutan berada di sisi ${directionText} pada instrumen ${instLabel} untuk parameter ${paramLabel}. Ini mengindikasikan pergeseran sistematik (systematic shift) dengan deviasi rata-rata ${meanDiff > 0 ? '+' : ''}${meanDiff} ${rawUnit || ''} (${meanBiasPercent > 0 ? '+' : ''}${meanBiasPercent}% bias terhadap target mean).`,
      instrumentImpact: guidance.impact,
      probableCauses: guidance.probableCauses,
      correctiveActions: guidance.correctiveActions,
      preventiveActions: guidance.preventiveActions,
      recommendations: [
        ...(guidance.correctiveActions || []),
        ...(guidance.preventiveActions || [])
      ]
    });
  };

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const diff = pt.zScore !== undefined ? pt.zScore : (pt.value - targetMean);
    const side: 'above' | 'below' | 'on_mean' = diff > 0.0001 ? 'above' : (diff < -0.0001 ? 'below' : 'on_mean');

    if (side === 'on_mean') {
      if (currentStreak >= 10 && currentSide) {
        pushDetection(streakStart, i - 1, currentStreak, currentSide);
      }
      currentSide = null;
      currentStreak = 0;
    } else if (side === currentSide) {
      currentStreak++;
    } else {
      if (currentStreak >= 10 && currentSide) {
        pushDetection(streakStart, i - 1, currentStreak, currentSide);
      }
      currentSide = side;
      streakStart = i;
      currentStreak = 1;
    }
  }

  if (currentStreak >= 10 && currentSide) {
    pushDetection(streakStart, points.length - 1, currentStreak, currentSide);
  }

  return detections;
}

/**
 * Calculate Cp and Cpk (Process Capability)
 */
export function calculateProcessCapability(
  mean: number,
  sd: number,
  minAcceptable: number,
  maxAcceptable: number
) {
  if (sd === 0) return { cp: 0, cpk: 0 };
  
  const cp = (maxAcceptable - minAcceptable) / (6 * sd);
  const cpu = (maxAcceptable - mean) / (3 * sd);
  const cpl = (mean - minAcceptable) / (3 * sd);
  const cpk = Math.min(cpu, cpl);
  
  return { 
    cp: Number(cp.toFixed(2)), 
    cpk: Number(cpk.toFixed(2)) 
  };
}

/**
 * Calculate Sigma Metric
 */
export function calculateSigmaMetric(
  mean: number,
  sd: number,
  targetMean: number,
  tea: number
): number {
  if (sd === 0) return 0;
  
  const bias = Math.abs(mean - targetMean) / targetMean * 100;
  const cv = (sd / mean) * 100;
  
  if (cv === 0) return 0;
  
  const sigma = (tea - bias) / cv;
  return Number(sigma.toFixed(2));
}

