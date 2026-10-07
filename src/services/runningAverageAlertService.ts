import { QCResult, Parameter, Instrument } from '../types';

export interface DailyAveragePoint {
  date: string;
  dailyMean: number;
  runningMean: number;
  zScore: number;
  sdDifference: number; // runningMean - targetMean
  testCount: number;
  values: number[];
  status: 'pass' | 'warning' | 'reject';
}

export interface RunningAverageAlert {
  id: string;
  parameterId: string;
  parameterName: string;
  parameterCode: string;
  instrumentId: string;
  instrumentName: string;
  controlLevel: string;
  unit: string;
  targetMean: number;
  targetSD: number;
  thresholdSD: number; // e.g. 1.0 SD
  consecutiveDaysCount: number; // e.g. 3, 4, 5 days
  direction: 'positive_shift' | 'negative_shift';
  dates: string[]; // ['2026-10-05', '2026-10-06', '2026-10-07']
  dailyPoints: DailyAveragePoint[];
  latestRunningMean: number;
  latestZScore: number;
  severity: 'critical' | 'warning';
  isActive: boolean; // true if the streak extends to the most recent test date
  detectedAt: string;
  ruleCode: string;
  title: string;
  summary: string;
  clinicalSignificance: string;
  recommendedActions: string[];
}

export interface AlertFilterOptions {
  thresholdSD?: number; // default 1.0
  consecutiveDays?: number; // default 3
  activeOnly?: boolean;
  parameterId?: string;
  instrumentId?: string;
}

const ACKNOWLEDGED_ALERTS_KEY = 'qc_acknowledged_running_avg_alerts';

