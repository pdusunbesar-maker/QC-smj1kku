import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Tesseract from "tesseract.js";
import { supabase } from "../lib/supabase";
import { StorageService } from "../services/storage";
import { Parameter, Instrument, ControlMaterial, QCLot, QCResult } from "../types";
import { evaluateWestgardRules } from "../utils/qcCalculations";
import { 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Database, 
  Activity, 
  Sliders, 
  FileText, 
  LineChart, 
  Camera, 
  Clock, 
  Calendar, 
  Layers, 
  Check, 
  Trash2, 
  RefreshCw,
  RotateCcw,
  Plus,
  Eye,
  EyeOff,
  Crop,
  ShieldCheck,
  HelpCircle,
  Maximize2,
  Copy,
  ChevronDown,
  ChevronUp,
  Target,
  Filter,
  CheckCircle,
  Tag,
  Shield
} from "lucide-react";

export interface HasilQC {
  id: string;
  item: string;
  nilai: string;
  flag: string | null;
  unit: string;
  status: "ok" | "warning" | "reject";
  // Master data linkage
  parameterId: string;
  parameterName: string;
  targetMean?: number;
  targetSD?: number;
  zScore?: number;
  sdPosition?: string;
  violation?: string;
  isCoreParameter?: boolean; // HGB, HCT, WBC, PLT, RBC
}

export interface IgnoredItem {
  item: string;
  value: string;
  rawText: string;
  reason: string;
}

