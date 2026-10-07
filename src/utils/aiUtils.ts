import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation, QCStatus } from '../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from './qcCalculations';
import { validateQCItemSchema, ValidationResult, PARAMETER_SCHEMAS } from './schemaValidation';

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
  
  // Schema validation metadata
  schemaValid: boolean;
  schemaWarnings: string[];
  schemaExpectedFormat?: string;
  
  // Selection
  isSelected: boolean;
  date: string;
  time: string;
}

// Parameter alias dictionaries for common clinical laboratory tests (including CST-240 & Dirui Dimih 3980 codes)
const PARAM_ALIASES: Record<string, string[]> = {
  'glu': ['glucose', 'glu', 'gluc', 'glu-g', 'gds', 'gdp', 'glukosa', 'blood sugar', 'gula darah'],
  'chol': ['cholesterol', 'chol', 'cho', 't-cho', 'tc', 'kolesterol', 'chol total', 'cholesterol total'],
  'urea': ['urea', 'ureum', 'bun', 'blood urea nitrogen', 'ure'],
  'creat': ['creatinine', 'crea', 'cre', 'creat', 'kreatinin', 'cr'],
  'trig': ['triglyceride', 'trig', 'tg', 'trigliserida'],
  'sgot': ['sgot', 'ast', 'got', 'aspartate aminotransferase'],
  'sgpt': ['sgpt', 'alt', 'gpt', 'alanine aminotransferase'],
  'ua': ['uric acid', 'ua', 'uric', 'asam urat', 'urate'],
  'alb': ['albumin', 'alb'],
  'tp': ['total protein', 'tp', 'protein total'],
  'tbil': ['total bilirubin', 'tbil', 't-bil', 'bilirubin total', 'bili total'],
  'dbil': ['direct bilirubin', 'dbil', 'd-bil', 'bilirubin direk'],
  'hgb': ['hemoglobin', 'hgb', 'hb', 'haemoglobin'],
  'wbc': ['white blood cell', 'wbc', 'leukosit', 'leuko'],
  'rbc': ['red blood cell', 'rbc', 'eritrosit', 'erythrocyte'],
  'hct': ['hematocrit', 'hct', 'hematokrit', 'pcv'],
  'mcv': ['mcv', 'mean corpuscular volume'],
  'mch': ['mch', 'mean corpuscular hemoglobin'],
  'mchc': ['mchc', 'mean corpuscular hemoglobin concentration'],
  'plt': ['platelet', 'plt', 'trombosit', 'thrombocyte'],
  'lym': ['lymphocyte', 'lym', 'lym%', 'ly%', 'limfosit'],
  'gran': ['granulocyte', 'gran', 'gran%', 'neu', 'neu%', 'neutrophil'],
  'mid': ['mid', 'mid%', 'mxd', 'mxd%', 'mon', 'mon%', 'monocyte'],
  'rdw': ['rdw', 'rdw-cv', 'rdw-sd'],
  'mpv': ['mpv', 'mean platelet volume'],
  'pdw': ['pdw'],
  'pct': ['pct', 'plateletcrit']
};

export function matchParameter(
  rawName: string | undefined, 
  rawCode: string | undefined, 
  parameters: Parameter[],
  targetInstrumentId?: string
): Parameter | null {
  if (parameters.length === 0) return null;
  if (!rawName && !rawCode) {
    const instParams = targetInstrumentId ? parameters.filter(p => p.instrumentId === targetInstrumentId) : parameters;
    return instParams[0] || parameters[0] || null;
  }
  
  const searchStr = `${rawName || ''} ${rawCode || ''}`.toLowerCase().trim();

  // If instrument is specified, prioritize parameters attached to this instrument
  const primaryPool = targetInstrumentId 
    ? parameters.filter(p => p.instrumentId === targetInstrumentId)
    : parameters;

  const fallbackPool = parameters;

  // Search in prioritized pool first, then fallback pool
  for (const pool of [primaryPool, fallbackPool]) {
    // 1. Direct code or name match
    for (const p of pool) {
      if (p.code.toLowerCase() === searchStr || p.name.toLowerCase() === searchStr) {
        return p;
      }
    }

    // 2. Exact word / code match in string
    for (const p of pool) {
      const pCode = p.code.toLowerCase();
      if (searchStr.split(/[\s,/_.-]+/).includes(pCode)) {
        return p;
      }
    }

    // 3. Contains match
    for (const p of pool) {
      if (searchStr.includes(p.code.toLowerCase()) || p.name.toLowerCase().includes(searchStr)) {
        return p;
      }
    }

    // 4. Alias match
    for (const [key, aliases] of Object.entries(PARAM_ALIASES)) {
      if (aliases.some(alias => searchStr.includes(alias) || searchStr.split(/[\s,/_.-]+/).includes(alias))) {
        const match = pool.find(p => p.code.toLowerCase() === key || p.id.toLowerCase().includes(key));
        if (match) return match;
      }
    }
  }

  return primaryPool[0] || parameters[0] || null;
}

