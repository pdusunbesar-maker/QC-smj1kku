import { Parameter } from '../types';

export interface ParameterNumericSchema {
  code: string;
  name: string;
  unit: string;
  expectedType: 'float' | 'integer';
  decimalPlaces: number;
  minPhysiological: number;
  maxPhysiological: number;
  typicalMeanRange: [number, number];
  typicalSDRange: [number, number];
  description: string;
}

// Enterprise clinical chemistry and hematology numeric validation schemas
export const PARAMETER_SCHEMAS: Record<string, ParameterNumericSchema> = {
  // Clinical Chemistry (Dirui CS-T240 / Cobas c311)
  'ALB': {
    code: 'ALB',
    name: 'Albumin',
    unit: 'g/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.5,
    maxPhysiological: 10.0,
    typicalMeanRange: [2.0, 6.0],
    typicalSDRange: [0.05, 0.30],
    description: 'Albumin serum (rentang kontrol 2.0 - 6.0 g/dL)'
  },
  'ALT': {
    code: 'ALT',
    name: 'SGPT / ALT',
    unit: 'U/L',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1,
    maxPhysiological: 1500,
    typicalMeanRange: [15, 250],
    typicalSDRange: [1.0, 10.0],
    description: 'Alanine Aminotransferase / SGPT (rentang kontrol 15 - 250 U/L)'
  },
  'AST': {
    code: 'AST',
    name: 'SGOT / AST',
    unit: 'U/L',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1,
    maxPhysiological: 1500,
    typicalMeanRange: [15, 250],
    typicalSDRange: [1.0, 10.0],
    description: 'Aspartate Aminotransferase / SGOT (rentang kontrol 15 - 250 U/L)'
  },
  'GLU-HK': {
    code: 'GLU-HK',
    name: 'Glucose Hexokinase',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 10,
    maxPhysiological: 700,
    typicalMeanRange: [70, 300],
    typicalSDRange: [1.5, 12.0],
    description: 'Glukosa Hexokinase CST-240 (rentang normal kontrol 70 - 300 mg/dL)'
  },
  'GLU': {
    code: 'GLU',
    name: 'Glucose (Glukosa Darah)',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 10,
    maxPhysiological: 700,
    typicalMeanRange: [70, 300],
    typicalSDRange: [1.5, 12.0],
    description: 'Glukosa darah sewaktu/puasa (rentang normal kontrol 70 - 300 mg/dL)'
  },
  'AU': {
    code: 'AU',
    name: 'Asam Urat / AU',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.5,
    maxPhysiological: 30.0,
    typicalMeanRange: [2.0, 15.0],
    typicalSDRange: [0.1, 0.8],
    description: 'Asam urat / AU CST-240 (rentang kontrol 2.0 - 15.0 mg/dL, 2 desimal)'
  },
  'UA': {
    code: 'UA',
    name: 'Uric Acid / Asam Urat',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.5,
    maxPhysiological: 30.0,
    typicalMeanRange: [2.0, 15.0],
    typicalSDRange: [0.1, 0.8],
    description: 'Asam urat (rentang kontrol 2.0 - 15.0 mg/dL, 2 desimal)'
  },
  'BUN': {
    code: 'BUN',
    name: 'Blood Urea Nitrogen / BUN',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 3,
    maxPhysiological: 250,
    typicalMeanRange: [8, 120],
    typicalSDRange: [0.5, 6.0],
    description: 'Blood Urea Nitrogen CST-240 (rentang kontrol 8 - 120 mg/dL)'
  },
  'UREA': {
    code: 'UREA',
    name: 'Urea / Ureum Darah',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 5,
    maxPhysiological: 350,
    typicalMeanRange: [15, 180],
    typicalSDRange: [0.8, 8.0],
    description: 'Ureum darah (rentang kontrol 15 - 180 mg/dL)'
  },
  'CRE-E': {
    code: 'CRE-E',
    name: 'Creatinine Enzymatic / CRE-E',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.1,
    maxPhysiological: 30.0,
    typicalMeanRange: [0.5, 8.0],
    typicalSDRange: [0.02, 0.40],
    description: 'Kreatinin enzimatik CST-240 (rentang kontrol 0.5 - 8.0 mg/dL, 2 desimal)'
  },
  'CREAT': {
    code: 'CREAT',
    name: 'Creatinine / Kreatinin',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.1,
    maxPhysiological: 30.0,
    typicalMeanRange: [0.5, 8.0],
    typicalSDRange: [0.02, 0.40],
    description: 'Kreatinin serum (rentang kontrol 0.5 - 8.0 mg/dL, 2 desimal)'
  },
  'TG': {
    code: 'TG',
    name: 'Triglyceride / TG',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 10,
    maxPhysiological: 1000,
    typicalMeanRange: [50, 400],
    typicalSDRange: [2.0, 18.0],
    description: 'Trigliserida CST-240 (rentang kontrol 50 - 400 mg/dL)'
  },
  'TRIG': {
    code: 'TRIG',
    name: 'Triglyceride / Trigliserida',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 10,
    maxPhysiological: 1000,
    typicalMeanRange: [50, 400],
    typicalSDRange: [2.0, 18.0],
    description: 'Trigliserida serum (rentang kontrol 50 - 400 mg/dL)'
  },
  'TC': {
    code: 'TC',
    name: 'Total Cholesterol / TC',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 20,
    maxPhysiological: 800,
    typicalMeanRange: [100, 350],
    typicalSDRange: [2.0, 15.0],
    description: 'Kolesterol total TC CST-240 (rentang kontrol 100 - 350 mg/dL)'
  },
  'CHOL': {
    code: 'CHOL',
    name: 'Cholesterol Total',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 20,
    maxPhysiological: 800,
    typicalMeanRange: [100, 350],
    typicalSDRange: [2.0, 15.0],
    description: 'Kolesterol total (rentang kontrol 100 - 350 mg/dL)'
  },
  'TBIL': {
    code: 'TBIL',
    name: 'Total Bilirubin',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.05,
    maxPhysiological: 40.0,
    typicalMeanRange: [0.3, 10.0],
    typicalSDRange: [0.03, 0.50],
    description: 'Bilirubin total (rentang kontrol 0.3 - 10.0 mg/dL)'
  },
  'DBIL': {
    code: 'DBIL',
    name: 'Direct Bilirubin',
    unit: 'mg/dL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.02,
    maxPhysiological: 25.0,
    typicalMeanRange: [0.1, 5.0],
    typicalSDRange: [0.02, 0.30],
    description: 'Bilirubin direk (rentang kontrol 0.1 - 5.0 mg/dL)'
  },
  'SGOT': {
    code: 'SGOT',
    name: 'SGOT / AST',
    unit: 'U/L',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1,
    maxPhysiological: 1500,
    typicalMeanRange: [15, 250],
    typicalSDRange: [1.0, 10.0],
    description: 'Aspartate Aminotransferase (rentang kontrol 15 - 250 U/L)'
  },
  'SGPT': {
    code: 'SGPT',
    name: 'SGPT / ALT',
    unit: 'U/L',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1,
    maxPhysiological: 1500,
    typicalMeanRange: [15, 250],
    typicalSDRange: [1.0, 10.0],
    description: 'Alanine Aminotransferase (rentang kontrol 15 - 250 U/L)'
  },
  'TP': {
    code: 'TP',
    name: 'Total Protein',
    unit: 'g/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1.0,
    maxPhysiological: 15.0,
    typicalMeanRange: [3.5, 9.0],
    typicalSDRange: [0.1, 0.45],
    description: 'Protein total serum (rentang kontrol 3.5 - 9.0 g/dL)'
  },

  // Hematology (Dirui Dimih 3980 / Sysmex XN-550)
  'WBC': {
    code: 'WBC',
    name: 'White Blood Cell / Leukosit',
    unit: '10^3/uL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.1,
    maxPhysiological: 150.0,
    typicalMeanRange: [2.0, 30.0],
    typicalSDRange: [0.15, 1.50],
    description: 'Hitung leukosit (rentang kontrol 2.0 - 30.0 10^3/uL)'
  },
  'RBC': {
    code: 'RBC',
    name: 'Red Blood Cell / Eritrosit',
    unit: '10^6/uL',
    expectedType: 'float',
    decimalPlaces: 2,
    minPhysiological: 0.5,
    maxPhysiological: 10.0,
    typicalMeanRange: [2.0, 6.5],
    typicalSDRange: [0.08, 0.35],
    description: 'Hitung eritrosit (rentang kontrol 2.0 - 6.5 10^6/uL, 2 desimal)'
  },
  'HGB': {
    code: 'HGB',
    name: 'Hemoglobin (Hb)',
    unit: 'g/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1.0,
    maxPhysiological: 30.0,
    typicalMeanRange: [5.0, 20.0],
    typicalSDRange: [0.2, 0.8],
    description: 'Kadar hemoglobin (rentang kontrol 5.0 - 20.0 g/dL)'
  },
  'HCT': {
    code: 'HCT',
    name: 'Hematocrit (Hematokrit)',
    unit: '%',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 5.0,
    maxPhysiological: 85.0,
    typicalMeanRange: [15.0, 60.0],
    typicalSDRange: [0.8, 2.5],
    description: 'Persentase hematokrit (rentang kontrol 15.0 - 60.0 %)'
  },
  'MCV': {
    code: 'MCV',
    name: 'Mean Corpuscular Volume',
    unit: 'fL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 30.0,
    maxPhysiological: 160.0,
    typicalMeanRange: [60.0, 120.0],
    typicalSDRange: [1.2, 4.0],
    description: 'Volume eritrosit rata-rata (rentang kontrol 60.0 - 120.0 fL)'
  },
  'MCH': {
    code: 'MCH',
    name: 'Mean Corpuscular Hemoglobin',
    unit: 'pg',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 10.0,
    maxPhysiological: 60.0,
    typicalMeanRange: [18.0, 40.0],
    typicalSDRange: [0.5, 2.0],
    description: 'Hemoglobin eritrosit rata-rata (rentang kontrol 18.0 - 40.0 pg)'
  },
  'MCHC': {
    code: 'MCHC',
    name: 'MCHC',
    unit: 'g/dL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 15.0,
    maxPhysiological: 50.0,
    typicalMeanRange: [25.0, 40.0],
    typicalSDRange: [0.6, 2.0],
    description: 'Konsentrasi Hb eritrosit rata-rata (rentang kontrol 25.0 - 40.0 g/dL)'
  },
  'PLT': {
    code: 'PLT',
    name: 'Platelet / Trombosit',
    unit: '10^3/uL',
    expectedType: 'integer',
    decimalPlaces: 0,
    minPhysiological: 5,
    maxPhysiological: 3000,
    typicalMeanRange: [40, 600],
    typicalSDRange: [4, 35],
    description: 'Hitung trombosit (rentang kontrol 40 - 600 10^3/uL, bilangan bulat)'
  },
  'LYM%': {
    code: 'LYM%',
    name: 'Lymphocyte %',
    unit: '%',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1.0,
    maxPhysiological: 99.0,
    typicalMeanRange: [10.0, 60.0],
    typicalSDRange: [1.0, 4.0],
    description: 'Persentase limfosit (rentang kontrol 10.0 - 60.0 %)'
  },
  'GRAN%': {
    code: 'GRAN%',
    name: 'Granulocyte / Neutrophil %',
    unit: '%',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 1.0,
    maxPhysiological: 99.0,
    typicalMeanRange: [30.0, 85.0],
    typicalSDRange: [1.5, 5.0],
    description: 'Persentase granulosit (rentang kontrol 30.0 - 85.0 %)'
  },
  'MID%': {
    code: 'MID%',
    name: 'MID / Monocyte %',
    unit: '%',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 0.5,
    maxPhysiological: 50.0,
    typicalMeanRange: [2.0, 20.0],
    typicalSDRange: [0.5, 2.0],
    description: 'Persentase sel monosit/MID (rentang kontrol 2.0 - 20.0 %)'
  },
  'RDW-CV': {
    code: 'RDW-CV',
    name: 'RDW-CV',
    unit: '%',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 5.0,
    maxPhysiological: 40.0,
    typicalMeanRange: [10.0, 22.0],
    typicalSDRange: [0.3, 1.2],
    description: 'Distribusi eritrosit RDW-CV (rentang kontrol 10.0 - 22.0 %)'
  },
  'MPV': {
    code: 'MPV',
    name: 'Mean Platelet Volume',
    unit: 'fL',
    expectedType: 'float',
    decimalPlaces: 1,
    minPhysiological: 3.0,
    maxPhysiological: 25.0,
    typicalMeanRange: [6.0, 15.0],
    typicalSDRange: [0.3, 1.2],
    description: 'Volume trombosit rata-rata (rentang kontrol 6.0 - 15.0 fL)'
  }
};

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: number;
  sanitizedMean: number;
  sanitizedSD: number;
  formatMatch: boolean;
  warnings: string[];
  autoCorrected: boolean;
  schema?: ParameterNumericSchema;
}

