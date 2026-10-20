import { WestgardRuleKey } from '../types';

export type AnalyzerType = 
  | 'chemistry' 
  | 'hematology' 
  | 'immunology' 
  | 'electrolyte' 
  | 'coagulation' 
  | 'urinalysis' 
  | 'general';

export interface WestgardContextualGuidance {
  analyzerType: AnalyzerType;
  analyzerTypeName: string;
  instrumentName: string;
  parameterName: string;
  ruleKey: WestgardRuleKey;
  ruleName: string;
  ruleType: 'warning' | 'reject';
  impact: string;
  probableCauses: string[];
  correctiveActions: string[];
  preventiveActions: string[];
  summaryText: string;
}

/**
 * Detect analyzer modality based on instrument name, parameter name, and unit.
 */
export function detectAnalyzerType(
  instrumentName?: string, 
  parameterName?: string, 
  unit?: string
): { type: AnalyzerType; label: string } {
  const text = `${instrumentName || ''} ${parameterName || ''} ${unit || ''}`.toLowerCase();

  // 1. Chemistry Analyzer / Kimia Darah
  if (
    text.includes('chemistry') || 
    text.includes('kimia') || 
    text.includes('cst') || 
    text.includes('dirui') || 
    text.includes('cobas c') || 
    text.includes('bs-') || 
    text.includes('glukosa') || 
    text.includes('glucose') || 
    text.includes('cholesterol') || 
    text.includes('kolesterol') || 
    text.includes('sgot') || 
    text.includes('sgpt') || 
    text.includes('alt') || 
    text.includes('ast') || 
    text.includes('asam urat') || 
    text.includes('uric acid') || 
    text.includes('ureum') || 
    text.includes('urea') || 
    text.includes('bun') || 
    text.includes('kreatinin') || 
    text.includes('creatinine') || 
    text.includes('trigliserida') || 
    text.includes('triglyceride') || 
    text.includes('bilirubin') || 
    text.includes('albumin') || 
    text.includes('protein total') ||
    text.includes('hdl') ||
    text.includes('ldl')
  ) {
    return { type: 'chemistry', label: 'Chemistry Analyzer (Kimia Klinik)' };
  }

  // 2. Hematology Analyzer
  if (
    text.includes('hematology') || 
    text.includes('hematologi') || 
    text.includes('sysmex') || 
    text.includes('xn') || 
    text.includes('poch') || 
    text.includes('medonic') || 
    text.includes('mindray bc') || 
    text.includes('hemoglobin') || 
    text.includes('leukosit') || 
    text.includes('trombosit') || 
    text.includes('eritrosit') || 
    text.includes('hematokrit') || 
    text.includes('wbc') || 
    text.includes('rbc') || 
    text.includes('plt') || 
    text.includes('hgb') || 
    text.includes('mcv') || 
    text.includes('mch') || 
    text.includes('mchc')
  ) {
    return { type: 'hematology', label: 'Hematology Analyzer (Hematologi)' };
  }

  // 3. Immunology Analyzer
  if (
    text.includes('immunology') || 
    text.includes('imunologi') || 
    text.includes('cobas e') || 
    text.includes('eclia') || 
    text.includes('vidas') || 
    text.includes('elisa') || 
    text.includes('troponin') || 
    text.includes('tsh') || 
    text.includes('ft4') || 
    text.includes('hbsag') || 
    text.includes('hiv') || 
    text.includes('ferritin') || 
    text.includes('crp') || 
    text.includes('procalcitonin') || 
    text.includes('d-dimer')
  ) {
    return { type: 'immunology', label: 'Immunology Analyzer (Imunoserologi)' };
  }

  // 4. Electrolyte Analyzer / ISE
  if (
    text.includes('electrolyte') || 
    text.includes('elektrolit') || 
    text.includes('ise') || 
    text.includes('kalium') || 
    text.includes('natrium') || 
    text.includes('klorida') || 
    text.includes('potassium') || 
    text.includes('sodium') || 
    text.includes('chloride') || 
    text.includes('mmol/l') || 
    text.includes('mEq/l')
  ) {
    return { type: 'electrolyte', label: 'Electrolyte Analyzer (Ion Selective Electrode)' };
  }

  // 5. Coagulation Analyzer
  if (
    text.includes('coagulation') || 
    text.includes('koagulasi') || 
    text.includes('hemostasis') || 
    text.includes('ca-') || 
    text.includes('pt') || 
    text.includes('aptt') || 
    text.includes('inr') || 
    text.includes('fibrinogen')
  ) {
    return { type: 'coagulation', label: 'Coagulation Analyzer (Koagulasi)' };
  }

  // 6. Urine Analyzer
  if (text.includes('urine') || text.includes('urinalisis') || text.includes('urisys')) {
    return { type: 'urinalysis', label: 'Urine Analyzer (Urinalisis Otomatis)' };
  }

  return { type: 'general', label: 'Automated Laboratory Analyzer' };
}

