import React from 'react';
import { Activity, XCircle, AlertTriangle, CheckCircle2, FolderGit2 } from 'lucide-react';

export const SummaryCardsPanel: React.FC<{
  total: number;
  pass: number;
  warning: number;
  reject: number;
  violationCount: number;
  openCapa: number;
}> = ({ total, pass, warning, reject, violationCount, openCapa }) => {
  const cards = [
    { title: 'QC HARI INI', value: total, icon: Activity, color: 'text-slate-500' },
    { title: 'NORMAL', value: pass, icon: CheckCircle2, color: 'text-emerald-500' },
    { title: 'WARNING', value: warning, icon: AlertTriangle, color: 'text-amber-500' },
    { title: 'REJECT', value: reject, icon: XCircle, color: 'text-rose-500' },
    { title: 'WESTGARD VIOLATION', value: violationCount, icon: AlertTriangle, color: 'text-rose-700' },
    { title: 'CAPA OPEN', value: openCapa, icon: FolderGit2, color: 'text-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {cards.map((card, i) => (
        <div key={i} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">{card.title}</span>
          <div className="mt-2.5 text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">{card.value}</div>
        </div>
      ))}
    </div>
  );
};
