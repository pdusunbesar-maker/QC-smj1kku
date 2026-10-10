import { createWorker, PSM } from 'tesseract.js';
import { preprocessDiruiReceipt, CropRegion, DEFAULT_DIRUI_TABLE_CROP, PreprocessResult } from '../utils/diruiOcrPreprocessing';

export interface DiruiParsedItem {
  id: string;
  item: string;
  hasil: number;
  flag: 'L' | 'H' | null;
  unit: string;
  rawText?: string;
  confidence?: number;
}

export interface DiruiOcrProgress {
  status: string;
  progress: number;
}

export interface DiruiOcrExecutionResult {
  rawText: string;
  items: DiruiParsedItem[];
  preprocessedDataUrl: string;
  preprocessedBlob: Blob;
  cropRect: { x: number; y: number; width: number; height: number };
}

/**
 * Normalizes common medical unit representations from thermal print OCR
 */
function normalizeUnit(rawUnit: string): string {
  if (!rawUnit) return '';
  const clean = rawUnit.trim();
  const upper = clean.toUpperCase();

  if (upper === 'G/DL' || upper === 'GDL') return 'g/dL';
  if (upper === 'FL') return 'fL';
  if (upper === 'PG') return 'pg';
  if (upper === '%' || upper === 'PCT') return '%';
  if (upper.includes('10^9') || upper.includes('10*9') || upper.includes('109/L')) return '10^9/L';
  if (upper.includes('10^12') || upper.includes('10*12') || upper.includes('1012/L')) return '10^12/L';
  if (upper.includes('10^3') || upper.includes('10*3') || upper.includes('/UL')) return '10^3/uL';
  if (upper.includes('10^6') || upper.includes('10*6')) return '10^6/uL';
  if (upper === 'MM/H' || upper === 'MM/HR') return 'mm/jam';
  return clean;
}

/**
 * Standard known hematology parameters on Dirui Dimih 3980 / 5-Diff analyzers
 */
const KNOWN_DIRUI_ITEMS = new Set([
  'WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT',
  'LYM%', 'MXD%', 'NEUT%', 'LYM#', 'MXD#', 'NEUT#', 'MONO%', 'EOS%', 'BASO%',
  'MONO#', 'EOS#', 'BASO#', 'RDW-CV', 'RDW-SD', 'MPV', 'PDW', 'PCT', 'P-LCR', 'P-LCC'
]);

/**
 * Parsing Logic (PENTING):
 * Setiap baris formatnya: [FLAG] [ITEM] [FLAG] [NILAI] [UNIT]
 * Flag bisa L/H sebelum nilai, contoh: "L 31.1" atau "MCHC L 31.1"
 * Regex: /(?:[LH]\s*)?([A-Z\-]+)\s+(?:[LH]\s*)?([0-9]+\.?[0-9]*)\s+([0-9\^\%\/a-zA-Z]+)/g
 * Simpan flag terpisah: flag = L/H/null
 */
