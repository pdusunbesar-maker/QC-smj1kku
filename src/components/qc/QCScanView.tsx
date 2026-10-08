import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Scan, 
  Loader2, 
  ArrowRight, 
  X, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Eye,
  Zap,
  Image as ImageIcon,
  Edit,
  Filter,
  ShieldCheck,
  Crop,
  Sliders,
  Maximize2,
  Check,
  RotateCcw,
  Sparkle,
  Monitor,
  Grid,
  Crosshair,
  ScanLine,
  Info,
  Focus,
  Sun,
  Layers,
  Plus,
  Trash2,
  CheckCircle,
  ListPlus,
  Images,
  Play
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Instrument, Parameter, ControlMaterial } from '../../types';
import { validateExtractedResultsBatch, PARAMETER_SCHEMAS } from '../../utils/schemaValidation';

interface QCScanViewProps {
  controls?: ControlMaterial[];
  parameters?: Parameter[];
  instruments?: Instrument[];
  onScanComplete: (results: any[], previewUrl: string | null, documentMeta?: any) => void;
}

interface CropRegion {
  x: number;      // % from left (0 - 100)
  y: number;      // % from top (0 - 100)
  width: number;  // % width (10 - 100)
  height: number; // % height (10 - 100)
}

export interface BatchScanItem {
  id: string;
  name: string;
  size: number;
  sourceDataUrl: string;
  croppedDataUrl?: string;
  croppedBase64?: string;
  status: 'ready' | 'processing' | 'done' | 'error';
  results?: any[];
  resultCount?: number;
  error?: string;
  instrumentHint?: string;
}

const DEFAULT_CROP: CropRegion = {
  x: 4,
  y: 6,
  width: 92,
  height: 88
};

// Preset samples with clean, reliable inline base64/SVG or high-reliability data
const SAMPLE_PRESETS = [
  {
    id: 'sample-cst240',
    title: 'Chemistry Analyzer CST-240',
    description: 'ALB, ALT, AST, GLU-HK, AU, BUN, CRE-E, TG, TC, TBIL, DBIL (Dirui CS-T240)',
    badge: 'Dirui CS-T240 (Kimia Klinik)',
    instrumentId: 'inst-cst240',
    color: 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400/30',
    dataUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
      instrument_id: 'inst-cst240',
      control_level: 'Level 1',
      lot_number: 'LOT-CST1-2026A',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Albumin (CST-240)', original_text: 'ALB', confidence: 0.99 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 3.82, original_text: '3.82', confidence: 0.99 },
        unit: { value: 'g/dL', confidence: 0.98 },
        mean: { value: 3.85, confidence: 0.96 },
        sd: { value: 0.12, confidence: 0.96 },
        source_text: 'ALB Conc: 3.82 Target: 3.85 SD: 0.12',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'SGPT / ALT (CST-240)', original_text: 'ALT', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 31.8, original_text: '31.8', confidence: 0.98 },
        unit: { value: 'U/L', confidence: 0.98 },
        mean: { value: 32.0, confidence: 0.96 },
        sd: { value: 1.7, confidence: 0.96 },
        source_text: 'ALT Conc: 31.8 Target: 32.0 SD: 1.70',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'SGOT / AST (CST-240)', original_text: 'AST', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 35.4, original_text: '35.4', confidence: 0.98 },
        unit: { value: 'U/L', confidence: 0.98 },
        mean: { value: 35.0, confidence: 0.96 },
        sd: { value: 1.8, confidence: 0.96 },
        source_text: 'AST Conc: 35.4 Target: 35.0 SD: 1.80',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Glucose Hexokinase / GLU-HK (CST-240)', original_text: 'GLU-HK', confidence: 0.99 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 104.2, original_text: '104.2', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 104.0, confidence: 0.96 },
        sd: { value: 3.5, confidence: 0.96 },
        source_text: 'GLU-HK Conc: 104.2 Target: 104.0 SD: 3.50',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Asam Urat / AU (CST-240)', original_text: 'AU', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 5.18, original_text: '5.18', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 5.20, confidence: 0.95 },
        sd: { value: 0.25, confidence: 0.95 },
        source_text: 'AU Conc: 5.18 Target: 5.20 SD: 0.25',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Blood Urea Nitrogen / BUN (CST-240)', original_text: 'BUN', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 18.6, original_text: '18.6', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 18.5, confidence: 0.95 },
        sd: { value: 0.9, confidence: 0.95 },
        source_text: 'BUN Conc: 18.6 Target: 18.5 SD: 0.90',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Creatinine Enzymatic / CRE-E (CST-240)', original_text: 'CRE-E', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 1.23, original_text: '1.23', confidence: 0.99 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 1.25, confidence: 0.95 },
        sd: { value: 0.06, confidence: 0.95 },
        source_text: 'CRE-E Conc: 1.23 Target: 1.25 SD: 0.06',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Trigliserida / TG (CST-240)', original_text: 'TG', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 124.5, original_text: '124.5', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 125.0, confidence: 0.95 },
        sd: { value: 5.0, confidence: 0.95 },
        source_text: 'TG Conc: 124.5 Target: 125.0 SD: 5.00',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Total Cholesterol / TC (CST-240)', original_text: 'TC', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 161.5, original_text: '161.5', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 160.0, confidence: 0.96 },
        sd: { value: 5.2, confidence: 0.96 },
        source_text: 'TC Conc: 161.5 Target: 160.0 SD: 5.20',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Total Bilirubin / TBIL (CST-240)', original_text: 'TBIL', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 1.12, original_text: '1.12', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 1.15, confidence: 0.95 },
        sd: { value: 0.08, confidence: 0.95 },
        source_text: 'TBIL Conc: 1.12 Target: 1.15 SD: 0.08',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Direct Bilirubin / DBIL (CST-240)', original_text: 'DBIL', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-CST1-2026A', confidence: 0.95 },
        result: { value: 0.34, original_text: '0.34', confidence: 0.98 },
        unit: { value: 'mg/dL', confidence: 0.98 },
        mean: { value: 0.35, confidence: 0.95 },
        sd: { value: 0.04, confidence: 0.95 },
        source_text: 'DBIL Conc: 0.34 Target: 0.35 SD: 0.04',
        overall_confidence: 0.97,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-dimih3980',
    title: 'Dirui Dimih 3980 Analyzer',
    description: 'Hemoglobin, Leukosit (WBC), Trombosit (PLT) (Khusus Dimih 3980)',
    badge: 'Dirui Dimih 3980',
    instrumentId: 'inst-dirui-3980',
    color: 'border-purple-500 bg-purple-50/60 text-purple-900',
    dataUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Dirui Dimih 3980 Automated Analyzer',
      instrument_id: 'inst-dirui-3980',
      control_level: 'Level 1',
      lot_number: 'LOT-EC8C-9912',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Hemoglobin (Dirui Dimih 3980)', original_text: 'HGB', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 12.6, original_text: '12,6', confidence: 0.99 },
        unit: { value: 'g/dL', confidence: 0.98 },
        mean: { value: 13.5, confidence: 0.95 },
        sd: { value: 0.4, confidence: 0.95 },
        source_text: 'HGB 12,6 g/dL',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Leukosit / WBC (Dirui Dimih 3980)', original_text: 'WBC', confidence: 0.97 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 7.2, original_text: '7.2', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 7.2, confidence: 0.95 },
        sd: { value: 0.5, confidence: 0.95 },
        source_text: 'WBC 7.2 10^3/uL',
        overall_confidence: 0.97,
        needs_verification: false
      },
      {
        parameter: { value: 'Trombosit / PLT (Dirui Dimih 3980)', original_text: 'PLT', confidence: 0.96 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.95 },
        lot: { value: 'LOT-EC8C-9912', confidence: 0.95 },
        result: { value: 245, original_text: '245', confidence: 0.98 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 250, confidence: 0.95 },
        sd: { value: 15, confidence: 0.95 },
        source_text: 'PLT 245 10^3/uL',
        overall_confidence: 0.96,
        needs_verification: false
      }
    ]
  },
  {
    id: 'sample-hema550',
    title: 'Sysmex XN-550 Hematology 5-Diff',
    description: 'WBC, RBC, HGB, HCT, PLT, NEUT%, LYMPH% (Sysmex XN-Series)',
    badge: 'Sysmex XN-550',
    instrumentId: 'inst-hema-a',
    color: 'border-emerald-500 bg-emerald-50/50 text-emerald-800',
    dataUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    documentMeta: {
      analyzer: 'Hematology Analyzer 5-Diff (Sysmex XN-550)',
      instrument_id: 'inst-hema-a',
      control_level: 'Level 1',
      lot_number: 'LOT-EIGHT-1026',
      laboratory_name: 'RSUD SULTAN MUHAMMAD JAMALUDIN I',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5)
    },
    presetResults: [
      {
        parameter: { value: 'Leukosit / WBC (Sysmex XN-550)', original_text: 'WBC', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-EIGHT-1026', confidence: 0.95 },
        result: { value: 7.15, original_text: '7.15', confidence: 0.99 },
        unit: { value: '10^3/uL', confidence: 0.98 },
        mean: { value: 7.20, confidence: 0.95 },
        sd: { value: 0.35, confidence: 0.95 },
        source_text: 'WBC 7.15 10^3/uL',
        overall_confidence: 0.98,
        needs_verification: false
      },
      {
        parameter: { value: 'Hemoglobin / HGB (Sysmex XN-550)', original_text: 'HGB', confidence: 0.98 },
        level: { value: 'Level 1', original_text: 'L1', confidence: 0.96 },
        lot: { value: 'LOT-EIGHT-1026', confidence: 0.95 },
        result: { value: 12.8, original_text: '12.8', confidence: 0.99 },
        unit: { value: 'g/dL', confidence: 0.98 },
        mean: { value: 12.9, confidence: 0.95 },
        sd: { value: 0.4, confidence: 0.95 },
        source_text: 'HGB 12.8 g/dL',
        overall_confidence: 0.98,
        needs_verification: false
      }
    ]
  }
];

