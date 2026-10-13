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
    { title: 'QC HARI INI', value: total, icon: Activity, color: 'text-[#647586]', valColor: 'text-[#172B3A]' },
    { title: 'NORMAL (PASS)', value: pass, icon: CheckCircle2, color: 'text-[#16845B]', valColor: 'text-[#16845B]' },
    { title: 'WARNING', value: warning, icon: AlertTriangle, color: 'text-[#D99118]', valColor: 'text-[#D99118]' },
    { title: 'REJECT', value: reject, icon: XCircle, color: 'text-[#D64545]', valColor: 'text-[#D64545]' },
    { title: 'WESTGARD VIOLATION', value: violationCount, icon: AlertTriangle, color: 'text-[#D64545]', valColor: 'text-[#D64545]' },
    { title: 'CAPA OPEN', value: openCapa, icon: FolderGit2, color: 'text-[#3478C7]', valColor: 'text-[#3478C7]' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="rounded-xl border border-[#DDE4EA] bg-[#FFFFFF] p-4 shadow-2xs flex flex-col justify-between transition-all hover:border-[#0F9D91]/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#647586]">{card.title}</span>
              <Icon className={`h-4 w-4 ${card.color} shrink-0`} />
            </div>
            <div className={`mt-2.5 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${card.valColor}`}>{card.value}</div>
          </div>
        );
      })}
    </div>
  );
};
