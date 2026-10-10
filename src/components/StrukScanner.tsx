import React, { useState } from "react";
import Tesseract from "tesseract.js";
import { supabase } from "../lib/supabase";
import { StorageService } from "../services/storage";

type HasilQC = {
  item: string;
  nilai: string;
  flag: string | null;
  unit: string;
  status: "ok" | "warning";
};

export default function StrukScanner({ atlmId }: { atlmId: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [hasil, setHasil] = useState<HasilQC[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const preprocessImage = (file: File): Promise<string> => {
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
    const regex = /([A-Z][A-Z\-]+)\s+([LH])?\s*([0-9]+\.?[0-9]*)\s*([0-9\^\/\%a-zA-Z]+)/i;

    for (const line of lines) {
      const clean = line.replace(/\^/g, "^").trim();
      const m = clean.match(regex);
      if (m) {
        const item = m[1].toUpperCase().replace("#", "#").replace("%", "%");
        const flag = m[2] ? m[2].toUpperCase() : null;
        let nilai = m[3];
        let unit = m[4]
          .replace("10A3", "10^3")
          .replace("10^6", "10^6")
          .replace("10A6", "10^6")
          .replace("g/dL", "g/dL");

        // Validasi item yang ada di struk kamu
        const allowed = ["WBC", "LYM#", "MXD#", "NEU#", "LYM%", "MXD%", "NEU%", "RBC", "HGB", "MCV", "HCT", "MCH", "MCHC", "RDW-SD", "RDW-CV", "PLT", "MPV", "PCT", "PDW", "P-LCR"];
        if (allowed.some(a => item.includes(a.replace("-", "")) || a.includes(item))) {
          results.push({
            item: item,
            nilai: nilai,
            flag: flag,
            unit: unit,
            status: flag ? "warning" : "ok"
          });
        }
      }
    }
    return results;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setProgress("Preprocessing foto struk...");
    setStatusMessage(null);

    try {
      // 1. Upload foto asli ke Supabase Storage
      const fileName = `qc/${Date.now()}_${file.name}`;
      try {
        await supabase.storage.from("struk-qc").upload(fileName, file);
        const { data: urlData } = supabase.storage.from("struk-qc").getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          setFotoUrl(urlData.publicUrl);
        }
      } catch (storageErr) {
        console.warn("Storage upload notice:", storageErr);
      }

      // 2. Preprocess
      const processedDataUrl = await preprocessImage(file);

      // 3. OCR dengan Tesseract
      setProgress("Membaca angka (OCR)... 70%");
      const { data } = await Tesseract.recognize(processedDataUrl, "eng", {
        logger: (m: any) => setProgress(m.status + " " + Math.round((m.progress || 0) * 100) + "%"),
        // @ts-ignore
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ%-#0123456789.^/uLfdpg ",
        tessedit_pageseg_mode: "6",
      });

      setProgress("Parsing hasil...");
      const parsed = parseStruk(data.text);
      setHasil(parsed);
      setProgress(`Selesai! Ditemukan ${parsed.length} parameter`);

    } catch (err) {
      console.error(err);
      setProgress("Gagal baca struk, coba foto lebih jelas di atas kertas putih");
    } finally {
      setLoading(false);
    }
  };

  const simpanKeDB = async () => {
    const payload = hasil.map(h => ({
      item: h.item,
      hasil: parseFloat(h.nilai) || 0,
      flag: h.flag,
      unit: h.unit,
      foto_url: fotoUrl,
      atlm_id: atlmId,
      tanggal: new Date().toISOString().split('T')[0],
    }));

    try {
      // Also save to local storage service for offline persistence
      await StorageService.saveQCHematologiBatch(payload, fotoUrl);

      const { error } = await supabase.from("qc_hematologi").insert(payload);
      if (!error) {
        setStatusMessage({ type: 'success', text: `Berhasil simpan ${payload.length} data QC ke Database!` });
        try {
          alert("Berhasil simpan " + payload.length + " data QC!");
        } catch {
          // ignore alert if blocked by iframe
        }
      } else {
        setStatusMessage({ type: 'error', text: "Gagal simpan ke Supabase: " + error.message });
        try {
          alert("Gagal simpan: " + error.message);
        } catch {
          // ignore alert if blocked by iframe
        }
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: "Terjadi kesalahan: " + e.message });
    }
  };

  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg text-slate-900">Scan Struk QC Hematologi</h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold font-mono">
          Dirui Dimih 3980
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">Foto di atas kertas putih, tanpa flash, fokus ke tabel Item-Hasil</p>

      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        onChange={handleUpload}
        className="mb-3 block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700 cursor-pointer" 
      />

      {loading && <div className="text-blue-600 text-sm font-semibold animate-pulse">{progress}</div>}
      {!loading && progress && <div className="text-emerald-600 text-sm font-semibold">{progress}</div>}

      {statusMessage && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-bold ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.text}
        </div>
      )}

      {hasil.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase">
                  <th className="p-2.5 text-left">Item</th>
                  <th className="p-2.5 text-left">Hasil</th>
                  <th className="p-2.5 text-left">Flag</th>
                  <th className="p-2.5 text-left">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hasil.map((h, i) => (
                  <tr key={i} className={h.status === "warning" ? "bg-amber-50" : "hover:bg-slate-50"}>
                    <td className="p-2.5 font-bold font-mono text-slate-900">{h.item}</td>
                    <td className="p-2.5">
                      <input 
                        value={h.nilai} 
                        onChange={e => {
                          const copy = [...hasil]; 
                          copy[i].nilai = e.target.value; 
                          setHasil(copy);
                        }} 
                        className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-mono font-bold text-sm bg-white focus:outline-none focus:border-blue-500" 
                      />
                    </td>
                    <td className={`p-2.5 font-mono ${h.flag ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                      {h.flag || "-"}
                    </td>
                    <td className="p-2.5 text-xs text-slate-600 font-mono">{h.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            type="button"
            onClick={simpanKeDB} 
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all text-white py-3 rounded-xl font-bold shadow-xs cursor-pointer"
          >
            Simpan ke Database QC
          </button>
        </>
      )}
    </div>
  );
}
