import React from 'react';
import { AlertCircle } from 'lucide-react';

export const CriticalAlertsPanel: React.FC<{ alerts: any[] }> = ({ alerts }) => (
  <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
    <div className="flex items-center gap-2 mb-4 border-b pb-2">
      <AlertCircle className="h-5 w-5 text-rose-600" />
      <h3 className="font-bold text-slate-900">Critical QC Alerts</h3>
    </div>
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-rose-900">
          🔴 {alert.parameter} — {alert.analyzer} | {alert.rule} | {alert.time}
        </div>
      ))}
    </div>
  </div>
);
