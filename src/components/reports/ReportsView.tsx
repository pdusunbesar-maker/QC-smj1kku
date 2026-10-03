import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Filter, 
  Calendar, 
  FileText, 
  Layers, 
  Building2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  QCResult, 
  LaboratoryInfo, 
  Parameter, 
  Instrument, 
  CAPA, 
  NonConformity 
} from '../../types';
import { calculateQCStatistics } from '../../utils/qcCalculations';

interface ReportsViewProps {
  labInfo: LaboratoryInfo;
  results: QCResult[];
  parameters: Parameter[];
  instruments: Instrument[];
  capas: CAPA[];
  nonConformities: NonConformity[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  labInfo,
  results,
  parameters,
  instruments,
  capas,
  nonConformities,
}) => {
  const [reportType, setReportType] = useState<'qc' | 'westgard' | 'capa' | 'nc'>('qc');
  const [selectedParameterId, setSelectedParameterId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');

  // Filter Results
  const filteredQC = useMemo(() => {
    let list = results;
    if (selectedParameterId !== 'all') {
      list = list.filter(r => r.parameterId === selectedParameterId);
    }

    if (selectedPeriod !== 'all') {
      const now = new Date('2026-10-03T12:00:00Z').getTime();
      const days = selectedPeriod === 'today' ? 1 : selectedPeriod === '7d' ? 7 : 30;
      const cutoff = now - days * 24 * 3600 * 1000;
      list = list.filter(r => r.timestamp >= cutoff);
    }
    return list;
  }, [results, selectedParameterId, selectedPeriod]);

  // Overall Stats
  const firstParam = parameters.find(p => p.id === selectedParameterId) || parameters[0];
  const stats = useMemo(() => {
    if (!firstParam) return null;
    return calculateQCStatistics(
      filteredQC,
      firstParam.targetMean,
      firstParam.targetSD,
      firstParam.targetCV
    );
  }, [filteredQC, firstParam]);

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'qc') {
      filename = `Laporan_QC_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,Tanggal,Jam,Instrumen,Parameter,Level,Lot,Nilai,Satuan,Mean,SD,Z_Score,Status,Reviewer\n';
      filteredQC.forEach(r => {
        csvContent += `"${r.id}","${r.date}","${r.time}","${r.instrumentName}","${r.parameterName}","${r.controlLevel}","${r.lotNumber}",${r.value},"${r.unit}",${r.mean},${r.sd},${r.zScore},"${r.status}","${r.reviewedByName || '-'}"\n`;
      });
    } else if (reportType === 'capa') {
      filename = `Laporan_CAPA_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,Tanggal,Sumber,PIC,Masalah,Status,Efektivitas,DueDate\n';
      capas.forEach(c => {
        csvContent += `"${c.id}","${c.createdAt}","${c.source}","${c.pic}","${c.problemStatement.replace(/"/g, '""')}","${c.status}","${c.effectiveness}","${c.overallDueDate}"\n`;
      });
    } else if (reportType === 'nc') {
      filename = `Laporan_Penyimpangan_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,Tanggal,Waktu,Instrumen,Parameter,Severity,Pelapor,Status\n';
      nonConformities.forEach(n => {
        csvContent += `"${n.id}","${n.date}","${n.time}","${n.instrumentName}","${n.parameterName}","${n.severity}","${n.reportedByName}","${n.status}"\n`;
      });
    } else {
      filename = `Laporan_Westgard_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'Tanggal,Jam,Parameter,Aturan,Tipe,Deskripsi\n';
      filteredQC.flatMap(r => r.violations.map(v => ({ ...v, r }))).forEach(item => {
        csvContent += `"${item.r.date}","${item.r.time}","${item.r.parameterName}","${item.ruleName}","${item.type}","${item.description.replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Mutu & Ekspor Dokumen Resmi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencetakan lembar kontrol mutu resmi dengan KOP Surat RSUD Sultan Muhammad Jamaludin I dan ekspor format CSV/Excel.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor Excel (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 font-medium text-slate-600">
            {[
              { id: 'qc', label: 'Laporan QC Harian' },
              { id: 'westgard', label: 'Pelanggaran Westgard' },
              { id: 'nc', label: 'Penyimpangan (NC)' },
              { id: 'capa', label: 'Dokumen CAPA' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportType(t.id as any)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  reportType === t.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Parameter filter (for QC) */}
          {reportType === 'qc' && (
            <select
              value={selectedParameterId}
              onChange={(e) => setSelectedParameterId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-medium focus:outline-none"
            >
              <option value="all">Semua Parameter</option>
              {parameters.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          )}

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 bg-white font-medium focus:outline-none"
          >
            <option value="today">Hari Ini</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir (Bulanan)</option>
            <option value="all">Semua Periode</option>
          </select>
        </div>
      </div>

      {/* Official Printable Report Sheet (Hospital Letterhead / KOP Surat) */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* KOP SURAT RESMI RSUD SULTAN MUHAMMAD JAMALUDIN I */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <img
            src={labInfo.logoUrl || '/logo_kayong_utara.png'}
            alt="Lambang Daerah Kabupaten Kayong Utara"
            className="h-24 w-auto object-contain shrink-0"
          />
          <div className="text-center flex-1 px-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              PEMERINTAH KABUPATEN KAYONG UTARA
            </h3>
            <h2 className="text-lg font-black uppercase text-slate-900 leading-tight">
              {labInfo.hospitalName}
            </h2>
            <h4 className="text-sm font-bold uppercase text-slate-800">
              {labInfo.name}
            </h4>
            <p className="text-[11px] text-slate-600 mt-1">
              {labInfo.address}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Telp: {labInfo.phone} · Surel: {labInfo.email} · Akreditasi: {labInfo.accreditation}
            </p>
          </div>
          <div className="w-20 shrink-0 text-right">
            <span className="font-mono text-[10px] text-slate-400 block">KARS MUTU</span>
            <span className="font-mono text-[10px] text-slate-400 block">ISO 15189</span>
          </div>
        </div>

        {/* Title of Document */}
        <div className="text-center my-4">
          <h2 className="text-base font-bold uppercase text-slate-900 tracking-wide underline underline-offset-4">
            {reportType === 'qc'
              ? 'LEMBAR LAPORAN PEMERIKSAAN QUALITY CONTROL (QC)'
              : reportType === 'westgard'
              ? 'REKAPITULASI PELANGGARAN ATURAN WESTGARD'
              : reportType === 'nc'
              ? 'LAPORAN KETIDAKSESUAIAN MUTU (NON-CONFORMITY)'
              : 'LAPORAN CORRECTIVE & PREVENTIVE ACTION (CAPA)'}
          </h2>
          <p className="text-xs text-slate-600 font-mono mt-1">
            Periode: {selectedPeriod.toUpperCase()} · Tanggal Cetak: {new Date().toISOString().split('T')[0]}
          </p>
        </div>

        {/* Statistical Summary Box (for QC) */}
        {reportType === 'qc' && stats && (
          <div className="mb-4 grid grid-cols-6 gap-2 rounded-lg border border-slate-300 p-2.5 text-center text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total Run (N)</p>
              <p className="font-bold text-slate-900">{stats.count}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Mean Aktual</p>
              <p className="font-bold text-slate-900">{stats.mean}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">SD Aktual</p>
              <p className="font-bold text-slate-900">{stats.sd}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">CV% Aktual</p>
              <p className="font-bold text-emerald-700">{stats.cv}%</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Pass Rate</p>
              <p className="font-bold text-slate-900">
                {stats.count > 0 ? Math.round((stats.passCount / stats.count) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Reject</p>
              <p className="font-bold text-rose-700">{stats.rejectCount}</p>
            </div>
          </div>
        )}

        {/* Content Table */}
        <div className="overflow-x-auto">
          {reportType === 'qc' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b">
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Tanggal/Jam</th>
                  <th className="p-2 border">Parameter</th>
                  <th className="p-2 border">Level/Lot</th>
                  <th className="p-2 border text-right">Hasil</th>
                  <th className="p-2 border text-right">Target Mean</th>
                  <th className="p-2 border text-center">Z-Score</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Pemeriksa / Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredQC.map((r, i) => (
                  <tr key={r.id} className="text-[11px]">
                    <td className="p-2 border text-center">{i + 1}</td>
                    <td className="p-2 border whitespace-nowrap">{r.date} {r.time}</td>
                    <td className="p-2 border font-sans font-semibold">{r.parameterName} ({r.parameterCode})</td>
                    <td className="p-2 border">{r.controlLevel}</td>
                    <td className="p-2 border text-right font-bold">{r.value} {r.unit}</td>
                    <td className="p-2 border text-right">{r.mean}</td>
                    <td className="p-2 border text-center font-bold">{r.sdPosition}</td>
                    <td className="p-2 border font-bold uppercase">{r.status}</td>
                    <td className="p-2 border font-sans">{r.operatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'capa' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800 border-b">
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">ID CAPA</th>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">PIC</th>
                  <th className="p-2 border">Pernyataan Masalah</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Efektivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {capas.map((c, i) => (
                  <tr key={c.id} className="text-[11px]">
                    <td className="p-2 border text-center font-mono">{i + 1}</td>
                    <td className="p-2 border font-mono font-bold">{c.id}</td>
                    <td className="p-2 border font-mono">{c.createdAt}</td>
                    <td className="p-2 border font-semibold">{c.pic}</td>
                    <td className="p-2 border">{c.problemStatement}</td>
                    <td className="p-2 border font-bold uppercase">{c.status}</td>
                    <td className="p-2 border font-bold uppercase">{c.effectiveness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Official Signatures Footer */}
        <div className="mt-12 grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-200">
          <div>
            <p className="text-slate-600">Mengetahui,</p>
            <p className="font-bold text-slate-900 mt-1">Penanggung Jawab Laboratorium</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">{labInfo.headOfLab}</p>
            <p className="text-[11px] font-mono text-slate-500">NIP: {labInfo.headNip}</p>
          </div>

          <div>
            <p className="text-slate-600">Sukadana, {new Date().toISOString().split('T')[0]}</p>
            <p className="font-bold text-slate-900 mt-1">Supervisor / PJ Mutu Laboratorium</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">Siti Rahmawati, S.Tr.Kes</p>
            <p className="text-[11px] font-mono text-slate-500">NIP: 19880315 201101 2 004</p>
          </div>
        </div>
      </div>
    </div>
  );
};
