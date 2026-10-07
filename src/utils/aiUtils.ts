import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation, QCStatus } from '../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from './qcCalculations';

export interface ExtractedAIItem {
  parameter?: { value?: string; original_text?: string; confidence?: number };
  level?: { value?: string; original_text?: string; confidence?: number };
  lot?: { value?: string; confidence?: number };
  result?: { value?: number; original_text?: string; confidence?: number };
  unit?: { value?: string; confidence?: number };
  mean?: { value?: number; confidence?: number };
  sd?: { value?: number; confidence?: number };
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
  
  resultValue: number;
  unit: string;
  targetMean: number;
  targetSD: number;
  
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

// Parameter alias dictionaries for common clinical laboratory tests
const PARAM_ALIASES: Record<string, string[]> = {
  'param-glu': ['glucose', 'glu', 'gluc', 'gds', 'gdp', 'glukosa', 'blood sugar', 'gula darah'],
  'param-chol': ['cholesterol', 'chol', 'tc', 'kolesterol', 'chol total', 'cholesterol total'],
  'param-urea': ['urea', 'ureum', 'bun', 'blood urea nitrogen', 'ure'],
  'param-creat': ['creatinine', 'crea', 'creat', 'kreatinin', 'cr'],
  'param-trig': ['triglyceride', 'trig', 'tg', 'trigliserida'],
  'param-sgot': ['sgot', 'ast', 'aspartate aminotransferase', 'got'],
  'param-sgpt': ['sgpt', 'alt', 'alanine aminotransferase', 'gpt'],
  'param-ua': ['uric acid', 'ua', 'asam urat', 'urate'],
  'param-alb': ['albumin', 'alb'],
  'param-tp': ['total protein', 'tp', 'protein total'],
  'param-tbil': ['total bilirubin', 'tbil', 'bilirubin total', 'bili total'],
  'param-dbil': ['direct bilirubin', 'dbil', 'bilirubin direk'],
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
    if (aliases.some(alias => searchStr.includes(alias))) {
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

  return extractedResults.map((item, index) => {
    const paramName = item.parameter?.value || item.parameter?.original_text || '';
    const matchedParam = matchParameter(paramName, item.parameter?.original_text, parameters);
    const matchedInst = matchInstrument(item.analyzer || docAnalyzer, instruments);
    const controlLevel = matchControlLevel(item.level?.value || documentMeta?.control_level);
    
    const lotNumber = item.lot?.value || documentMeta?.lot_number || (controlLevel === 'Level 2' ? 'LOT-CCM2-2026B' : 'LOT-CCM1-2026A');
    const resultValue = typeof item.result?.value === 'number' ? item.result.value : parseFloat(String(item.result?.original_text || '0')) || 0;
    
    const targetMean = matchedParam?.targetMean || item.mean?.value || (resultValue > 0 ? resultValue : 100);
    const targetSD = matchedParam?.targetSD || item.sd?.value || (targetMean * 0.035);
    const unit = matchedParam?.unit || item.unit?.value || 'mg/dL';
    
    const zScore = calculateZScore(resultValue, targetMean, targetSD);
    const sdPosition = formatSDPosition(zScore);

    // Evaluate Westgard rules
    const history = existingResults.filter(r => r.parameterId === matchedParam?.id);
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
      sourceText: item.source_text || item.result?.original_text,
      confidence,
      needsVerification,
      verificationReason: item.verification_reason || (status !== 'pass' ? `Status QC: ${status.toUpperCase()}` : null),
      
      instrumentId: matchedInst?.id || 'inst-chem-a',
      instrumentName: matchedInst?.name || 'Chemistry Analyzer A (Cobas c311)',
      parameterId: matchedParam?.id || 'param-glu',
      parameterName: matchedParam?.name || 'Glucose (Glukosa Darah Sewaktu/Puasa)',
      parameterCode: matchedParam?.code || 'GLU',
      controlLevel,
      lotNumber,
      
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
