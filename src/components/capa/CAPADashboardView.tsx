import React, { useMemo } from 'react';
import { CAPA } from '../../types';
import { AlertCircle, FileText, CheckCircle, Clock, AlertTriangle, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CAPADashboardViewProps {
  capas: CAPA[];
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const CAPADashboardView: React.FC<CAPADashboardViewProps> = ({ capas, onNavigateToTab }) => {
  const stats = useMemo(() => {
    const counts = { open: 0, investigation: 0, in_progress: 0, waiting: 0, effectiveness: 0, overdue: 0, closed: 0 };
    const today = new Date().setHours(0,0,0,0);
    
    capas.forEach(c => {
      const isOverdue = new Date(c.overallDueDate).getTime() < today && c.status !== 'CLOSED';
      if (isOverdue) counts.overdue++;
      
      if (c.status === 'OPEN') counts.open++;
      else if (c.status === 'INVESTIGATION') counts.investigation++;
      else if (c.status === 'IN_PROGRESS') counts.in_progress++;
      else if (c.status === 'WAITING_REVIEW') counts.waiting++;
      else if (c.status === 'EFFECTIVENESS_CHECK') counts.effectiveness++;
      else if (c.status === 'CLOSED') counts.closed++;
    });
    return counts;
  }, [capas]);

  const cards = [
    { title: 'OPEN', value: stats.open, icon: FileText, color: 'text-slate-600' },
    { title: 'INVESTIGATION', value: stats.investigation, icon: Search, color: 'text-indigo-500' },
    { title: 'IN PROGRESS', value: stats.in_progress, icon: Clock, color: 'text-amber-500' },
    { title: 'WAITING REVIEW', value: stats.waiting, icon: CheckCircle, color: 'text-blue-500' },
    { title: 'EFFECTIVENESS', value: stats.effectiveness, icon: ShieldCheck, color: 'text-purple-500' },
    { title: 'OVERDUE', value: stats.overdue, icon: AlertTriangle, color: 'text-rose-500' },
    { title: 'CLOSED', value: stats.closed, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">CAPA Intelligence Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border shadow-sm">
            <div className={`text-xs font-bold ${card.color} mb-1 flex items-center gap-1`}>
              <card.icon className="h-3 w-3" /> {card.title}
            </div>
            <div className="text-2xl font-extrabold">{card.value}</div>
          </div>
        ))}
      </div>
      {/* ... Add other panels for Analyzer Health, Parameter Health, etc. later ... */}
    </div>
  );
};