interface StrukScannerProps {
  atlmId?: string;
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

// Preset Filter Preprocessing untuk Variasi Kertas Struk
type PreprocessPreset = 'standard' | 'faint' | 'dark' | 'adaptive' | 'grayscale_only';

interface FilterOption {
  id: PreprocessPreset;
  label: string;
  description: string;
  contrast: number;
  threshold: number;
}

const PREPROCESS_PRESETS: FilterOption[] = [
  {
    id: 'standard',
    label: 'Rekomendasi Dirui (Threshold 180 + Kontras 1.8)',
    description: 'Binarisasi tajam standar pabrikan Dirui Dimih 3980',
    contrast: 1.8,
    threshold: 180,
  },
  {
    id: 'faint',
    label: 'Thermal Pudar / Terang (Threshold 160 + Kontras 2.2)',
    description: 'Cocok jika tinta termal printer struk mulai menipis/pudar',
    contrast: 2.2,
    threshold: 160,
  },
  {
    id: 'dark',
    label: 'Kertas Berbayang / Gelap (Threshold 200 + Kontras 1.6)',
    description: 'Cocok jika foto diambil di ruangan minim cahaya atau ada bayangan hp',
    contrast: 1.6,
    threshold: 200,
  },
  {
    id: 'adaptive',
    label: 'Adaptif Otomatis (Dynamic Mean)',
    description: 'Menghitung batas binarisasi secara otomatis berdasarkan rata-rata pencahayaan',
    contrast: 1.8,
    threshold: 175,
  },
  {
    id: 'grayscale_only',
    label: 'Grayscale & Kontras Saja (Tanpa Binarisasi)',
    description: 'Menjaga gradasi abu-abu jika binarisasi memotong titik printer',
    contrast: 2.0,
    threshold: 0,
  },
];

// Parameter Utama Laboratorium yang diprioritaskan
const CORE_MASTER_CODES = ['HGB', 'HCT', 'WBC', 'PLT', 'RBC'];

export default function StrukScanner({ atlmId = "ATLM-01", onNavigateToTab }: StrukScannerProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [hasil, setHasil] = useState<HasilQC[]>([]);
  const [ignoredItems, setIgnoredItems] = useState<IgnoredItem[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | Blob | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [processedPreviewSrc, setProcessedPreviewSrc] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);
  
  // OCR Raw Text & Inspeksi
  const [rawOcrText, setRawOcrText] = useState<string>("");
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [showIgnoredPanel, setShowIgnoredPanel] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'original' | 'processed'>('original');

  // Master Data State
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [controls, setControls] = useState<ControlMaterial[]>([]);
  const [qcLots, setQcLots] = useState<QCLot[]>([]);

  // QC Metadata Config - Terintegrasi Master Data
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("inst-dirui-3980");
  const [selectedControlMaterialId, setSelectedControlMaterialId] = useState<string>("ctrl-hema-8c");
  const [selectedControlLevel, setSelectedControlLevel] = useState<"Level 1" | "Level 2" | "Level 3">("Level 1");
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>("LOT-EC8C-9912");
  const [isCustomLot, setIsCustomLot] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState<string>(() => new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [syncToLeveyJennings, setSyncToLeveyJennings] = useState<boolean>(true);

  // Struk Header Detection State
  const [detectedReceiptLot, setDetectedReceiptLot] = useState<string | null>(null);
  const [detectedReceiptLevel, setDetectedReceiptLevel] = useState<string | null>(null);

  // Preprocessing Adjustments State (User Tuning & Rescan)
  const [activePreset, setActivePreset] = useState<PreprocessPreset>('standard');
  const [customThreshold, setCustomThreshold] = useState<number>(180);
  const [customContrast, setCustomContrast] = useState<number>(1.8);
  const [autoCropTable, setAutoCropTable] = useState<boolean>(true);
  const [showFilterSettings, setShowFilterSettings] = useState<boolean>(false);

  // File input ref for camera & picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load master data on mount
  useEffect(() => {
    const instList = StorageService.getInstruments();
    const paramList = StorageService.getParameters();
    const ctrlList = StorageService.getControlMaterials();
    const lotList = StorageService.getQCLots();

    setInstruments(instList);
    setParameters(paramList);
    setControls(ctrlList);
    setQcLots(lotList);

    // If Dirui instrument exists, ensure it is selected
    const diruiInst = instList.find(i => i.id === "inst-dirui-3980" || i.code.includes("3980"));
    if (diruiInst) {
      setSelectedInstrumentId(diruiInst.id);
    }

    // Default to Eightcheck Level 1 or first hematology control
    const defaultCtrl = ctrlList.find(c => c.id === 'ctrl-hema-8c' || c.name.toLowerCase().includes('eightcheck')) || ctrlList[0];
    if (defaultCtrl) {
      setSelectedControlMaterialId(defaultCtrl.id);
      setSelectedControlLevel(defaultCtrl.level || 'Level 1');
      setSelectedLotNumber(defaultCtrl.lotNumber || 'LOT-EC8C-9912');
    }
  }, []);

  // Filter master parameters for Dirui Dimih 3980
  const dimihParameters = useMemo(() => {
    return parameters.filter(p => p.instrumentId === selectedInstrumentId || p.instrumentId === "inst-dirui-3980");
  }, [parameters, selectedInstrumentId]);

  const activeInstrument = useMemo(() => {
    return instruments.find(i => i.id === selectedInstrumentId) || {
      id: "inst-dirui-3980",
      name: "Dirui Dimih 3980 Automated Analyzer",
      code: "DIMIH-3980"
    };
  }, [instruments, selectedInstrumentId]);

  // Bahan Kontrol Terpilih dari Master Data
  const selectedControlMaterial = useMemo(() => {
    return controls.find(c => c.id === selectedControlMaterialId) 
      || controls.find(c => c.level === selectedControlLevel) 
      || controls[0];
  }, [controls, selectedControlMaterialId, selectedControlLevel]);

  // Daftar Nomor LOT Master yang Tersedia untuk Bahan Kontrol & Level Terpilih
  const availableLots = useMemo(() => {
    const map = new Map<string, { number: string; expDate?: string; status: string; id?: string }>();
    
    // 1. Lot dari bahan kontrol terpilih
    if (selectedControlMaterial?.lotNumber) {
      map.set(selectedControlMaterial.lotNumber, {
        number: selectedControlMaterial.lotNumber,
        expDate: selectedControlMaterial.expirationDate,
        status: selectedControlMaterial.status || 'active',
        id: selectedControlMaterial.id
      });
    }

    // 2. Lot dari daftar tabel Master QCLot
    qcLots.forEach(l => {
      const matchMaterial = l.materialId === selectedControlMaterialId || l.materialId === selectedControlMaterial?.id;
      const matchLevel = l.levelId === selectedControlLevel || !l.levelId;
      if (matchMaterial || matchLevel) {
        if (!map.has(l.number)) {
          map.set(l.number, {
            number: l.number,
            expDate: l.expirationDate,
            status: l.status || 'active',
            id: l.id
          });
        }
      }
    });

    // 3. Tambahan lot dari bahan kontrol lain yang berlevel sama
    controls.filter(c => c.level === selectedControlLevel).forEach(c => {
      if (c.lotNumber && !map.has(c.lotNumber)) {
        map.set(c.lotNumber, {
          number: c.lotNumber,
          expDate: c.expirationDate,
          status: c.status || 'active',
          id: c.id
        });
      }
    });

    return Array.from(map.values());
  }, [selectedControlMaterial, selectedControlMaterialId, selectedControlLevel, qcLots, controls]);

  // Handler Ganti Bahan Kontrol Master (Auto-Sync Level & Lot)
  const handleControlMaterialChange = (materialId: string) => {
    setSelectedControlMaterialId(materialId);
    const found = controls.find(c => c.id === materialId);
    if (found) {
      setSelectedControlLevel(found.level);
      setSelectedLotNumber(found.lotNumber);
    }
  };

  // Handler Ganti Level Kontrol Master (Auto-Sync Bahan Kontrol & Lot)
  const handleLevelChange = (newLevel: "Level 1" | "Level 2" | "Level 3") => {
    setSelectedControlLevel(newLevel);
    
    // Cari bahan kontrol yang sesuai dengan level baru dari keluarga yang sama (Eightcheck atau Dirui)
    const currentName = selectedControlMaterial?.name.toLowerCase() || "";
    const isDiruiBrand = currentName.includes("dirui");
    
    let matchedCtrl = controls.find(c => 
      c.level === newLevel && (isDiruiBrand ? c.name.toLowerCase().includes("dirui") : c.name.toLowerCase().includes("eightcheck"))
    );

    if (!matchedCtrl) {
      matchedCtrl = controls.find(c => c.level === newLevel);
    }

    if (matchedCtrl) {
      setSelectedControlMaterialId(matchedCtrl.id);
      setSelectedLotNumber(matchedCtrl.lotNumber);
    }
  };

  // Alias mapper to match receipt OCR codes to master parameters
  const findMatchingMasterParameter = useCallback((itemCode: string): Parameter | undefined => {
    const clean = itemCode.toUpperCase().trim();

    // 1. Exact code match in selected instrument parameters
    let match = dimihParameters.find(p => p.code.toUpperCase() === clean);
    if (match) return match;

    // 2. Alias mapping for Dirui Dimih 3980 printouts
    const aliasMap: Record<string, string> = {
      // Core Parameters
      "HB": "HGB",
      "HEMOGLOBIN": "HGB",
      "H8B": "HGB",
      "HT": "HCT",
      "HEMATOKRIT": "HCT",
      "HGI": "HCT",
      "LEUKOSIT": "WBC",
      "W8C": "WBC",
      "TROMBOSIT": "PLT",
      "8LT": "PLT",
      "ERITROSIT": "RBC",
      "8BC": "RBC",
      // Differential & Indices
      "GRAN%": "NEUT%",
      "GRAN#": "NEUT#",
      "NEU%": "NEUT%",
      "NEU#": "NEUT#",
      "MID%": "MXD%",
      "MID#": "MXD#",
      "MONO%": "MXD%",
      "MONO#": "MXD#",
      "RDW": "RDW-CV",
      "RDWCV": "RDW-CV",
      "RDW_CV": "RDW-CV",
      "RDWSD": "RDW-SD",
      "RDW_SD": "RDW-SD",
      "MCHG": "MCHC",
      "PLCR": "P-LCR",
      "P_LCR": "P-LCR",
      "PLCC": "P-LCC",
      "P_LCC": "P-LCC"
    };

    const targetCode = aliasMap[clean];
    if (targetCode) {
      match = dimihParameters.find(p => p.code.toUpperCase() === targetCode);
      if (match) return match;
    }

    // 3. Fallback search across all master parameters
    match = parameters.find(p => p.code.toUpperCase() === clean);
    if (match) return match;
    if (targetCode) {
      match = parameters.find(p => p.code.toUpperCase() === targetCode);
      if (match) return match;
    }

    return undefined;
  }, [dimihParameters, parameters]);

  // Evaluates SDI (Z-Score) & Westgard Status against Master Data
  // Menyesuaikan target rata-rata sesuai Level Kontrol (Level 1 Normal, Level 2 Low, Level 3 High)
  const evaluateMasterDataMetrics = useCallback((nilaiStr: string, param?: Parameter, flagStr?: string | null, levelOverride?: "Level 1" | "Level 2" | "Level 3") => {
    const val = parseFloat(nilaiStr);
    if (isNaN(val) || !param || !param.targetSD || param.targetSD <= 0) {
      return {
        targetMean: param?.targetMean,
        targetSD: param?.targetSD,
        zScore: undefined,
        sdPosition: undefined,
        status: (flagStr ? "warning" : "ok") as "ok" | "warning" | "reject",
        violation: undefined
      };
    }

    const currentLevel = levelOverride || selectedControlLevel;
    let targetMean = param.targetMean;
    let targetSD = param.targetSD;

    // Penyesuaian rentang target bila menggunakan bahan kontrol Level 2 (Low) atau Level 3 (High)
    if (currentLevel === 'Level 2') {
      const isHemoglobin = ['HGB', 'HCT'].includes(param.code.toUpperCase());
      const factor = isHemoglobin ? 0.60 : 0.50;
      targetMean = Number((param.targetMean * factor).toFixed(2));
      targetSD = Number((param.targetSD * factor).toFixed(2)) || 0.1;
    } else if (currentLevel === 'Level 3') {
      const isHemoglobin = ['HGB', 'HCT'].includes(param.code.toUpperCase());
      const factor = isHemoglobin ? 1.40 : 1.70;
      targetMean = Number((param.targetMean * factor).toFixed(2));
      targetSD = Number((param.targetSD * factor).toFixed(2)) || 0.1;
    }

    const zScore = (val - targetMean) / targetSD;
    const absZ = Math.abs(zScore);
    const sign = zScore >= 0 ? "+" : "";
    const sdPosition = `${sign}${zScore.toFixed(2)} SD`;

    let status: "ok" | "warning" | "reject" = "ok";
    let violation: string | undefined = undefined;

    if (absZ >= 3.0) {
      status = "reject";
      violation = "1:3s (Reject) - Melampaui batas kritis 3 SD";
    } else if (absZ >= 2.0 || flagStr === "L" || flagStr === "H") {
      status = "warning";
      violation = flagStr ? `Flag Struk ${flagStr} / Peringatan 1:2s` : "1:2s (Warning) - Melampaui batas 2 SD";
    }

    return {
      targetMean,
      targetSD,
      zScore: Number(zScore.toFixed(2)),
      sdPosition,
      status,
      violation
    };
  }, [selectedControlLevel]);

  /**
   * Preprocessing Canvas Tingkat Lanjut (WAJIB):
   * 1. Normalisasi resolusi ke skala optimal OCR (~1200 - 1500px width)
   * 2. Grayscale standard: 0.299 * R + 0.587 * G + 0.114 * B
   * 3. Kontras 1.8 (atau custom) menggunakan faktor matematis cFactor
   * 4. Threshold 180 (Binarisasi tajam pixel-level: teks jadi hitam 0, kertas jadi putih 255)
   * 5. Crop otomatis: Hanya fokus area tabel Item-Hasil-Unit
   */
  const preprocessImage = useCallback((
    file: File | Blob, 
    thresholdVal: number = customThreshold, 
    contrastVal: number = customContrast,
    cropTable: boolean = autoCropTable,
    preset: PreprocessPreset = activePreset
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const origW = img.width;
          const origH = img.height;

          // 1. Hitung Area Crop Otomatis
          // Jika crop tabel diaktifkan: buang margin meja dan header/footer non-tabel
          let cropX = 0;
          let cropY = 0;
          let cropW = origW;
          let cropH = origH;

          if (cropTable) {
            cropX = Math.round(origW * 0.05); // 5% margin kiri
            cropY = Math.round(origH * 0.16); // 16% margin atas (lewati logo, judul, date banner)
            cropW = Math.round(origW * 0.90); // 90% lebar
            cropH = Math.round(origH * 0.72); // 72% tinggi (lewati histogram dan tanda tangan)
          }

          // 2. Normalisasi Resolusi untuk Kerapatan Pixel Optimal Tesseract (1200 - 1400 px width)
          const targetWidth = Math.min(1400, Math.max(900, cropW));
          const scale = targetWidth / cropW;
          const targetHeight = Math.round(cropH * scale);

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(img.src);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Gambar section terpilih ke canvas dengan penskalaan halus
          ctx.drawImage(
            img,
            cropX, cropY, cropW, cropH,
            0, 0, targetWidth, targetHeight
          );

          // 3. Pixel-level Manipulation: Grayscale -> Contrast -> Binarization Threshold
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const data = imgData.data;

          // Kontras formula: cFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))
          const cFactor = (259 * (contrastVal * 255 + 255)) / (255 * (259 - contrastVal * 255));

          // Hitung rata-rata luminans jika mode adaptif
          let totalLuminance = 0;
          if (preset === 'adaptive') {
            for (let i = 0; i < data.length; i += 16) {
              totalLuminance += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            }
          }
          const avgLuminance = preset === 'adaptive' ? totalLuminance / (data.length / 16) : thresholdVal;
          const effectiveThreshold = preset === 'adaptive' ? Math.max(140, Math.min(210, avgLuminance * 0.95)) : thresholdVal;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // A: Grayscale (ITU-R BT.601)
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // B: Kontras 1.8
            gray = cFactor * (gray - 128) + 128;
            if (gray < 0) gray = 0;
            else if (gray > 255) gray = 255;

            // C: Binarisasi Threshold (180 sebagai default WAJIB)
            if (preset === 'grayscale_only') {
              data[i] = gray;
              data[i + 1] = gray;
              data[i + 2] = gray;
            } else {
              const binary = gray >= effectiveThreshold ? 255 : 0;
              data[i] = binary;
              data[i + 1] = binary;
              data[i + 2] = binary;
            }
            data[i + 3] = 255;
          }

          ctx.putImageData(imgData, 0, 0);
          const processedUrl = canvas.toDataURL("image/png");
          setProcessedPreviewSrc(processedUrl);
          resolve(processedUrl);
        } catch (e) {
          console.error("Preprocessing error:", e);
          resolve(URL.createObjectURL(file));
        }
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, [customThreshold, customContrast, autoCropTable, activePreset]);

  /**
   * Logika Parsing FOKUS MASTER DATA:
   * 1. Mendeteksi LOT & LEVEL dari Header Struk dan menyelaraskan ke Master Data
   * 2. Mencari parameter yang ADA di Master Data (HGB, HCT, WBC, PLT, RBC, dsb.)
   * 3. Mengesampingkan parameter / teks yang TIDAK ADA di Master Data
   */
  const parseStruk = useCallback((text: string): HasilQC[] => {
    setRawOcrText(text);
    const lines = text.split("\n");
    const resultsMap = new Map<string, HasilQC>();
    const ignored: IgnoredItem[] = [];

    // --- A. DETEKSI OTOMATIS NOMOR LOT & LEVEL DARI STRUK ---
    const lotMatch = text.match(/\bLOT\s*[:#-]?\s*([A-Z0-9\-_]+)/i);
    let matchedLotFound: string | null = null;
    let matchedLevelFound: ("Level 1" | "Level 2" | "Level 3") | null = null;

    if (lotMatch && lotMatch[1]) {
      const detectedLotStr = lotMatch[1].trim();
      matchedLotFound = detectedLotStr;
      
      // Cari apakah LOT ini ada pada Master Data Bahan Kontrol
      const matchedCtrl = controls.find(c => c.lotNumber.toUpperCase() === detectedLotStr.toUpperCase())
        || controls.find(c => detectedLotStr.toUpperCase().includes(c.lotNumber.toUpperCase()) || c.lotNumber.toUpperCase().includes(detectedLotStr.toUpperCase()));

      if (matchedCtrl) {
        setSelectedControlMaterialId(matchedCtrl.id);
        setSelectedControlLevel(matchedCtrl.level);
        setSelectedLotNumber(matchedCtrl.lotNumber);
        setDetectedReceiptLot(matchedCtrl.lotNumber);
        setDetectedReceiptLevel(matchedCtrl.level);
        matchedLevelFound = matchedCtrl.level;
      } else {
        // Cari di daftar Master QCLots
        const matchLotObj = qcLots.find(l => l.number.toUpperCase() === detectedLotStr.toUpperCase());
        if (matchLotObj) {
          setSelectedLotNumber(matchLotObj.number);
          if (matchLotObj.levelId) {
            setSelectedControlLevel(matchLotObj.levelId as any);
            matchedLevelFound = matchLotObj.levelId as any;
          }
          if (matchLotObj.materialId) setSelectedControlMaterialId(matchLotObj.materialId);
          setDetectedReceiptLot(matchLotObj.number);
        } else {
          setSelectedLotNumber(detectedLotStr);
          setDetectedReceiptLot(detectedLotStr);
        }
      }
    }

    // Deteksi Level dari Header (misal: "SAMPLE ID: QC-DIMIH-LV1", "LEVEL 1", "LV2", "NORMAL")
    const levelMatch = text.match(/\b(?:LEVEL\s*([123])|LV([123])|QC[A-Z0-9\-_]*LV([123])|NORMAL|LOW|HIGH)\b/i);
    if (levelMatch) {
      let lvlName: "Level 1" | "Level 2" | "Level 3" = "Level 1";
      const lvlNum = levelMatch[1] || levelMatch[2] || levelMatch[3];
      const matchText = levelMatch[0].toUpperCase();

      if (lvlNum === "1" || matchText.includes("NORMAL")) lvlName = "Level 1";
      else if (lvlNum === "2" || matchText.includes("LOW")) lvlName = "Level 2";
      else if (lvlNum === "3" || matchText.includes("HIGH")) lvlName = "Level 3";

      matchedLevelFound = lvlName;
      setDetectedReceiptLevel(lvlName);
      setSelectedControlLevel(lvlName);

      // Sinkronkan ke bahan kontrol master yang sesuai dengan level ini
      const matchCtrl = controls.find(c => c.level === lvlName && (c.name.includes("Eightcheck") || c.name.includes("Dimih")));
      if (matchCtrl) {
        setSelectedControlMaterialId(matchCtrl.id);
        if (!matchedLotFound) setSelectedLotNumber(matchCtrl.lotNumber);
      }
    }

    // --- B. PARSING PARAMETER DENGAN FOKUS MASTER DATA ---
    const lineRegex = /(?:([LH])\s+)?([A-Z0-9\-%#]+)\s+(?:([LH])\s+)?([0-9]+[.,]?[0-9]*)\s*([0-9\^\/\%a-zA-Z#]+)?/i;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const clean = line.replace(/\^/g, "^").trim();
      if (!clean) continue;

      const m = clean.match(lineRegex);
      if (m) {
        const flagPre = m[1]?.toUpperCase() || null;
        let itemRaw = m[2].toUpperCase().replace("#", "#").replace("%", "%");
        const flagMid = m[3]?.toUpperCase() || null;
        let nilaiRaw = m[4].replace(",", ".");
        let unitRaw = (m[5] || "")
          .replace("10A3", "10^3/uL")
          .replace("10A6", "10^6/uL")
          .replace("10^3", "10^3/uL")
          .replace("10^6", "10^6/uL")
          .replace("g/dL", "g/dL")
          .replace("fL", "fL")
          .replace("pg", "pg");

        // Normalisasi Typo Karakter Umum OCR Thermal
        if (itemRaw === "8BC") itemRaw = "RBC";
        if (itemRaw === "W8C") itemRaw = "WBC";
        if (itemRaw === "MCHG") itemRaw = "MCHC";
        if (itemRaw === "H8B") itemRaw = "HGB";
        if (itemRaw === "8LT") itemRaw = "PLT";
        if (itemRaw === "HGI") itemRaw = "HCT";
        if (itemRaw === "RDW_SD") itemRaw = "RDW-SD";
        if (itemRaw === "RDW_CV") itemRaw = "RDW-CV";
        if (itemRaw === "P_LCR") itemRaw = "P-LCR";

        // Abaikan teks judul, header, nomor sampel
        if (["DATE", "TIME", "SAMPLE", "PATIENT", "DIRUI", "DIMIH", "OPERATOR", "ITEM", "LOT", "ID", "NO", "NAME", "VAL"].includes(itemRaw)) {
          continue;
        }

        const flag = flagMid || flagPre || null;

        // FOKUS MASTER DATA: Cari kecocokan di Master Data
        const matchedParam = findMatchingMasterParameter(itemRaw);

        if (!matchedParam) {
          ignored.push({
            item: itemRaw,
            value: nilaiRaw,
            rawText: clean,
            reason: "Tidak terdaftar dalam Master Data Instrumen"
          });
          continue;
        }

        const canonicalCode = matchedParam.code.toUpperCase();
        if (!resultsMap.has(canonicalCode)) {
          const metrics = evaluateMasterDataMetrics(nilaiRaw, matchedParam, flag, matchedLevelFound || selectedControlLevel);
          const isCore = CORE_MASTER_CODES.includes(canonicalCode);

          resultsMap.set(canonicalCode, {
            id: `item-${Date.now()}-${canonicalCode}`,
            item: matchedParam.code,
            nilai: nilaiRaw,
            flag: flag,
            unit: matchedParam.unit || unitRaw || (canonicalCode.includes("%") ? "%" : ""),
            status: metrics.status,
            parameterId: matchedParam.id,
            parameterName: matchedParam.name,
            targetMean: metrics.targetMean,
            targetSD: metrics.targetSD,
            zScore: metrics.zScore,
            sdPosition: metrics.sdPosition,
            violation: metrics.violation,
            isCoreParameter: isCore
          });
        }
      }
    }

    // --- C. PEMINDAIAN BERTARGET KHUSUS PARAMETER KUNCI (HGB, HCT, WBC, PLT, RBC) ---
    const coreTargetMatchers = [
      { code: "HGB", regex: /(?:^|[^\w])(?:HGB|HB|HEMOGLOBIN|H8B)(?:[:=-]|\s+)\s*([LH])?\s*([0-9]+\.?[0-9]*)\s*([LH])?\s*([a-zA-Z\^\/\%]+)?/i },
      { code: "HCT", regex: /(?:^|[^\w])(?:HCT|HT|HEMATOKRIT|HGI)(?:[:=-]|\s+)\s*([LH])?\s*([0-9]+\.?[0-9]*)\s*([LH])?\s*([a-zA-Z\^\/\%]+)?/i },
      { code: "WBC", regex: /(?:^|[^\w])(?:WBC|LEUKOSIT|W8C)(?:[:=-]|\s+)\s*([LH])?\s*([0-9]+\.?[0-9]*)\s*([LH])?\s*([a-zA-Z\^\/\%]+)?/i },
      { code: "PLT", regex: /(?:^|[^\w])(?:PLT|TROMBOSIT|8LT)(?:[:=-]|\s+)\s*([LH])?\s*([0-9]+\.?[0-9]*)\s*([LH])?\s*([a-zA-Z\^\/\%]+)?/i },
      { code: "RBC", regex: /(?:^|[^\w])(?:RBC|ERITROSIT|8BC)(?:[:=-]|\s+)\s*([LH])?\s*([0-9]+\.?[0-9]*)\s*([LH])?\s*([a-zA-Z\^\/\%]+)?/i },
    ];

    coreTargetMatchers.forEach(({ code, regex }) => {
      if (!resultsMap.has(code)) {
        const m = text.match(regex);
        if (m) {
          const matchedParam = findMatchingMasterParameter(code);
          if (matchedParam) {
            const flag = m[1]?.toUpperCase() || m[3]?.toUpperCase() || null;
            const val = m[2];
            const metrics = evaluateMasterDataMetrics(val, matchedParam, flag, matchedLevelFound || selectedControlLevel);

            resultsMap.set(code, {
              id: `item-${Date.now()}-core-${code}`,
              item: matchedParam.code,
              nilai: val,
              flag: flag,
              unit: matchedParam.unit || (code === "HGB" ? "g/dL" : code === "HCT" ? "%" : "10^3/uL"),
              status: metrics.status,
              parameterId: matchedParam.id,
              parameterName: matchedParam.name,
              targetMean: metrics.targetMean,
              targetSD: metrics.targetSD,
              zScore: metrics.zScore,
              sdPosition: metrics.sdPosition,
              violation: metrics.violation,
              isCoreParameter: true
            });
          }
        }
      }
    });

    // Urutkan sesuai Standar Klinis Laboratorium (WBC, RBC, HGB, HCT, PLT paling atas)
    const priorityOrder = [
      'WBC', 'RBC', 'HGB', 'HCT', 'PLT',
      'MCV', 'MCH', 'MCHC',
      'RDW-CV', 'RDW-SD', 'MPV', 'PDW', 'PCT', 'P-LCR',
      'LYM%', 'MXD%', 'NEUT%', 'LYM#', 'MXD#', 'NEUT#'
    ];

    const sortedResults = Array.from(resultsMap.values()).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a.item.toUpperCase());
      const idxB = priorityOrder.indexOf(b.item.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.item.localeCompare(b.item);
    });

    setIgnoredItems(ignored);
    return sortedResults;
  }, [findMatchingMasterParameter, evaluateMasterDataMetrics, controls, qcLots, selectedControlLevel]);

  /**
   * Eksekusi OCR dengan Tesseract.js v5
   */
  const runOcrRecognition = useCallback(async (dataUrl: string) => {
    setProgress("Membaca angka & karakter (OCR Tesseract v5)...");
    const { data } = await Tesseract.recognize(dataUrl, "eng", {
      logger: (m: any) => {
        const pct = Math.round((m.progress || 0) * 100);
        setProgress(`${m.status === 'recognizing text' ? 'Menganalisis teks struk' : m.status}... ${pct}%`);
      },
      // Whitelist ketat sesuai spesifikasi OCR laboratorium
      // @ts-ignore
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ%-#0123456789.^/uLfdpg+ ",
      tessedit_pageseg_mode: "6", // PSM 6: Single uniform block of text
    });

    setProgress("Memvalidasi parameter, Bahan Kontrol & LOT Master...");
    const parsed = parseStruk(data.text);
    setHasil(parsed);
    setProgress(`Selesai! Ditemukan ${parsed.length} parameter Master Data (HGB, HCT, WBC, PLT, RBC, dll).`);
    return parsed;
  }, [parseStruk]);

  /**
   * Handler Upload / Kamera Foto Baru
   */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFile(file);
    const origUrl = URL.createObjectURL(file);
    setPreviewSrc(origUrl);
    setLoading(true);
    setProgress("Preprocessing foto struk (Grayscale, Kontras 1.8, Threshold 180)...");
    setStatusMessage(null);

    try {
      // 1. Upload foto asli ke Supabase Storage bucket struk-qc
      const fileName = `qc/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      try {
        await supabase.storage.from("struk-qc").upload(fileName, file);
        const { data: urlData } = supabase.storage.from("struk-qc").getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          setFotoUrl(urlData.publicUrl);
        }
      } catch (storageErr) {
        console.warn("Storage upload notice (menggunakan blob lokal):", storageErr);
      }

      // 2. Preprocess Canvas dengan spesifikasi WAJIB
      const processedDataUrl = await preprocessImage(file);

      // 3. OCR Tesseract
      await runOcrRecognition(processedDataUrl);

    } catch (err: any) {
      console.error(err);
      setProgress("Gagal baca struk, coba gunakan opsi 'Scan Ulang' atau foto lebih tegak lurus");
      setStatusMessage({
        type: 'error',
        text: 'Gagal memproses struk: ' + (err.message || 'Coba gunakan foto yang lebih fokus dan kontras.')
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * FITUR SCAN ULANG (RESCAN) KHUSUS JIKA HASIL TIDAK SESUAI
   */
  const handleRescanWithFilter = async (presetId: PreprocessPreset, customThresh?: number) => {
    if (!sourceFile && !previewSrc) return;
    setActivePreset(presetId);
    const targetPreset = PREPROCESS_PRESETS.find(p => p.id === presetId);
    const targetThresh = customThresh !== undefined ? customThresh : (targetPreset?.threshold || 180);
    const targetContrast = targetPreset?.contrast || 1.8;

    setCustomThreshold(targetThresh);
    setCustomContrast(targetContrast);
    setLoading(true);
    setProgress(`Scan Ulang: Menerapkan filter '${targetPreset?.label || presetId}'...`);
    setStatusMessage(null);

    try {
      let fileToUse: File | Blob | null = sourceFile;
      if (!fileToUse && previewSrc) {
        const resp = await fetch(previewSrc);
        fileToUse = await resp.blob();
      }

      if (!fileToUse) throw new Error("File sumber gambar tidak ditemukan.");

      const processed = await preprocessImage(
        fileToUse, 
        targetThresh, 
        targetContrast, 
        autoCropTable, 
        presetId
      );

      await runOcrRecognition(processed);
      setPreviewTab('processed');
    } catch (err: any) {
      console.error("Rescan failed:", err);
      setStatusMessage({
        type: 'error',
        text: 'Scan ulang gagal: ' + (err.message || 'Silakan coba foto ulang dari awal.')
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Scan Ulang dengan Toggle Area Crop
   */
  const handleToggleCropAndRescan = async () => {
    const nextCropState = !autoCropTable;
    setAutoCropTable(nextCropState);
    if (!sourceFile && !previewSrc) return;

    setLoading(true);
    setProgress(nextCropState ? "Mengaktifkan Crop Fokus Area Tabel..." : "Menggunakan Foto Penuh Tanpa Crop...");
    setStatusMessage(null);

    try {
      let fileToUse: File | Blob | null = sourceFile;
      if (!fileToUse && previewSrc) {
        const resp = await fetch(previewSrc);
        fileToUse = await resp.blob();
      }
      if (!fileToUse) return;

      const processed = await preprocessImage(
        fileToUse, 
        customThreshold, 
        customContrast, 
        nextCropState, 
        activePreset
      );

      await runOcrRecognition(processed);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset Semua Hasil & Siap Scan Ulang
   */
  const handleResetScan = () => {
    setHasil([]);
    setIgnoredItems([]);
    setSourceFile(null);
    setPreviewSrc("");
    setProcessedPreviewSrc("");
    setFotoUrl("");
    setRawOcrText("");
    setDetectedReceiptLot(null);
    setDetectedReceiptLevel(null);
    setProgress("");
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  /**
   * Tambah Baris Parameter Manual (Hanya dari Master Data)
   */
  const handleAddManualRow = () => {
    const targetParam = dimihParameters.find(p => p.code === 'HGB') || dimihParameters[0] || parameters[0];
    if (!targetParam) return;

    const metrics = evaluateMasterDataMetrics(targetParam.targetMean.toString(), targetParam, null);
    const newRow: HasilQC = {
      id: `item-${Date.now()}-manual`,
      item: targetParam.code,
      nilai: targetParam.targetMean.toString(),
      flag: null,
      unit: targetParam.unit,
      status: metrics.status,
      parameterId: targetParam.id,
      parameterName: targetParam.name,
      targetMean: metrics.targetMean,
      targetSD: metrics.targetSD,
      zScore: metrics.zScore,
      sdPosition: metrics.sdPosition,
      isCoreParameter: CORE_MASTER_CODES.includes(targetParam.code.toUpperCase())
    };
    setHasil(prev => [...prev, newRow]);
  };

  /**
   * 1-Click Simulator / Generator Contoh Struk Realistis Dirui Dimih 3980
   */
  const handleLoadSampleDiruiReceipt = useCallback(async () => {
    setLoading(true);
    setProgress("Membuat contoh struk termal Dirui Dimih 3980...");
    setStatusMessage(null);

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d")!;

    // Background thermal receipt
    ctx.fillStyle = "#F9FAFB";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text Print
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.font = "bold 22px monospace";
    ctx.fillText("DIRUI DIMIH 3980 ANALYZER", canvas.width / 2, 45);
    ctx.font = "bold 16px monospace";
    ctx.fillText("HEMATOLOGY CONTROL REPORT", canvas.width / 2, 75);
    ctx.font = "14px monospace";
    ctx.fillText("RSUD SULTAN MUHAMMAD JAMALUDIN I", canvas.width / 2, 100);

    ctx.textAlign = "left";
    ctx.font = "14px monospace";
    ctx.fillText("----------------------------------------------", 30, 130);
    ctx.fillText(`DATE: ${selectedDate}   TIME: ${selectedTime}`, 30, 155);
    ctx.fillText(`SAMPLE ID : QC-DIMIH-${selectedControlLevel.replace(" ", "")}   LOT: ${selectedLotNumber}`, 30, 180);
    ctx.fillText(`OPERATOR  : ${atlmId}`, 30, 205);
    ctx.fillText("----------------------------------------------", 30, 230);
    ctx.font = "bold 15px monospace";
    ctx.fillText("ITEM       FLAG   VALUE    UNIT", 30, 255);
    ctx.fillText("----------------------------------------------", 30, 275);

    // Realistic sample values reflecting Master Data
    const mockRows = selectedControlLevel === "Level 2" ? [
      { item: "WBC", flag: "L", val: "3.60", unit: "10^3/uL" },
      { item: "RBC", flag: "L", val: "2.25", unit: "10^6/uL" },
      { item: "HGB", flag: "L", val: "6.8", unit: "g/dL" },
      { item: "HCT", flag: "L", val: "20.5", unit: "%" },
      { item: "MCV", flag: "", val: "88.0", unit: "fL" },
      { item: "MCH", flag: "", val: "29.2", unit: "pg" },
      { item: "MCHC", flag: "", val: "33.1", unit: "g/dL" },
      { item: "PLT", flag: "L", val: "120", unit: "10^3/uL" },
      { item: "LYM%", flag: "", val: "31.5", unit: "%" },
      { item: "MXD%", flag: "", val: "7.2", unit: "%" },
      { item: "NEUT%", flag: "", val: "61.3", unit: "%" },
      { item: "RDW-CV", flag: "", val: "13.5", unit: "%" },
      { item: "RDW-SD", flag: "", val: "42.0", unit: "fL" },
      { item: "MPV", flag: "", val: "9.6", unit: "fL" },
      { item: "PDW", flag: "", val: "15.4", unit: "%" },
      { item: "PCT", flag: "", val: "0.14", unit: "%" },
      { item: "P-LCR", flag: "", val: "27.5", unit: "%" }
    ] : selectedControlLevel === "Level 3" ? [
      { item: "WBC", flag: "H", val: "12.20", unit: "10^3/uL" },
      { item: "RBC", flag: "H", val: "6.30", unit: "10^6/uL" },
      { item: "HGB", flag: "H", val: "18.8", unit: "g/dL" },
      { item: "HCT", flag: "H", val: "56.7", unit: "%" },
      { item: "MCV", flag: "", val: "89.2", unit: "fL" },
      { item: "MCH", flag: "", val: "29.8", unit: "pg" },
      { item: "MCHC", flag: "", val: "33.5", unit: "g/dL" },
      { item: "PLT", flag: "H", val: "415", unit: "10^3/uL" },
      { item: "LYM%", flag: "", val: "31.5", unit: "%" },
      { item: "MXD%", flag: "", val: "7.2", unit: "%" },
      { item: "NEUT%", flag: "", val: "61.3", unit: "%" },
      { item: "RDW-CV", flag: "", val: "13.5", unit: "%" },
      { item: "RDW-SD", flag: "", val: "42.0", unit: "fL" },
      { item: "MPV", flag: "", val: "9.6", unit: "fL" },
      { item: "PDW", flag: "", val: "15.4", unit: "%" },
      { item: "PCT", flag: "", val: "0.42", unit: "%" },
      { item: "P-LCR", flag: "", val: "27.5", unit: "%" }
    ] : [
      { item: "WBC", flag: "", val: "7.20", unit: "10^3/uL" },
      { item: "RBC", flag: "", val: "4.50", unit: "10^6/uL" },
      { item: "HGB", flag: "L", val: "11.4", unit: "g/dL" },
      { item: "HCT", flag: "L", val: "34.2", unit: "%" },
      { item: "MCV", flag: "", val: "88.5", unit: "fL" },
      { item: "MCH", flag: "", val: "29.5", unit: "pg" },
      { item: "MCHC", flag: "L", val: "31.1", unit: "g/dL" },
      { item: "PLT", flag: "H", val: "295", unit: "10^3/uL" },
      { item: "LYM%", flag: "", val: "31.5", unit: "%" },
      { item: "MXD%", flag: "", val: "7.2", unit: "%" },
      { item: "NEUT%", flag: "", val: "61.3", unit: "%" },
      { item: "RDW-CV", flag: "", val: "13.5", unit: "%" },
      { item: "RDW-SD", flag: "", val: "42.0", unit: "fL" },
      { item: "MPV", flag: "", val: "9.6", unit: "fL" },
      { item: "PDW", flag: "", val: "15.4", unit: "%" },
      { item: "PCT", flag: "", val: "0.28", unit: "%" },
      { item: "P-LCR", flag: "", val: "27.5", unit: "%" }
    ];

    let y = 305;
    ctx.font = "15px monospace";
    mockRows.forEach(r => {
      const colItem = r.item.padEnd(10, " ");
      const colFlag = (r.flag || " ").padEnd(6, " ");
      const colVal = r.val.padStart(6, " ");
      const colUnit = "   " + r.unit;
      ctx.fillText(`${colItem}${colFlag}${colVal}${colUnit}`, 30, y);
      y += 35;
    });

    ctx.fillText("----------------------------------------------", 30, y);
    y += 25;
    ctx.font = "13px monospace";
    ctx.fillText(`* STATUS: DIMIH 3980 ${selectedControlLevel.toUpperCase()} REPORT *`, 30, y);

    const dataUrl = canvas.toDataURL("image/png");
    setPreviewSrc(dataUrl);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setSourceFile(blob);
      try {
        const processed = await preprocessImage(blob);
        await runOcrRecognition(processed);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, "image/png");
  }, [selectedDate, selectedTime, selectedLotNumber, selectedControlLevel, atlmId, preprocessImage, runOcrRecognition]);

  // Handle row value change with dynamic recalculation against Master Data
  const handleValueChange = (index: number, newVal: string) => {
    const copy = [...hasil];
    const target = copy[index];
    target.nilai = newVal;

    const matchedParam = parameters.find(p => p.id === target.parameterId) || findMatchingMasterParameter(target.item);

    const metrics = evaluateMasterDataMetrics(newVal, matchedParam, target.flag);
    target.zScore = metrics.zScore;
    target.sdPosition = metrics.sdPosition;
    target.status = metrics.status;
    target.violation = metrics.violation;

    setHasil(copy);
  };

  // Handle flag change (Normal / L / H)
  const handleFlagChange = (index: number, newFlag: string | null) => {
    const copy = [...hasil];
    const target = copy[index];
    target.flag = newFlag || null;

    const matchedParam = parameters.find(p => p.id === target.parameterId) || findMatchingMasterParameter(target.item);

    const metrics = evaluateMasterDataMetrics(target.nilai, matchedParam, target.flag);
    target.status = metrics.status;
    target.violation = metrics.violation;

    setHasil(copy);
  };

  // Handle parameter mapping change from dropdown
  const handleParameterMappingChange = (index: number, newParamId: string) => {
    const copy = [...hasil];
    const target = copy[index];
    const newParam = parameters.find(p => p.id === newParamId);
    if (!newParam) return;

    target.parameterId = newParam.id;
    target.parameterName = newParam.name;
    target.item = newParam.code;
    target.isCoreParameter = CORE_MASTER_CODES.includes(newParam.code.toUpperCase());
    if (newParam.unit) target.unit = newParam.unit;

    const metrics = evaluateMasterDataMetrics(target.nilai, newParam, target.flag);
    target.targetMean = metrics.targetMean;
    target.targetSD = metrics.targetSD;
    target.zScore = metrics.zScore;
    target.sdPosition = metrics.sdPosition;
    target.status = metrics.status;
    target.violation = metrics.violation;

    setHasil(copy);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    setHasil(prev => prev.filter((_, i) => i !== index));
  };

  // SIMPAN TERINTEGRASI KE DATABASE QC (Supabase qc_hematologi + StorageService Master QC Results qc_results)
  const simpanKeDB = async () => {
    if (hasil.length === 0) return;
    setLoading(true);
    setProgress("Menyimpan data hasil QC terintegrasi...");
    setStatusMessage(null);

    // 1. Payload untuk tabel qc_hematologi
    const hemaPayload = hasil.map(h => ({
      item: h.item,
      hasil: parseFloat(h.nilai) || 0,
      flag: h.flag,
      unit: h.unit,
      foto_url: fotoUrl,
      atlm_id: atlmId,
      tanggal: selectedDate,
    }));

    try {
      // Simpan ke storage service lokal untuk cadangan & offline capability
      await StorageService.saveQCHematologiBatch(hemaPayload, fotoUrl || previewSrc, selectedDate);

      // Simpan ke Supabase tabel qc_hematologi
      const { error: hemaError } = await supabase.from("qc_hematologi").insert(hemaPayload);
      if (hemaError) {
        console.warn("Supabase qc_hematologi notice:", hemaError.message);
      }

      // 2. Sinkronkan ke Master QC Results (qc_results) jika parameter terpetakan
      let syncedQCResultsCount = 0;
      if (syncToLeveyJennings) {
        const existingQCResults = StorageService.getQCResults();
        const activeRules = StorageService.getWestgardRules();

        hasil.forEach(h => {
          const matchParam = parameters.find(p => p.id === h.parameterId) || findMatchingMasterParameter(h.item);

          if (matchParam) {
            const numVal = parseFloat(h.nilai) || 0;
            const evalMetrics = evaluateMasterDataMetrics(h.nilai, matchParam, h.flag);
            const targetMean = evalMetrics.targetMean ?? matchParam.targetMean;
            const targetSD = evalMetrics.targetSD ?? matchParam.targetSD;
            const zScore = evalMetrics.zScore ?? (targetSD > 0 ? (numVal - targetMean) / targetSD : 0);

            // Ambil riwayat QC sebelumnya untuk parameter & level ini (urut kronologis)
            const previousHistory = existingQCResults
              .filter(r => r.parameterId === matchParam.id && r.controlLevel === selectedControlLevel)
              .sort((a, b) => a.timestamp - b.timestamp);

            const resultId = `QC-DIMIH-${Date.now()}-${matchParam.code}-${Math.random().toString(36).substring(7)}`;

            // Evaluasi aturan Westgard multi-rule (termasuk deteksi otomatis 10x pergeseran sistematik)
            const westgardEval = evaluateWestgardRules(
              { id: resultId, value: numVal, mean: targetMean, sd: targetSD, zScore },
              previousHistory,
              activeRules
            );

            const status = westgardEval.status;
            const violations = westgardEval.violations;

            const qcResult: QCResult = {
              id: resultId,
              date: selectedDate,
              time: selectedTime,
              timestamp: Date.now(),
              operatorId: atlmId,
              operatorName: atlmId === "user-admin" ? "dr. Hendra Wijaya, Sp.PK" : "ATLM Lab Hematologi",
              instrumentId: activeInstrument.id,
              instrumentName: activeInstrument.name,
              parameterId: matchParam.id,
              parameterName: matchParam.name,
              parameterCode: matchParam.code,
              controlLevel: selectedControlLevel,
              lotNumber: selectedLotNumber,
              value: numVal,
              unit: matchParam.unit || h.unit,
              mean: targetMean,
              sd: targetSD,
              zScore: Number(zScore.toFixed(2)),
              sdPosition: `${zScore >= 0 ? "+" : ""}${zScore.toFixed(2)} SD`,
              status,
              violations,
              notes: `Scan Struk OCR Dimih 3980 | Bahan Kontrol: ${selectedControlMaterial?.name || 'Master'} | Lot: ${selectedLotNumber} | ${selectedControlLevel} (Flag: ${h.flag || "Normal"})`,
              source: "AI_VISION",
              verificationStatus: "VERIFIED",
              reviewStatus: status === "reject" ? "rejected" : status === "warning" ? "investigation_required" : "accepted"
            };

            StorageService.saveQCResult(qcResult);
            syncedQCResultsCount++;
          }
        });
      }

      const successText = `Berhasil menyimpan ${hemaPayload.length} parameter hematologi master ke tabel qc_hematologi` +
        (syncedQCResultsCount > 0 ? ` dan ${syncedQCResultsCount} data langsung terintegrasi ke grafik Levey-Jennings & Dashboard Mutu!` : "!");

      setStatusMessage({
        type: 'success',
        text: successText,
        details: { count: hemaPayload.length, synced: syncedQCResultsCount }
      });

      // Audit Log
      StorageService.logAudit(
        "INPUT_QC_RESULT",
        `Input Scan Struk Hematologi Dirui Dimih 3980 (${hemaPayload.length} item, Bahan Kontrol: ${selectedControlMaterial?.name}, Lot: ${selectedLotNumber})`
      );

      StorageService.notifyDataChanged("qc_results");

    } catch (e: any) {
      setStatusMessage({ type: 'error', text: "Gagal simpan: " + (e.message || "Kesalahan jaringan.") });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const coreCount = hasil.filter(h => h.isCoreParameter).length;
  const warningCount = hasil.filter(h => h.status === "warning").length;
  const rejectCount = hasil.filter(h => h.status === "reject").length;

  return (
    <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-5 antialiased">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
              Scan Struk QC Hematologi Dirui Dimih 3980
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono border border-emerald-300 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Master Bahan Kontrol & LOT Terintegrasi</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ekstraksi OCR terarah yang terhubung langsung dengan <strong>Bahan Kontrol, Kontrol Level, dan Nomor LOT Master</strong> instrumen <strong>{activeInstrument.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleLoadSampleDiruiReceipt}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Coba Contoh Struk Dimih 3980 ({selectedControlLevel})</span>
          </button>
        </div>
      </div>

      {/* FOCUS BANNER WAJIB */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-blue-950 flex items-center gap-1.5 flex-wrap">
              <span>Mode Filter Master Data Aktif:</span>
              <span className="text-emerald-700 font-mono">HGB, HCT, WBC, PLT, RBC, MCV, MCH, MCHC, dkk.</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Item yang tidak terdaftar pada Master Data instrumen <strong>{activeInstrument.name}</strong> akan disisihkan otomatis.
            </p>
          </div>
        </div>

        {ignoredItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowIgnoredPanel(!showIgnoredPanel)}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Filter className="h-3 w-3 text-slate-500" />
            <span>{ignoredItems.length} Item Non-Master Dikesampingkan</span>
            {showIgnoredPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Panel Daftar Item yang Dikesampingkan (Non-Master Items) */}
      {showIgnoredPanel && ignoredItems.length > 0 && (
        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span>Daftar Parameter/Teks yang Dikesampingkan (Tidak Ada di Master Data):</span>
            <span className="text-[11px] text-amber-700 font-normal">Otomatis diabaikan demi menjaga kemurnian data QC</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {ignoredItems.map((ig, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-amber-200 font-mono text-[11px] flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{ig.item}</span>
                  <span className="text-slate-500 ml-1.5">{ig.value || "-"}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-sans">Non-Master</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MASTER DATA INTEGRATION SETTINGS RIBBON: BAHAN KONTROL, LEVEL, DAN NOMOR LOT MASTER */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 text-xs shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span className="font-extrabold text-slate-800 text-sm">
              Integrasi Bahan Kontrol & Nomor LOT Master
            </span>
          </div>
          {detectedReceiptLot && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px] border border-emerald-300 flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Struk Terdeteksi: Lot {detectedReceiptLot} ({detectedReceiptLevel || selectedControlLevel})</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Instrumen Master */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Instrumen Master:</label>
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {instruments.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Bahan Kontrol Master */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Bahan Kontrol Master:</label>
            <select
              value={selectedControlMaterialId}
              onChange={(e) => handleControlMaterialChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {controls.map(ctrl => (
                <option key={ctrl.id} value={ctrl.id}>
                  {ctrl.name} [{ctrl.level}]
                </option>
              ))}
            </select>
          </div>

          {/* 3. Level Kontrol Master (Segmented Buttons) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Level Kontrol Master:</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-lg">
              {(["Level 1", "Level 2", "Level 3"] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleLevelChange(lvl)}
                  className={`py-1.5 px-1.5 rounded-md font-bold text-[11px] transition-all cursor-pointer text-center ${
                    selectedControlLevel === lvl
                      ? lvl === "Level 1"
                        ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                        : lvl === "Level 2"
                        ? "bg-amber-600 text-white shadow-2xs font-extrabold"
                        : "bg-indigo-600 text-white shadow-2xs font-extrabold"
                      : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-300/40"
                  }`}
                >
                  {lvl === "Level 1" ? "L1 (Normal)" : lvl === "Level 2" ? "L2 (Low)" : "L3 (High)"}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Nomor LOT Kontrol Master */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">Nomor LOT Master:</label>
              <button
                type="button"
                onClick={() => setIsCustomLot(!isCustomLot)}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                {isCustomLot ? "Pilih Lot Terdaftar" : "✏️ Input Manual"}
              </button>
            </div>

            {isCustomLot ? (
              <input
                type="text"
                value={selectedLotNumber}
                onChange={(e) => setSelectedLotNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                placeholder="LOT-EC8C-9912"
              />
            ) : (
              <select
                value={selectedLotNumber}
                onChange={(e) => setSelectedLotNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {availableLots.map((lot, idx) => (
                  <option key={idx} value={lot.number}>
                    {lot.number} {lot.expDate ? `(Exp: ${lot.expDate})` : ''}
                  </option>
                ))}
                {!availableLots.some(l => l.number === selectedLotNumber) && (
                  <option value={selectedLotNumber}>{selectedLotNumber} (Struk Terdeteksi)</option>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Informasi Detail Bahan Kontrol & Lot Terpilih */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              <strong>Bahan Kontrol:</strong> {selectedControlMaterial?.name || "Eightcheck-3WP"}
            </span>
            <span>•</span>
            <span>
              <strong>Produsen:</strong> {selectedControlMaterial?.manufacturer || "Sysmex Corporation"}
            </span>
            <span>•</span>
            <span>
              <strong>Nomor LOT:</strong> <span className="font-mono font-bold text-blue-700">{selectedLotNumber}</span>
            </span>
            {selectedControlMaterial?.expirationDate && (
              <>
                <span>•</span>
                <span>
                  <strong>Kadaluarsa:</strong> {selectedControlMaterial.expirationDate}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
              {selectedControlMaterial?.status === 'active' ? '✓ Master Lot Aktif' : 'Master Terdaftar'}
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono ${
              selectedControlLevel === "Level 1" ? "bg-emerald-100 text-emerald-800" :
              selectedControlLevel === "Level 2" ? "bg-amber-100 text-amber-800" :
              "bg-indigo-100 text-indigo-800"
            }`}>
              {selectedControlLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Input File Box with Camera & Upload Options */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Pilih / Ambil Foto Struk Hasil Pengujian:
        </label>
        
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="py-3 px-4 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Camera className="h-4 w-4 text-blue-600" />
            <span>Kamera HP (Foto Langsung)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-3 px-4 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 text-slate-600" />
            <span>Pilih File Galeri / Dokumen</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2 pt-1">
          <span>* Tips Akurasi: Letakkan struk di atas meja putih/terang, pastikan teks parameter HGB, HCT, WBC, PLT, RBC terlihat jelas.</span>
          <button
            type="button"
            onClick={() => setShowFilterSettings(!showFilterSettings)}
            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="h-3 w-3" />
            <span>{showFilterSettings ? "Sembunyikan Pengaturan Filter OCR" : "Atur Filter & Threshold OCR"}</span>
          </button>
        </div>
      </div>

      {/* Opsi Filter & Tuning Threshold (Akurasi Tinggi) */}
      {showFilterSettings && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-blue-600" />
              <span>Preset Preprocessing & Ketajaman Teks (Tesseract v5)</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Ubah preset jika struk terlalu pudar atau gelap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {PREPROCESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleRescanWithFilter(p.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  activePreset === p.id 
                    ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500" 
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="font-bold">{p.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="font-bold text-slate-700 whitespace-nowrap">
                Ambang Binarisasi (Threshold: {customThreshold}):
              </label>
              <input
                type="range"
                min="120"
                max="240"
                step="5"
                value={customThreshold}
                onChange={(e) => setCustomThreshold(parseInt(e.target.value))}
                className="w-full sm:w-48 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={() => handleToggleCropAndRescan()}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer border ${
                  autoCropTable 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                <Crop className="h-3.5 w-3.5" />
                <span>{autoCropTable ? "Crop Tabel Aktif (Fokus)" : "Crop Tabel Non-aktif"}</span>
              </button>

              <button
                type="button"
                disabled={loading || !previewSrc}
                onClick={() => handleRescanWithFilter(activePreset, customThreshold)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer disabled:bg-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Terapkan Threshold Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Progress Bar */}
      {loading && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <Activity className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
          <span>{progress}</span>
        </div>
      )}

      {!loading && progress && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{progress}</span>
        </div>
      )}

      {/* Status Message Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-start justify-between gap-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-start gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">{statusMessage.text}</p>
              {statusMessage.details?.synced > 0 && (
                <p className="mt-1 text-emerald-700">
                  Data telah ditambahkan ke basis data kontrol mutu harian dan siap ditinjau di grafik Levey-Jennings.
                </p>
              )}
            </div>
          </div>

          {statusMessage.type === 'success' && onNavigateToTab && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateToTab('levey-jennings')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>Lihat Levey-Jennings</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Preview & Opsi Scan Ulang Bar (Bila Foto Ada) */}
      {previewSrc && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab Preview: Asli vs Binarisasi */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewTab('original')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'original' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Foto Asli
              </button>
              {processedPreviewSrc && (
                <button
                  type="button"
                  onClick={() => setPreviewTab('processed')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    previewTab === 'processed' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Hasil Binarisasi OCR</span>
                  <span className="text-[10px] px-1 py-0.2 bg-blue-100 text-blue-900 rounded font-mono">180</span>
                </button>
              )}
            </div>

            {/* PILIHAN SCAN ULANG (USER ACTION BAR) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRescanWithFilter(activePreset)}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Pindai ulang gambar saat ini dengan filter berbeda tanpa upload ulang"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Scan Ulang Foto Ini</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ambil foto baru lewat kamera"
              >
                <Camera className="h-3.5 w-3.5 text-slate-600" />
                <span>Foto Baru</span>
              </button>

              <button
                type="button"
                onClick={handleResetScan}
                className="px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Hapus foto dan bersihkan hasil"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Visual Preview Box */}
          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black/5 max-h-72 flex items-center justify-center">
            <img
              src={previewTab === 'processed' && processedPreviewSrc ? processedPreviewSrc : previewSrc}
              alt="Preview Struk QC"
              className="max-h-72 object-contain w-auto mx-auto"
            />
            {previewTab === 'processed' && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white rounded text-[10px] font-mono font-bold">
                Binarisasi Pixel Tesseract (Tinta Hitam & Kertas Putih)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Text Inspector Accordion */}
      {rawOcrText && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="w-full p-3 flex items-center justify-between text-left font-bold text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <span>Inspeksi Teks Mentah OCR (Tesseract v5 Output)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                {rawOcrText.split('\n').filter(Boolean).length} Baris Terbaca
              </span>
            </div>
            {showRawText ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showRawText && (
            <div className="p-3 bg-white border-t border-slate-200 font-mono text-[11px] text-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {rawOcrText}
            </div>
          )}
        </div>
      )}

      {/* Hasil Pembacaan OCR & Tabel Koreksi ATLM */}
      {hasil.length > 0 && (
        <div className="space-y-4">
          {/* Summary Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-blue-700 flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Master Data Terpetakan</span>
              </span>
              <div className="text-xl font-extrabold font-mono text-blue-900">{hasil.length} Item</div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-indigo-700">Parameter Kunci</span>
              <div className="text-xl font-extrabold font-mono text-indigo-700">{coreCount} / 5 (HGB, HCT, etc)</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-amber-700">Peringatan (Warning)</span>
              <div className="text-xl font-extrabold font-mono text-amber-700">{warningCount} Item</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-rose-700">Out-of-Control (Reject)</span>
              <div className="text-xl font-extrabold font-mono text-rose-700">{rejectCount} Item</div>
            </div>
          </div>

          {/* Tabel Hasil Terintegrasi Master Data */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-slate-600 font-medium">
                * Evaluasi SDI dihitung terhadap target Bahan Kontrol <strong>{selectedControlMaterial?.name} ({selectedControlLevel})</strong>. Nilai dapat dikoreksi sebelum disimpan:
              </div>
              <button
                type="button"
                onClick={handleAddManualRow}
                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Parameter Master Manual</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-3">Item Struk</th>
                    <th className="p-3">Parameter Master Terkait</th>
                    <th className="p-3 text-right">Hasil (OCR)</th>
                    <th className="p-3 text-center">Target Mean ± SD ({selectedControlLevel})</th>
                    <th className="p-3 text-center">SDI (Z-Score)</th>
                    <th className="p-3 text-center">Status Mutu</th>
                    <th className="p-3 text-center">Flag</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {hasil.map((h, i) => (
                    <tr 
                      key={h.id || i} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        h.status === "reject" ? "bg-rose-50/40" : h.status === "warning" ? "bg-amber-50/40" : ""
                      }`}
                    >
                      {/* Item Name with Core Parameter Badge */}
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{h.item}</span>
                          {h.isCoreParameter && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold font-sans">
                              Kunci
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Master Data Parameter Selector */}
                      <td className="p-3">
                        <select
                          value={h.parameterId || ""}
                          onChange={(e) => handleParameterMappingChange(i, e.target.value)}
                          className="text-xs font-bold rounded-lg px-2 py-1 border max-w-xs truncate cursor-pointer bg-blue-50 text-blue-900 border-blue-200"
                        >
                          {dimihParameters.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.code}] ({p.targetMean} ± {p.targetSD})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Nilai / Editable Input */}
                      <td className="p-3 text-right">
                        <input 
                          type="number"
                          step="any"
                          value={h.nilai} 
                          onChange={(e) => handleValueChange(i, e.target.value)} 
                          className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono font-extrabold text-xs text-right bg-white focus:outline-none focus:border-blue-500 shadow-2xs" 
                        />
                      </td>

                      {/* Target Mean ± SD */}
                      <td className="p-3 text-center font-mono text-slate-600">
                        {h.targetMean !== undefined ? (
                          <span>{h.targetMean.toFixed(1)} ± {h.targetSD?.toFixed(1)}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* SDI (Z-Score) */}
                      <td className="p-3 text-center font-mono font-bold">
                        {h.sdPosition ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            h.status === "reject" ? "bg-rose-100 text-rose-800" :
                            h.status === "warning" ? "bg-amber-100 text-amber-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {h.sdPosition}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status Westgard */}
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-tight ${
                          h.status === "reject" ? "bg-rose-600 text-white" :
                          h.status === "warning" ? "bg-amber-500 text-white" :
                          "bg-emerald-600 text-white"
                        }`}>
                          {h.status === "reject" ? "REJECT (1:3s)" : h.status === "warning" ? "WARNING" : "IN CONTROL"}
                        </span>
                      </td>

                      {/* Flag Struk (L / H / -) */}
                      <td className="p-3 text-center font-mono">
                        <select
                          value={h.flag || ""}
                          onChange={(e) => handleFlagChange(i, e.target.value || null)}
                          className={`text-xs font-bold rounded px-1.5 py-0.5 border cursor-pointer ${
                            h.flag === "H" ? "bg-rose-100 text-rose-800 border-rose-300" :
                            h.flag === "L" ? "bg-blue-100 text-blue-800 border-blue-300" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          <option value="">- (Normal)</option>
                          <option value="L">L (Low)</option>
                          <option value="H">H (High)</option>
                        </select>
                      </td>

                      {/* Unit */}
                      <td className="p-3 text-xs text-slate-600 font-mono">
                        <input
                          type="text"
                          value={h.unit}
                          onChange={(e) => {
                            const copy = [...hasil];
                            copy[i].unit = e.target.value;
                            setHasil(copy);
                          }}
                          className="w-16 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 bg-transparent text-xs font-mono"
                        />
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(i)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync to Levey-Jennings Checkbox & Action Button */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="syncLJ"
                checked={syncToLeveyJennings}
                onChange={(e) => setSyncToLeveyJennings(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="syncLJ" className="text-xs text-slate-700 font-bold cursor-pointer flex items-center gap-1.5">
                <LineChart className="h-3.5 w-3.5 text-blue-600" />
                <span>Otomatis simpan ke tabel utama QC (Grafik Levey-Jennings & Dashboard Mutu)</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                type="button"
                disabled={loading}
                onClick={simpanKeDB} 
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300 transition-all text-white py-3.5 rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Database className="h-4 w-4" />
                <span>Simpan {hasil.length} Parameter QC Master ke Database</span>
              </button>

              <button
                type="button"
                onClick={() => handleRescanWithFilter(activePreset)}
                className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Scan Ulang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
