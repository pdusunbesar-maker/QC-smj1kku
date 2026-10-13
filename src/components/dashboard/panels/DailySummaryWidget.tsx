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
      color: 'text-[#3478C7]',
      bg: 'bg-blue-50/70 border border-blue-100'
    },
    { 
      title: 'PELANGGARAN WESTGARD', 
      value: activeViolations, 
      subtitle: 'Pelanggaran terdeteksi hari ini',
      icon: AlertTriangle, 
      color: 'text-[#D64545]',
      bg: 'bg-rose-50/70 border border-rose-100'
    },
    { 
      title: 'STATUS OPERASIONAL ALAT', 
      value: `${activeInstrumentsCount}/${totalInstruments} Aktif`, 
      subtitle: instrumentStatusText,
      icon: Wrench, 
      color: 'text-[#16845B]',
      bg: 'bg-emerald-50/70 border border-emerald-100'
    },
    { 
      title: 'REVIEW TERTUNDA', 
      value: pendingReviews, 
      subtitle: 'Menunggu verifikasi supervisor',
      icon: Clock, 
      color: 'text-[#D99118]',
      bg: 'bg-amber-50/70 border border-amber-100'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-xl border border-[#DDE4EA] bg-[#FFFFFF] p-4 shadow-2xs flex items-center gap-4 transition-all hover:border-[#0F9D91]/40 hover:shadow-xs">
          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#647586] truncate font-mono">{stat.title}</div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-[#172B3A] tracking-tight mt-0.5">{stat.value}</div>
            <div className="text-[11px] text-[#647586] font-medium truncate mt-0.5">{stat.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
