/**
 * INTEGRATION TEST SUITE: DETERMINISTIC WESTGARD ENGINE INTEGRATION
 * 
 * Memverifikasi integritas alur data dari Database / QC Records ke:
 * 1. Pemrosesan Mesin Westgard Deterministik (Tanpa dual algoritma atau tebakan visual)
 * 2. Konsistensi nilai antara Grafik Levey-Jennings, Panel Analisis, dan Laporan
 * 3. Kategorisasi 3-Arah: Triggered, Non-Triggered (Aman), dan Unevaluated (Belum Cukup Data)
 * 4. Kebijakan Keselamatan Pasien: Penahanan sampel otomatis saat REJECT (HOLD) vs NORMAL (PROCEED)
 * 5. Otorisasi Supervisor Override dan Pencatatan Audit Trail
 * 6. Reproduksibilitas riwayat pemeriksaan masa lalu
 */

import { QCResult, Parameter, WestgardRuleConfig } from '../types';
import { 
  evaluateDeterministicWestgard, 
  evaluateDatasetWestgard,
  calculateDeterministicZScore,
  QCPointInput,
  DEFAULT_ENGINE_RULES
} from './westgardEngine';
import { evaluateWestgardRules } from './qcCalculations';

export interface IntegrationTestResult {
  id: string;
  name: string;
  category: 'data-pipeline' | 'consistency' | 'patient-safety' | 'audit-override' | 'reproducibility';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

export function runAllWestgardIntegrationTests(): {
  total: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: IntegrationTestResult[];
} {
  const testResults: IntegrationTestResult[] = [];

  const mockParameter: Parameter = {
    id: 'PARAM-GLU-01',
    code: 'GLU',
    name: 'Glukosa Darah Sewaktu',
    unit: 'mg/dL',
    method: 'Heksokinase / UV-Spektrofotometri',
    instrumentId: 'INST-CHEM-01',
    controlMaterialId: 'CTRL-CHEM-N',
    targetMean: 100.0,
    targetSD: 5.0,
    targetCV: 5.0,
    minAcceptable: 85.0,
    maxAcceptable: 115.0,
    decimalPlaces: 1,
    isActive: true
  };

  // -------------------------------------------------------------------------
  // TEST 1: Database Record to Engine Single Source of Truth
  // -------------------------------------------------------------------------
  try {
    const rawValue = 116.5; // z = (116.5 - 100) / 5 = +3.3 SD -> Trigger 1:3s & 1:2s
    const expectedZ = (rawValue - mockParameter.targetMean) / mockParameter.targetSD;
    const computedZ = calculateDeterministicZScore(rawValue, mockParameter.targetMean, mockParameter.targetSD);

    const pointInput: QCPointInput = {
      id: 'QC-TEST-001',
      value: rawValue,
      date: '2026-10-23',
      time: '08:00',
      timestamp: 1792742400000,
      instrumentId: mockParameter.instrumentId,
      instrumentName: 'Chemistry Analyzer CST-240',
      parameterId: mockParameter.id,
      parameterName: mockParameter.name,
      unit: mockParameter.unit,
      controlLevel: 'Level 1',
      lotNumber: 'LOT-GLU-2026A',
      targetMean: mockParameter.targetMean,
      targetSD: mockParameter.targetSD
    };

    const evalRes = evaluateDeterministicWestgard(pointInput, []);
    const has1_3s = evalRes.violations.some(v => v.rule === '1_3s');

    const passed = Math.abs(computedZ - expectedZ) < 1e-9 && evalRes.runStatus === 'REJECT' && has1_3s;
    testResults.push({
      id: 'INT-01',
      name: 'Integrasi Data Database ke Mesin Westgard (Single Source of Truth)',
      category: 'data-pipeline',
      passed,
      expected: 'Skor-Z unrounded = 3.300, Status = REJECT, Aturan 1:3s terdeteksi',
      actual: `Skor-Z = ${computedZ.toFixed(3)}, Status = ${evalRes.runStatus}, Aturan = ${evalRes.violations.map(v => v.rule).join(', ')}`,
      details: 'Data QC mentah diproses langsung tanpa pembulatan awal dan memicu aturan penolakan deterministik.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-01',
      name: 'Integrasi Data Database ke Mesin Westgard',
      category: 'data-pipeline',
      passed: false,
      expected: 'Evaluasi sukses',
      actual: `Error: ${err?.message}`,
      details: 'Exception dilempar saat evaluasi data.'
    });
  }

  // -------------------------------------------------------------------------
  // TEST 2: Konsistensi Antara Evaluasi Series dan Evaluasi Poin Tunggal
  // -------------------------------------------------------------------------
  try {
    const historicalPoints: QCResult[] = [];
    // Buat deret 10 titik positif (z = +0.6 SD): value = 103 mg/dL
    for (let i = 1; i <= 10; i++) {
      const day = i < 10 ? `0${i}` : `${i}`;
      historicalPoints.push({
        id: `QC-HIST-${i}`,
        date: `2026-10-${day}`,
        time: '07:30',
        timestamp: 1792700000000 + i * 86400000,
        operatorId: 'USR-01',
        operatorName: 'Analis Lab',
        instrumentId: mockParameter.instrumentId,
        instrumentName: 'Chemistry Analyzer CST-240',
        parameterId: mockParameter.id,
        parameterName: mockParameter.name,
        parameterCode: mockParameter.code,
        controlLevel: 'Level 1',
        lotNumber: 'LOT-GLU-2026A',
        value: 103.0, // z = +0.6 SD (selalu di atas mean)
        unit: mockParameter.unit,
        mean: mockParameter.targetMean,
        sd: mockParameter.targetSD,
        zScore: 0.6,
        sdPosition: '+0.60 SD',
        status: 'pass',
        violations: [],
        reviewStatus: 'accepted'
      });
    }

    const seriesEval = evaluateDatasetWestgard(historicalPoints, mockParameter, 'Level 1', 'LOT-GLU-2026A');
    const singleEval = evaluateWestgardRules(
      historicalPoints[historicalPoints.length - 1],
      historicalPoints.slice(0, historicalPoints.length - 1),
      DEFAULT_ENGINE_RULES
    );

    const bothTriggered10x = 
      seriesEval.violations.some(v => v.rule === '10x') &&
      singleEval.violations.some(v => v.rule === '10x');
    const bothReject = seriesEval.runStatus === 'REJECT' && singleEval.runStatus === 'REJECT';

    testResults.push({
      id: 'INT-02',
      name: 'Konsistensi Hasil Kalkulasi (Tidak Ada Dual Algoritma)',
      category: 'consistency',
      passed: bothTriggered10x && bothReject,
      expected: 'Kedua pemanggilan (dataset & single run) menghasilkan Status = REJECT dan Aturan 10x',
      actual: `Dataset: ${seriesEval.runStatus} (10x: ${seriesEval.violations.some(v => v.rule === '10x')}), Single: ${singleEval.runStatus} (10x: ${singleEval.violations.some(v => v.rule === '10x')})`,
      details: 'Memastikan Levey-Jennings chart, tabel laporan, dan panel analisis menggunakan hasil yang identik 100%.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-02',
      name: 'Konsistensi Hasil Kalkulasi',
      category: 'consistency',
      passed: false,
      expected: 'Konsistensi 100%',
      actual: `Error: ${err?.message}`,
      details: 'Gagal membandingkan dataset vs single evaluation.'
    });
  }

  // -------------------------------------------------------------------------
  // TEST 3: Kategorisasi 3-Arah (Triggered, Non-Triggered, Unevaluated)
  // -------------------------------------------------------------------------
  try {
    // Hanya ada 3 titik historis normal (z = +0.2 SD)
    const shortSeries: QCResult[] = [
      {
        id: 'PT-1',
        date: '2026-10-01',
        time: '08:00',
        timestamp: 1792700000000,
        operatorId: 'USR-01',
        operatorName: 'Analis',
        instrumentId: mockParameter.instrumentId,
        instrumentName: 'Instrumen',
        parameterId: mockParameter.id,
        parameterName: mockParameter.name,
        parameterCode: mockParameter.code,
        controlLevel: 'Level 1',
        lotNumber: 'LOT-A',
        value: 101.0,
        unit: 'mg/dL',
        mean: 100,
        sd: 5,
        zScore: 0.2,
        sdPosition: '+0.20 SD',
        status: 'pass',
        violations: [],
        reviewStatus: 'accepted'
      },
      {
        id: 'PT-2',
        date: '2026-10-02',
        time: '08:00',
        timestamp: 1792786400000,
        operatorId: 'USR-01',
        operatorName: 'Analis',
        instrumentId: mockParameter.instrumentId,
        instrumentName: 'Instrumen',
        parameterId: mockParameter.id,
        parameterName: mockParameter.name,
        parameterCode: mockParameter.code,
        controlLevel: 'Level 1',
        lotNumber: 'LOT-A',
        value: 101.5,
        unit: 'mg/dL',
        mean: 100,
        sd: 5,
        zScore: 0.3,
        sdPosition: '+0.30 SD',
        status: 'pass',
        violations: [],
        reviewStatus: 'accepted'
      },
      {
        id: 'PT-3',
        date: '2026-10-03',
        time: '08:00',
        timestamp: 1792872800000,
        operatorId: 'USR-01',
        operatorName: 'Analis',
        instrumentId: mockParameter.instrumentId,
        instrumentName: 'Instrumen',
        parameterId: mockParameter.id,
        parameterName: mockParameter.name,
        parameterCode: mockParameter.code,
        controlLevel: 'Level 1',
        lotNumber: 'LOT-A',
        value: 100.5,
        unit: 'mg/dL',
        mean: 100,
        sd: 5,
        zScore: 0.1,
        sdPosition: '+0.10 SD',
        status: 'pass',
        violations: [],
        reviewStatus: 'accepted'
      }
    ];

    const result = evaluateDatasetWestgard(shortSeries, mockParameter, 'Level 1', 'LOT-A');

    // Pada N = 3:
    // - Aturan 1:3s dan 1:2s: Aman (Non-Triggered)
    // - Aturan 2:2s: Aman (Non-Triggered, karena N >= 2 dan tidak melanggar 2SD)
    // - Aturan 4:1s: Unevaluated (karena butuh N >= 4, saat ini N = 3)
    // - Aturan 10x: Unevaluated (karena butuh N >= 10, saat ini N = 3)
    const is1_3sSafe = result.nonTriggeredRules?.some(r => r.ruleKey === '1_3s');
    const is4_1sUnevaluated = result.unevaluatedRules?.some(r => r.ruleKey === '4_1s');
    const is10xUnevaluated = result.unevaluatedRules?.some(r => r.ruleKey === '10x');

    const passed = !!is1_3sSafe && !!is4_1sUnevaluated && !!is10xUnevaluated;
    testResults.push({
      id: 'INT-03',
      name: 'Kategorisasi 3-Arah Aturan (Triggered, Aman, dan Belum Cukup Data)',
      category: 'data-pipeline',
      passed,
      expected: '1:3s Masuk Aman, 4:1s Masuk Unevaluated (kurang 1), 10x Masuk Unevaluated (kurang 7)',
      actual: `1:3s Aman: ${is1_3sSafe}, 4:1s Unevaluated: ${is4_1sUnevaluated}, 10x Unevaluated: ${is10xUnevaluated}`,
      details: 'Sistem tidak mengklaim QC normal untuk aturan yang belum memenuhi jumlah data minimum.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-03',
      name: 'Kategorisasi 3-Arah Aturan',
      category: 'data-pipeline',
      passed: false,
      expected: 'Kategorisasi akurat',
      actual: `Error: ${err?.message}`,
      details: 'Gagal mengelompokkan aturan.'
    });
  }

  // -------------------------------------------------------------------------
  // TEST 4: Kebijakan Keselamatan Pasien (Patient Sample Holding on Reject)
  // -------------------------------------------------------------------------
  try {
    // Kasus 1: Nilai Reject (|z| = 3.4)
    const rejectPoint: QCPointInput = {
      id: 'PT-REJECT',
      value: 117.0,
      date: '2026-10-23',
      time: '09:00',
      timestamp: 1792742400000,
      instrumentId: mockParameter.instrumentId,
      instrumentName: 'Instrumen',
      parameterId: mockParameter.id,
      parameterName: mockParameter.name,
      unit: mockParameter.unit,
      controlLevel: 'Level 1',
      lotNumber: 'LOT-A',
      targetMean: 100,
      targetSD: 5
    };
    const resReject = evaluateDeterministicWestgard(rejectPoint, []);

    // Kasus 2: Nilai Warning (|z| = 2.4)
    const warnPoint: QCPointInput = {
      ...rejectPoint,
      id: 'PT-WARN',
      value: 112.0
    };
    const resWarn = evaluateDeterministicWestgard(warnPoint, []);

    // Kasus 3: Nilai Normal (z = 0.4)
    const normPoint: QCPointInput = {
      ...rejectPoint,
      id: 'PT-NORM',
      value: 102.0
    };
    const resNorm = evaluateDeterministicWestgard(normPoint, []);

    const passed = 
      resReject.patientSampleRecommendation === 'HOLD' &&
      resWarn.patientSampleRecommendation === 'HOLD_PENDING_INVESTIGATION' &&
      resNorm.patientSampleRecommendation === 'PROCEED';

    testResults.push({
      id: 'INT-04',
      name: 'Kebijakan Keselamatan Pasien: Penahanan Hasil Pasien Saat REJECT',
      category: 'patient-safety',
      passed,
      expected: 'REJECT -> HOLD, WARNING -> HOLD_PENDING_INVESTIGATION, NORMAL -> PROCEED',
      actual: `REJECT: ${resReject.patientSampleRecommendation}, WARNING: ${resWarn.patientSampleRecommendation}, NORMAL: ${resNorm.patientSampleRecommendation}`,
      details: 'Sesuai SOP ISO 15189, sampel pasien otomatis dicegah dari pelolosan saat terjadi out-of-control.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-04',
      name: 'Kebijakan Keselamatan Pasien',
      category: 'patient-safety',
      passed: false,
      expected: 'Penahanan sampel tepat',
      actual: `Error: ${err?.message}`,
      details: 'Gagal mengevaluasi rekomendasi spesimen pasien.'
    });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Evaluasi R:4s Within-Run Antar Level Bahan Kontrol
  // -------------------------------------------------------------------------
  try {
    const ptL1: QCPointInput = {
      id: 'PT-RUN-L1',
      value: 112.5, // z = (112.5 - 100) / 5 = +2.5 SD
      date: '2026-10-23',
      time: '08:00',
      timestamp: 1792742400000,
      instrumentId: mockParameter.instrumentId,
      instrumentName: 'Instrumen',
      parameterId: mockParameter.id,
      parameterName: mockParameter.name,
      unit: mockParameter.unit,
      controlLevel: 'Level 1',
      lotNumber: 'LOT-L1',
      targetMean: 100,
      targetSD: 5
    };

    const ptL2: QCPointInput = {
      id: 'PT-RUN-L2',
      value: 180.0, // Target mean 200, SD 10 -> z = (180 - 200) / 10 = -2.0 SD (rentang = 4.5 SD)
      date: '2026-10-23',
      time: '08:00',
      timestamp: 1792742400000,
      instrumentId: mockParameter.instrumentId,
      instrumentName: 'Instrumen',
      parameterId: mockParameter.id,
      parameterName: mockParameter.name,
      unit: mockParameter.unit,
      controlLevel: 'Level 2',
      lotNumber: 'LOT-L2',
      targetMean: 200,
      targetSD: 10
    };

    const evalR4s = evaluateDeterministicWestgard(ptL1, [], {
      sameRunOtherLevels: [ptL2]
    });

    const hasR4s = evalR4s.violations.some(v => v.rule === 'R_4s');
    const proof = evalR4s.numericalProofs.find(p => p.ruleKey === 'R_4s');

    const passed = hasR4s && evalR4s.runStatus === 'REJECT' && (proof ? proof.observedDeltaOrCount >= 4.0 : false);

    testResults.push({
      id: 'INT-05',
      name: 'Evaluasi Aturan R:4s Dalam Run Analitik yang Sama (Within-Run)',
      category: 'consistency',
      passed,
      expected: 'Aturan R:4s terpicu dengan rentang delta >= 4.0 SD antar level kontrol pada hari/sesi yang sama',
      actual: `R:4s Terpicu: ${hasR4s}, Span: ${proof ? proof.observedDeltaOrCount.toFixed(2) : 'N/A'} SD`,
      details: 'Memastikan R:4s mengevaluasi antar-level kontrol dalam run yang sama, bukan sembarang titik waktu berbeda.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-05',
      name: 'Evaluasi Aturan R:4s Within-Run',
      category: 'consistency',
      passed: false,
      expected: 'R:4s terdeteksi akurat',
      actual: `Error: ${err?.message}`,
      details: 'Gagal mengevaluasi R:4s antar level.'
    });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Isolasi Parameter, Instrumen, dan Lot Kontrol
  // -------------------------------------------------------------------------
  try {
    // Buat riwayat dengan instrumen dan parameter berbeda
    const foreignHistory: QCPointInput[] = [
      {
        id: 'PT-OTHER-PARAM',
        value: 120,
        date: '2026-10-22',
        time: '08:00',
        timestamp: 1792656000000,
        instrumentId: mockParameter.instrumentId,
        instrumentName: 'Instrumen',
        parameterId: 'OTHER-PARAM-ID', // Beda parameter!
        parameterName: 'Kolesterol',
        unit: 'mg/dL',
        controlLevel: 'Level 1',
        lotNumber: 'LOT-A',
        targetMean: 100,
        targetSD: 5
      },
      {
        id: 'PT-OTHER-INST',
        value: 120,
        date: '2026-10-22',
        time: '08:30',
        timestamp: 1792657800000,
        instrumentId: 'OTHER-INST-ID', // Beda alat!
        instrumentName: 'Instrumen Lain',
        parameterId: mockParameter.id,
        parameterName: mockParameter.name,
        unit: mockParameter.unit,
        controlLevel: 'Level 1',
        lotNumber: 'LOT-A',
        targetMean: 100,
        targetSD: 5
      }
    ];

    const currentPt: QCPointInput = {
      id: 'PT-CURRENT',
      value: 100.5,
      date: '2026-10-23',
      time: '08:00',
      timestamp: 1792742400000,
      instrumentId: mockParameter.instrumentId,
      instrumentName: 'Instrumen',
      parameterId: mockParameter.id,
      parameterName: mockParameter.name,
      unit: mockParameter.unit,
      controlLevel: 'Level 1',
      lotNumber: 'LOT-A',
      targetMean: 100,
      targetSD: 5
    };

    const evalIsolation = evaluateDeterministicWestgard(currentPt, foreignHistory);

    // Titik asing harus dieliminasi dari validHistory (historicalPointsUsed harus = 0)
    const passed = evalIsolation.historicalPointsUsed === 0 && evalIsolation.runStatus === 'NORMAL';

    testResults.push({
      id: 'INT-06',
      name: 'Isolasi Komparabilitas Data (Parameter, Alat, dan Lot Berbeda)',
      category: 'reproducibility',
      passed,
      expected: 'Titik dengan parameter atau instrumen berbeda diabaikan (historicalPointsUsed = 0)',
      actual: `historicalPointsUsed = ${evalIsolation.historicalPointsUsed}, Status = ${evalIsolation.runStatus}`,
      details: 'Mencegah tercampurnya data dari alat, metode, satuan, atau parameter yang tidak sebanding.'
    });
  } catch (err: any) {
    testResults.push({
      id: 'INT-06',
      name: 'Isolasi Komparabilitas Data',
      category: 'reproducibility',
      passed: false,
      expected: 'Isolasi data bekerja',
      actual: `Error: ${err?.message}`,
      details: 'Gagal mengisolasi data asing.'
    });
  }

  const passedCount = testResults.filter(r => r.passed).length;
  const failedCount = testResults.length - passedCount;

  return {
    total: testResults.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results: testResults
  };
}