export function matchInstrument(
  rawName: string | undefined, 
  instruments: Instrument[]
): Instrument | null {
  if (instruments.length === 0) return null;
  if (!rawName) return instruments[0] || null;
  const searchStr = rawName.toLowerCase().trim();

  // Dirui Dimih 3980 keywords
  if (
    searchStr.includes('dimih') || 
    searchStr.includes('3980') || 
    searchStr.includes('dimih 3980') ||
    searchStr.includes('bcc-3900') ||
    searchStr.includes('cbc') ||
    searchStr.includes('hematology')
  ) {
    const dimih = instruments.find(i => i.id === 'inst-dirui-3980' || i.name.toLowerCase().includes('3980') || i.model.toLowerCase().includes('3980'));
    if (dimih) return dimih;
  }

  // CST-240 / CS-T240 Analyzer keywords
  if (
    searchStr.includes('cst-240') || 
    searchStr.includes('cs-t240') || 
    searchStr.includes('cst240') || 
    searchStr.includes('cst 240') ||
    (searchStr.includes('dirui') && (searchStr.includes('chem') || searchStr.includes('cst')))
  ) {
    const cst = instruments.find(i => i.id === 'inst-cst240' || i.name.toLowerCase().includes('cst') || i.model.toLowerCase().includes('cst'));
    if (cst) return cst;
  }

  // General check across all instruments
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

  // Cobas c311 keywords
  if (searchStr.includes('cobas') || searchStr.includes('roche') || searchStr.includes('c311')) {
    const cobas = instruments.find(i => i.name.toLowerCase().includes('cobas') || i.model.toLowerCase().includes('cobas'));
    if (cobas) return cobas;
  }

  // Sysmex keywords
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
 * Strictly isolates parameters to the detected / selected instrument
 */
export function buildVerifiedItemsFromAI(
  extractedResults: ExtractedAIItem[],
  documentMeta: any,
  parameters: Parameter[],
  instruments: Instrument[],
  existingResults: QCResult[] = [],
  filterInstrumentId?: string
): VerifiedQCItem[] {
  const today = documentMeta?.date || new Date().toISOString().split('T')[0];
  const time = documentMeta?.time || new Date().toTimeString().split(' ')[0].substring(0, 5);
  const docAnalyzer = documentMeta?.analyzer;
  const controlLevel = matchControlLevel(documentMeta?.control_level);
  const lotNumber = documentMeta?.lot_number || (controlLevel === 'Level 2' ? 'LOT-CCM2-2026B' : 'LOT-CST1-2026A');

  // Determine the target instrument for this document
  const defaultInst = (filterInstrumentId ? instruments.find(i => i.id === filterInstrumentId) : null) 
    || matchInstrument(docAnalyzer, instruments) 
    || instruments[0];

  // Fallback: If AI returned 0 items, generate rows ONLY from the detected instrument's parameters
  if (!extractedResults || !Array.isArray(extractedResults) || extractedResults.length === 0) {
    let targetParams = parameters.filter(p => p.instrumentId === defaultInst?.id);
    
    // If no parameters explicitly assigned to defaultInst, find chemistry or appropriate params
    if (targetParams.length === 0) {
      if (defaultInst?.id === 'inst-cst240' || defaultInst?.name?.toLowerCase().includes('cst') || defaultInst?.name?.toLowerCase().includes('chem')) {
        targetParams = parameters.filter(p => !p.id.includes('dimih') && !p.id.includes('hema') && !p.name.toLowerCase().includes('dimih'));
      } else if (defaultInst?.id === 'inst-dirui-3980' || defaultInst?.name?.toLowerCase().includes('3980')) {
        targetParams = parameters.filter(p => p.id.includes('dimih') || p.name.toLowerCase().includes('dimih'));
      } else {
        targetParams = parameters.slice(0, 4);
      }
    }

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
        sourceText: `Master Data (${defaultInst?.name || 'CST-240'}): ${param.name}`,
        confidence: 0.90,
        needsVerification: true,
        verificationReason: 'Periksa & sesuaikan angka hasil dengan foto struk',
        instrumentId: defaultInst?.id || param.instrumentId || 'inst-cst240',
        instrumentName: defaultInst?.name || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
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
        schemaValid: true,
        schemaWarnings: [],
        isSelected: true,
        date: today,
        time: time
      };
    });
  }

  // Filter out any AI OCR results that belong to other instruments if instrument is CST-240
  const isCST240Doc = (defaultInst?.id === 'inst-cst240' || docAnalyzer?.toLowerCase().includes('cst'));
  const isDimihDoc = (defaultInst?.id === 'inst-dirui-3980' || docAnalyzer?.toLowerCase().includes('3980'));

  return extractedResults
    .filter(item => {
      const pName = (item.parameter?.value || item.parameter?.original_text || '').toLowerCase();
      // If document is CST-240 chemistry analyzer, exclude hematology/dimih parameters that might have been hallucinated
      if (isCST240Doc && (pName.includes('dimih') || pName.includes('3980') || pName.includes('eightcheck'))) {
        return false;
      }
      // If document is Dimih 3980, exclude pure chemistry parameters if inapplicable
      if (isDimihDoc && (pName.includes('cst-240') || pName.includes('c311'))) {
        return false;
      }
      return true;
    })
    .map((item, index) => {
      const paramName = item.parameter?.value || item.parameter?.original_text || '';
      const matchedInst = (filterInstrumentId ? instruments.find(i => i.id === filterInstrumentId) : null) 
        || matchInstrument(item.analyzer || docAnalyzer, instruments) 
        || defaultInst;

      const matchedParam = matchParameter(paramName, item.parameter?.original_text, parameters, matchedInst?.id);
      const itemLevel = matchControlLevel(item.level?.value || documentMeta?.control_level);
      
      const itemLot = item.lot?.value || documentMeta?.lot_number || (itemLevel === 'Level 2' ? 'LOT-CCM2-2026B' : 'LOT-CST1-2026A');
      
      // Result value: The actual measured QC concentration read from photo/struk
      let rawResultValue: number;
      if (typeof item.result?.value === 'number' && !isNaN(item.result.value)) {
        rawResultValue = item.result.value;
      } else {
        const parsed = parseFloat(String(item.result?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        rawResultValue = !isNaN(parsed) && parsed > 0 ? parsed : (matchedParam?.targetMean || 100);
      }

      // Target SD: Prioritize the OCR extracted SD value from the photo, fallback to Master Data
      let rawTargetSD: number;
      if (typeof item.sd?.value === 'number' && !isNaN(item.sd.value) && item.sd.value > 0) {
        rawTargetSD = item.sd.value;
      } else {
        const parsedSD = parseFloat(String(item.sd?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        rawTargetSD = !isNaN(parsedSD) && parsedSD > 0 ? parsedSD : (matchedParam?.targetSD || 3.5);
      }

      // Target Mean: Prioritize the OCR extracted Mean value from the photo if available, fallback to Master Data
      let rawTargetMean: number;
      if (typeof item.mean?.value === 'number' && !isNaN(item.mean.value) && item.mean.value > 0) {
        rawTargetMean = item.mean.value;
      } else {
        const parsedMean = parseFloat(String(item.mean?.original_text || '0').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        rawTargetMean = !isNaN(parsedMean) && parsedMean > 0 ? parsedMean : (matchedParam?.targetMean || 100);
      }

      // Intelligent Auto-Detection & Fix for Inverted Result vs Target SD:
      const code = (matchedParam?.code || paramName).toUpperCase();
      if (
        (code.includes('GLU') || code.includes('CHOL') || code.includes('TRIG')) &&
        rawResultValue <= 15 && rawTargetSD >= 40
      ) {
        const temp = rawResultValue;
        rawResultValue = rawTargetSD;
        rawTargetSD = temp;
      } else if (
        (code.includes('UREA') || code.includes('BUN') || code.includes('AST') || code.includes('ALT') || code.includes('SGOT') || code.includes('SGPT')) &&
        rawResultValue <= 8 && rawTargetSD >= 20
      ) {
        const temp = rawResultValue;
        rawResultValue = rawTargetSD;
        rawTargetSD = temp;
      } else if (
        (code.includes('CREA') || code.includes('TBIL') || code.includes('DBIL')) &&
        rawResultValue < 0.25 && rawTargetSD >= 0.5
      ) {
        const temp = rawResultValue;
        rawResultValue = rawTargetSD;
        rawTargetSD = temp;
      }

      const unit = item.unit?.value || matchedParam?.unit || 'mg/dL';

      const isDimih = matchedInst?.id === 'inst-dirui-3980' || matchedInst?.name.toLowerCase().includes('3980') || matchedInst?.name.toLowerCase().includes('dimih');
      const defaultParamForInst = isDimih 
        ? (parameters.find(p => p.instrumentId === 'inst-dirui-3980') || parameters.find(p => p.id.includes('dimih') || p.code === 'HGB'))
        : (parameters.find(p => p.instrumentId === 'inst-cst240') || parameters.find(p => p.id.includes('cst') || p.code === 'GLU'));

      const finalParam = matchedParam || defaultParamForInst || parameters[0];

      // Validate with clinical schema
      const validation = validateQCItemSchema(
        rawResultValue, 
        rawTargetMean, 
        rawTargetSD, 
        finalParam?.code || paramName, 
        finalParam
      );

      const finalResultValue = validation.sanitizedValue;
      const finalTargetMean = validation.sanitizedMean;
      const finalTargetSD = validation.sanitizedSD;

      // Recalculate Z-Score with sanitized values
      const zScore = calculateZScore(finalResultValue, finalTargetMean, finalTargetSD);
      const sdPosition = formatSDPosition(zScore);

      // Evaluate Westgard rules
      const history = existingResults.filter(r => r.parameterId === finalParam?.id);
      const tempId = `QC-SCAN-TEMP-${index}`;
      const { status, violations } = evaluateWestgardRules(
        { id: tempId, value: finalResultValue, mean: finalTargetMean, sd: finalTargetSD, zScore },
        history,
        DEFAULT_WESTGARD_RULES
      );

      const confidence = item.overall_confidence ?? item.result?.confidence ?? 0.9;
      const needsVerification = item.needs_verification ?? (confidence < 0.8 || status !== 'pass' || !validation.formatMatch);

      return {
        id: `VERIFY-${Date.now()}-${index}`,
        sourceText: item.source_text || item.result?.original_text || `Hasil QC: ${finalResultValue} ${unit}`,
        confidence,
        needsVerification,
        verificationReason: item.verification_reason || (status !== 'pass' ? `Status QC: ${status.toUpperCase()}` : (!validation.formatMatch ? validation.warnings[0] : null)),
        
        instrumentId: matchedInst?.id || (isDimih ? 'inst-dirui-3980' : 'inst-cst240'),
        instrumentName: matchedInst?.name || (isDimih ? 'Dirui Dimih 3980 Automated Analyzer' : 'Chemistry Analyzer CST-240 (Dirui CS-T240)'),
        parameterId: finalParam?.id || (isDimih ? 'param-dimih-hgb' : 'param-cst-glu'),
        parameterName: finalParam?.name || (isDimih ? 'Hemoglobin / HGB (Dirui Dimih 3980)' : 'Glucose (Glukosa Darah CST-240)'),
        parameterCode: finalParam?.code || (isDimih ? 'HGB' : 'GLU'),
        controlLevel: itemLevel,
        lotNumber: itemLot,
        
        resultValue: finalResultValue,
        unit: validation.schema?.unit || unit,
        targetMean: finalTargetMean,
        targetSD: finalTargetSD,
        
        zScore,
        sdPosition,
        status,
        violations,
        
        schemaValid: validation.isValid && validation.formatMatch,
        schemaWarnings: validation.warnings,
        schemaExpectedFormat: validation.schema ? `${validation.schema.expectedType.toUpperCase()} (${validation.schema.minPhysiological} - ${validation.schema.maxPhysiological} ${validation.schema.unit})` : undefined,
        
        isSelected: true,
        date: today,
        time: time
      };
    });
}