/**
 * Crops and optimizes an image on a canvas based on crop region percentages
 * Applies optional thermal contrast enhancement for crisp OCR text
 */
async function cropAndOptimizeImage(
  sourceUrl: string,
  crop: CropRegion,
  enhanceContrast: boolean = false
): Promise<{ dataUrl: string; base64: string; croppedWidth: number; croppedHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const fullW = img.naturalWidth || img.width;
        const fullH = img.naturalHeight || img.height;

        // Calculate source rectangle in natural pixels
        const sx = Math.max(0, Math.round((crop.x / 100) * fullW));
        const sy = Math.max(0, Math.round((crop.y / 100) * fullH));
        const sw = Math.min(fullW - sx, Math.max(20, Math.round((crop.width / 100) * fullW)));
        const sh = Math.min(fullH - sy, Math.max(20, Math.round((crop.height / 100) * fullH)));

        // Scale to maximum 1600px dimension for optimal OCR resolution without excessive payload
        const MAX_DIM = 1600;
        let destW = sw;
        let destH = sh;

        if (destW > MAX_DIM || destH > MAX_DIM) {
          if (destW > destH) {
            destH = Math.round((destH * MAX_DIM) / destW);
            destW = MAX_DIM;
          } else {
            destW = Math.round((destW * MAX_DIM) / destH);
            destH = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = destW;
        canvas.height = destH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context tidak tersedia');

        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, destW, destH);

        // Draw cropped section
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);

        // Contrast enhancement for thermal receipts / LCD photos
        if (enhanceContrast) {
          const imgData = ctx.getImageData(0, 0, destW, destH);
          const data = imgData.data;
          const factor = 1.35; // Contrast multiplier
          const intercept = 128 * (1 - factor);

          for (let i = 0; i < data.length; i += 4) {
            // Apply contrast curve to RGB
            data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        const base64 = dataUrl.split(',')[1];
        resolve({ dataUrl, base64, croppedWidth: destW, croppedHeight: destH });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Gagal memuat format gambar untuk pemangkasan: ' + e));
    img.src = sourceUrl;
  });
}

/**
 * Analyze an image using computer vision in JavaScript.
 * Applies a Sobel filter to generate edge magnitude, detects the document margins,
 * and returns the recommended CropRegion along with an edge-detected base64 preview (green neon on black background).
 */
async function detectDocumentEdgesAndCreateSobel(
  sourceUrl: string,
  instrumentTemplate: 'dimih3980' | 'cst240' | 'auto'
): Promise<{ cropRegion: CropRegion; edgeDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const fullW = img.naturalWidth || img.width;
        const fullH = img.naturalHeight || img.height;

        // Create small analytical canvas
        const width = 300;
        const height = Math.round((fullH * width) / fullW);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Grayscale conversion
        const gray = new Uint8Array(width * height);
        let totalLuma = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          gray[i / 4] = luma;
          totalLuma += luma;
        }
        const avgLuma = totalLuma / (width * height);

        // Edge detection canvas & Sobel magnitude calculation
        const edgeCanvas = document.createElement('canvas');
        edgeCanvas.width = width;
        edgeCanvas.height = height;
        const edgeCtx = edgeCanvas.getContext('2d');
        if (!edgeCtx) throw new Error('Edge canvas context not available');
        const edgeImgData = edgeCtx.createImageData(width, height);
        const edgeData = edgeImgData.data;

        const colEdges = new Float32Array(width);
        const rowEdges = new Float32Array(height);

        // Fill background black with alpha 255
        for (let i = 0; i < edgeData.length; i += 4) {
          edgeData[i] = 15;     // dark charcoal background
          edgeData[i + 1] = 23;
          edgeData[i + 2] = 42;
          edgeData[i + 3] = 255;
        }

        const sobelThreshold = 35;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            
            // Sobel kernels
            const gx = 
              -gray[(y-1)*width + (x-1)] + gray[(y-1)*width + (x+1)] +
              -2 * gray[y*width + (x-1)] + 2 * gray[y*width + (x+1)] +
              -gray[(y+1)*width + (x-1)] + gray[(y+1)*width + (x+1)];
            
            const gy = 
              -gray[(y-1)*width + (x-1)] - 2 * gray[(y-1)*width + x] - gray[(y-1)*width + (x+1)] +
              gray[(y+1)*width + (x-1)] + 2 * gray[(y+1)*width + x] + gray[(y+1)*width + (x+1)];
            
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            
            if (magnitude > sobelThreshold) {
              colEdges[x] += magnitude;
              rowEdges[y] += magnitude;

              // Write glowing green pixel for the edge visualization
              const pIdx = idx * 4;
              edgeData[pIdx] = 52;      // Emerald neon green
              edgeData[pIdx + 1] = 211;  // #34d399
              edgeData[pIdx + 2] = 153;
              edgeData[pIdx + 3] = 255;
            }
          }
        }

        edgeCtx.putImageData(edgeImgData, 0, 0);

        // Scan columns from outer bounds to find paper strip / document borders
        let minX = 0;
        let maxX = width - 1;
        let minY = 0;
        let maxY = height - 1;

        if (instrumentTemplate === 'dimih3980') {
          // DIMIH 3980: narrow, high vertical strip
          // Scan row/col profiles
          const colLuma = new Float32Array(width);
          for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let y = 0; y < height; y++) {
              sum += gray[y * width + x];
            }
            colLuma[x] = sum / height;
          }

          // Search left transition edge
          let foundLeft = false;
          for (let x = 12; x < width * 0.45; x++) {
            if (colLuma[x] > avgLuma * 0.9 && colEdges[x] > 40) {
              minX = x;
              foundLeft = true;
              break;
            }
          }
          if (!foundLeft) minX = Math.round(width * 0.15);

          // Search right transition edge
          let foundRight = false;
          for (let x = width - 13; x > width * 0.55; x--) {
            if (colLuma[x] > avgLuma * 0.9 && colEdges[x] > 40) {
              maxX = x;
              foundRight = true;
              break;
            }
          }
          if (!foundRight) maxX = Math.round(width * 0.85);

          // Vertical content bounds
          let foundTop = false;
          for (let y = 15; y < height * 0.4; y++) {
            if (rowEdges[y] > 50) {
              minY = y;
              foundTop = true;
              break;
            }
          }
          if (!foundTop) minY = Math.round(height * 0.05);

          let foundBottom = false;
          for (let y = height - 16; y > height * 0.6; y--) {
            if (rowEdges[y] > 50) {
              maxY = y;
              foundBottom = true;
              break;
            }
          }
          if (!foundBottom) maxY = Math.round(height * 0.95);

        } else {
          // CS-T240 or general A4/Monitor document page layout
          let foundLeft = false;
          for (let x = 8; x < width * 0.45; x++) {
            if (colEdges[x] > 35) {
              minX = x;
              foundLeft = true;
              break;
            }
          }
          if (!foundLeft) minX = Math.round(width * 0.04);

          let foundRight = false;
          for (let x = width - 9; x > width * 0.55; x--) {
            if (colEdges[x] > 35) {
              maxX = x;
              foundRight = true;
              break;
            }
          }
          if (!foundRight) maxX = Math.round(width * 0.96);

          let foundTop = false;
          for (let y = 8; y < height * 0.4; y++) {
            if (rowEdges[y] > 35) {
              minY = y;
              foundTop = true;
              break;
            }
          }
          if (!foundTop) minY = Math.round(height * 0.04);

          let foundBottom = false;
          for (let y = height - 9; y > height * 0.6; y--) {
            if (rowEdges[y] > 35) {
              maxY = y;
              foundBottom = true;
              break;
            }
          }
          if (!foundBottom) maxY = Math.round(height * 0.96);
        }

        // Add padding / margin
        const padX = Math.round(width * 0.015);
        const padY = Math.round(height * 0.015);

        minX = Math.max(0, minX - padX);
        maxX = Math.min(width - 1, maxX + padX);
        minY = Math.max(0, minY - padY);
        maxY = Math.min(height - 1, maxY + padY);

        let w = maxX - minX;
        let h = maxY - minY;

        // Prevent zero size
        if (w < width * 0.15) {
          minX = Math.round(width * 0.05);
          w = Math.round(width * 0.9);
        }
        if (h < height * 0.15) {
          minY = Math.round(height * 0.05);
          h = Math.round(height * 0.9);
        }

        // Crop bounding box in percentages
        const cropRegion: CropRegion = {
          x: Math.round((minX / width) * 1000) / 10,
          y: Math.round((minY / height) * 1000) / 10,
          width: Math.round((w / width) * 1000) / 10,
          height: Math.round((h / height) * 1000) / 10
        };

        // Draw bounding box on edge canvas for visual validation/guidance feedback
        edgeCtx.strokeStyle = '#38bdf8'; // Sky blue border
        edgeCtx.lineWidth = 1.5;
        edgeCtx.setLineDash([4, 4]);
        edgeCtx.strokeRect(minX, minY, w, h);

        edgeCtx.fillStyle = '#38bdf8';
        edgeCtx.font = 'bold 8px monospace';
        edgeCtx.fillText('AUTO-CROP FOCUS', minX + 4, minY + 10);

        const markedEdgeDataUrl = edgeCanvas.toDataURL('image/jpeg', 0.85);

        resolve({ cropRegion, edgeDataUrl: markedEdgeDataUrl });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Gagal memuat gambar untuk deteksi tepi: ' + e));
    img.src = sourceUrl;
  });
}

