import * as XLSX from 'xlsx';
import { 
  QCResult, 
  LaboratoryInfo, 
  Parameter, 
  Instrument, 
  CAPA, 
  NonConformity 
} from '../types';
import { calculateQCStatistics } from './qcCalculations';

export interface ExportExcelOptions {
  labInfo: LaboratoryInfo;
  qcResults: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
  capas: CAPA[];
  nonConformities: NonConformity[];
  startDate: string;
  endDate: string;
  selectedParamName?: string;
  selectedInstrumentName?: string;
}

/**
 * Generates an enterprise, audit-ready Excel workbook (.xlsx)
 * Contains structured sheets:
 * 1. Ringkasan & Statistik QC (Executive Summary & Statistical Analysis)
 * 2. Data QC Harian (QC Raw Data)
 * 3. Log Westgard (Westgard Violations Log)
 * 4. Tindakan CAPA (Corrective & Preventive Actions)
 * 5. Penyimpangan Mutu NC (Non-Conformity Log)
 */
export function exportAuditReadyExcel(options: ExportExcelOptions) {
  const {
    labInfo,
    qcResults,
    parameters,
    instruments,
    capas,
    nonConformities,
    startDate,
    endDate,
    selectedParamName,
    selectedInstrumentName
  } = options;

  const workbook = XLSX.utils.book_new();
  const timestampStr = new Date().toLocaleString('id-ID');
  const periodStr = `${startDate} s/d ${endDate}`;

  // ==========================================
  // SHEET 1: RINGKASAN & STATISTIK QC
  // ==========================================
  const summaryData: any[][] = [
    ['LAPORAN KONTROL MUTU LABORATORIUM (PEMANTAPAN MUTU INTERNAL - PMI)'],
    [labInfo.name ? labInfo.name.toUpperCase() : 'RSUD SULTAN MUHAMMAD JAMALUDIN I'],
    [`Alamat: ${labInfo.address || '-'} | Telp: ${labInfo.phone || '-'} | Email: ${labInfo.email || '-'}`],
    [`Akreditasi: ${labInfo.accreditation || 'PARIPURNA KARS / ISO 15189'} | Ruangan: ${labInfo.roomUnit || 'Laboratorium Patologi Klinik'}`],
    [],
    ['INFORMASI DOKUMEN & AUDIT TRAIL'],
    ['Periode Pemeriksaan', periodStr, '', 'Tanggal Cetak / Ekspor', timestampStr],
    ['Filter Instrumen', selectedInstrumentName || 'Semua Alat', '', 'Filter Parameter', selectedParamName || 'Semua Parameter'],
    ['Kepala Laboratorium', `${labInfo.headOfLab || 'dr. Hendra Wijaya, Sp.PK'} (NIP: ${labInfo.headNip || '-'})`],
    ['Penanggung Jawab Mutu', `${labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes'} (NIP: ${labInfo.qualityNip || '-'})`],
    [],
    ['RINGKASAN STATISTIK EVALUASI KONTROL MUTU PER PARAMETER'],
    [
      'No',
      'Instrumen Alat',
      'Kode Param',
      'Nama Parameter',
      'Level Kontrol',
      'Lot Number',
      'Jumlah Data (N)',
      'Nilai Min',
      'Nilai Max',
      'Target Mean (X̄)',
      'Mean Aktual (X̄)',
      'Target SD',
      'SD Aktual',
      'Target CV (%)',
      'CV Aktual (%)',
      'Inakurasi / Bias (%)',
      'Total Error Obs (TEo %)',
      'Total Error Allow (TEa %)',
      'Six Sigma Metric (σ)',
      'Kategori Sigma',
      'Pass (%)',
      'Warning (%)',
      'Reject (%)',
      'Status Kinerja'
    ]
  ];

  // Group results by parameterId & controlLevel to compute accurate statistical summaries
  const groupedParams: Record<string, QCResult[]> = {};
  qcResults.forEach(r => {
    const key = `${r.parameterId}_${r.controlLevel}_${r.lotNumber}`;
    if (!groupedParams[key]) groupedParams[key] = [];
    groupedParams[key].push(r);
  });

  let statRowIndex = 1;
  const groupKeys = Object.keys(groupedParams);

  if (groupKeys.length === 0) {
    summaryData.push(['-', '-', '-', 'Tidak ada data QC dalam periode ini', '-', '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '-', '0%', '0%', '0%', 'NO DATA']);
  } else {
    groupKeys.forEach(key => {
      const paramResults = groupedParams[key];
      const sample = paramResults[0];
      const param = parameters.find(p => p.id === sample.parameterId);
      const inst = instruments.find(i => i.id === sample.instrumentId);

      const targetMean = param?.targetMean || sample.mean || 100;
      const targetSD = param?.targetSD || sample.sd || 3.5;
      const targetCV = param?.targetCV || (targetMean > 0 ? (targetSD / targetMean) * 100 : 3.5);

      const stats = calculateQCStatistics(paramResults, targetMean, targetSD, targetCV);

      const bias = targetMean > 0 ? Number((((stats.mean - targetMean) / targetMean) * 100).toFixed(2)) : 0;
      const tea = 10.0;
      const teo = Number((Math.abs(bias) + 1.65 * stats.cv).toFixed(2));
      const sigmaMetric = stats.cv > 0 ? Number(((tea - Math.abs(bias)) / stats.cv).toFixed(2)) : 0;
      const sigmaCategory = sigmaMetric >= 6 ? 'World Class (≥6σ)' : sigmaMetric >= 5 ? 'Excellent (5-6σ)' : sigmaMetric >= 4 ? 'Good (4-5σ)' : sigmaMetric >= 3 ? 'Marginal (3-4σ)' : 'Poor (<3σ)';
      const inControlRate = stats.count > 0 ? Number(((stats.passCount / stats.count) * 100).toFixed(1)) : 0;
      const warningRate = stats.count > 0 ? Number(((stats.warningCount / stats.count) * 100).toFixed(1)) : 0;
      const outOfControlRate = stats.count > 0 ? Number(((stats.rejectCount / stats.count) * 100).toFixed(1)) : 0;

      summaryData.push([
        statRowIndex++,
        inst?.name || sample.instrumentName,
        sample.parameterCode,
        param?.name || sample.parameterName,
        sample.controlLevel,
        sample.lotNumber,
        stats.count,
        stats.min,
        stats.max,
        targetMean,
        stats.mean,
        targetSD,
        stats.sd,
        Number(targetCV.toFixed(2)),
        stats.cv,
        bias,
        teo,
        tea,
        sigmaMetric,
        sigmaCategory,
        `${inControlRate}%`,
        `${warningRate}%`,
        `${outOfControlRate}%`,
        stats.rejectCount === 0 ? 'MEMENUHI SYARAT (IN CONTROL)' : 'MEMERLUKAN TINDAKAN (OUT OF CONTROL)'
      ]);
    });
  }

  // Add summary footer signatures
  summaryData.push([]);
  summaryData.push(['LEMBAR PENGESAHAN HASIL KENDALI MUTU (AUDIT TRAIL)']);
  summaryData.push(['Penanggung Jawab Mutu Laboratorium', '', '', '', '', '', '', 'Kepala Instalasi Laboratorium']);
  summaryData.push([]);
  summaryData.push([]);
  summaryData.push([
    `${labInfo.headOfQuality || 'Siti Rahmawati, S.Tr.Kes'}`, '', '', '', '', '', '',
    `${labInfo.headOfLab || 'dr. Hendra Wijaya, Sp.PK'}`
  ]);
  summaryData.push([
    `NIP. ${labInfo.qualityNip || '19850914 201001 2 015'}`, '', '', '', '', '', '',
    `NIP. ${labInfo.headNip || '19800512 200801 1 008'}`
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 32 }, // Instrumen
    { wch: 12 }, // Kode Param
    { wch: 30 }, // Nama Parameter
    { wch: 14 }, // Level Kontrol
    { wch: 18 }, // Lot Number
    { wch: 14 }, // N
    { wch: 12 }, // Min
    { wch: 12 }, // Max
    { wch: 14 }, // Target Mean
    { wch: 14 }, // Mean Aktual
    { wch: 12 }, // Target SD
    { wch: 12 }, // SD Aktual
    { wch: 14 }, // Target CV
    { wch: 14 }, // CV Aktual
    { wch: 16 }, // Bias
    { wch: 16 }, // TEo
    { wch: 16 }, // TEa
    { wch: 16 }, // Sigma
    { wch: 18 }, // Kategori Sigma
    { wch: 12 }, // Pass%
    { wch: 12 }, // Warn%
    { wch: 12 }, // Rej%
    { wch: 28 }  // Status Kinerja
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan & Statistik QC');

  // ==========================================
  // SHEET 2: DATA QC HARIAN (RAW DATA LOG)
  // ==========================================
  const rawQCRows: any[][] = [
    ['DATA PEMERIKSAAN KONTROL MUTU HARIAN (RAW QC LOG)'],
    [labInfo.name || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'],
    [`Periode: ${periodStr} | Total Data: ${qcResults.length} Rekaman`],
    [],
    [
      'No',
      'ID Rekaman',
      'Tanggal',
      'Jam',
      'Instrumen / Alat',
      'Kode Alat',
      'Nama Parameter',
      'Kode Parameter',
      'Level Kontrol',
      'Nomor Lot',
      'Nilai Hasil (Result/Conc)',
      'Satuan',
      'Target Mean (X̄)',
      'Target SD',
      'Z-Score (SDI)',
      'Posisi SD',
      'Status Westgard',
      'Pelanggaran Aturan',
      'Petugas Analis (ATLM)',
      'Status Approval / Review',
      'Catatan / Keterangan'
    ]
  ];

  qcResults.forEach((r, idx) => {
    const violationsStr = r.violations && r.violations.length > 0 
      ? r.violations.map(v => `${v.rule} (${v.type.toUpperCase()})`).join(', ')
      : 'None';

    rawQCRows.push([
      idx + 1,
      r.id,
      r.date,
      r.time,
      r.instrumentName,
      r.instrumentId,
      r.parameterName,
      r.parameterCode,
      r.controlLevel,
      r.lotNumber,
      r.value,
      r.unit,
      r.mean,
      r.sd,
      r.zScore,
      r.sdPosition,
      r.status.toUpperCase(),
      violationsStr,
      r.operatorName,
      r.reviewStatus ? r.reviewStatus.toUpperCase() : 'PENDING',
      r.notes || ''
    ]);
  });

  const rawQCSheet = XLSX.utils.aoa_to_sheet(rawQCRows);
  rawQCSheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // ID
    { wch: 12 }, // Tanggal
    { wch: 8 },  // Jam
    { wch: 32 }, // Instrumen
    { wch: 14 }, // Kode Alat
    { wch: 28 }, // Parameter
    { wch: 12 }, // Kode Param
    { wch: 14 }, // Level
    { wch: 16 }, // Lot
    { wch: 16 }, // Nilai Hasil
    { wch: 10 }, // Satuan
    { wch: 14 }, // Target Mean
    { wch: 12 }, // Target SD
    { wch: 14 }, // Z-Score
    { wch: 14 }, // Posisi SD
    { wch: 16 }, // Status
    { wch: 24 }, // Pelanggaran
    { wch: 22 }, // Petugas
    { wch: 16 }, // Review
    { wch: 30 }  // Catatan
  ];
  XLSX.utils.book_append_sheet(workbook, rawQCSheet, 'Data QC Harian');

  // ==========================================
  // SHEET 3: LOG PELANGGARAN WESTGARD
  // ==========================================
  const westgardRows: any[][] = [
    ['LOG EVALUASI & PELANGGARAN ATURAN WESTGARD MULTIRULE'],
    [labInfo.name || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'],
    [`Periode: ${periodStr}`],
    [],
    [
      'No',
      'ID QC',
      'Tanggal',
      'Jam',
      'Instrumen',
      'Parameter',
      'Kode',
      'Level',
      'Lot Number',
      'Nilai Hasil',
      'Satuan',
      'Target Mean',
      'Target SD',
      'Z-Score (SDI)',
      'Kode Aturan',
      'Nama Aturan Westgard',
      'Tingkat Evaluasi',
      'Deskripsi Pelanggaran',
      'Petugas Analis',
      'Status Tindakan'
    ]
  ];

  let westgardIndex = 1;
  qcResults.forEach(r => {
    if (r.violations && r.violations.length > 0) {
      r.violations.forEach(v => {
        westgardRows.push([
          westgardIndex++,
          r.id,
          r.date,
          r.time,
          r.instrumentName,
          r.parameterName,
          r.parameterCode,
          r.controlLevel,
          r.lotNumber,
          r.value,
          r.unit,
          r.mean,
          r.sd,
          r.zScore,
          v.rule,
          v.ruleName,
          v.type.toUpperCase(),
          v.description,
          r.operatorName,
          r.linkedCapaId ? `CAPA Linked (${r.linkedCapaId})` : (r.linkedNonConformityId ? `NC Linked (${r.linkedNonConformityId})` : 'Tercatat')
        ]);
      });
    }
  });

  if (westgardRows.length === 5) {
    westgardRows.push(['-', '-', '-', '-', '-', 'Tidak ada pelanggaran Westgard pada periode ini', '-', '-', '-', 0, '-', 0, 0, 0, '-', '-', 'IN CONTROL', 'Semua hasil kontrol mutu berada dalam batas yang dapat diterima.', '-', '-']);
  }

  const westgardSheet = XLSX.utils.aoa_to_sheet(westgardRows);
  westgardSheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // ID QC
    { wch: 12 }, // Tanggal
    { wch: 8 },  // Jam
    { wch: 30 }, // Instrumen
    { wch: 24 }, // Parameter
    { wch: 10 }, // Kode
    { wch: 12 }, // Level
    { wch: 16 }, // Lot
    { wch: 14 }, // Nilai
    { wch: 10 }, // Satuan
    { wch: 12 }, // Target Mean
    { wch: 12 }, // Target SD
    { wch: 14 }, // Z-Score
    { wch: 14 }, // Kode Aturan
    { wch: 22 }, // Nama Aturan
    { wch: 16 }, // Tingkat
    { wch: 38 }, // Deskripsi
    { wch: 20 }, // Petugas
    { wch: 22 }  // Status Tindakan
  ];
  XLSX.utils.book_append_sheet(workbook, westgardSheet, 'Log Westgard');

  // ==========================================
  // SHEET 4: LOG TINDAKAN CAPA
  // ==========================================
  const capaRows: any[][] = [
    ['LOG TINDAKAN KOREKTIF & PENCEGAHAN (CAPA - AUDIT READY)'],
    [labInfo.name || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'],
    [`Periode: ${periodStr} | Total CAPA: ${capas.length} Dokumen`],
    [],
    [
      'No',
      'ID CAPA',
      'Tanggal Dibuat',
      'Departemen / Unit',
      'Penanggung Jawab (PIC)',
      'Sumber Masalah (Source)',
      'Pernyataan Masalah (Problem Statement)',
      'Akar Masalah (Root Cause Analysis - RCA)',
      'Daftar Tindakan Korektif (Corrective Actions)',
      'Daftar Tindakan Preventif (Preventive Actions)',
      'Batas Waktu (Due Date)',
      'Status CAPA',
      'Tanggal Selesai (Closed Date)'
    ]
  ];

  if (capas.length === 0) {
    capaRows.push(['-', '-', '-', '-', '-', '-', 'Tidak ada dokumen CAPA yang tercatat', '-', '-', '-', '-', 'NO CAPA', '-']);
  } else {
    capas.forEach((c, idx) => {
      const correctiveStr = c.correctiveActions && c.correctiveActions.length > 0
        ? c.correctiveActions.map((a, i) => `${i + 1}. [${a.description || ''}] (PIC: ${a.pic || '-'}, Status: ${a.status || 'pending'})`).join('\n')
        : 'Tidak ada tindakan korektif spesifik';

      const preventiveStr = c.preventiveActions && c.preventiveActions.length > 0
        ? c.preventiveActions.map((a, i) => `${i + 1}. [${a.description || ''}] (PIC: ${a.pic || '-'}, Status: ${a.status || 'pending'})`).join('\n')
        : 'Tidak ada tindakan preventif spesifik';

      capaRows.push([
        idx + 1,
        c.id,
        c.createdAt ? c.createdAt.substring(0, 10) : '-',
        c.department || 'Laboratorium Patologi Klinik',
        c.pic || '-',
        c.source || 'QC Westgard Out-of-Control',
        c.problemStatement || '-',
        c.identifiedRootCause || '-',
        correctiveStr,
        preventiveStr,
        c.overallDueDate || '-',
        c.status ? c.status.toUpperCase() : 'OPEN',
        c.status === 'closed' || c.status === 'CLOSED' ? 'Selesai' : '-'
      ]);
    });
  }

  const capaSheet = XLSX.utils.aoa_to_sheet(capaRows);
  capaSheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // ID CAPA
    { wch: 14 }, // Tanggal
    { wch: 22 }, // Departemen
    { wch: 20 }, // PIC
    { wch: 24 }, // Sumber Masalah
    { wch: 38 }, // Masalah
    { wch: 38 }, // Akar Masalah
    { wch: 45 }, // Tindakan Korektif
    { wch: 45 }, // Tindakan Preventif
    { wch: 14 }, // Due Date
    { wch: 14 }, // Status
    { wch: 14 }  // Closed Date
  ];
  XLSX.utils.book_append_sheet(workbook, capaSheet, 'Log Tindakan CAPA');

  // ==========================================
  // SHEET 5: LOG PENYIMPANGAN MUTU (NC LOG)
  // ==========================================
  const ncRows: any[][] = [
    ['LOG PENYIMPANGAN MUTU LABORATORIUM (NON-CONFORMITY / NC LOG)'],
    [labInfo.name || 'RSUD SULTAN MUHAMMAD JAMALUDIN I'],
    [`Periode: ${periodStr} | Total NC: ${nonConformities.length} Kasus`],
    [],
    [
      'No',
      'ID NC',
      'Tanggal Kejadian',
      'Waktu',
      'Unit / Instalasi',
      'Instrumen / Mesin',
      'Parameter Terkait',
      'Aturan Westgard Terlanggar',
      'Tingkat Keparahan (Severity)',
      'Kategori Masalah',
      'Deskripsi Penyimpangan',
      'Dampak Hasil Pasien',
      'Tindakan Segera (Immediate Action)',
      'Pelapor (Reported By)',
      'Status Penanganan',
      'Tanggal Penyelesaian'
    ]
  ];

  if (nonConformities.length === 0) {
    ncRows.push(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Tidak ada penyimpangan mutu tercatat', '-', '-', '-', 'CLEAN', '-']);
  } else {
    nonConformities.forEach((nc, idx) => {
      ncRows.push([
        idx + 1,
        nc.id,
        nc.date,
        nc.time || '-',
        nc.unit || 'Patologi Klinik',
        nc.instrumentName || '-',
        nc.parameterName || '-',
        nc.westgardRule || '-',
        nc.severity ? nc.severity.toUpperCase() : 'MEDIUM',
        nc.category ? nc.category.toUpperCase() : 'QC_VIOLATION',
        nc.description || '-',
        nc.impact || '-',
        nc.immediateAction || '-',
        nc.reportedByName || '-',
        nc.status ? nc.status.toUpperCase() : 'OPEN',
        nc.resolvedAt || (nc.status === 'resolved' ? 'Selesai' : '-')
      ]);
    });
  }

  const ncSheet = XLSX.utils.aoa_to_sheet(ncRows);
  ncSheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // ID NC
    { wch: 14 }, // Tanggal
    { wch: 8 },  // Waktu
    { wch: 20 }, // Unit
    { wch: 28 }, // Instrumen
    { wch: 24 }, // Parameter
    { wch: 16 }, // Aturan
    { wch: 16 }, // Severity
    { wch: 20 }, // Kategori
    { wch: 38 }, // Deskripsi
    { wch: 30 }, // Dampak
    { wch: 32 }, // Tindakan Segera
    { wch: 22 }, // Pelapor
    { wch: 16 }, // Status
    { wch: 16 }  // Tanggal Selesai
  ];
  XLSX.utils.book_append_sheet(workbook, ncSheet, 'Log Penyimpangan NC');

  // ==========================================
  // GENERATE AND DOWNLOAD FILE
  // ==========================================
  const sanitizedLabName = (labInfo.name || 'RSUD_SMJ1').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Laporan_Audit_QC_Laboratorium_${sanitizedLabName}_${startDate}_sd_${endDate}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