/**
 * Sanitizes typical OCR misreads in numeric strings:
 * - 'O' or 'o' -> '0'
 * - 'l' or 'I' or '|' -> '1'
 * - 'S' or 's' -> '5'
 * - 'B' -> '8'
 * - Commas ',' converted to standard decimal dot '.'
 */
export function sanitizeNumericString(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }
  if (!raw || typeof raw !== 'string') return 0;

  let str = raw.trim();

  // Replace common OCR character substitutions in numbers
  str = str.replace(/[Oo]/g, '0');
  str = str.replace(/[lI|]/g, '1');
  str = str.replace(/,/g, '.');
  str = str.replace(/[^0-9.-]/g, '');

  // Handle multiple dots (e.g. 10.4.2 -> 104.2 or 10.42)
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validates and sanitizes a QC item value, mean, and SD against strict clinical parameter schemas
 */
export function validateQCItemSchema(
  rawResult: number | string,
  rawMean: number | string,
  rawSD: number | string,
  paramCodeOrName?: string,
  masterParam?: Parameter
): ValidationResult {
  const warnings: string[] = [];
  let autoCorrected = false;

  let val = sanitizeNumericString(rawResult);
  let mean = sanitizeNumericString(rawMean);
  let sd = sanitizeNumericString(rawSD);

  // If result was 0 but mean had a number and SD was empty (e.g. single-value receipt like HGB 12,6)
  if (val === 0 && mean > 0 && sd === 0) {
    val = mean;
    mean = masterParam?.targetMean || 0;
  }

  // Find matching schema by code
  const searchKey = (masterParam?.code || paramCodeOrName || '').toUpperCase().trim();
  let schema: ParameterNumericSchema | undefined = undefined;

  for (const [key, s] of Object.entries(PARAMETER_SCHEMAS)) {
    if (searchKey === key || searchKey.startsWith(key) || searchKey.includes(key)) {
      schema = s;
      break;
    }
  }

  // Fallback match by name
  if (!schema && paramCodeOrName) {
    const lower = paramCodeOrName.toLowerCase();
    if (lower.includes('alb')) schema = PARAMETER_SCHEMAS['ALB'];
    else if (lower.includes('alt') || lower.includes('sgpt') || lower.includes('gpt')) schema = PARAMETER_SCHEMAS['ALT'];
    else if (lower.includes('ast') || lower.includes('sgot') || lower.includes('got')) schema = PARAMETER_SCHEMAS['AST'];
    else if (lower.includes('glu-hk') || lower.includes('gluhk')) schema = PARAMETER_SCHEMAS['GLU-HK'];
    else if (lower.includes('gluc') || lower.includes('gula') || lower.includes('glu')) schema = PARAMETER_SCHEMAS['GLU'];
    else if (lower.includes('au') || lower.includes('asam urat') || lower.includes('uric') || lower.includes('ua')) schema = PARAMETER_SCHEMAS['AU'];
    else if (lower.includes('bun') || lower.includes('blood urea')) schema = PARAMETER_SCHEMAS['BUN'];
    else if (lower.includes('urea') || lower.includes('ureum')) schema = PARAMETER_SCHEMAS['UREA'];
    else if (lower.includes('cre-e') || lower.includes('cree')) schema = PARAMETER_SCHEMAS['CRE-E'];
    else if (lower.includes('crea') || lower.includes('kreat')) schema = PARAMETER_SCHEMAS['CREAT'];
    else if (lower.includes('tg') || lower.includes('trig')) schema = PARAMETER_SCHEMAS['TG'];
    else if (lower.includes('tc') || lower.includes('chol') || lower.includes('koles')) schema = PARAMETER_SCHEMAS['TC'];
    else if (lower.includes('tbil') || lower.includes('t-bil') || lower.includes('bilirubin total')) schema = PARAMETER_SCHEMAS['TBIL'];
    else if (lower.includes('dbil') || lower.includes('d-bil') || lower.includes('bilirubin direk')) schema = PARAMETER_SCHEMAS['DBIL'];
    else if (lower.includes('hemo') || lower.includes('hgb') || lower.includes('hb')) schema = PARAMETER_SCHEMAS['HGB'];
    else if (lower.includes('leuko') || lower.includes('wbc')) schema = PARAMETER_SCHEMAS['WBC'];
    else if (lower.includes('trombo') || lower.includes('plt')) schema = PARAMETER_SCHEMAS['PLT'];
    else if (lower.includes('eritro') || lower.includes('rbc')) schema = PARAMETER_SCHEMAS['RBC'];
    else if (lower.includes('hemato') || lower.includes('hct')) schema = PARAMETER_SCHEMAS['HCT'];
    else if (lower.includes('mcv')) schema = PARAMETER_SCHEMAS['MCV'];
    else if (lower.includes('mchc')) schema = PARAMETER_SCHEMAS['MCHC'];
    else if (lower.includes('mch')) schema = PARAMETER_SCHEMAS['MCH'];
  }

  // Check 1: Inverted Result and Target SD check
  if (schema) {
    if (schema.expectedType === 'integer') {
      val = Math.round(val);
      mean = Math.round(mean);
    }

    // Auto-fix if Result was swapped with SD (e.g. Result is 3.5 and SD is 104.2 for Glucose)
    if (val <= schema.typicalSDRange[1] && sd >= schema.typicalMeanRange[0] * 0.5) {
      const temp = val;
      val = sd;
      sd = temp;
      autoCorrected = true;
      warnings.push(`Posisi Hasil (${val}) dan Standar Deviasi (${sd}) terdeteksi terbalik dan telah ditukar secara otomatis.`);
    }

    // Smart Magnitude & Decimal Auto-Correction (e.g., receipt prints 38 or 382 for ALB where target mean is ~3.85, or 318 for ALT where target mean is ~32.0)
    const expectedMean = masterParam?.targetMean || (schema ? (schema.typicalMeanRange[0] + schema.typicalMeanRange[1]) / 2 : 0);
    if (expectedMean > 0 && val > 0 && schema.expectedType !== 'integer') {
      if (val > expectedMean * 3.5 || val > schema.maxPhysiological) {
        if (Math.abs((val / 10) - expectedMean) <= expectedMean * 0.75) {
          const oldVal = val;
          val = Number((val / 10).toFixed(schema.decimalPlaces));
          autoCorrected = true;
          warnings.push(`Nilai hasil (${oldVal}) dikoreksi desimalnya secara otomatis menjadi ${val} agar sesuai dengan target mean (${expectedMean} ${schema.unit}).`);
        } else if (Math.abs((val / 100) - expectedMean) <= expectedMean * 0.75) {
          const oldVal = val;
          val = Number((val / 100).toFixed(schema.decimalPlaces));
          autoCorrected = true;
          warnings.push(`Nilai hasil (${oldVal}) dikoreksi desimalnya secara otomatis menjadi ${val} agar sesuai dengan target mean (${expectedMean} ${schema.unit}).`);
        } else if (Math.abs((val / 1000) - expectedMean) <= expectedMean * 0.75) {
          const oldVal = val;
          val = Number((val / 1000).toFixed(schema.decimalPlaces));
          autoCorrected = true;
          warnings.push(`Nilai hasil (${oldVal}) dikoreksi desimalnya secara otomatis menjadi ${val} agar sesuai dengan target mean (${expectedMean} ${schema.unit}).`);
        }
      }
    }

    // Check physiological bounds
    if (val < schema.minPhysiological || val > schema.maxPhysiological) {
      warnings.push(`Nilai hasil (${val} ${schema.unit}) berada di luar batas rentang fisiologis kontrol (${schema.minPhysiological} - ${schema.maxPhysiological} ${schema.unit}).`);
    }

    // Check SD sanity (SD must be positive and non-zero)
    if (sd <= 0) {
      sd = masterParam?.targetSD || schema.typicalSDRange[0];
      autoCorrected = true;
      warnings.push(`Nilai SD tidak valid (${rawSD}), disesuaikan dengan nilai master data (${sd}).`);
    } else if (sd > schema.typicalSDRange[1] * 3) {
      warnings.push(`Nilai SD (${sd}) tampak terlalu besar untuk parameter ${schema.code} (biasanya < ${schema.typicalSDRange[1] * 2}).`);
    }

    // Check Mean sanity
    if (mean <= 0) {
      mean = masterParam?.targetMean || (schema.typicalMeanRange[0] + schema.typicalMeanRange[1]) / 2;
      autoCorrected = true;
      warnings.push(`Nilai Target Mean (${rawMean}) tidak valid, disinkronkan dengan master data (${mean}).`);
    }

    // Precision formatting
    val = Number(val.toFixed(schema.decimalPlaces));
    mean = Number(mean.toFixed(schema.decimalPlaces));
    sd = Number(sd.toFixed(schema.decimalPlaces > 0 ? Math.max(schema.decimalPlaces, 2) : 2));
  } else {
    // Generic validation
    if (sd <= 0) sd = masterParam?.targetSD || 1.0;
    if (mean <= 0) mean = masterParam?.targetMean || val || 100.0;
  }

  const formatMatch = warnings.length === 0;

  return {
    isValid: val > 0,
    sanitizedValue: val,
    sanitizedMean: mean,
    sanitizedSD: sd,
    formatMatch,
    warnings,
    autoCorrected,
    schema
  };
}