export const QCScanView: React.FC<QCScanViewProps> = ({ 
  controls, 
  parameters: propParameters, 
  instruments: propInstruments, 
  onScanComplete 
}) => {
  const [instruments, setInstruments] = useState<Instrument[]>(() => propInstruments || []);
  const [parameters, setParameters] = useState<Parameter[]>(() => propParameters || []);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('auto');
  
  // Mode: Single image vs Batch multi-image
  const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');

  // Single Image states
  const [file, setFile] = useState<File | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null); // Original uploaded image
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null); // Cropped region result
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null);
  
  // Batch Queue states
  const [batchQueue, setBatchQueue] = useState<BatchScanItem[]>([]);
  const [activeBatchItemIndex, setActiveBatchItemIndex] = useState<number>(0);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; step: string }>({ current: 0, total: 0, step: '' });

  // Cropping / ROI states
  const [cropRegion, setCropRegion] = useState<CropRegion>(DEFAULT_CROP);
  const [isCropEnabled, setIsCropEnabled] = useState<boolean>(true);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [isPreProcessing, setIsPreProcessing] = useState<boolean>(false);
  const [activePresetCrop, setActivePresetCrop] = useState<string>('receipt');

  // Auto preprocessing & edge detection states
  const [isAutoCropPending, setIsAutoCropPending] = useState<boolean>(false);
  const [autoEdgeDataUrl, setAutoEdgeDataUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cropped' | 'edges'>('cropped');
  const [autoCropSuccess, setAutoCropSuccess] = useState<boolean>(false);
  const [autoPreprocessingEnabled, setAutoPreprocessingEnabled] = useState<boolean>(true);
  const lastProcessedUrlRef = useRef<string | null>(null);

  // Drag interaction states for ROI bounding box
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragInitialRegion, setDragInitialRegion] = useState<CropRegion | null>(null);

  // Camera Visual Guide Overlay states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [cameraTargetMode, setCameraTargetMode] = useState<'receipt' | 'screen'>('receipt');
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [cameraTemplate, setCameraTemplate] = useState<'dimih3980' | 'cst240'>('dimih3980');
  const [showOverlayGuides, setShowOverlayGuides] = useState<boolean>(true);
  const [showAnatomyGuide, setShowAnatomyGuide] = useState<boolean>(true);

  // Auto-sync visual template based on selected instrument
  useEffect(() => {
    if (selectedInstrumentId === 'inst-dirui-3980') {
      setCameraTemplate('dimih3980');
      setCameraTargetMode('receipt');
    } else if (selectedInstrumentId === 'inst-cst240') {
      setCameraTemplate('cst240');
      setCameraTargetMode('screen');
    }
  }, [selectedInstrumentId]);

  // Scan & processing states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentMeta, setDocumentMeta] = useState<any>(null);
  const [activePresetResults, setActivePresetResults] = useState<any[] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Schema validation feedback state
  const [schemaValidationSummary, setSchemaValidationSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInstruments(StorageService.getInstruments());
    setParameters(StorageService.getParameters());
  }, []);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Recalculate cropped image whenever sourceDataUrl, cropRegion, or enhanceContrast changes
  const updateCroppedPreview = useCallback(async (
    srcUrl: string,
    crop: CropRegion,
    contrast: boolean
  ) => {
    if (!srcUrl) return;
    setIsPreProcessing(true);
    try {
      const activeCrop = isCropEnabled ? crop : { x: 0, y: 0, width: 100, height: 100 };
      const { dataUrl, base64 } = await cropAndOptimizeImage(srcUrl, activeCrop, contrast);
      setCroppedDataUrl(dataUrl);
      setCroppedBase64(base64);
    } catch (err) {
      console.warn('Error cropping image:', err);
      setCroppedDataUrl(srcUrl);
      if (srcUrl.includes(',')) {
        setCroppedBase64(srcUrl.split(',')[1]);
      }
    } finally {
      setIsPreProcessing(false);
    }
  }, [isCropEnabled]);

  const triggerAutoPreprocessing = useCallback(async (imgUrl: string) => {
    if (!imgUrl) return;
    setIsAutoCropPending(true);
    setAutoCropSuccess(false);
    try {
      let instTemplate: 'dimih3980' | 'cst240' | 'auto' = 'auto';
      if (selectedInstrumentId === 'inst-dirui-3980') {
        instTemplate = 'dimih3980';
      } else if (selectedInstrumentId === 'inst-cst240') {
        instTemplate = 'cst240';
      } else {
        const fileLow = file?.name?.toLowerCase() || '';
        if (fileLow.includes('3980') || fileLow.includes('dimih') || fileLow.includes('hema')) {
          instTemplate = 'dimih3980';
        } else if (fileLow.includes('cst') || fileLow.includes('240') || fileLow.includes('chem')) {
          instTemplate = 'cst240';
        }
      }

      const { cropRegion: detectedRegion, edgeDataUrl } = await detectDocumentEdgesAndCreateSobel(imgUrl, instTemplate);
      setCropRegion(detectedRegion);
      setAutoEdgeDataUrl(edgeDataUrl);
      setIsCropEnabled(true);
      setActivePresetCrop('auto');
      setAutoCropSuccess(true);
      setViewMode('cropped'); // Default to showing the cropped results
    } catch (err) {
      console.warn('Auto edge detection failed, fallback to standard crop region', err);
    } finally {
      setIsAutoCropPending(false);
    }
  }, [selectedInstrumentId, file]);

  // Automatically execute edge detection on image load
  useEffect(() => {
    if (sourceDataUrl && autoPreprocessingEnabled && sourceDataUrl !== lastProcessedUrlRef.current) {
      lastProcessedUrlRef.current = sourceDataUrl;
      triggerAutoPreprocessing(sourceDataUrl);
    }
  }, [sourceDataUrl, autoPreprocessingEnabled, triggerAutoPreprocessing]);

  useEffect(() => {
    if (sourceDataUrl) {
      updateCroppedPreview(sourceDataUrl, cropRegion, enhanceContrast);
    }
  }, [sourceDataUrl, cropRegion, enhanceContrast, isCropEnabled, updateCroppedPreview]);

  // Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              if (scanMode === 'batch') {
                addFilesToBatch([blob]);
              } else {
                processSingleImageFile(blob);
              }
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [scanMode]);

  const processSingleImageFile = async (selectedFile: File) => {
    setErrorMsg(null);
    setFile(selectedFile);
    setDocumentMeta(null);
    setActivePresetResults(null);
    setSchemaValidationSummary(null);

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      setSourceDataUrl(resultStr);
    };
    reader.onerror = (e) => setErrorMsg('Gagal membaca file gambar: ' + e);
    reader.readAsDataURL(selectedFile);
  };

  // Add multiple files into the batch queue
  const addFilesToBatch = async (filesToAdd: File[]) => {
    setErrorMsg(null);
    const newItems: BatchScanItem[] = [];

    for (let i = 0; i < filesToAdd.length; i++) {
      const f = filesToAdd[i];
      if (!f.type.startsWith('image/')) continue;

      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });

      newItems.push({
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: f.name || `Struk-QC-${batchQueue.length + i + 1}.jpg`,
        size: f.size,
        sourceDataUrl: dataUrl,
        status: 'ready'
      });
    }

    if (newItems.length > 0) {
      setBatchQueue(prev => [...prev, ...newItems]);
      setScanMode('batch');
    }
  };

  const removeBatchItem = (id: string) => {
    setBatchQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearBatchQueue = () => {
    setBatchQueue([]);
    setBatchProgress({ current: 0, total: 0, step: '' });
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error, fallback to file input:', err);
      setIsCameraActive(false);
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        if (scanMode === 'batch') {
          // In batch mode, append captured photo to queue
          const newItem: BatchScanItem = {
            id: `batch-cam-${Date.now()}`,
            name: `Foto-Kamera-${batchQueue.length + 1}.jpg`,
            size: Math.round((dataUrl.length * 3) / 4),
            sourceDataUrl: dataUrl,
            status: 'ready'
          };
          setBatchQueue(prev => [...prev, newItem]);
          stopCamera();
        } else {
          setSourceDataUrl(dataUrl);
          setFile(null);
          setActivePresetResults(null);
          stopCamera();
        }
      }
    } catch (err) {
      console.error('Capture error:', err);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      if (selectedFiles.length > 1 || scanMode === 'batch') {
        addFilesToBatch(Array.from(selectedFiles));
      } else {
        processSingleImageFile(selectedFiles[0]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      if (droppedFiles.length > 1 || scanMode === 'batch') {
        addFilesToBatch(Array.from(droppedFiles));
      } else if (droppedFiles[0].type.startsWith('image/')) {
        processSingleImageFile(droppedFiles[0]);
      }
    }
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setErrorMsg(null);
    setSourceDataUrl(preset.dataUrl);
    setDocumentMeta(preset.documentMeta);
    setActivePresetResults(preset.presetResults);
    setSelectedInstrumentId(preset.instrumentId);
    setFile(null);
    setSchemaValidationSummary(null);
  };

  // Crop ROI Presets
  const applyCropPreset = (type: 'receipt' | 'table' | 'values' | 'full') => {
    setActivePresetCrop(type);
    setIsCropEnabled(true);
    switch (type) {
      case 'receipt':
        setCropRegion({ x: 4, y: 5, width: 92, height: 90 });
        break;
      case 'table':
        setCropRegion({ x: 5, y: 15, width: 90, height: 72 });
        break;
      case 'values':
        setCropRegion({ x: 10, y: 22, width: 80, height: 60 });
        break;
      case 'full':
        setCropRegion({ x: 0, y: 0, width: 100, height: 100 });
        setIsCropEnabled(false);
        break;
    }
  };

  // Interactive ROI Drag Handlers
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragInitialRegion({ ...cropRegion });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingHandle || !dragStartPos || !dragInitialRegion || !previewContainerRef.current) return;
    e.preventDefault();

    const rect = previewContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPercent = ((e.clientX - dragStartPos.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartPos.y) / rect.height) * 100;

    let newRegion = { ...dragInitialRegion };

    if (draggingHandle === 'move') {
      newRegion.x = Math.max(0, Math.min(100 - newRegion.width, dragInitialRegion.x + deltaXPercent));
      newRegion.y = Math.max(0, Math.min(100 - newRegion.height, dragInitialRegion.y + deltaYPercent));
    } else if (draggingHandle === 'nw') {
      const newX = Math.max(0, Math.min(dragInitialRegion.x + dragInitialRegion.width - 15, dragInitialRegion.x + deltaXPercent));
      const newY = Math.max(0, Math.min(dragInitialRegion.y + dragInitialRegion.height - 15, dragInitialRegion.y + deltaYPercent));
      newRegion.width = dragInitialRegion.width + (dragInitialRegion.x - newX);
      newRegion.height = dragInitialRegion.height + (dragInitialRegion.y - newY);
      newRegion.x = newX;
      newRegion.y = newY;
    } else if (draggingHandle === 'ne') {
      const newY = Math.max(0, Math.min(dragInitialRegion.y + dragInitialRegion.height - 15, dragInitialRegion.y + deltaYPercent));
      newRegion.width = Math.max(15, Math.min(100 - dragInitialRegion.x, dragInitialRegion.width + deltaXPercent));
      newRegion.height = dragInitialRegion.height + (dragInitialRegion.y - newY);
      newRegion.y = newY;
    } else if (draggingHandle === 'sw') {
      const newX = Math.max(0, Math.min(dragInitialRegion.x + dragInitialRegion.width - 15, dragInitialRegion.x + deltaXPercent));
      newRegion.width = dragInitialRegion.width + (dragInitialRegion.x - newX);
      newRegion.height = Math.max(15, Math.min(100 - dragInitialRegion.y, dragInitialRegion.height + deltaYPercent));
      newRegion.x = newX;
    } else if (draggingHandle === 'se') {
      newRegion.width = Math.max(15, Math.min(100 - dragInitialRegion.x, dragInitialRegion.width + deltaXPercent));
      newRegion.height = Math.max(15, Math.min(100 - dragInitialRegion.y, dragInitialRegion.height + deltaYPercent));
    }

    setCropRegion({
      x: Math.round(newRegion.x * 10) / 10,
      y: Math.round(newRegion.y * 10) / 10,
      width: Math.round(newRegion.width * 10) / 10,
      height: Math.round(newRegion.height * 10) / 10
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingHandle) {
      setDraggingHandle(null);
      setDragStartPos(null);
      setDragInitialRegion(null);
    }
  };

  const getTargetInstrument = () => {
    if (selectedInstrumentId === 'auto') return null;
    return instruments.find(i => i.id === selectedInstrumentId) || null;
  };

  const handleManualFallback = () => {
    const targetInst = getTargetInstrument();
    onScanComplete(activePresetResults || [], croppedDataUrl || sourceDataUrl, documentMeta || {
      analyzer: targetInst?.name || 'Dirui Dimih 3980 Automated Analyzer',
      instrument_id: targetInst?.id || 'inst-dirui-3980',
      control_level: 'Level 1',
      lot_number: 'LOT-EC8C-9912'
    });
  };

  // Single Image Scan Execution
  const scanSingleQC = async () => {
    if (!sourceDataUrl) return;
    setIsScanning(true);
    setErrorMsg(null);
    setSchemaValidationSummary(null);

    const targetInst = getTargetInstrument();
    const instHintName = targetInst ? targetInst.name : (selectedInstrumentId === 'auto' ? undefined : selectedInstrumentId);

    try {
      // Step 1: Pre-processing & ROI Cropping
      setScanStep('1. Melakukan pra-pemrosesan gambar & pemangkasan area bacaan alat (ROI)...');
      
      let base64ToSend = croppedBase64;
      let finalCroppedUrl = croppedDataUrl;

      if (!base64ToSend) {
        const activeCrop = isCropEnabled ? cropRegion : { x: 0, y: 0, width: 100, height: 100 };
        const cropped = await cropAndOptimizeImage(sourceDataUrl, activeCrop, enhanceContrast);
        base64ToSend = cropped.base64;
        finalCroppedUrl = cropped.dataUrl;
      }

      // If preset sample is active, simulate fast schema verification
      if (activePresetResults && activePresetResults.length > 0) {
        setScanStep('2. AI Vision sedang membaca data laboratorium dari area fokus...');
        await new Promise(r => setTimeout(r, 350));
        
        setScanStep('3. Memvalidasi skema numerik & kesesuaian format parameter...');
        const batchValidation = validateExtractedResultsBatch(activePresetResults, parameters);
        setSchemaValidationSummary(batchValidation.summaryMessage);
        await new Promise(r => setTimeout(r, 250));

        onScanComplete(batchValidation.validatedResults, finalCroppedUrl || sourceDataUrl, {
          ...(documentMeta || {}),
          analyzer: targetInst?.name || documentMeta?.analyzer || 'Chemistry Analyzer CST-240 (Dirui CS-T240)',
          instrument_id: targetInst?.id || documentMeta?.instrument_id || 'inst-cst240',
          schema_validation: batchValidation
        });
        setIsScanning(false);
        return;
      }

      // Step 2: OCR Reading
      setScanStep(`2. AI Vision OCR membaca struk ${instHintName ? `[Alat: ${instHintName}]` : ''}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch('/api/qc/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          imageBase64: base64ToSend, 
          mimeType: 'image/jpeg',
          instrumentHint: instHintName,
          fileName: file?.name
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const rawResults = data.results || [];

      // Step 3: Schema Validation Pipeline
      setScanStep('3. Memvalidasi skema numerik parameter (Desimal, Mean, SD)...');
      const batchValidation = validateExtractedResultsBatch(rawResults, parameters);
      setSchemaValidationSummary(batchValidation.summaryMessage);

      const analyzerName = targetInst?.name || data.document?.analyzer || 'Dirui Dimih 3980 Automated Analyzer';
      let autoInstId = 'inst-dirui-3980';
      if (analyzerName.toLowerCase().includes('cst') || analyzerName.toLowerCase().includes('cs-t240')) {
        autoInstId = 'inst-cst240';
      } else if (analyzerName.toLowerCase().includes('cobas') || analyzerName.toLowerCase().includes('c311')) {
        autoInstId = 'inst-chem-a';
      } else if (analyzerName.toLowerCase().includes('sysmex') || analyzerName.toLowerCase().includes('xn')) {
        autoInstId = 'inst-hema-a';
      }

      const meta = {
        ...(documentMeta || {}),
        ...(data.document || {}),
        analyzer: analyzerName,
        instrument_id: targetInst?.id || autoInstId,
        scanId: data.scan?.scan_id || `SCAN-${Date.now().toString().slice(-6)}`,
        timestamp: data.scan?.timestamp || new Date().toISOString(),
        cropRegion: isCropEnabled ? cropRegion : null,
        schema_validation: batchValidation
      };

      // Complete scan and move to verification view
      onScanComplete(batchValidation.validatedResults, finalCroppedUrl || sourceDataUrl, meta);
    } catch (error: any) {
      console.error('OCR Error:', error);
      const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
      const friendlyMsg = isAbort 
        ? 'Waktu koneksi pemindaian melebihi batas (Timeout). Mengalihkan ke form verifikasi.'
        : `Gagal membaca gambar via AI Vision: ${error.message || 'Koneksi terputus'}. Mengalihkan ke form verifikasi.`;
      
      setErrorMsg(friendlyMsg);
      handleManualFallback();
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Batch Processing Multi-Image Execution
  const processBatchQC = async () => {
    if (batchQueue.length === 0) return;
    setIsScanning(true);
    setErrorMsg(null);

    const targetInst = getTargetInstrument();
    const instHintName = targetInst ? targetInst.name : (selectedInstrumentId === 'auto' ? undefined : selectedInstrumentId);

    const mergedResults: any[] = [];
    const batchImagesList: string[] = [];

    try {
      for (let i = 0; i < batchQueue.length; i++) {
        const item = batchQueue[i];
        setBatchProgress({
          current: i + 1,
          total: batchQueue.length,
          step: `Memproses Struk ${i + 1} dari ${batchQueue.length}: ${item.name}...`
        });

        // Optimize and crop item image
        const { base64, dataUrl } = await cropAndOptimizeImage(item.sourceDataUrl, DEFAULT_CROP, true);
        batchImagesList.push(dataUrl);

        // Update item status in UI
        setBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q));

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const res = await fetch('/api/qc/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: 'image/jpeg',
              instrumentHint: instHintName,
              fileName: item.name
            })
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const extracted = data.results || [];
            
            // Tag items with batch source
            const tagged = extracted.map((resItem: any) => ({
              ...resItem,
              sourceReceiptIndex: i + 1,
              sourceFileName: item.name
            }));

            mergedResults.push(...tagged);
            setBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', results: tagged, resultCount: tagged.length } : q));
          } else {
            setBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: 'Gagal membaca gambar' } : q));
          }
        } catch (itemErr: any) {
          console.warn(`Error scanning batch item ${i}:`, itemErr);
          setBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: itemErr.message } : q));
        }

        // Brief delay between batch requests
        await new Promise(r => setTimeout(r, 200));
      }

      setBatchProgress({
        current: batchQueue.length,
        total: batchQueue.length,
        step: 'Memvalidasi skema semua hasil batch...'
      });

      // Run batch schema validation on the combined results
      const batchValidation = validateExtractedResultsBatch(mergedResults, parameters);

      const analyzerName = targetInst?.name || 'Dirui Dimih 3980 Automated Analyzer';
      let autoInstId = targetInst?.id || 'inst-dirui-3980';

      const batchMeta = {
        isBatch: true,
        batchImages: batchImagesList,
        totalImages: batchQueue.length,
        analyzer: analyzerName,
        instrument_id: autoInstId,
        scanId: `BATCH-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        schema_validation: batchValidation
      };

      // Complete scan and move to verification view with merged batch
      onScanComplete(batchValidation.validatedResults, batchImagesList[0] || null, batchMeta);
    } catch (err: any) {
      console.error('Batch Processing Error:', err);
      setErrorMsg('Gagal memproses batch gambar: ' + err.message);
    } finally {
      setIsScanning(false);
      setBatchProgress({ current: 0, total: 0, step: '' });
    }
  };

  const selectedInstObj = instruments.find(i => i.id === selectedInstrumentId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0B5FA5] via-[#084B83] to-[#043361] text-white p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI Vision & Batch Processing Studio v3.2</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Scan Hasil QC dari Foto / Struk</h1>
            <p className="text-blue-100 text-sm">
              Pindai satu struk atau unggah banyak foto struk sekaligus (*batch*) untuk diproses bersama dalam satu antrean.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <Layers className="h-4 w-4 text-cyan-300 shrink-0" />
            <span>Batch Upload Didukung</span>
          </div>
        </div>
      </div>

      {/* Mode Selector & Instrument Selection Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Mode Switcher Pills */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode Pemindaian:</span>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setScanMode('single')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  scanMode === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Foto Tunggal (1 Struk)</span>
              </button>
              <button
                type="button"
                onClick={() => setScanMode('batch')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  scanMode === 'batch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Batch Multi-Foto ({batchQueue.length} Struk)</span>
              </button>
            </div>
          </div>

          {scanMode === 'batch' && batchQueue.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => batchFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Foto Struk
              </button>
              <button
                type="button"
                onClick={clearBatchQueue}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Kosongkan Antrean
              </button>
            </div>
          )}
        </div>

        {/* Instrument Target Selection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Target Alat / Instrumen Pemeriksaan:
              </label>
              <div className="text-sm font-semibold text-slate-800">
                {selectedInstObj ? selectedInstObj.name : 'Auto-Detect dari Foto / Printout'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="auto">🔍 Auto-Detect dari Foto (Semua Alat Master)</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  🧪 {inst.name} ({inst.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Isolation Alert Helper */}
        <div className="text-xs bg-blue-50/70 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            {scanMode === 'batch' ? (
              <strong>Mode Batch Aktif:</strong>
            ) : (
              <strong>Proteksi Alat & Skema Aktif:</strong>
            )}{' '}
            Mengekstrak nilai hasil secara akurat dari foto, memetakan ke instrumen <strong>{selectedInstObj ? selectedInstObj.name : 'pilihan'}</strong>, dan memvalidasi skema numerik (desimal/integer).
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Pemberitahuan Sistem</p>
              <p>{errorMsg}</p>
            </div>
          </div>
          {sourceDataUrl && (
            <button
              onClick={handleManualFallback}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" /> Lanjut ke Form Verifikasi
            </button>
          )}
        </div>
      )}

      {/* Camera Live View Modal with Interactive Readout Bounding Box Overlay */}
      {isCameraActive && (
        <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 overflow-hidden text-white shadow-2xl border border-slate-800 space-y-4">
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Focus className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Panduan Visual Penyelarasan Alat</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Alignment Box
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Posisikan tabel hasil pemeriksaan di dalam kotak panduan sebelum memotret.
                </p>
              </div>
            </div>

            {/* Mode Switches: Struk Kertas vs Layar Monitor & Templat Fokus Alat */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Templat Overlay Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Fokus Alat:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCameraTemplate('dimih3980');
                    setCameraTargetMode('receipt');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    cameraTemplate === 'dimih3980'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>DIMIH 3980</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCameraTemplate('cst240');
                    setCameraTargetMode('screen');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    cameraTemplate === 'cst240'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  <span>CST-240</span>
                </button>
              </div>

              {/* Toggle Guides Button */}
              <button
                type="button"
                onClick={() => setShowOverlayGuides(!showOverlayGuides)}
                title="Aktifkan/Matikan Overlay Kotak Panduan Fokus"
                className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  showOverlayGuides 
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Crosshair className="h-4 w-4" />
                <span className="text-[11px] hidden md:inline">Overlay</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGridOverlay(!showGridOverlay)}
                title="Toggle Garis Kisi Penyelarasan"
                className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                  showGridOverlay 
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Viewport with Visual Bounding Box Reticle & Scan Guide Overlay */}
          <div className="relative aspect-[4/3] sm:aspect-video max-h-[500px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800/80 shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />

            {/* Dark Mask Layer with Cut-Out Bounding Box */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-6">
              <div 
                className={`relative transition-all duration-300 flex flex-col justify-between ${
                  cameraTargetMode === 'receipt'
                    ? 'w-[80%] sm:w-[60%] h-[80%] rounded-2xl'
                    : 'w-[90%] sm:w-[80%] h-[70%] rounded-2xl'
                }`}
              >
                {/* Glowing Outer Bounding Box Border */}
                <div className="absolute inset-0 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.35)] backdrop-brightness-110 pointer-events-none" />

                {/* Specific Device Overlay Focus Guides */}
                {showOverlayGuides && cameraTemplate === 'dimih3980' && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {/* Header Zone */}
                    <div className="absolute top-[4%] inset-x-[4%] h-[18%] border border-dashed border-amber-400 bg-amber-500/5 rounded-lg flex flex-col justify-between p-1.5 animate-pulse shadow-[inset_0_0_8px_rgba(251,191,36,0.2)]">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-mono">1. HEADER & MODEL</span>
                      </div>
                      <span className="text-[8px] text-amber-200/90 font-medium leading-none">DIRUI DIMIH-3980 Hematology</span>
                    </div>

                    {/* Parameter Zone */}
                    <div className="absolute top-[24%] inset-x-[4%] h-[50%] border-2 border-dashed border-cyan-400 bg-cyan-500/5 rounded-lg flex flex-col justify-between p-2 shadow-[inset_0_0_12px_rgba(34,211,238,0.25)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold bg-cyan-500 text-slate-950 px-1 py-0.2 rounded font-mono">2. PARAMETER HEMATOLOGI (UTAMA)</span>
                        <span className="text-[7px] text-cyan-300 font-bold">FOKUS UTAMA</span>
                      </div>
                      <div className="text-[8px] text-cyan-200/90 leading-tight space-y-0.5">
                        <p>✓ Sejajarkan WBC, RBC, HGB, PLT</p>
                        <p>✓ Pastikan angka desimal terlihat tajam</p>
                      </div>
                    </div>

                    {/* Lot & QC Date Zone */}
                    <div className="absolute bottom-[4%] inset-x-[4%] h-[20%] border border-dashed border-fuchsia-400 bg-fuchsia-500/5 rounded-lg flex flex-col justify-between p-1.5 shadow-[inset_0_0_8px_rgba(232,121,249,0.2)]">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold bg-fuchsia-500 text-slate-950 px-1 py-0.2 rounded font-mono">3. TANGGAL QC & LOT</span>
                      </div>
                      <span className="text-[8px] text-fuchsia-200/90 font-medium leading-none">LOT-EC8C... & Tanggal QC</span>
                    </div>
                  </div>
                )}

                {/* Specific Device Overlay Focus Guides (CS-T240) */}
                {showOverlayGuides && cameraTemplate === 'cst240' && (
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {/* Header Zone */}
                    <div className="absolute top-[4%] left-[4%] w-[45%] h-[26%] border border-dashed border-amber-400 bg-amber-500/5 rounded-lg flex flex-col justify-between p-1.5 shadow-[inset_0_0_8px_rgba(251,191,36,0.2)]">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-mono">1. HEADER & LOT</span>
                      </div>
                      <span className="text-[8px] text-amber-200/90 font-medium leading-tight">Brand DIRUI & Lot LOT-CST1-...</span>
                    </div>

                    {/* Stats Zone (Mean & SD) */}
                    <div className="absolute top-[4%] right-[4%] w-[45%] h-[26%] border border-dashed border-fuchsia-400 bg-fuchsia-500/5 rounded-lg flex flex-col justify-between p-1.5 shadow-[inset_0_0_8px_rgba(232,121,249,0.2)]">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold bg-fuchsia-500 text-slate-950 px-1 py-0.2 rounded font-mono">2. TARGET MEAN / SD</span>
                      </div>
                      <span className="text-[8px] text-fuchsia-200/90 font-medium leading-tight">Penting untuk Westgard limit</span>
                    </div>

                    {/* Parameters Table Zone */}
                    <div className="absolute bottom-[4%] inset-x-[4%] h-[62%] border-2 border-dashed border-cyan-400 bg-cyan-500/5 rounded-lg flex flex-col justify-between p-2 shadow-[inset_0_0_12px_rgba(34,211,238,0.25)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold bg-cyan-500 text-slate-950 px-1 py-0.2 rounded font-mono">3. TABEL PARAMETER & HASIL (RESULT)</span>
                        <span className="text-[7px] text-cyan-300 font-bold">FOKUS UTAMA</span>
                      </div>
                      <div className="text-[8px] text-cyan-200/90 leading-tight space-y-0.5">
                        <p>✓ Fokuskan pada nama parameter (ALB, ALT, AST, GLU-HK)</p>
                        <p>✓ Sejajarkan Nilai Hasil (Result) & Standard Deviasi</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shaded Vignette Backdrop around Box */}
                <div className="absolute -inset-96 border-[400px] border-black/55 pointer-events-none rounded-2xl" />

                {/* Animated Scan Line Bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] opacity-80 animate-pulse pointer-events-none" />

                {/* Corner Target L-Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_8px_#10b981]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_8px_#10b981]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_8px_#10b981]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_8px_#10b981]" />

                {/* Subtle Alignment Grid Lines */}
                {showGridOverlay && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-dashed border-emerald-300/40" />
                    <div className="border-r border-b border-dashed border-emerald-300/40" />
                    <div className="border-b border-dashed border-emerald-300/40" />
                    <div className="border-r border-b border-dashed border-emerald-300/40" />
                    <div className="border-r border-b border-dashed border-emerald-300/40 flex items-center justify-center">
                      <Crosshair className="h-6 w-6 text-emerald-400/80 animate-pulse" />
                    </div>
                    <div className="border-b border-dashed border-emerald-300/40" />
                    <div className="border-r border-dashed border-emerald-300/40" />
                    <div className="border-r border-dashed border-emerald-300/40" />
                    <div />
                  </div>
                )}

                {/* Target Guidance Banners inside Reticle */}
                <div className="p-2 flex items-center justify-between z-10">
                  <span className="bg-slate-950/80 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>{cameraTargetMode === 'receipt' ? 'Header Alat / Struk QC' : 'Layar Monitor QC'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300/80 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    {selectedInstObj ? selectedInstObj.code : 'CST-240'}
                  </span>
                </div>

                <div className="text-center px-4 py-2 z-10 flex flex-col items-center">
                  <span className="bg-emerald-950/90 text-emerald-200 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-emerald-400/50 backdrop-blur-md shadow-lg flex items-center gap-2">
                    <ScanLine className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
                    <span>Sejajarkan Kolom Hasil (Result), Mean & SD</span>
                  </span>
                </div>

                <div className="p-2 flex items-center justify-between z-10">
                  <span className="bg-slate-950/80 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700/60 backdrop-blur-sm">
                    Lot No & Tanggal
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    Fokus Jelas
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Floating Guide Hint */}
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none px-4">
              <span className="bg-black/80 text-slate-200 text-xs px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg">
                <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Pastikan teks angka tidak buram dan terbebas dari pantulan cahaya.</span>
              </span>
            </div>
          </div>

          {/* Camera Bottom Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
                  startCamera();
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs rounded-xl font-medium flex items-center justify-center gap-2 flex-1 sm:flex-none transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-slate-400" />
                <span>Putar Kamera ({cameraFacing === 'environment' ? 'Belakang' : 'Depan'})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/60 ring-4 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all transform active:scale-95"
              >
                <Camera className="h-5 w-5" />
                <span>
                  {scanMode === 'batch' 
                    ? `Ambil & Tambah ke Antrean (${batchQueue.length + 1})` 
                    : 'Ambil Foto Sesuai Panduan Kotak'}
                </span>
              </button>
            </div>

            <div className="hidden sm:block text-xs text-slate-400 text-right">
              Target Alat: <strong className="text-slate-200">{selectedInstObj ? selectedInstObj.name : 'Auto-Detect'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs for single and multiple batch selection */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        className="hidden" 
      />
      <input 
        ref={batchFileInputRef}
        type="file" 
        multiple
        accept="image/*" 
        onChange={handleFileChange}
        className="hidden" 
      />

      {/* BATCH MODE QUEUE VIEW */}
      {scanMode === 'batch' && !isCameraActive ? (
        <div className="space-y-6">
          {batchQueue.length === 0 ? (
            /* Empty Batch Dropzone */
            <div 
              onClick={() => batchFileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[300px] ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-white'
              }`}
            >
              <div className="p-4 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <Images className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Pilih Beberapa Foto Struk Sekaligus (Batch)</h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                Pilih banyak file foto struk QC dari komputer, seret dan lepas beberapa file sekaligus, atau gunakan kamera secara berurutan.
              </p>
              <div className="flex items-center gap-3">
                <span className="px-5 py-2.5 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Pilih Banyak File Gambar
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Buka Kamera Batch
                </button>
              </div>
            </div>
          ) : (
            /* Active Batch Queue Manager */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Antrean Batch QC ({batchQueue.length} Foto Struk Terpilih)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Semua foto di bawah akan diekstrak dan digabungkan ke satu sesi verifikasi QC untuk alat {selectedInstObj ? selectedInstObj.name : 'terkait'}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => batchFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Tambah Foto
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="h-4 w-4" /> Foto Lagi
                  </button>
                </div>
              </div>

              {/* Batch Queue Thumbnails Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {batchQueue.map((item, index) => (
                  <div 
                    key={item.id}
                    className="relative bg-slate-900 border border-slate-200 rounded-xl overflow-hidden group shadow-sm flex flex-col justify-between"
                  >
                    {/* Thumbnail Image */}
                    <div className="aspect-[3/4] overflow-hidden flex items-center justify-center p-1 bg-slate-950">
                      <img 
                        src={item.sourceDataUrl} 
                        alt={item.name} 
                        className="w-full h-full object-contain rounded"
                      />
                    </div>

                    {/* Badge & Name Bar */}
                    <div className="p-2.5 bg-white text-slate-800 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          Struk #{index + 1}
                        </span>
                        {item.status === 'processing' && (
                          <span className="text-[10px] text-blue-600 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> OCR...
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> {item.resultCount || 'OK'}
                          </span>
                        )}
                        {item.status === 'ready' && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Siap
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 truncate" title={item.name}>
                        {item.name}
                      </p>
                    </div>

                    {/* Remove Action Button on Hover */}
                    <button
                      type="button"
                      onClick={() => removeBatchItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-80 hover:opacity-100 shadow transition-opacity"
                      title="Hapus foto dari antrean"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Batch Processing Execution Bar */}
              {isScanning ? (
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                      <div className="text-sm font-bold">
                        {batchProgress.step || 'Sedang memproses antrean batch QC...'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-300">
                      {batchProgress.current} / {batchProgress.total} Foto
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-500">
                    Total: <strong>{batchQueue.length} Foto Struk</strong> | Target Alat: <strong>{selectedInstObj ? selectedInstObj.name : 'Auto-Detect'}</strong>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={clearBatchQueue}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={processBatchQC}
                      className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>Proses Batch {batchQueue.length} Foto Struk Sekaligus</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SINGLE IMAGE MODE VIEW */
        !sourceDataUrl && !isCameraActive ? (
          <div className="space-y-6">
            {/* Upload Dropzone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: File Upload + Drag & Drop */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[260px] ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-white'
                }`}
              >
                <div className="p-4 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-sm">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Unggah Foto Struk QC (Tunggal)</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-3">
                  Klik untuk memilih file foto, seret file ke sini, atau tempel tangkapan layar (Ctrl+V)
                </p>
                <span className="px-4 py-2 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4" /> Pilih File Gambar
                </span>
              </div>

              {/* Box 2: Direct Camera with Visual Guide */}
              <div 
                onClick={startCamera}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 bg-white p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[260px]"
              >
                <div className="p-4 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-2xl mb-4 transition-transform group-hover:scale-110 shadow-sm">
                  <Focus className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">Ambil Foto Langsung (Kamera + Bounding Box)</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-3">
                  Gunakan kamera dengan kotak pemandu visual untuk menyelaraskan struk cetak atau layar monitor alat
                </p>
                <span className="px-4 py-2 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Buka Kamera dengan Panduan Visual
                </span>
              </div>
            </div>

            {/* Quick Presets Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Preset Sampel Struk QC Laboratorium (Uji Coba Cepat Tanpa Upload):
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_PRESETS
                  .filter(preset => instruments.length === 0 || instruments.some(inst => inst.id === preset.instrumentId))
                  .map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-left p-3.5 rounded-xl border bg-white hover:shadow-md transition-all flex flex-col justify-between ${preset.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 border">
                          {preset.badge}
                        </span>
                      </div>
                      <div className="font-bold text-xs mb-1">{preset.title}</div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{preset.description}</p>
                    </div>
                    <div className="mt-3 text-[11px] font-bold text-blue-700 flex items-center gap-1">
                      <span>Gunakan Sampel Ini</span> <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Pre-Processing, Cropping Studio & Scan Action Card */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Pra-Pemrosesan & Fokus Area Struk QC</h3>
                  <p className="text-xs text-slate-500">
                    Sesuaikan kotak pangkas agar fokus pada baris parameter & angka hasil bacaan mesin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSourceDataUrl(null);
                    setCroppedDataUrl(null);
                    setCroppedBase64(null);
                    setFile(null);
                    setActivePresetResults(null);
                    setSchemaValidationSummary(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Ganti Gambar
                </button>
              </div>
            </div>

            {/* Cropping Presets & Controls Bar */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-600 flex items-center gap-1">
                  <Crop className="h-3.5 w-3.5 text-blue-600" /> Presets Fokus Area:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (sourceDataUrl) triggerAutoPreprocessing(sourceDataUrl);
                    }}
                    disabled={isAutoCropPending}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      activePresetCrop === 'auto' && isCropEnabled
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                    title="Deteksi tepi dokumen dan pangkas otomatis"
                  >
                    {isAutoCropPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                    )}
                    <span>✨ Deteksi Tepi Otomatis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset('receipt')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      activePresetCrop === 'receipt' && isCropEnabled
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📄 Pangkas Tepi Kertas
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset('table')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      activePresetCrop === 'table' && isCropEnabled
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🔍 Fokus Tabel Parameter
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset('values')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      activePresetCrop === 'values' && isCropEnabled
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🎯 Fokus Kolom Nilai / Hasil
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCropPreset('full')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      !isCropEnabled
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Maximize2 className="h-3 w-3 inline mr-1" /> Area Penuh (100%)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoPreprocessingEnabled}
                    onChange={(e) => setAutoPreprocessingEnabled(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <Layers className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Auto Pre-proses Tepi Dokumen</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={enhanceContrast}
                    onChange={(e) => setEnhanceContrast(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <Sliders className="h-3 w-3 text-amber-500" />
                  <span>Pertajam Kontras Struk</span>
                </label>
              </div>
            </div>

            {/* Collapsible Visual Anatomy Guide Panel */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAnatomyGuide(!showAnatomyGuide)}
                  className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider hover:text-blue-600 transition-colors"
                >
                  <Info className="h-4.5 w-4.5 text-blue-600" />
                  <span>💡 Panduan Anatomi Kertas Hasil QC (DIMIH 3980 vs CST-240)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnatomyGuide(!showAnatomyGuide)}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  {showAnatomyGuide ? 'Sembunyikan Panduan' : 'Tampilkan Panduan'}
                </button>
              </div>

              {showAnatomyGuide && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-200">
                  {/* DIMIH 3980 Card */}
                  <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-purple-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                      <h4 className="font-bold text-purple-900">1. Struk Hasil Hematologi (DIMIH 3980)</h4>
                    </div>
                    <ul className="space-y-1.5 text-purple-950 font-medium list-disc list-inside">
                      <li><strong>Bentuk Fisik:</strong> Kertas struk kasir termal putih yang sempit dan panjang secara vertikal.</li>
                      <li><strong>Area Kritis AI:</strong> Baris parameter hematologi (<code className="bg-purple-100 px-1 py-0.2 rounded font-mono text-[10px]">WBC</code>, <code className="bg-purple-100 px-1 py-0.2 rounded font-mono text-[10px]">RBC</code>, <code className="bg-purple-100 px-1 py-0.2 rounded font-mono text-[10px]">HGB</code>, <code className="bg-purple-100 px-1 py-0.2 rounded font-mono text-[10px]">PLT</code>).</li>
                      <li><strong>Tanggal & Lot:</strong> Biasanya berada di bagian paling atas atau paling bawah cetakan struk.</li>
                      <li className="text-purple-700 font-bold">⚠️ Tips Kamera: Sejajarkan struk lurus vertikal, hindari lipatan kertas atau bayangan tangan.</li>
                    </ul>
                  </div>

                  {/* CS-T240 Card */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-blue-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      <h4 className="font-bold text-blue-900">2. Laporan / Monitor Kimia (CS-T240)</h4>
                    </div>
                    <ul className="space-y-1.5 text-blue-950 font-medium list-disc list-inside">
                      <li><strong>Bentuk Fisik:</strong> Laporan lembar lebar (A4) atau tampilan layar monitor berbentuk tabel grid horizontal.</li>
                      <li><strong>Area Kritis AI:</strong> Baris kimia klinik (<code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">ALB</code>, <code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">ALT</code>, <code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">AST</code>, <code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">GLU-HK</code>, <code className="bg-blue-100 px-1 py-0.2 rounded font-mono text-[10px]">TG</code>).</li>
                      <li><strong>Parameter Statistik:</strong> Kolom Nilai Hasil (Result), target Mean, dan SD teratur rapi di bagian kanan.</li>
                      <li className="text-blue-700 font-bold">⚠️ Tips Kamera: Ambil foto tegak lurus (horizontal), kurangi pantulan cahaya monitor/lampu.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Studio Workspace: Interactive Crop Canvas + Cropped Result Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Interactive Image Cropper (7 cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold flex items-center gap-1">
                    <Crop className="h-3.5 w-3.5 text-blue-600" /> Tarik sudut kotak untuk mengatur area fokus:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {cropRegion.width}% × {cropRegion.height}%
                  </span>
                </div>

                <div 
                  ref={previewContainerRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center select-none touch-none min-h-[340px] max-h-[460px]"
                >
                  {sourceDataUrl && (
                    <img 
                      src={sourceDataUrl} 
                      alt="Foto Asli" 
                      className="w-full h-full max-h-[440px] object-contain pointer-events-none opacity-80"
                      draggable={false}
                    />
                  )}

                  {/* Dark Mask Backdrop Outside Crop Area */}
                  {isCropEnabled && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div 
                        className="absolute left-0 right-0 top-0 bg-black/60 backdrop-blur-[1px]"
                        style={{ height: `${cropRegion.y}%` }}
                      />
                      <div 
                        className="absolute left-0 right-0 bottom-0 bg-black/60 backdrop-blur-[1px]"
                        style={{ height: `${100 - (cropRegion.y + cropRegion.height)}%` }}
                      />
                      <div 
                        className="absolute left-0 bg-black/60 backdrop-blur-[1px]"
                        style={{ 
                          top: `${cropRegion.y}%`, 
                          height: `${cropRegion.height}%`, 
                          width: `${cropRegion.x}%` 
                        }}
                      />
                      <div 
                        className="absolute right-0 bg-black/60 backdrop-blur-[1px]"
                        style={{ 
                          top: `${cropRegion.y}%`, 
                          height: `${cropRegion.height}%`, 
                          width: `${100 - (cropRegion.x + cropRegion.width)}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Active Interactive Crop Box */}
                  {isCropEnabled && (
                    <div
                      onPointerDown={(e) => handlePointerDown('move', e)}
                      className="absolute border-2 border-blue-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.0)] cursor-move transition-shadow"
                      style={{
                        left: `${cropRegion.x}%`,
                        top: `${cropRegion.y}%`,
                        width: `${cropRegion.width}%`,
                        height: `${cropRegion.height}%`
                      }}
                    >
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-blue-400/30">
                        <div className="border-r border-b border-blue-400/20" />
                        <div className="border-r border-b border-blue-400/20" />
                        <div className="border-b border-blue-400/20" />
                        <div className="border-r border-b border-blue-400/20" />
                        <div className="border-r border-b border-blue-400/20" />
                        <div className="border-b border-blue-400/20" />
                        <div className="border-r border-blue-400/20" />
                        <div className="border-r border-blue-400/20" />
                        <div />
                      </div>

                      <div className="absolute top-1 left-1 bg-blue-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                        <Crop className="h-2.5 w-2.5" /> Area Bacaan OCR
                      </div>

                      <div 
                        onPointerDown={(e) => handlePointerDown('nw', e)}
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div 
                        onPointerDown={(e) => handlePointerDown('ne', e)}
                        className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div 
                        onPointerDown={(e) => handlePointerDown('sw', e)}
                        className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      />
                      <div 
                        onPointerDown={(e) => handlePointerDown('se', e)}
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Readout Area Live Preview & Schema Validation Card (5 cols) */}
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
                    <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setViewMode('cropped')}
                        className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                          viewMode === 'cropped'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        👁️ Hasil Potong
                      </button>
                      {autoEdgeDataUrl && (
                        <button
                          type="button"
                          onClick={() => setViewMode('edges')}
                          className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                            viewMode === 'edges'
                              ? 'bg-slate-900 text-emerald-400 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ⚡ Deteksi Tepi (Sobel)
                        </button>
                      )}
                    </div>
                    {isPreProcessing || isAutoCropPending ? (
                      <span className="text-[10px] text-blue-600 flex items-center gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Memproses...
                      </span>
                    ) : autoCropSuccess ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Auto-Crop Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Siap Dipindai
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-900 rounded-lg p-2 min-h-[160px] max-h-[190px] flex items-center justify-center overflow-hidden border border-slate-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                    {viewMode === 'edges' && autoEdgeDataUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img 
                          src={autoEdgeDataUrl} 
                          alt="Deteksi Tepi Sobel" 
                          className="max-h-[170px] w-auto object-contain rounded border border-emerald-500/20 shadow-lg shadow-slate-950"
                        />
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400">
                          SOBEL FILTER
                        </span>
                      </div>
                    ) : croppedDataUrl ? (
                      <img 
                        src={croppedDataUrl} 
                        alt="Hasil Crop" 
                        className="max-h-[170px] w-auto object-contain rounded shadow"
                      />
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Menyiapkan area baca...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-2 text-xs text-blue-900">
                  <div className="flex items-center gap-2 font-bold text-blue-950">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    <span>Validasi Skema Numerik Otomatis</span>
                  </div>
                  <p className="text-blue-800 leading-relaxed text-[11px]">
                    Setelah teks terbaca, sistem memvalidasi presisi desimal (mis. GLU 1 desimal, CREA 2 desimal, PLT bilangan bulat) dan menyelaraskan posisi Nilai Hasil vs Standar Deviasi jika terjadi salah kolom pada struk.
                  </p>

                  {schemaValidationSummary && (
                    <div className="bg-white/80 border border-blue-200 text-blue-800 p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{schemaValidationSummary}</span>
                    </div>
                  )}
                </div>

                {/* Scan Trigger / Verification Action */}
                <div className="space-y-3 pt-2">
                  {isScanning ? (
                    <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
                        <div className="text-xs font-semibold">
                          {scanStep || 'Sedang memproses gambar...'}
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-4/5"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={scanSingleQC}
                        disabled={isPreProcessing}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>Jalankan OCR pada Area Fokus Ini</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleManualFallback}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Buka Form Verifikasi Manual</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
