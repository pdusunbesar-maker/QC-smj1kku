import React, { useMemo } from 'react';
import { CAPA } from '../../types';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ClipboardList 
} from 'lucide-react';

interface CAPADashboardViewProps {
  capas: CAPA[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const CAPADashboardView: React.FC<CAPADashboardViewProps> = ({ capas, onNavigateToTab }) => {
  const stats = useMemo(() => {
    const counts = { open: 0, investigation: 0, in_progress: 0, waiting: 0, effectiveness: 0, overdue: 0, closed: 0, total: capas.length };
    const today = new Date().setHours(0,0,0,0);
    
    capas.forEach(c => {
      const isOverdue = new Date(c.overallDueDate).getTime() < today && c.status.toLowerCase() !== 'closed';
      if (isOverdue) counts.overdue++;
      
      const st = (c.status || '').toLowerCase();
      if (st === 'open' || st === 'draft') counts.open++;
      else if (st === 'investigation') counts.investigation++;
      else if (st === 'in_progress' || st === 'action_in_progress' || st === 'action_required') counts.in_progress++;
      else if (st === 'waiting_review' || st === 'pending_verification') counts.waiting++;
      else if (st === 'effectiveness_check') counts.effectiveness++;
      else if (st === 'closed') counts.closed++;
    });
    return counts;
  }, [capas]);

  const cards = [
    { title: 'Total Dokumen', value: stats.total, filterKey: 'all', icon: ClipboardList, color: 'text-slate-700 bg-slate-50 border-slate-200' },
    { title: 'Open / Baru', value: stats.open, filterKey: 'open', icon: FileText, color: 'text-slate-800 bg-slate-50 border-slate-200' },
    { title: 'Investigasi / RCA', value: stats.investigation, filterKey: 'investigation', icon: Search, color: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
    { title: 'Dalam Proses', value: stats.in_progress, filterKey: 'action_in_progress', icon: Clock, color: 'text-amber-800 bg-amber-50 border-amber-200' },
    { title: 'Menunggu Review', value: stats.waiting, filterKey: 'pending_verification', icon: CheckCircle, color: 'text-blue-800 bg-blue-50 border-blue-200' },
    { title: 'Efektivitas', value: stats.effectiveness, filterKey: 'effectiveness_check', icon: ShieldCheck, color: 'text-purple-800 bg-purple-50 border-purple-200' },
    { title: 'Terlambat (Overdue)', value: stats.overdue, filterKey: 'overdue', icon: AlertTriangle, color: 'text-rose-800 bg-rose-50 border-rose-200' },
    { title: 'Selesai (Closed)', value: stats.closed, filterKey: 'closed', icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Quick Action to Management */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              CAPA Intelligence Dashboard & Integrasi Manajemen
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau status investigasi, tindakan korektif & preventif (CAPA), serta analisis akar masalah secara terintegrasi dengan menu CAPA Management.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToTab('capa')}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>Buka CAPA Management</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Interactive Metric Cards (Click to filter in CAPA Management) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateToTab('capa', { prefill: { statusFilter: card.filterKey } })}
              className={`p-4 rounded-xl border ${card.color} shadow-2xs hover:shadow-md cursor-pointer transition-all group bg-white`}
              title={`Klik untuk melihat data ${card.title} di CAPA Management`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{card.title}</span>
                <Icon className="h-4 w-4 opacity-70 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{card.value}</div>
              <div className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Lihat Data</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent CAPA Documents Integrated List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Dokumen CAPA Terbaru & Status Penanganan</h3>
            <p className="text-xs text-slate-500">Klik dokumen untuk dikelola langsung di menu CAPA Management</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('capa')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Kelola Semua ({capas.length})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ID CAPA</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">PIC & Departemen</th>
                <th className="px-4 py-3">Pernyataan Masalah</th>
                <th className="px-4 py-3 text-center">Batas Waktu</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {capas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada dokumen CAPA yang tercatat dalam sistem.
                  </td>
                </tr>
              ) : (
                capas.slice(0, 6).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{c.id}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.createdAt.substring(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.pic}</div>
                      <div className="text-[10px] text-slate-500">{c.department}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-700 font-medium">{c.problemStatement}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{c.overallDueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'closed' || c.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('capa', { prefill: { selectedCapaId: c.id } })}
                        className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Kelola</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
