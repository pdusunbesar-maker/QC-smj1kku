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
    <div className="rounded-xl border border-[#DDE4EA] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-[#DDE4EA] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-rose-50 text-[#D64545] border border-rose-100 flex items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-[#172B3A] text-sm">
            Critical QC Alerts & Pelanggaran Aturan Kendali Mutu
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#D64545] font-mono">
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
              className="p-3 bg-rose-50/50 hover:bg-rose-50 border border-rose-200/80 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#D64545] mt-1.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#172B3A]">{title}</span>
                    <span className="text-[10px] font-mono font-semibold text-[#D64545]">
                      · {tag}
                    </span>
                  </div>
                  <p className="text-[#647586] text-[11px] mt-0.5 font-medium">
                    {subtitle}
                  </p>
                </div>
              </div>

              {onNavigateToTab && alert.tab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab(alert.tab, alert.payload)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D64545] hover:text-white hover:bg-[#D64545] bg-white px-2.5 py-1 rounded-md border border-rose-200 self-end sm:self-center shrink-0 transition-colors"
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
