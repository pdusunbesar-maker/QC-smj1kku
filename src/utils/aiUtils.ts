import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation, QCStatus } from '../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from './qcCalculations';

export interface ExtractedAIItem {
  parameter?: { value?: string; original_text?: string; confidence?: number };
  level?: { value?: string; original_text?: string; confidence?: number };
  lot?: { value?: string; confidence?: number };
  result?: { value?: number; original_text?: string; confidence?: number };
  unit?: { value?: string; confidence?: number };
  mean?: { value?: number; original_text?: string; confidence?: number };
  sd?: { value?: number; original_text?: string; confidence?: number };
  analyzer?: string;
  source_text?: string;
  overall_confidence?: number;
  needs_verification?: boolean;
  verification_reason?: string | null;
}

export interface VerifiedQCItem {
  id: string;
  sourceText?: string;
  confidence: number;
  needsVerification: boolean;
  verificationReason?: string | null;
  
  // Matched or edited fields
  instrumentId: string;
  instrumentName: string;
  parameterId: string;
  parameterName: string;
  parameterCode: string;
  controlLevel: 'Level 1' | 'Level 2' | 'Level 3';
  lotNumber: string;
  
  // Explicit distinction between Result, Target Mean, and Target SD
  resultValue: number;       // Hasil QC Aktual / Conc
  unit: string;              // Satuan
  targetMean: number;        // Nilai Target Mean (X̄)
  targetSD: number;          // Nilai Target SD (1 SD)
  
  // Calculated fields
  zScore: number;
  sdPosition: string;
  status: QCStatus;
  violations: WestgardViolation[];
  
  // Selection
  isSelected: boolean;
  date: string;
  time: string;
}

// Parameter alias dictionaries for common clinical laboratory tests (including CST-240 & Dirui codes)
const PARAM_ALIASES: Record<string, string[]> = {
  'param-glu': ['glucose', 'glu', 'gluc', 'glu-g', 'gds', 'gdp', 'glukosa', 'blood sugar', 'gula darah'],
  'param-chol': ['cholesterol', 'chol', 'cho', 't-cho', 'tc', 'kolesterol', 'chol total', 'cholesterol total'],
  'param-urea': ['urea', 'ureum', 'bun', 'blood urea nitrogen', 'ure'],
  'param-creat': ['creatinine', 'crea', 'cre', 'creat', 'kreatinin', 'cr'],
  'param-trig': ['triglyceride', 'trig', 'tg', 'trigliserida'],
  'param-sgot': ['sgot', 'ast', 'got', 'aspartate aminotransferase'],
  'param-sgpt': ['sgpt', 'alt', 'gpt', 'alanine aminotransferase'],
  'param-ua': ['uric acid', 'ua', 'uric', 'asam urat', 'urate'],
  'param-alb': ['albumin', 'alb'],
  'param-tp': ['total protein', 'tp', 'protein total'],
  'param-tbil': ['total bilirubin', 'tbil', 't-bil', 'bilirubin total', 'bili total'],
  'param-dbil': ['direct bilirubin', 'dbil', 'd-bil', 'bilirubin direk'],
  'param-hgb': ['hemoglobin', 'hgb', 'hb', 'haemoglobin'],
  'param-wbc': ['white blood cell', 'wbc', 'leukosit', 'leuko'],
  'param-plt': ['platelet', 'plt', 'trombosit', 'thrombocyte'],
  'param-rbc': ['red blood cell', 'rbc', 'eritrosit', 'erythrocyte'],
  'param-hct': ['hematocrit', 'hct', 'hematokrit', 'pcv'],
};

export function matchParameter(
  rawName: string | undefined, 
  rawCode: string | undefined, 
  parameters: Parameter[]
): Parameter | null {
  if (!rawName && !rawCode) return parameters[0] || null;
  const searchStr = `${rawName || ''} ${rawCode || ''}`.toLowerCase().trim();

  // 1. Direct code or name match
  for (const p of parameters) {
    if (p.code.toLowerCase() === searchStr || p.name.toLowerCase() === searchStr) {
      return p;
    }
  }

  // 2. Contains match
  for (const p of parameters) {
    if (searchStr.includes(p.code.toLowerCase()) || p.name.toLowerCase().includes(searchStr)) {
      return p;
    }
  }

  // 3. Alias match
  for (const [key, aliases] of Object.entries(PARAM_ALIASES)) {
    if (aliases.some(alias => searchStr.includes(alias) || alias === searchStr)) {
      const match = parameters.find(p => p.id === key || p.code.toLowerCase() === key.replace('param-', ''));
      if (match) return match;
    }
  }

  return parameters[0] || null;
}

