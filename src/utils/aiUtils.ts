import { Parameter, Instrument, ControlMaterial, QCResult, WestgardViolation, QCStatus } from '../types';
import { calculateZScore, formatSDPosition, evaluateWestgardRules, DEFAULT_WESTGARD_RULES } from './qcCalculations';
import { validateQCItemSchema, ValidationResult, PARAMETER_SCHEMAS } from './schemaValidation';
import { StorageService } from '../services/storage';

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
  'alb': ['alb', 'albumin', 'alb-bcp', 'alb-bcg', 'albumin cst-240'],
  'alt': ['alt', 'sgpt', 'gpt', 'alt/sgpt', 'alanine aminotransferase', 'sgpt / alt'],
  'ast': ['ast', 'sgot', 'got', 'ast/sgot', 'aspartate aminotransferase', 'sgot / ast'],
  'glu-hk': ['glu-hk', 'gluhk', 'glu', 'gluc', 'glucose', 'hexokinase', 'glukosa', 'gds', 'gdp', 'gula darah'],
  'glu': ['glucose', 'glu', 'gluc', 'glu-hk', 'glu-g', 'gds', 'gdp', 'glukosa', 'blood sugar', 'gula darah'],
  'au': ['au', 'ua', 'uric acid', 'uric', 'asam urat', 'urate', 'asam urat / au'],
  'ua': ['uric acid', 'ua', 'au', 'uric', 'asam urat', 'urate'],
  'bun': ['bun', 'urea', 'ureum', 'blood urea nitrogen', 'ure', 'bun / urea'],
  'urea': ['urea', 'ureum', 'bun', 'blood urea nitrogen', 'ure'],
  'cre-e': ['cre-e', 'cree', 'cre', 'crea', 'creatinine', 'creat', 'kreatinin', 'cr', 'creatinine enzymatic'],
  'creat': ['creatinine', 'crea', 'cre-e', 'cre', 'creat', 'kreatinin', 'cr'],
  'tg': ['tg', 'trig', 'triglyceride', 'trigliserida', 'trigliserida / tg'],
  'tc': ['tc', 'chol', 't-cho', 'cholesterol', 'kolesterol', 'chol total', 'cholesterol total', 'total cholesterol / tc'],
  'chol': ['cholesterol', 'chol', 'tc', 'cho', 't-cho', 'kolesterol', 'chol total', 'cholesterol total'],
  'tbil': ['tbil', 't-bil', 'total bilirubin', 'bilirubin total', 'bili total', 't-bilirubin'],
  'dbil': ['dbil', 'd-bil', 'direct bilirubin', 'bilirubin direk', 'bili direk', 'd-bilirubin'],
  'tp': ['total protein', 'tp', 'protein total', 'prot total'],
  'sgot': ['sgot', 'ast', 'got', 'aspartate aminotransferase', 'sgot / ast'],
  'sgpt': ['sgpt', 'alt', 'gpt', 'alanine aminotransferase', 'sgpt / alt'],
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
  
  const rawCodeClean = (rawCode || '').toUpperCase().trim();
  const rawNameClean = (rawName || '').trim();
  const searchStr = `${rawNameClean} ${rawCodeClean}`.toLowerCase().trim();

  // Extract clean code tokens (e.g. "ALB", "ALT", "AST", "GLU", "GLU-HK", "AU", "BUN", "CRE-E", "TG", "TC", "TBIL", "DBIL", "WBC", "PLT")
  const extractedTokens = `${rawNameClean} ${rawCodeClean}`
    .toUpperCase()
    .split(/[\s,/_.:;()-]+/)
    .filter(t => t.length >= 2 && !/^[0-9]+$/.test(t));

  // If instrument is specified, prioritize parameters attached to this instrument
  const primaryPool = targetInstrumentId 
    ? parameters.filter(p => p.instrumentId === targetInstrumentId)
    : parameters;

  const fallbackPool = parameters;

  // Search in prioritized pool first, then fallback pool
  for (const pool of [primaryPool, fallbackPool]) {
    // 0. High Sensitivity: Token-level exact parameter code match (ALB, ALT, AST, GLU-HK, AU, BUN, CRE-E, TG, TC, TBIL, DBIL, WBC, PLT, etc.)
    for (const token of extractedTokens) {
      const tokenMatch = pool.find(p => p.code.toUpperCase() === token || p.code.toUpperCase().replace(/[-_]/g, '') === token);
      if (tokenMatch) return tokenMatch;

      // Try root prefix (e.g. GLU-HK -> GLU, CRE-E -> CREAT)
      const rootToken = token.split(/[-_]/)[0];
      if (rootToken && rootToken.length >= 2) {
        const rootMatch = pool.find(p => p.code.toUpperCase().startsWith(rootToken));
        if (rootMatch) return rootMatch;
      }
    }

    // 1. Direct code or name match
    for (const p of pool) {
      if (p.code.toLowerCase() === searchStr || p.name.toLowerCase() === searchStr) {
        return p;
      }
    }

    // 2. Exact word / code match in string tokens
    const tokens = searchStr.split(/[\s,/_.-]+/).filter(Boolean);
    for (const p of pool) {
      const pCode = p.code.toLowerCase();
      if (tokens.includes(pCode)) {
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
      if (aliases.some(alias => searchStr === alias || tokens.includes(alias) || searchStr.includes(alias) || extractedTokens.includes(alias.toUpperCase()))) {
        const match = pool.find(p => p.code.toLowerCase() === key || p.code.toLowerCase().includes(key) || p.id.toLowerCase().includes(key));
        if (match) return match;
      }
    }
  }

  // Return null if no matching parameter exists in master data (abaikan parameter yang tidak ada di master data)
  return null;
}

