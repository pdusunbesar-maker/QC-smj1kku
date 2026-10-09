import React from 'react';
import { Activity, AlertTriangle, Clock, Wrench } from 'lucide-react';

export const DailySummaryWidget: React.FC<{
  totalTests: number;
  activeViolations: number;
  pendingReviews: number;
  activeInstrumentsCount: number;
  totalInstruments: number;
  instrumentStatusText: string;
}> = ({ totalTests, activeViolations, pendingReviews, activeInstrumentsCount, totalInstruments, instrumentStatusText }) => {
  const stats = [
    { 
      title: 'JUMLAH TES QC HARI INI', 
      value: totalTests, 
      subtitle: 'Pemeriksaan kontrol hari ini',
      icon: Activity, 
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      title: 'PELANGGARAN WESTGARD', 
      value: activeViolations, 
      subtitle: 'Pelanggaran terdeteksi hari ini',
      icon: AlertTriangle, 
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    },
    { 
      title: 'STATUS RATA-RATA INSTRUMEN', 
      value: `${activeInstrumentsCount}/${totalInstruments} Aktif`, 
      subtitle: instrumentStatusText,
      icon: Wrench, 
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      title: 'REVIEW TERTUNDA', 
      value: pendingReviews, 
      subtitle: 'Menunggu verifikasi supervisor',
      icon: Clock, 
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
            <stat.icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">{stat.title}</div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight mt-0.5">{stat.value}</div>
            <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
