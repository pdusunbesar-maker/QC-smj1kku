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

export interface EarlyTrendFinding {
  parameter: Parameter;
  instrument: Instrument | undefined;
  controlLevel: 'Level 1' | 'Level 2' | 'Level 3';
  latestResults: QCResult[];
  activeShiftStreak: number;
  shiftDirection: 'above' | 'below' | 'none';
  activeTrendStreak: number;
  trendDirection: 'increasing' | 'decreasing' | 'none';
  slope: number;
  correlation: number;
  rSquared: number;
  status: 'critical' | 'warning' | 'stable';
  statusLabel: string;
  reason: string;
  recommendation: string;
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

  /**
   * Evaluates all QC results and detects subtle trends/shifts (Early Warning Signs)
   * before Westgard rejection rules are triggered.
   */
  static detectEarlyTrendWarnings(
    qcResults: QCResult[],
    parameters: Parameter[],
    instruments: Instrument[]
  ): EarlyTrendFinding[] {
    const findings: EarlyTrendFinding[] = [];

    if (!qcResults || qcResults.length === 0 || !parameters || parameters.length === 0) {
      return [];
    }

    parameters.forEach(param => {
      const inst = instruments.find(i => i.id === param.instrumentId);
      const levels: Array<'Level 1' | 'Level 2' | 'Level 3'> = ['Level 1', 'Level 2', 'Level 3'];

      levels.forEach(level => {
        // Find matching results
        const groupResults = qcResults.filter(
          r => r.parameterId === param.id && r.controlLevel === level
        );

        if (groupResults.length < 3) return; // Need at least 3 points to start visual, 5 for regression

        // Sort chronologically ascending (oldest to newest)
        const sorted = [...groupResults].sort((a, b) => {
          const timeA = a.timestamp || new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const timeB = b.timestamp || new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return timeA - timeB;
        });

        // Take last 10 points for active trend scanning
        const latestResults = sorted.slice(-10);
        const n = latestResults.length;

        // 1. Shift detection ending at the latest point (consecutive points on the same side of the mean)
        let activeShiftStreak = 0;
        let shiftDirection: 'above' | 'below' | 'none' = 'none';

        if (n > 0) {
          const lastPoint = latestResults[n - 1];
          const lastDiff = lastPoint.value - param.targetMean;
          
          if (lastDiff > 0) {
            shiftDirection = 'above';
            for (let i = n - 1; i >= 0; i--) {
              const diff = latestResults[i].value - param.targetMean;
              if (diff > 0) {
                activeShiftStreak++;
              } else {
                break;
              }
            }
          } else if (lastDiff < 0) {
            shiftDirection = 'below';
            for (let i = n - 1; i >= 0; i--) {
              const diff = latestResults[i].value - param.targetMean;
              if (diff < 0) {
                activeShiftStreak++;
              } else {
                break;
              }
            }
          }
        }

        // 2. Trend detection (monotonically increasing/decreasing ending at the latest point)
        let activeTrendStreak = 1;
        let trendDirection: 'increasing' | 'decreasing' | 'none' = 'none';

        if (n >= 2) {
          const lastDiff = latestResults[n - 1].value - latestResults[n - 2].value;
          if (lastDiff > 0) {
            trendDirection = 'increasing';
            for (let i = n - 1; i > 0; i--) {
              if (latestResults[i].value - latestResults[i - 1].value > 0) {
                activeTrendStreak++;
              } else {
                break;
              }
            }
          } else if (lastDiff < 0) {
            trendDirection = 'decreasing';
            for (let i = n - 1; i > 0; i--) {
              if (latestResults[i].value - latestResults[i - 1].value < 0) {
                activeTrendStreak++;
              } else {
                break;
              }
            }
          }
        }
        
        if (activeTrendStreak < 2) {
          activeTrendStreak = 0;
          trendDirection = 'none';
        }

        // 3. Simple Linear Regression over the last n points (minimum 5 points for mathematical significance)
        let slope = 0;
        let correlation = 0;
        let rSquared = 0;

        if (n >= 5) {
          const xValues = Array.from({ length: n }, (_, i) => i + 1);
          const yValues = latestResults.map(r => 
            param.targetSD > 0 ? (r.value - param.targetMean) / param.targetSD : 0
          );

          const sumX = xValues.reduce((a, b) => a + b, 0);
          const sumY = yValues.reduce((a, b) => a + b, 0);
          const meanX = sumX / n;
          const meanY = sumY / n;

          let num = 0;
          let denX = 0;
          let denY = 0;

          for (let i = 0; i < n; i++) {
            const diffX = xValues[i] - meanX;
            const diffY = yValues[i] - meanY;
            num += diffX * diffY;
            denX += diffX * diffX;
            denY += diffY * diffY;
          }

          if (denX > 0) {
            slope = num / denX;
          }
          if (denX > 0 && denY > 0) {
            correlation = num / Math.sqrt(denX * denY);
            rSquared = correlation * correlation;
          }
        }

        // 4. Status determination & warnings
        let status: 'critical' | 'warning' | 'stable' = 'stable';
        let statusLabel = 'Normal & Stabil';
        let reason = 'Semua titik bergerak secara acak di sekitar nilai target (Mean). Tidak ada tren linear atau pergeseran terdeteksi.';
        let recommendation = 'Kestabilan analitik berjalan dengan baik. Lakukan pemantauan kontrol harian seperti biasa.';

        if (activeShiftStreak >= 10) {
          status = 'critical';
          statusLabel = 'Pergeseran Rata-rata Aktif (Aturan 10x)';
          reason = `Terdeteksi pergeseran rata-rata yang sangat kuat dengan ${activeShiftStreak} hasil QC berurutan berada di ${shiftDirection === 'above' ? 'atas (+)' : 'bawah (-)'} garis Mean. Ini melanggar aturan Westgard 10x secara aktif.`;
          recommendation = 'Lakukan kalibrasi ulang instrumen untuk parameter ini segera. Periksa apakah ada penguapan reagen, perubahan suhu bilik reaksi, atau kontaminasi reagen harian.';
        } else if (activeShiftStreak >= 6) {
          status = 'warning';
          statusLabel = `Indikasi Shift Berkelanjutan (${activeShiftStreak} Titik)`;
          reason = `Terdeteksi kecenderungan pergeseran dengan ${activeShiftStreak} hasil QC berurutan berada di ${shiftDirection === 'above' ? 'atas (+)' : 'bawah (-)'} garis Mean harian. Ini merupakan peringatan dini (early warning) sebelum terjadinya pelanggaran Westgard.`;
          recommendation = 'Periksa lot reagen yang sedang berjalan, pastikan tidak ada kontaminasi pada probe, atau gelembung udara pada syring sistem pemipetan.';
        } else if (activeTrendStreak >= 6) {
          status = 'warning';
          statusLabel = `Kecenderungan Tren (${trendDirection === 'increasing' ? 'Naik' : 'Turun'})`;
          reason = `Terdeteksi tren linear bertahap dengan ${activeTrendStreak} hasil QC berurutan ${trendDirection === 'increasing' ? 'meningkat secara monoton' : 'menurun secara monoton'}. Ini mengindikasikan drift analitis bertahap.`;
          recommendation = 'Kecenderungan tren bertahap biasanya disebabkan oleh degradasi kualitas reagen onboard, penurunan emisi lampu fotometer, penyusutan volume reagen harian, atau degradasi material kontrol.';
        } else if (n >= 5 && Math.abs(correlation) >= 0.70 && Math.abs(slope) >= 0.12) {
          status = 'warning';
          statusLabel = `Tren Regresi Linear (${slope > 0 ? 'Meningkat' : 'Menurun'})`;
          reason = `Deteksi regresi mendeteksi tren linear bertahap yang kuat (R² = ${rSquared.toFixed(2)}, Slope = ${slope > 0 ? '+' : ''}${slope.toFixed(2)} SD/run). Data menunjukkan deviasi progresif yang signifikan.`;
          recommendation = 'Pantau stabilitas reagen onboard. Periksa tanggal expired reagen atau bersihkan cuvette optikal pembacaan alat.';
        }

        findings.push({
          parameter: param,
          instrument: inst,
          controlLevel: level,
          latestResults,
          activeShiftStreak,
          shiftDirection,
          activeTrendStreak,
          trendDirection,
          slope,
          correlation,
          rSquared,
          status,
          statusLabel,
          reason,
          recommendation,
        });
      });
    });

    // Sort findings so critical is first, then warnings, then stable
    return findings.sort((a, b) => {
      const priority = { critical: 3, warning: 2, stable: 1 };
      return priority[b.status] - priority[a.status];
    });
  }
}