/**
 * Generate comprehensive contextual guidance (impact, causes, corrective actions, preventive actions)
 * specifically customized to the instrument name, model, parameter name, and Westgard rule.
 */
export function getWestgardContextualGuidance(
  ruleKey: WestgardRuleKey,
  ruleName: string,
  ruleType: 'warning' | 'reject',
  rawInstrumentName?: string,
  rawParameterName?: string,
  zScore?: number,
  deviationDetail?: string
): WestgardContextualGuidance {
  const instName = (rawInstrumentName || 'Instrumen Laboratorium').trim();
  const paramName = (rawParameterName || 'Parameter Pemeriksaan').trim();
  const { type: analyzerType, label: analyzerTypeName } = detectAnalyzerType(instName, paramName);

  const zFormatted = zScore !== undefined ? `${zScore > 0 ? '+' : ''}${zScore.toFixed(2)} SD` : '';
  const isPositive = zScore !== undefined ? zScore > 0 : true;
  const biasDirection = isPositive ? 'positif (hasil cenderung lebih tinggi)' : 'negatif (hasil cenderung lebih rendah)';

  // Build analyzer-specific content
  switch (analyzerType) {
    case 'chemistry': {
      // Chemistry Analyzer (Fotometer, kuvet, probe reagen/sampel, inkubator 37°C)
      if (ruleKey === '1_3s' || ruleKey === 'R_4s') {
        // Random Error in Chemistry Analyzer
        return {
          analyzerType,
          analyzerTypeName,
          instrumentName: instName,
          parameterName: paramName,
          ruleKey,
          ruleName,
          ruleType: 'reject',
          impact: `Lonjakan kesalahan acak akut (Random Error) terdeteksi pada ${instName} untuk parameter ${paramName} (${zFormatted || deviationDetail || 'Out of Control'}). Akurasi dan presisi fotometri tidak dapat diandalkan saat ini. Hasil pemeriksaan klinis pasien untuk ${paramName} pada alat ${instName} WAJIB DITAHAN (HOLD) dan tidak boleh divalidasi ke rekam medis.`,
          probableCauses: [
            `Gelembung mikro atau kavitasi udara pada jarum pipetting (sample/reagent probe) alat ${instName}.`,
            `Goresan, kondensasi, atau residu kotoran pada kuvet reaksi optik pada rotor ${instName}.` ,
            `Fluktuasi intensitas atau ketidakstabilan sumber cahaya lampu halogen/fotometer ${instName}.`,
            `Adanya partikel mikro-bekuan (fibrin) atau kekeruhan pada botol reagen ${paramName} atau vial kontrol yang digunakan pada ${instName}.`,
            `Ketidakhomogenan rekonstitusi vial bahan kontrol ${paramName} saat disiapkan di meja kerja.`
          ],
          correctiveActions: [
            `Segera HOLD / tahan pelepasan seluruh hasil pemeriksaan ${paramName} pasien dari instrumen ${instName}.`,
            `Inspeksi visual jarum probe ${instName}: periksa apakah ada gelembung udara pada tubing reagen atau sumbatan jarum pipetting.`,
            `Jalankan siklus pencucian kuvet otomatis (Cuvette Wash & Blank) pada ${instName}.`,
            `Siapkan dan rekonstitusi vial bahan kontrol ${paramName} baru yang segar dari kulkas 2-8°C, biarkan mencapai suhu ruang 15 menit, homogenkan tanpa buih, lalu lakukan uji ulang (re-run) pada ${instName}.`,
            `Bila hasil re-run masih menyimpang, jalankan kalibrasi ulang (re-calibration) khusus parameter ${paramName} pada ${instName} menggunakan kalibrator standar.`
          ],
          preventiveActions: [
            `Lakukan pemeliharaan harian (daily maintenance) ${instName}: de-proteinization wash probe dan bersihkan permukaan jarum dengan alkohol pad.`,
            `Verifikasi kualitas air deionisasi/aquabidest pengencer ${instName} (resistivitas > 1.0 MΩ·cm / konduktivitas < 1.0 µS/cm).`,
            `Pantau umur pemakaian (lamp hours) fotometer ${instName} dan jadwalkan penggantian bila mendekati batas jam operasional.`,
            `Pastikan vial kontrol ditutup rapat dan tidak terpapar evaporasi pada suhu ruangan lebih dari batas stabilitas kit reagen ${paramName}.`
          ],
          summaryText: `Kesalahan acak akut pada ${instName} (${paramName}). Tahan hasil pasien, periksa jarum/kuvet alat ${instName}, dan re-run kontrol baru.`
        };
      }

      if (ruleKey === '2_2s' || ruleKey === '4_1s' || ruleKey === '10x') {
        // Systematic Shift / Drift in Chemistry Analyzer
        const isTenX = ruleKey === '10x';
        return {
          analyzerType,
          analyzerTypeName,
          instrumentName: instName,
          parameterName: paramName,
          ruleKey,
          ruleName,
          ruleType: isTenX ? 'warning' : 'reject',
          impact: `Pergeseran sistematik (${ruleName}) terdeteksi pada ${instName} untuk parameter ${paramName}. Terjadi bias analitis ${biasDirection} yang persisten, memengaruhi keakuratan seluruh data kuantitatif pasien ${paramName}. Berisiko menimbulkan kesalahan interpretasi klinis bila tidak segera dikoreksi.`,
          probableCauses: [
            `Pergeseran kurva kalibrasi (calibration drift/shift) parameter ${paramName} pada sistem ${instName}.`,
            `Penurunan stabilitas atau degradasi kimiawi botol reagen ${paramName} di dalam kompartemen reagen ${instName}.`,
            `Fluktuasi suhu inkubasi reaksi ${instName} (menyimpang dari standar 37.0°C ± 0.1°C).`,
            `Penggunaan lot reagen baru ${paramName} tanpa memperbarui kalibrator pada ${instName}.`,
            `Evaporasi pelarut reagen akibat pendingin carousel ${instName} tidak bekerja optimal.`
          ],
          correctiveActions: [
            `Tunda verifikasi hasil pasien parameter ${paramName} pada alat ${instName}.`,
            `Periksa masa on-board stability dan tanggal kedaluwarsa botol reagen ${paramName} pada carousel ${instName}.`,
            `Lakukan kalibrasi ulang lengkap (Multi-point calibration) untuk parameter ${paramName} pada instrumen ${instName}.`,
            `Verifikasi kurva kalibrasi baru (periksa nilai slope, intercept, dan absorbansi blanko reagen).`,
            `Lakukan uji kontrol mutu level 1 dan level 2 pada ${instName} setelah kalibrasi selesai.`
          ],
          preventiveActions: [
            `Selalu jalankan kalibrasi baru setiap kali membuka botol reagen dengan nomor lot baru pada ${instName}.`,
            `Pantau temperatur modul reagen carousel ${instName} (harus stabil di 2°C - 8°C).`,
            `Jaga stabilitas suhu ruangan laboratorium (20°C - 24°C) dengan pendingin udara terkontrol.`,
            `Lakukan evaluasi tren Levey-Jennings 10 hari pasca kalibrasi pada ${instName} untuk memastikan bias analitis telah hilang.`
          ],
          summaryText: `Pergeseran sistematik ${biasDirection} pada ${instName} (${paramName}). Lakukan re-kalibrasi dan evaluasi kestabilan reagen.`
        };
      }

      // Default 1:2s Warning
      return {
        analyzerType,
        analyzerTypeName,
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: 'warning',
        impact: `Peringatan deviasi nilai (${zFormatted}) pada ${instName} untuk parameter ${paramName}. Merupakan aturan peringatan (Warning Rule); hasil pasien masih dapat dirilis namun memerlukan kewaspadaan dan evaluasi terhadap tren analitik berikutnya.`,
        probableCauses: [
          `Variasi suhu inkubator kuvet ${instName} dalam rentang toleransi mikro.`,
          `Pengadukan (mixing) mikro reagen dan sampel ${paramName} pada kuvet ${instName} kurang sempurna.`,
          `Reagen ${paramName} pada ${instName} mendekati batas on-board stability.`,
          `Variabilitas teknis penyiapan bahan kontrol harian.`
        ],
        correctiveActions: [
          `Periksa tren grafik Levey-Jennings untuk melihat apakah titik kontrol sebelumnya menunjukkan tren mengarah ke batas luar.`,
          `Lakukan inspeksi visual jarum mixer rotor dan sirkuit pencucian ${instName}.`,
          `Boleh melanjutkan operasional jika aturan Westgard reject (1:3s, 2:2s, R:4s) tidak terlanggar.`,
          `Bila ragu, lakukan running duplikat untuk memastikan nilai stabil.`
        ],
        preventiveActions: [
          `Jalankan siklus priming dan pembersihan jarum probe ${instName} sebelum pergantian shift operasional.`,
          `Pastikan botol reagen ${paramName} tertutup rapat jika alat tidak digunakan dalam waktu lama.`
        ],
        summaryText: `Peringatan 1:2s pada ${instName} (${paramName}). Lakukan monitoring tren dan inspeksi kuvet.`
      };
    }

    case 'hematology': {
      // Hematology Analyzer (Aperture, transducer, lyse, flowcell, impedance)
      const isRandom = ruleKey === '1_3s' || ruleKey === 'R_4s';
      return {
        analyzerType,
        analyzerTypeName,
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: isRandom ? 'reject' : ruleKey === '1_2s' ? 'warning' : 'reject',
        impact: `Terdeteksi pelanggaran aturan ${ruleName} pada instrumen hematologi ${instName} untuk parameter ${paramName} (${zFormatted}). Data hitung sel darah berisiko mengalami penyimpangan akurasi. Hasil pasien parameter terkait pada ${instName} harus dievaluasi ketat sebelum divalidasi.`,
        probableCauses: [
          `Clog parsial atau penumpukan deposit protein pada counting aperture bath ${instName}.`,
          `Tekanan pneumatik (vacuum / pressure chamber) alat ${instName} berfluktuasi atau selang sheath fluid terjepit.`,
          `Reagen hemolisis (lyse) berbusa atau temperatur hemolyzing chamber ${instName} tidak stabil.`,
          `Bahan kontrol hematologi mengalami agregasi atau tidak dihomogenkan secara roller/invert sebelum diaspirasi oleh ${instName}.`
        ],
        correctiveActions: [
          `Jalankan siklus Clog Removal / Flush Aperture pada menu pemeliharaan ${instName}.`,
          `Periksa nilai Background Count pada alat ${instName} untuk memastikan saluran aspirasi bebas partikel asing.`,
          `Homogenkan bahan kontrol hematologi dengan cara invert perlahan 10-15 kali (hindari mengocok kuat yang menimbulkan buih) lalu uji ulang.`,
          `Bila deviasi berlanjut, lakukan deproteinization pada counting chamber ${instName} dengan larutan cellclean.`
        ],
        preventiveActions: [
          `Lakukan auto-rinse dan shutdown harian sesuai SOP pada ${instName}.`,
          `Periksa level cairan reagen diluent, lyse, dan botol pembuangan limbah (waste container) ${instName}.`,
          `Simpan kontrol hematologi pada 2°C - 8°C dan hindari paparan sinar matahari langsung.`
        ],
        summaryText: `Pelanggaran ${ruleName} pada alat hematologi ${instName} (${paramName}). Lakukan flush aperture dan cek background count.`
      };
    }

    case 'immunology': {
      // Immunology Analyzer (Chemiluminescence, PMT, wash probe, magnetic beads)
      return {
        analyzerType,
        analyzerTypeName,
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: ruleType,
        impact: `Pelanggaran aturan ${ruleName} pada instrumen imunologi ${instName} untuk parameter ${paramName} (${zFormatted}). Pengukuran sinyal chemiluminescence berisiko mengalami bias. Hasil tes immunoassay pasien parameter ${paramName} pada ${instName} harus ditahan sementara.`,
        probableCauses: [
          `Kontaminasi atau sumbatan parsial pada wash nozzle / aspiration probe ${instName}.`,
          `Suspensi partikel magnetik (magnetic microparticles) reagen ${paramName} mengendap dan belum homogen sempurna di dalam kompartemen ${instName}.`,
          `Penurunan intensitas background fotomultiplier (PMT noise) pada detektor ${instName}.`,
          `Stabilitas reagen substrat chemiluminescence terganggu oleh paparan suhu atau cahaya.`
        ],
        correctiveActions: [
          `Tahan rilis hasil uji imunologi ${paramName} pasien dari ${instName}.`,
          `Jalankan siklus Special Wash dan pembersihan probe cuci pada instrumen ${instName}.`,
          `Pastikan pack reagen ${paramName} telah di-vortex/homogenkan sesuai petunjuk kit sebelum diletakkan di rotor ${instName}.`,
          `Lakukan kalibrasi 2-point ulang untuk parameter ${paramName} pada ${instName}.`
        ],
        preventiveActions: [
          `Lakukan pembersihan mingguan pada measuring cell dan jarum aspirasi ${instName}.`,
          `Pastikan larutan wash buffer dan sistem deionisasi air ${instName} bebas dari kontaminasi bakteri/jamur.`
        ],
        summaryText: `Pelanggaran ${ruleName} pada immunoassay ${instName} (${paramName}). Lakukan special wash probe dan re-kalibrasi.`
      };
    }

    case 'electrolyte': {
      // Electrolyte Analyzer (ISE membrane, reference electrode, fluid pack)
      return {
        analyzerType,
        analyzerTypeName,
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: ruleType,
        impact: `Pelanggaran ${ruleName} pada elektroda ISE ${instName} untuk ion ${paramName} (${zFormatted}). Potensial membran elektroda selektif ion mengalami deviasi mV, yang memengaruhi hasil kadar elektrolit pasien.`,
        probableCauses: [
          `Penuaan membran elektroda selektif ion ${paramName} pada modul ISE alat ${instName}.`,
          `Penumpukan lapisan protein (protein coating) pada kapiler selang elektroda ${instName}.`,
          `Larutan kalibrator internal (Cal A / Cal B) atau reference liquid pada ${instName} menipis atau terkontaminasi.`,
          `Koneksi ground listrik alat ${instName} mengalami noise voltase.`
        ],
        correctiveActions: [
          `Tahan hasil pasien parameter elektrolit ${paramName} pada alat ${instName}.`,
          `Jalankan siklus Deproteinization (pembersihan protein) pada modul elektroda ${instName}.`,
          `Jalankan 2-Point Calibration ISE pada ${instName} dan periksa nilai slope elektroda (${paramName} harus dalam rentang rekomendasi pabrikan).`,
          `Lakukan uji ulang kontrol elektrolit level normal dan abnormal pada ${instName}.`
        ],
        preventiveActions: [
          `Ganti membran elektroda ${paramName} jika nilai slope mV sudah di luar batas spesifikasi.`,
          `Lakukan conditioning elektroda setiap minggu sesuai protokol pabrikan ${instName}.`
        ],
        summaryText: `Deviasi elektroda ISE pada ${instName} (${paramName}). Bersihkan protein kapiler dan kalibrasi slope mV.`
      };
    }

    case 'coagulation': {
      // Coagulation Analyzer (Optical / Mechanical, 37C block, thromboplastin)
      return {
        analyzerType,
        analyzerTypeName,
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: ruleType,
        impact: `Pelanggaran ${ruleName} pada analiser koagulasi ${instName} untuk pemeriksaan ${paramName} (${zFormatted}). Waktu pembekuan plasma berisiko tidak akurat, berpotensi memengaruhi dosis antikoagulan pasien.`,
        probableCauses: [
          `Fluktuasi suhu blok pemanas inkubasi 37.0°C pada kuvet ${instName}.`,
          `Reagen ${paramName} (tromboplastin/kalsium klorida) mengalami penurunan aktivitas biologis akibat paparan suhu.`,
          `Sensor optik/detektor magnetik bekuan ${instName} kotor atau tergores.`
        ],
        correctiveActions: [
          `Tahan hasil uji koagulasi ${paramName} pada ${instName}.`,
          `Verifikasi suhu modul inkubasi ${instName} dengan termometer terkalibrasi (harus 37°C ± 0.5°C).`,
          `Ganti botol reagen kerja ${paramName} dengan yang baru, rekonstitusi dengan aquabidest aquadest standar, lalu running kontrol ulang.`
        ],
        preventiveActions: [
          `Jangan biarkan reagen koagulasi berada di suhu ruang melebihi batas stabilitas kerja.`,
          `Bersihkan jalur pembacaan detektor optik/mekanik ${instName} secara berkala.`
        ],
        summaryText: `Pelanggaran hemostasis pada ${instName} (${paramName}). Periksa suhu 37°C dan rekonstitusi reagen baru.`
      };
    }

    default: {
      // General Automated Laboratory Analyzer
      return {
        analyzerType: 'general',
        analyzerTypeName: 'Automated Laboratory Analyzer',
        instrumentName: instName,
        parameterName: paramName,
        ruleKey,
        ruleName,
        ruleType: ruleType,
        impact: `Pelanggaran aturan Westgard ${ruleName} terdeteksi pada ${instName} untuk parameter ${paramName} (${zFormatted || 'Out of Control'}). Akurasi pengukuran analitik pada instrumen ${instName} mengalami deviasi dan hasil pemeriksaan pasien harus ditahan sementara.`,
        probableCauses: [
          `Pergeseran kalibrasi atau degradasi reagen parameter ${paramName} pada instrumen ${instName}.`,
          `Gangguan teknis aspirasi pipettor, kuvet ukur, atau sistem optik ${instName}.`,
          `Kondisi fisik vial kontrol mengalami evaporasi atau tidak dihomogenkan secara benar.`
        ],
        correctiveActions: [
          `Tahan pelepasan hasil pasien parameter ${paramName} dari instrumen ${instName}.`,
          `Lakukan inspeksi fisik pada ${instName}: periksa saluran cairan, jarum probe, dan kuvet ukur.`,
          `Siapkan bahan kontrol baru yang segar dan jalankan pemeriksaan ulang pada ${instName}.`,
          `Lakukan kalibrasi ulang parameter ${paramName} pada ${instName} jika hasil re-run masih menyimpang.`
        ],
        preventiveActions: [
          `Lakukan pemeliharaan rutin harian dan mingguan sesuai panduan operasional ${instName}.`,
          `Pastikan suhu penyimpanan reagen dan bahan kontrol sesuai standar (2°C - 8°C).`
        ],
        summaryText: `Pelanggaran ${ruleName} pada ${instName} (${paramName}). Tahan hasil pasien dan lakukan uji kontrol ulang.`
      };
    }
  }
}