export function matchInstrument(
  rawName: string | undefined, 
  instruments: Instrument[]
): Instrument | null {
  if (instruments.length === 0) return null;
  if (!rawName) return instruments[0] || null;
  const searchStr = rawName.toLowerCase().trim();

  // 1. High Priority: Explicit Dirui Dimih 3980 / Hematology check
  if (
    searchStr.includes('dimih') || 
    searchStr.includes('3980') || 
    searchStr.includes('bcc-3900') ||
    searchStr.includes('cbc') ||
    searchStr.includes('hematology') ||
    searchStr.includes('hematologi') ||
    /\b(wbc|rbc|hgb|hct|plt|mcv|mch|mchc|lym|gran|mid|rdw|mpv)\b/i.test(searchStr)
  ) {
    const dimih = instruments.find(i => i.id === 'inst-dirui-3980' || i.name.toLowerCase().includes('3980') || i.model.toLowerCase().includes('3980') || i.code.toLowerCase().includes('3980'));
    if (dimih) return dimih;
  }

  // 2. High Priority: CST-240 / CS-T240 / Chemistry Analyzer check
  if (
    searchStr.includes('cst-240') || 
    searchStr.includes('cs-t240') || 
    searchStr.includes('cst240') || 
    searchStr.includes('cst 240') ||
    searchStr.includes('cst') ||
    searchStr.includes('kimia') ||
    searchStr.includes('chemistry') ||
    /\b(glu-hk|cre-e|tbil|dbil|alb|alt|ast|au|bun|tg|tc|sgot|sgpt)\b/i.test(searchStr)
  ) {
    const cst = instruments.find(i => i.id === 'inst-cst240' || i.name.toLowerCase().includes('cst') || i.model.toLowerCase().includes('cst') || i.name.toLowerCase().includes('chemistry'));
    if (cst) return cst;
  }

  // 3. Cobas c311 keywords
  if (searchStr.includes('cobas') || searchStr.includes('roche') || searchStr.includes('c311')) {
    const cobas = instruments.find(i => i.name.toLowerCase().includes('cobas') || i.model.toLowerCase().includes('cobas'));
    if (cobas) return cobas;
  }

  // 4. Sysmex keywords
  if (searchStr.includes('sysmex') || searchStr.includes('xn')) {
    const sysmex = instruments.find(i => i.name.toLowerCase().includes('sysmex'));
    if (sysmex) return sysmex;
  }

  // 5. General check across all instruments
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
  filterInstrumentId?: string,
  controls?: ControlMaterial[]
): VerifiedQCItem[] {
  const masterControls = controls && controls.length > 0 ? controls : StorageService.getControlMaterials();
  const today = documentMeta?.date || new Date().toISOString().split('T')[0];
  const time = documentMeta?.time || new Date().toTimeString().split(' ')[0].substring(0, 5);
  const docAnalyzer = documentMeta?.analyzer;
  const controlLevel = matchControlLevel(documentMeta?.control_level);
  const lotNumber = documentMeta?.lot_number || (masterControls[0]?.lotNumber || 'LOT-CST1-2026A');

  // Determine the target instrument for this document
  let defaultInst = (filterInstrumentId ? instruments.find(i => i.id === filterInstrumentId) : null) 
    || matchInstrument(docAnalyzer, instruments) 
    || instruments[0];

  const rawTextCombined = (extractedResults || []).map(r => 
    `${r.parameter?.value || ''} ${r.parameter?.original_text || ''} ${r.source_text || ''}`
  ).join(' ').toUpperCase();

  const hasHematologyCodes = ['WBC', 'RBC', 'HGB', 'HB', 'HCT', 'PLT', 'MCV', 'MCH', 'MCHC', 'LYM', 'GRAN', 'MID', 'RDW', 'MPV'].some(code => {
    const regex = new RegExp(`\\b${code}\\b`, 'i');
    return regex.test(rawTextCombined);
  });

  const hasChemistryCodes = ['ALB', 'ALT', 'AST', 'GLU-HK', 'GLU', 'AU', 'BUN', 'CRE-E', 'CREA', 'CREAT', 'TG', 'TC', 'TBIL', 'DBIL', 'TP', 'SGOT', 'SGPT', 'UREA', 'CHOL', 'UA'].some(code => {
    const regex = new RegExp(`\\b${code.replace('-', '[-_]?')}\\b`, 'i');
    return regex.test(rawTextCombined);
  });

  // Force defaultInst according to detected codes if not explicitly filtered
  if (!filterInstrumentId) {
    if (hasHematologyCodes && !hasChemistryCodes) {
      const dimih = instruments.find(i => i.id === 'inst-dirui-3980' || i.name.toLowerCase().includes('3980') || i.model.toLowerCase().includes('3980'));
      if (dimih) defaultInst = dimih;
    } else if (hasChemistryCodes && !hasHematologyCodes) {
      const cst = instruments.find(i => i.id === 'inst-cst240' || i.name.toLowerCase().includes('cst') || i.name.toLowerCase().includes('chem'));
      if (cst) defaultInst = cst;
    }
  }

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
      const pName = (item.parameter?.value || item.parameter?.original_text || (item as any)['Parameter'] || (item as any)['HGB'] || '').toLowerCase();
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
    .map((item: any, index: number): VerifiedQCItem | null => {
      const paramName = item['Parameter'] || item['HGB'] || item.parameter?.value || item.parameter?.original_text || '';
      const paramCode = item['Parameter'] || item['HGB'] || item.parameter?.original_text || '';

      const matchedInst = (filterInstrumentId ? instruments.find(i => i.id === filterInstrumentId) : null) 
        || matchInstrument(item.analyzer || docAnalyzer, instruments) 
        || defaultInst;

      const matchedParam = matchParameter(paramName, paramCode, parameters, matchedInst?.id);
      
      // Abaikan parameter yang tidak ada di master data yang diinput
      if (!matchedParam) {
        return null;
      }

      const matchedControl = masterControls.find(c => c.id === matchedParam.controlMaterialId);

      const itemLevel = matchControlLevel(
        item.level?.value || documentMeta?.control_level || matchedControl?.level
      );
      
      const itemLot = item.lot?.value || 
                      documentMeta?.lot_number || 
                      matchedControl?.lotNumber || 
                      (matchedControl?.lotNumber || masterControls[0]?.lotNumber || 'LOT-CST1-2026A');
      
      const itemDate = item['tanggal QC'] || item['tanggal'] || item['date'] || documentMeta?.date || today;

      // 1. Result value: Support 'hasil/ result', 'hasil', 'result', 'value'
      let rawResultValue: number = 0;
      const jsonVal = item['hasil/ result'] ?? item['hasil'] ?? item['result'] ?? item['value'];
      if (typeof jsonVal === 'number' && !isNaN(jsonVal) && jsonVal > 0) {
        rawResultValue = jsonVal;
      } else if (typeof jsonVal === 'string') {
        const parsed = parseFloat(jsonVal.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed) && parsed > 0) rawResultValue = parsed;
      }

      if (rawResultValue === 0 && typeof item.result?.value === 'number' && !isNaN(item.result.value) && item.result.value > 0) {
        rawResultValue = item.result.value;
      } else if (rawResultValue === 0 && item.result?.original_text) {
        const parsed = parseFloat(String(item.result.original_text).replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          rawResultValue = parsed;
        }
      }

      // If item.result was empty or not populated, check if item.mean held the single measurement from receipt
      if (rawResultValue === 0 && typeof item.mean?.value === 'number' && !isNaN(item.mean.value) && item.mean.value > 0) {
        if (!item.sd?.value || item.sd.value === 0) {
          // Single number on receipt -> this is the measured QC result
          rawResultValue = item.mean.value;
        }
      }

      // If still 0, search for number in source_text or parameter text (e.g. "HGB 12,6")
      if (rawResultValue === 0) {
        const textToSearch = `${item.source_text || ''} ${item.parameter?.original_text || ''} ${item.parameter?.value || ''}`;
        const matchNum = textToSearch.match(/(?:[0-9]+[.,][0-9]+|\b[0-9]+\b)/);
        if (matchNum) {
          const parsed = parseFloat(matchNum[0].replace(/,/g, '.'));
          if (!isNaN(parsed) && parsed > 0) {
            rawResultValue = parsed;
          }
        }
      }

      // Fallback only if no number could be found
      if (rawResultValue === 0) {
        rawResultValue = matchedParam.targetMean || 100;
      }

      // 2. Target Mean: If explicitly printed in separate column distinct from result, use it; otherwise, use Master Data
      let rawTargetMean: number;
      if (
        typeof item.mean?.value === 'number' && 
        !isNaN(item.mean.value) && 
        item.mean.value > 0 &&
        item.mean.value !== rawResultValue &&
        typeof item.sd?.value === 'number' &&
        item.sd.value > 0
      ) {
        rawTargetMean = item.mean.value;
      } else {
        rawTargetMean = matchedParam.targetMean || 100;
      }

      // 3. Target SD: If explicitly printed on receipt and > 0, use it; otherwise, use Master Data
      let rawTargetSD: number;
      if (typeof item.sd?.value === 'number' && !isNaN(item.sd.value) && item.sd.value > 0) {
        rawTargetSD = item.sd.value;
      } else {
        rawTargetSD = matchedParam.targetSD || 3.5;
      }

      // Intelligent Auto-Detection & Fix for Inverted Result vs Target SD:
      const code = (matchedParam.code || paramName).toUpperCase();
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

      const unit = item.unit?.value || matchedParam.unit || 'mg/dL';
      const isDimih = matchedInst?.id === 'inst-dirui-3980' || matchedInst?.name.toLowerCase().includes('3980') || matchedInst?.name.toLowerCase().includes('dimih');

      const finalParam = matchedParam;

      // Validate with clinical schema
      const validation = validateQCItemSchema(
        rawResultValue, 
        rawTargetMean, 
        rawTargetSD, 
        finalParam.code || paramName, 
        finalParam
      );

      const finalResultValue = validation.sanitizedValue;
      const finalTargetMean = validation.sanitizedMean;
      const finalTargetSD = validation.sanitizedSD;

      // Recalculate Z-Score with sanitized values
      const zScore = calculateZScore(finalResultValue, finalTargetMean, finalTargetSD);
      const sdPosition = formatSDPosition(zScore);

      // Evaluate Westgard rules
      const history = existingResults.filter(r => r.parameterId === finalParam.id);
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
        parameterId: finalParam.id,
        parameterName: finalParam.name,
        parameterCode: finalParam.code,
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
        date: itemDate,
        time: time
      };
    })
    .filter((item): item is VerifiedQCItem => item !== null);
}