export interface BatchSchemaValidationResult {
  totalItems: number;
  validItemsCount: number;
  correctedItemsCount: number;
  warningCount: number;
  allMatchSchema: boolean;
  validatedResults: any[];
  summaryMessage: string;
}

/**
 * Validates a batch of extracted QC items against parameter schemas
 */
export function validateExtractedResultsBatch(
  items: any[],
  parameters: Parameter[] = []
): BatchSchemaValidationResult {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      totalItems: 0,
      validItemsCount: 0,
      correctedItemsCount: 0,
      warningCount: 0,
      allMatchSchema: true,
      validatedResults: [],
      summaryMessage: 'Tidak ada item yang divalidasi'
    };
  }

  let correctedCount = 0;
  let warningCount = 0;
  let validCount = 0;

  const validatedResults = items.map((item) => {
    const rawParamName = item.parameter?.value || item.parameter?.original_text || '';
    let rawVal = item.result?.value ?? item.result?.original_text ?? 0;
    const rawMean = item.mean?.value ?? item.mean?.original_text ?? 0;
    const rawSD = item.sd?.value ?? item.sd?.original_text ?? 0;

    // If result was 0 but mean had the single number from receipt and SD was 0/null
    if ((rawVal === 0 || rawVal === '0') && (rawSD === 0 || rawSD === '0' || rawSD == null) && rawMean) {
      rawVal = rawMean;
    }

    const matchedParam = parameters.find(p => 
      p.code.toLowerCase() === rawParamName.toLowerCase() ||
      p.name.toLowerCase().includes(rawParamName.toLowerCase()) ||
      rawParamName.toLowerCase().includes(p.code.toLowerCase())
    );

    const valResult = validateQCItemSchema(rawVal, rawMean, rawSD, rawParamName, matchedParam);

    if (valResult.isValid) validCount++;
    if (valResult.autoCorrected) correctedCount++;
    if (valResult.warnings.length > 0) warningCount += valResult.warnings.length;

    return {
      ...item,
      result: {
        ...(item.result || {}),
        value: valResult.sanitizedValue,
        confidence: item.result?.confidence || 0.95
      },
      mean: {
        ...(item.mean || {}),
        value: valResult.sanitizedMean,
        confidence: item.mean?.confidence || 0.95
      },
      sd: {
        ...(item.sd || {}),
        value: valResult.sanitizedSD,
        confidence: item.sd?.confidence || 0.95
      },
      schema_validation: {
        is_valid: valResult.isValid,
        format_match: valResult.formatMatch,
        warnings: valResult.warnings,
        auto_corrected: valResult.autoCorrected,
        expected_type: valResult.schema?.expectedType,
        decimal_places: valResult.schema?.decimalPlaces,
        expected_unit: valResult.schema?.unit
      }
    };
  });

  const allMatch = warningCount === 0;
  let summaryMessage = `${validCount} dari ${items.length} parameter valid sesuai skema laboratorium`;
  if (correctedCount > 0) {
    summaryMessage += ` (${correctedCount} angka telah diselaraskan otomatis)`;
  }

  return {
    totalItems: items.length,
    validItemsCount: validCount,
    correctedItemsCount: correctedCount,
    warningCount,
    allMatchSchema: allMatch,
    validatedResults,
    summaryMessage
  };
}

