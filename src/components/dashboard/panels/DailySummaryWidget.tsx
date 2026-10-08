import React from 'react';
import { Activity, AlertTriangle, Clock } from 'lucide-react';

export const DailySummaryWidget: React.FC<{
  totalTests: number;
  activeViolations: number;
  pendingReviews: number;
}> = ({ totalTests, activeViolations, pendingReviews }) => {
  const stats = [
    { title: 'TOTAL TES HARI INI', value: totalTests, icon: Activity, color: 'text-slate-600' },
    { title: 'PELANGGARAN AKTIF', value: activeViolations, icon: AlertTriangle, color: 'text-rose-600' },
    { title: 'REVIEW TERTUNDA', value: pendingReviews, icon: Clock, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-lg bg-slate-50 ${stat.color}`}>
            <stat.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.title}</div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">{stat.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