export class RunningAverageAlertService {
  /**
   * Evaluates all QC results and identifies parameters where the running average
   * has exceeded the specified standard deviation threshold for 3 or more consecutive days.
   */
  static detectRunningAverageAlerts(
    qcResults: QCResult[],
    parameters: Parameter[],
    instruments: Instrument[],
    options: AlertFilterOptions = {}
  ): RunningAverageAlert[] {
    const thresholdSD = options.thresholdSD ?? 1.0;
    const requiredConsecutiveDays = options.consecutiveDays ?? 3;

    if (!qcResults || qcResults.length === 0 || !parameters || parameters.length === 0) {
      return [];
    }

    const alerts: RunningAverageAlert[] = [];

    // Group QC results by parameterId and controlLevel
    const groups = new Map<string, QCResult[]>();
    for (const r of qcResults) {
      if (!r.parameterId || r.value === undefined || r.value === null || isNaN(r.value)) {
        continue;
      }
      const key = `${r.parameterId}___${r.controlLevel || 'Level 1'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(r);
    }

    // Evaluate each group
    for (const [key, results] of groups.entries()) {
      const [paramId, controlLevel] = key.split('___');
      const param = parameters.find(p => p.id === paramId);
      if (!param || !param.targetMean || !param.targetSD || param.targetSD <= 0) {
        continue;
      }

      const instrument = instruments.find(i => i.id === param.instrumentId) || {
        id: param.instrumentId || 'unknown',
        name: results[0]?.instrumentName || 'Alat Laboratorium'
      };

      // Group tests by date (YYYY-MM-DD)
      const dateMap = new Map<string, number[]>();
      for (const r of results) {
        const d = r.date;
        if (!d) continue;
        if (!dateMap.has(d)) {
          dateMap.set(d, []);
        }
        dateMap.get(d)!.push(r.value);
      }

      // Sort dates chronologically ascending
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));
      if (sortedDates.length < requiredConsecutiveDays) {
        continue;
      }

      // Calculate daily points and running averages
      const dailyPoints: DailyAveragePoint[] = [];
      const runningWindow: number[] = [];

      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        const vals = dateMap.get(date)!;
        const dailySum = vals.reduce((acc, v) => acc + v, 0);
        const dailyMean = Number((dailySum / vals.length).toFixed(param.decimalPlaces ?? 2));

        // Use rolling 3-day window of tests for agile running average,
        // or up to current cumulative tests on that date
        // Taking the current day + past 2 days gives the 3-day running average
        const recentDates = sortedDates.slice(Math.max(0, i - 2), i + 1);
        const recentVals: number[] = [];
        recentDates.forEach(rd => {
          const vList = dateMap.get(rd);
          if (vList) recentVals.push(...vList);
        });

        const runningSum = recentVals.reduce((acc, v) => acc + v, 0);
        const runningMean = Number((runningSum / recentVals.length).toFixed(param.decimalPlaces ?? 2));
        const zScore = Number(((runningMean - param.targetMean) / param.targetSD).toFixed(2));
        const sdDifference = Number((runningMean - param.targetMean).toFixed(param.decimalPlaces ?? 2));

        let status: 'pass' | 'warning' | 'reject' = 'pass';
        if (Math.abs(zScore) >= 3.0) status = 'reject';
        else if (Math.abs(zScore) >= 2.0) status = 'warning';

        dailyPoints.push({
          date,
          dailyMean,
          runningMean,
          zScore,
          sdDifference,
          testCount: vals.length,
          values: vals,
          status,
        });
      }

      // Scan for consecutive days exceeding thresholdSD in the same direction
      let currentStreak: DailyAveragePoint[] = [];
      let currentDirection: 'positive_shift' | 'negative_shift' | null = null;

      for (let i = 0; i < dailyPoints.length; i++) {
        const pt = dailyPoints[i];
        const isHigh = pt.zScore >= thresholdSD;
        const isLow = pt.zScore <= -thresholdSD;

        if (isHigh || isLow) {
          const ptDir: 'positive_shift' | 'negative_shift' = isHigh ? 'positive_shift' : 'negative_shift';

          if (currentDirection === ptDir) {
            currentStreak.push(pt);
          } else {
            // Check previous streak
            if (currentStreak.length >= requiredConsecutiveDays && currentDirection) {
              addAlert(currentStreak, currentDirection, param, instrument);
            }
            // Start new streak
            currentStreak = [pt];
            currentDirection = ptDir;
          }
        } else {
          // Threshold not exceeded, flush streak if >= requiredConsecutiveDays
          if (currentStreak.length >= requiredConsecutiveDays && currentDirection) {
            addAlert(currentStreak, currentDirection, param, instrument);
          }
          currentStreak = [];
          currentDirection = null;
        }
      }

      // Flush final streak if active
      if (currentStreak.length >= requiredConsecutiveDays && currentDirection) {
        addAlert(currentStreak, currentDirection, param, instrument);
      }

      function addAlert(
        streak: DailyAveragePoint[], 
        direction: 'positive_shift' | 'negative_shift',
        p: Parameter,
        inst: { id: string; name: string }
      ) {
        const lastPt = streak[streak.length - 1];
        const latestDate = sortedDates[sortedDates.length - 1];
        const isActive = lastPt.date === latestDate || 
          (new Date(latestDate).getTime() - new Date(lastPt.date).getTime() <= 24 * 3600 * 1000 * 2);

        const streakDates = streak.map(s => s.date);
        const alertId = `ALERT-RUNAVG-${p.code}-${direction}-${streakDates[0]}_${streakDates[streakDates.length - 1]}`;

        // Don't add duplicate alert for same streak range
        if (alerts.some(a => a.id === alertId)) return;

        const dirText = direction === 'positive_shift' ? 'Positif (High Bias)' : 'Negatif (Low Bias)';
        const dirSign = direction === 'positive_shift' ? '+' : '';

        alerts.push({
          id: alertId,
          parameterId: p.id,
          parameterName: p.name,
          parameterCode: p.code,
          instrumentId: inst.id,
          instrumentName: inst.name,
          controlLevel,
          unit: p.unit,
          targetMean: p.targetMean,
          targetSD: p.targetSD,
          thresholdSD,
          consecutiveDaysCount: streak.length,
          direction,
          dates: streakDates,
          dailyPoints: [...streak],
          latestRunningMean: lastPt.runningMean,
          latestZScore: lastPt.zScore,
          severity: isActive ? 'critical' : 'warning',
          isActive,
          detectedAt: lastPt.date,
          ruleCode: '3-Day-Running-Mean-Shift',
          title: `Pergeseran Sistematis 3 Hari: ${p.name}`,
          summary: `Running average (${lastPt.runningMean} ${p.unit}, ${dirSign}${lastPt.zScore} SD) melampaui batas ambang ${thresholdSD} SD arah ${dirText} selama ${streak.length} hari berturut-turut (${streakDates[0]} s/d ${streakDates[streakDates.length - 1]}).`,
          clinicalSignificance: `Terdeteksi deviasi sistematis konstan (Systematic Error / Analytical Shift) yang berpotensi menghasilkan bias analitik pada spesimen pasien jika tidak segera ditangani.`,
          recommendedActions: [
            `Lakukan evaluasi Levey-Jennings Chart untuk mengidentifikasi tanggal awal pergeseran kurva kontrol.`,
            `Periksa tanggal kedaluwarsa, stabilitas penyimpanan, dan nomor lot reagen/buffer.`,
            `Lakukan rekalibrasi analit (${p.code}) pada instrumen ${inst.name}.`,
            `Rekonstitusi vial bahan kontrol mutu baru (${controlLevel}) untuk menyingkirkan penguapan/kontaminasi kontrol.`,
            `Terbitkan Formulir Investigasi Ketidaksesuaian (CAPA) jika deviasi berlanjut setelah rekalibrasi.`
          ]
        });
      }
    }

    // Sort alerts: active first, then highest consecutive days, then latest date
    return alerts.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (b.consecutiveDaysCount !== a.consecutiveDaysCount) {
        return b.consecutiveDaysCount - a.consecutiveDaysCount;
      }
      return b.dates[b.dates.length - 1].localeCompare(a.dates[a.dates.length - 1]);
    });
  }

  /**
   * Persist acknowledged alerts to local storage
   */
  static getAcknowledgedAlertIds(): string[] {
    try {
      const raw = localStorage.getItem(ACKNOWLEDGED_ALERTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static acknowledgeAlert(alertId: string): void {
    try {
      const current = this.getAcknowledgedAlertIds();
      if (!current.includes(alertId)) {
        current.push(alertId);
        localStorage.setItem(ACKNOWLEDGED_ALERTS_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.warn('Failed to save acknowledged alert:', e);
    }
  }

  static unacknowledgeAlert(alertId: string): void {
    try {
      const current = this.getAcknowledgedAlertIds().filter(id => id !== alertId);
      localStorage.setItem(ACKNOWLEDGED_ALERTS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to remove acknowledged alert:', e);
    }
  }
}