export function matchInstrument(
  rawName: string | undefined, 
  instruments: Instrument[]
): Instrument | null {
  if (!rawName || instruments.length === 0) return instruments[0] || null;
  const searchStr = rawName.toLowerCase().trim();

  for (const inst of instruments) {
    if (
      inst.name.toLowerCase().includes(searchStr) ||
      inst.model.toLowerCase().includes(searchStr) ||
      inst.code.toLowerCase().includes(searchStr) ||
      searchStr.includes(inst.code.toLowerCase()) ||
      searchStr.includes(inst.model.toLowerCase())
    ) {
      return inst;
    }
  }

  // Analyzer keywords fallback
  if (searchStr.includes('cst-240') || searchStr.includes('cs-t240') || searchStr.includes('cst240') || searchStr.includes('dirui')) {
    const cst = instruments.find(i => i.name.toLowerCase().includes('cst') || i.model.toLowerCase().includes('cst') || i.name.toLowerCase().includes('chem'));
    if (cst) return cst;
  }
  if (searchStr.includes('cobas') || searchStr.includes('roche') || searchStr.includes('c311')) {
    const cobas = instruments.find(i => i.name.toLowerCase().includes('cobas') || i.model.toLowerCase().includes('cobas'));
    if (cobas) return cobas;
  }
  if (searchStr.includes('sysmex') || searchStr.includes('xn')) {
    const sysmex = instruments.find(i => i.name.toLowerCase().includes('sysmex'));
    if (sysmex) return sysmex;
  }

  return instruments[0] || null;
}

export function matchControlLevel(rawLevel: string | undefined): 'Level 1' | 'Level 2' | 'Level 3' {
  if (!rawLevel) return 'Level 1';
  const str = rawLevel.toLowerCase();
  if (str.includes('2') || str.includes('patho') || str.includes('high') || str.includes('tinggi')) {
    return 'Level 2';
  }
  if (str.includes('3') || str.includes('critical') || str.includes('low') || str.includes('rendah')) {
    return 'Level 3';
  }
  return 'Level 1';
}

/**
 * Transforms raw AI OCR extraction output into fully matched, verified QC rows
 * Distinguishes clearly between Result (Conc), Target Mean, and Target SD
 */
