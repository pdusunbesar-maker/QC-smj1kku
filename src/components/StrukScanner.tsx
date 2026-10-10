import React, { useState, useEffect, useMemo, useCallback } from "react";
import Tesseract from "tesseract.js";
import { supabase } from "../lib/supabase";
import { StorageService } from "../services/storage";
import { Parameter, Instrument, ControlMaterial, QCResult } from "../types";
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
  RefreshCw 
} from "lucide-react";

export interface HasilQC {
  id: string;
  item: string;
  nilai: string;
  flag: string | null;
  unit: string;
  status: "ok" | "warning" | "reject";
  // Master data linkage
  parameterId?: string;
  parameterName?: string;
  targetMean?: number;
  targetSD?: number;
  zScore?: number;
  sdPosition?: string;
  violation?: string;
}

interface StrukScannerProps {
  atlmId?: string;
  onNavigateToTab?: (tab: string, itemData?: any) => void;
}

export default function StrukScanner({ atlmId = "ATLM-01", onNavigateToTab }: StrukScannerProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [hasil, setHasil] = useState<HasilQC[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | Blob | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  // Master Data State
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [controls, setControls] = useState<ControlMaterial[]>([]);

  // QC Metadata Config
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("inst-dirui-3980");
  const [selectedControlLevel, setSelectedControlLevel] = useState<"Level 1" | "Level 2" | "Level 3">("Level 1");
  const [selectedLotNumber, setSelectedLotNumber] = useState<string>("LOT-EC8C-9912");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState<string>(() => new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [syncToLeveyJennings, setSyncToLeveyJennings] = useState<boolean>(true);

  // Load master data on mount
  useEffect(() => {
    const instList = StorageService.getInstruments();
    const paramList = StorageService.getParameters();
    const ctrlList = StorageService.getControlMaterials();

    setInstruments(instList);
    setParameters(paramList);
    setControls(ctrlList);

    // If dirui instrument exists, ensure it is selected
    const diruiInst = instList.find(i => i.id === "inst-dirui-3980" || i.code.includes("3980"));
    if (diruiInst) {
      setSelectedInstrumentId(diruiInst.id);
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

  // Alias mapper to match receipt OCR codes to master parameters
  const findMatchingMasterParameter = useCallback((itemCode: string): Parameter | undefined => {
    const clean = itemCode.toUpperCase().trim();

    // 1. Exact code match
    let match = dimihParameters.find(p => p.code.toUpperCase() === clean);
    if (match) return match;

    // 2. Alias mapping for Dirui Dimih 3980 printouts
    const aliasMap: Record<string, string> = {
      "GRAN%": "NEUT%",
      "GRAN#": "NEUT#",
      "NEU%": "NEUT%",
      "NEU#": "NEUT#",
      "MID%": "MXD%",
      "MID#": "MXD#",
      "MONO%": "MXD%",
      "MONO#": "MXD#",
      "LEUKOSIT": "WBC",
      "ERITROSIT": "RBC",
      "HEMOGLOBIN": "HGB",
      "HEMATOKRIT": "HCT",
      "TROMBOSIT": "PLT"
    };

    const targetCode = aliasMap[clean];
    if (targetCode) {
      match = dimihParameters.find(p => p.code.toUpperCase() === targetCode);
      if (match) return match;
    }

    // 3. Fallback search across all master parameters
    return parameters.find(p => p.code.toUpperCase() === clean);
  }, [dimihParameters, parameters]);

  // Evaluates SDI (Z-Score) & Westgard Status against Master Data
  const evaluateMasterDataMetrics = useCallback((nilaiStr: string, param?: Parameter, flagStr?: string | null) => {
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

    const zScore = (val - param.targetMean) / param.targetSD;
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
      targetMean: param.targetMean,
      targetSD: param.targetSD,
      zScore: Number(zScore.toFixed(2)),
      sdPosition,
      status,
      violation
    };
  }, []);

  const preprocessImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      img.onload = () => {
        // Crop tengah 85% untuk buang background meja
        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        ctx.filter = "grayscale(1) contrast(180%) brightness(110%)";
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const parseStruk = (text: string): HasilQC[] => {
    const lines = text.split("\n");
    const results: HasilQC[] = [];
    // Regex sakti untuk format: ITEM [L/H] NILAI UNIT
    const regex = /([A-Z][A-Z\-#%]+)\s+([LH])?\s*([0-9]+\.?[0-9]*)\s*([0-9\^\/\%a-zA-Z#]+)/i;

    // Daftar parameter yang diizinkan (mencakup seluruh item hematologi Dimih 3980)
    const allowed = [
      "WBC", "LYM#", "MXD#", "NEU#", "NEUT#", "MID#", "GRAN#", 
      "LYM%", "MXD%", "NEU%", "NEUT%", "MID%", "GRAN%", 
      "RBC", "HGB", "MCV", "HCT", "MCH", "MCHC", 
      "RDW-SD", "RDW-CV", "PLT", "MPV", "PCT", "PDW", "P-LCR"
    ];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const clean = line.replace(/\^/g, "^").trim();
      const m = clean.match(regex);
      if (m) {
        let item = m[1].toUpperCase().replace("#", "#").replace("%", "%");
        const flag = m[2] ? m[2].toUpperCase() : null;
        let nilai = m[3];
        let unit = m[4]
          .replace("10A3", "10^3/uL")
          .replace("10^3", "10^3/uL")
          .replace("10A6", "10^6/uL")
          .replace("10^6", "10^6/uL")
          .replace("g/dL", "g/dL");

        // Normalisasi OCR confusion umum
        if (item === "8BC") item = "RBC";
        if (item === "W8C") item = "WBC";
        if (item === "MCHG") item = "MCHC";

        if (allowed.some(a => item.includes(a.replace("-", "")) || a.includes(item))) {
          // Cari keterkaitan ke Master Data Parameter Dimih 3980
          const matchedParam = findMatchingMasterParameter(item);
          const metrics = evaluateMasterDataMetrics(nilai, matchedParam, flag);

          results.push({
            id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}`,
            item: item,
            nilai: nilai,
            flag: flag,
            unit: matchedParam?.unit || unit,
            status: metrics.status,
            parameterId: matchedParam?.id,
            parameterName: matchedParam?.name,
            targetMean: metrics.targetMean,
            targetSD: metrics.targetSD,
            zScore: metrics.zScore,
            sdPosition: metrics.sdPosition,
            violation: metrics.violation
          });
        }
      }
    }
    return results;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFile(file);
    setPreviewSrc(URL.createObjectURL(file));
    setLoading(true);
    setProgress("Preprocessing foto struk...");
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
        console.warn("Storage upload notice:", storageErr);
      }

      // 2. Preprocess Canvas
      const processedDataUrl = await preprocessImage(file);

      // 3. OCR dengan Tesseract
      setProgress("Membaca angka (OCR)... 70%");
      const { data } = await Tesseract.recognize(processedDataUrl, "eng", {
        logger: (m: any) => setProgress(m.status + " " + Math.round((m.progress || 0) * 100) + "%"),
        // @ts-ignore
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ%-#0123456789.^/uLfdpg ",
        tessedit_pageseg_mode: "6",
      });

      setProgress("Menghubungkan ke Master Data...");
      const parsed = parseStruk(data.text);
      setHasil(parsed);
      setProgress(`Selesai! Ditemukan ${parsed.length} parameter, terintegrasi ke Master Data Dirui Dimih 3980.`);

    } catch (err) {
      console.error(err);
      setProgress("Gagal baca struk, coba foto lebih jelas di atas kertas putih");
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Simulator / Generator Contoh Struk Realistis Dimih 3980
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
    ctx.fillText(`SAMPLE ID : QC-DIMIH-LV1    LOT: ${selectedLotNumber}`, 30, 180);
    ctx.fillText(`OPERATOR  : ${atlmId}`, 30, 205);
    ctx.fillText("----------------------------------------------", 30, 230);
    ctx.font = "bold 15px monospace";
    ctx.fillText("ITEM       FLAG   VALUE    UNIT", 30, 255);
    ctx.fillText("----------------------------------------------", 30, 275);

    // Mock realistic receipt rows
    const mockRows = [
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
    ctx.fillText("* STATUS: DIRUI DIMIH 3980 CONTROL NORMAL *", 30, y);

    const dataUrl = canvas.toDataURL("image/png");
    setPreviewSrc(dataUrl);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setSourceFile(blob);
      try {
        const processed = await preprocessImage(blob);
        setProgress("OCR membaca angka struk...");
        const { data } = await Tesseract.recognize(processed, "eng", {
          // @ts-ignore
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ%-#0123456789.^/uLfdpg ",
          tessedit_pageseg_mode: "6",
        });

        const parsed = parseStruk(data.text);
        setHasil(parsed);
        setProgress(`Berhasil memuat contoh struk! Ditemukan ${parsed.length} parameter terpetakan ke Master Data.`);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, "image/png");
  }, [selectedDate, selectedTime, selectedLotNumber, atlmId, parseStruk]);

  // Handle row value change with dynamic recalculation against Master Data
  const handleValueChange = (index: number, newVal: string) => {
    const copy = [...hasil];
    const target = copy[index];
    target.nilai = newVal;

    const matchedParam = target.parameterId 
      ? parameters.find(p => p.id === target.parameterId)
      : findMatchingMasterParameter(target.item);

    const metrics = evaluateMasterDataMetrics(newVal, matchedParam, target.flag);
    target.zScore = metrics.zScore;
    target.sdPosition = metrics.sdPosition;
    target.status = metrics.status;
    target.violation = metrics.violation;

    setHasil(copy);
  };

  // Handle parameter mapping change from dropdown
  const handleParameterMappingChange = (index: number, newParamId: string) => {
    const copy = [...hasil];
    const target = copy[index];
    const newParam = parameters.find(p => p.id === newParamId);

    target.parameterId = newParam?.id;
    target.parameterName = newParam?.name;
    if (newParam?.unit) target.unit = newParam.unit;

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

  // SIMPAN TERINTEGRASI KE DATABASE QC (Supabase + StorageService Master QC Results)
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
      // Simpan ke storage service lokal untuk cadangan
      await StorageService.saveQCHematologiBatch(hemaPayload, fotoUrl || previewSrc, selectedDate);

      // Simpan ke Supabase tabel qc_hematologi
      const { error: hemaError } = await supabase.from("qc_hematologi").insert(hemaPayload);

      // 2. Sinkronkan ke Master QC Results (qc_results) jika parameter terpetakan
      let syncedQCResultsCount = 0;
      if (syncToLeveyJennings) {
        hasil.forEach(h => {
          const matchParam = h.parameterId 
            ? parameters.find(p => p.id === h.parameterId)
            : findMatchingMasterParameter(h.item);

          if (matchParam) {
            const numVal = parseFloat(h.nilai) || 0;
            const zScore = matchParam.targetSD > 0 ? (numVal - matchParam.targetMean) / matchParam.targetSD : 0;
            const absZ = Math.abs(zScore);
            const status: "pass" | "warning" | "reject" = 
              absZ >= 3.0 ? "reject" : absZ >= 2.0 || h.flag ? "warning" : "pass";

            const violations: any[] = [];
            if (absZ >= 3.0) {
              violations.push({
                rule: "1_3s",
                ruleName: "1:3s Violation",
                type: "reject",
                description: `Nilai ${numVal} ${matchParam.unit} melampaui batas kritis 3 SD`,
                pointsInvolved: [],
                detectedAt: new Date().toISOString()
              });
            } else if (absZ >= 2.0) {
              violations.push({
                rule: "1_2s",
                ruleName: "1:2s Warning",
                type: "warning",
                description: `Nilai ${numVal} ${matchParam.unit} melampaui batas peringatan 2 SD`,
                pointsInvolved: [],
                detectedAt: new Date().toISOString()
              });
            }

            const qcResult: QCResult = {
              id: `QC-DIMIH-${Date.now()}-${matchParam.code}-${Math.random().toString(36).substring(7)}`,
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
              mean: matchParam.targetMean,
              sd: matchParam.targetSD,
              zScore: Number(zScore.toFixed(2)),
              sdPosition: `${zScore >= 0 ? "+" : ""}${zScore.toFixed(2)} SD`,
              status,
              violations,
              notes: `Diinput via Scan Struk OCR Dirui Dimih 3980 (Flag: ${h.flag || "Normal"})`,
              source: "AI_VISION",
              verificationStatus: "VERIFIED",
              reviewStatus: "pending"
            };

            StorageService.saveQCResult(qcResult);
            syncedQCResultsCount++;
          }
        });
      }

      const successText = `Berhasil menyimpan ${hemaPayload.length} parameter hematologi ke tabel qc_hematologi` +
        (syncedQCResultsCount > 0 ? ` dan ${syncedQCResultsCount} data langsung terintegrasi ke grafik Levey-Jennings & Dashboard Mutu!` : "!");

      setStatusMessage({
        type: 'success',
        text: successText,
        details: { count: hemaPayload.length, synced: syncedQCResultsCount }
      });

      // Audit Log
      StorageService.logAudit(
        "INPUT_QC_RESULT",
        `Input Scan Struk Hematologi Dirui Dimih 3980 (${hemaPayload.length} item, ${syncedQCResultsCount} terintegrasi Master QC)`
      );

      StorageService.notifyDataChanged("qc_results");

    } catch (e: any) {
      setStatusMessage({ type: 'error', text: "Gagal simpan: " + (e.message || "Kesalahan jaringan.") });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const mappedCount = hasil.filter(h => h.parameterId).length;
  const warningCount = hasil.filter(h => h.status === "warning").length;
  const rejectCount = hasil.filter(h => h.status === "reject").length;

  return (
    <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-5 antialiased">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
              Scan Struk QC Hematologi Dirui Dimih 3980
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold font-mono border border-blue-200">
              Master Data Terintegrasi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pembacaan OCR cerdas yang langsung memetakan nilai pengujian ke target Mean & SD instrumen <strong>{activeInstrument.name}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleDiruiReceipt}
          className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>Coba Contoh Struk Dimih 3980</span>
        </button>
      </div>

      {/* Master Data Integration Settings Ribbon */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Instrumen Hematologi:</label>
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

        <div>
          <label className="font-bold text-slate-700 block mb-1">Bahan Kontrol & Level:</label>
          <select
            value={selectedControlLevel}
            onChange={(e) => setSelectedControlLevel(e.target.value as any)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="Level 1">Eightcheck-3WP - Level 1 (Normal)</option>
            <option value="Level 2">Eightcheck-3WP - Level 2 (Low)</option>
            <option value="Level 3">Eightcheck-3WP - Level 3 (High)</option>
          </select>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">No. Lot Kontrol:</label>
          <input
            type="text"
            value={selectedLotNumber}
            onChange={(e) => setSelectedLotNumber(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            placeholder="LOT-EC8C-9912"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Tanggal Pemeriksaan:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Input File Box */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Pilih / Tangkap Foto Struk Hasil Pengujian:
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white file:font-bold hover:file:bg-blue-700 cursor-pointer border border-slate-200 rounded-xl bg-slate-50/50 p-1"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          * Tips: Foto tegak lurus, pencahayaan merata, tanpa bayangan flash, fokus ke kolom Item-Hasil-Unit.
        </p>
      </div>

      {/* Loading Progress */}
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

      {/* Preview Foto Struk & Summary Badges */}
      {hasil.length > 0 && (
        <div className="space-y-4">
          {/* Summary Badges Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-500">Total Terdeteksi</span>
              <div className="text-xl font-extrabold font-mono text-slate-900">{hasil.length} Item</div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] font-extrabold uppercase text-blue-700">Terpetakan ke Master</span>
              <div className="text-xl font-extrabold font-mono text-blue-700">{mappedCount} / {hasil.length}</div>
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
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <th className="p-3">Item Struk</th>
                  <th className="p-3">Kaitan Master Data</th>
                  <th className="p-3 text-right">Hasil (OCR)</th>
                  <th className="p-3 text-center">Target Mean ± SD</th>
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
                    {/* Item Name */}
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {h.item}
                    </td>

                    {/* Master Data Parameter Selector */}
                    <td className="p-3">
                      <select
                        value={h.parameterId || ""}
                        onChange={(e) => handleParameterMappingChange(i, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border max-w-xs truncate ${
                          h.parameterId 
                            ? "bg-blue-50 text-blue-900 border-blue-200" 
                            : "bg-amber-50 text-amber-900 border-amber-300"
                        }`}
                      >
                        <option value="">-- Pilih Parameter Master --</option>
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
                      {h.flag ? (
                        <span className={`px-2 py-0.5 rounded font-extrabold text-xs ${
                          h.flag === "H" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {h.flag}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="p-3 text-xs text-slate-600 font-mono">
                      {h.unit}
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

            <button 
              type="button"
              disabled={loading}
              onClick={simpanKeDB} 
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300 transition-all text-white py-3.5 rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Database className="h-4 w-4" />
              <span>Simpan ke Database QC Terintegrasi ({hasil.length} Parameter)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
