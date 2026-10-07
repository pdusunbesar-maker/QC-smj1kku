import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

interface CriticalAlertsPanelProps {
  alerts: any[];
  onNavigateToTab?: (tab: string, payload?: any) => void;
}

export const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({ alerts, onNavigateToTab }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-rose-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            Critical QC Alerts & Pelanggaran Aturan Kendali Mutu
          </h3>
        </div>
        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          {alerts.length} Perlu Tindakan
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const title = alert.title || alert.parameter || alert.parameterName || 'Peringatan Kontrol Mutu';
          const subtitle = alert.subtitle || `${alert.analyzer || alert.instrumentName || ''} · ${alert.rule || alert.ruleName || ''}`;
          const tag = alert.tag || (alert.type === 'running_avg' ? '3-Day Shift' : 'Out of Control');

          return (
            <div 
              key={alert.id || i} 
              className="p-3 bg-rose-50/80 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-rose-950">{title}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-200 text-rose-800">
                      {tag}
                    </span>
                  </div>
                  <p className="text-rose-800/80 text-[11px] mt-0.5 font-medium">
                    {subtitle}
                  </p>
                </div>
              </div>

              {onNavigateToTab && alert.tab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab(alert.tab, alert.payload)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100/50 px-2.5 py-1 rounded-md border border-rose-300 self-end sm:self-center shrink-0 transition-colors"
                >
                  <span>{alert.actionText || 'Review QC'}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