export function buildVerifiedItemsFromAI(
  extractedResults: ExtractedAIItem[],
  documentMeta: any,
  parameters: Parameter[],
  instruments: Instrument[],
  existingResults: QCResult[] = []
): VerifiedQCItem[] {
  const today = documentMeta?.date || new Date().toISOString().split('T')[0];
  const time = documentMeta?.time || new Date().toTimeString().split(' ')[0].substring(0, 5);
  const docAnalyzer = documentMeta?.analyzer;
  const controlLevel = matchControlLevel(documentMeta?.control_level);
  const lotNumber = documentMeta?.lot_number || (controlLevel === 'Level 2' ? 'LOT-CCM2-2026B' : 'LOT-CCM1-2026A');

  // Fallback: If AI returned 0 items, generate rows from active master parameters so user never sees empty state
  if (!extractedResults || !Array.isArray(extractedResults) || extractedResults.length === 0) {
    const defaultInst = matchInstrument(docAnalyzer, instruments) || instruments[0];
    const targetParams = parameters.length > 0 ? parameters : [];

    return targetParams.map((param, index) => {
      const targetMean = param.targetMean || 100;
      const targetSD = param.targetSD || 3.5;
      const resultValue = targetMean; // default to target mean for easy adjustment
      const zScore = calculateZScore(resultValue, targetMean, targetSD);
      const sdPosition = formatSDPosition(zScore);

      const history = existingResults.filter(r => r.parameterId === param.id);
      const tempId = `QC-SCAN-FALLBACK-${index}`;
      const { status, violations } = evaluateWestgardRules(
        { id: tempId, value: resultValue, mean: targetMean, sd: targetSD, zScore },
        history,
        DEFAULT_WESTGARD_RULES
      );

      return {
        id: `VERIFY-${Date.now()}-${index}`,
        sourceText: `Master Data Auto-Populated: ${param.name}`,
        confidence: 0.90,
        needsVerification: true,
        verificationReason: 'Periksa & sesuaikan angka hasil dengan foto struk',
        instrumentId: defaultInst?.id || param.instrumentId || 'inst-chem-a',
        instrumentName: defaultInst?.name || 'Chemistry Analyzer A (Cobas c311)',
        parameterId: param.id,
        parameterName: param.name,
        parameterCode: param.code,
        controlLevel,
        lotNumber,
        resultValue,
        unit: param.unit || 'mg/dL',
        targetMean,
        targetSD,
        zScore,
        sdPosition,
        status,
        violations,
        isSelected: true,
        date: today,
        time: time
      };
    });
  }

  return extractedResults.map((item, index) => {
    const paramName = item.parameter?.value || item.parameter?.original_text || '';
    const matchedParam = matchParameter(paramName, item.parameter?.original_text, parameters);
    const matchedInst = matchInstrument(item.analyzer || docAnalyzer, instruments);
    const itemLevel = matchControlLevel(item.level?.value || documentMeta?.control_level);
    
    const itemLot = item.lot?.value || documentMeta?.lot_number || (itemLevel === 'Level 2' ? 'LOT-CCM2-2026B' : 'LOT-CCM1-2026A');
    
    // Result value: The actual measured QC concentration read from photo/struk (CST-240 / Cobas / Sysmex)
    let resultValue: number;
    if (typeof item.result?.value === 'number' && !isNaN(item.result.value)) {
      resultValue = item.result.value;
    } else {
      const parsed = parseFloat(String(item.result?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      resultValue = !isNaN(parsed) && parsed > 0 ? parsed : (matchedParam?.targetMean || 100);
    }

    // Target SD: Prioritize the OCR extracted SD value from the photo, fallback to Master Data
    let targetSD: number;
    if (typeof item.sd?.value === 'number' && !isNaN(item.sd.value) && item.sd.value > 0) {
      targetSD = item.sd.value;
    } else {
      const parsedSD = parseFloat(String(item.sd?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      targetSD = !isNaN(parsedSD) && parsedSD > 0 ? parsedSD : (matchedParam?.targetSD || 3.5);
    }

    // Target Mean: Prioritize the OCR extracted Mean value from the photo if available, fallback to Master Data
    let targetMean: number;
    if (typeof item.mean?.value === 'number' && !isNaN(item.mean.value) && item.mean.value > 0) {
      targetMean = item.mean.value;
    } else {
      const parsedMean = parseFloat(String(item.mean?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      targetMean = !isNaN(parsedMean) && parsedMean > 0 ? parsedMean : (matchedParam?.targetMean || 100);
    }

    const unit = item.unit?.value || matchedParam?.unit || 'mg/dL';
    
    // Calculate Z-Score = (Result - Mean) / SD
    const zScore = calculateZScore(resultValue, targetMean, targetSD);
    const sdPosition = formatSDPosition(zScore);

    // Evaluate Westgard rules
    const history = existingResults.filter(r => r.parameterId === (matchedParam?.id || 'param-glu'));
    const tempId = `QC-SCAN-TEMP-${index}`;
    const { status, violations } = evaluateWestgardRules(
      { id: tempId, value: resultValue, mean: targetMean, sd: targetSD, zScore },
      history,
      DEFAULT_WESTGARD_RULES
    );

    const confidence = item.overall_confidence ?? item.result?.confidence ?? 0.9;
    const needsVerification = item.needs_verification ?? (confidence < 0.8 || status !== 'pass');

    return {
      id: `VERIFY-${Date.now()}-${index}`,
      sourceText: item.source_text || item.result?.original_text || `Hasil QC: ${resultValue} ${unit}`,
      confidence,
      needsVerification,
      verificationReason: item.verification_reason || (status !== 'pass' ? `Status QC: ${status.toUpperCase()}` : null),
      
      instrumentId: matchedInst?.id || 'inst-chem-a',
      instrumentName: matchedInst?.name || 'Chemistry Analyzer A (Cobas c311)',
      parameterId: matchedParam?.id || 'param-glu',
      parameterName: matchedParam?.name || 'Glucose (Glukosa Darah Sewaktu/Puasa)',
      parameterCode: matchedParam?.code || 'GLU',
      controlLevel: itemLevel,
      lotNumber: itemLot,
      
      resultValue,
      unit,
      targetMean,
      targetSD,
      
      zScore,
      sdPosition,
      status,
      violations,
      
      isSelected: true,
      date: today,
      time: time,
    };
  });
}