export function parseDiruiHematologiText(rawText: string): DiruiParsedItem[] {
  const items: DiruiParsedItem[] = [];
  const seenItems = new Map<string, number>();

  // Process line by line first
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Line-level capture regex matching: [FLAG?] [ITEM] [FLAG?] [NILAI] [UNIT]
  const linePattern = /(?:([LH])\s+)?([A-Z0-9\-%#]+)\s+(?:([LH])\s+)?([0-9]+\.?[0-9]*)\s+([0-9\^\%\/a-zA-Z#]+)/i;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Clean up extraneous symbols while preserving required chars: A-Z 0-9 - % # . / ^
    const cleanLine = line.replace(/[^A-Za-z0-9\s%\#\.\-\^\/]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanLine) continue;

    const match = cleanLine.match(linePattern);
    if (match) {
      const flagPre = match[1]?.toUpperCase();
      let itemName = match[2]?.toUpperCase().trim();
      const flagPost = match[3]?.toUpperCase();
      const valStr = match[4];
      const unitStr = match[5]?.trim();

      // Normalize common OCR confusions on Item names (e.g., RBC with 8BC, HCT with HGI)
      if (itemName === '8BC') itemName = 'RBC';
      if (itemName === 'W8C') itemName = 'WBC';
      if (itemName === 'MCHG') itemName = 'MCHC';

      // Skip non-item header/footer lines
      if (['DATE', 'TIME', 'ID', 'SAMPLE', 'PATIENT', 'NAME', 'NO', 'DIRUI', 'DIMIH', 'OPERATOR'].includes(itemName)) {
        continue;
      }

      // Determine flag
      let flag: 'L' | 'H' | null = null;
      if (flagPost === 'L' || flagPost === 'H') {
        flag = flagPost as 'L' | 'H';
      } else if (flagPre === 'L' || flagPre === 'H') {
        flag = flagPre as 'L' | 'H';
      }

      const hasil = parseFloat(valStr);
      if (isNaN(hasil)) continue;

      const parsed: DiruiParsedItem = {
        id: `dirui-${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}`,
        item: itemName,
        hasil,
        flag,
        unit: normalizeUnit(unitStr),
        rawText: line,
      };

      items.push(parsed);
      seenItems.set(itemName, items.length - 1);
    }
  }

  // Also apply the prompt's exact global regex across the full text
  // to catch any multi-space or wrapped entries that might have missed line boundaries
  const globalRegex = /(?:[LH]\s*)?([A-Z\-]+)\s+(?:[LH]\s*)?([0-9]+\.?[0-9]*)\s+([0-9\^\%\/a-zA-Z]+)/g;
  let gMatch: RegExpExecArray | null;

  while ((gMatch = globalRegex.exec(rawText)) !== null) {
    const fullMatched = gMatch[0];
    const itemName = gMatch[1].toUpperCase().trim();
    const val = parseFloat(gMatch[2]);
    const unitStr = gMatch[3].trim();

    if (['DATE', 'TIME', 'ID', 'SAMPLE', 'DIRUI', 'DIMIH'].includes(itemName)) continue;

    if (!seenItems.has(itemName) && !isNaN(val)) {
      let detectedFlag: 'L' | 'H' | null = null;
      if (/\bL\s+[0-9]/.test(fullMatched) || /^[LH]\s+/.test(fullMatched)) {
        detectedFlag = 'L';
      } else if (/\bH\s+[0-9]/.test(fullMatched)) {
        detectedFlag = 'H';
      }

      items.push({
        id: `dirui-${Date.now()}-g-${Math.random().toString(36).substring(7)}`,
        item: itemName,
        hasil: val,
        flag: detectedFlag,
        unit: normalizeUnit(unitStr),
        rawText: fullMatched
      });
      seenItems.set(itemName, items.length - 1);
    }
  }

  // Sort items: known hematology items first in standard laboratory clinical order
  const orderArray = [
    'WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT',
    'LYM%', 'MXD%', 'NEUT%', 'LYM#', 'MXD#', 'NEUT#',
    'RDW-CV', 'RDW-SD', 'MPV', 'PDW', 'PCT', 'P-LCR'
  ];

  return items.sort((a, b) => {
    const idxA = orderArray.indexOf(a.item);
    const idxB = orderArray.indexOf(b.item);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.item.localeCompare(b.item);
  });
}

/**
 * Main OCR Runner for Dirui Dimih 3980:
 * 1. Preprocessing WAJIB (Grayscale, Contrast 1.8, Threshold 180, Auto Crop)
 * 2. Tesseract.js v5 execution with eng, whitelist, and PSM 6
 * 3. Parsing Logic extraction
 */
export async function executeDiruiOcr(
  imageSource: HTMLImageElement | string,
  cropRegion: CropRegion = DEFAULT_DIRUI_TABLE_CROP,
  onProgress?: (p: DiruiOcrProgress) => void
): Promise<DiruiOcrExecutionResult> {
  // Step 1: Preprocessing WAJIB Canvas
  if (onProgress) onProgress({ status: 'Melakukan preprocessing citra (Grayscale, Contrast 1.8, Threshold 180)...', progress: 0.15 });
  const preprocessed = await preprocessDiruiReceipt(imageSource, cropRegion, {
    contrast: 1.8,
    threshold: 180
  });

  // Step 2: Initialize Tesseract.js v5 Worker with required config:
  // - lang: eng
  // - tessedit_char_whitelist: ABCDEFGHIJKLMNOPQRSTUVWXYZ%#-.0123456789
  // - psm: 6 (SINGLE_BLOCK)
  if (onProgress) onProgress({ status: 'Menginisialisasi engine Tesseract.js v5...', progress: 0.35 });

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress({ status: `Mengekstrak teks struk (${Math.round((m.progress || 0) * 100)}%)...`, progress: 0.4 + (m.progress || 0) * 0.45 });
      }
    }
  });

  try {
    // Config Tesseract
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ%#-.0123456789',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // PSM 6: Assume a single uniform block of text
    });

    if (onProgress) onProgress({ status: 'Melakukan pemindaian OCR karakter struk...', progress: 0.65 });

    // Recognize on the preprocessed canvas
    const { data } = await worker.recognize(preprocessed.canvas);
    const rawText = data.text || '';

    if (onProgress) onProgress({ status: 'Membedah dan memvalidasi baris data hematologi...', progress: 0.9 });

    // Step 3: Parsing Logic
    const items = parseDiruiHematologiText(rawText);

    if (onProgress) onProgress({ status: 'Ekstraksi selesai!', progress: 1.0 });

    return {
      rawText,
      items,
      preprocessedDataUrl: preprocessed.dataUrl,
      preprocessedBlob: preprocessed.blob,
      cropRect: preprocessed.cropRect
    };
  } finally {
    await worker.terminate();
  }
}
