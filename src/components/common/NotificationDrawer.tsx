import React from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  XCircle, 
  Info, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { AppNotification } from '../../types';
import { StorageService } from '../../services/storage';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNotificationsUpdated: (notifs: AppNotification[]) => void;
  onNavigateToTab: (tab: string, itemData?: any) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationsUpdated,
  onNavigateToTab,
}) => {
  if (!isOpen) return null;

  const getDestinationLabel = (n: AppNotification): { tabName: string; targetTab: string } => {
    let targetTab = n.linkTab || '';
    const titleLower = n.title.toLowerCase();
    const msgLower = n.message.toLowerCase();

    if (!targetTab) {
      if (titleLower.includes('capa') || msgLower.includes('capa')) {
        targetTab = 'capa';
      } else if (titleLower.includes('westgard') || titleLower.includes('grafik') || msgLower.includes('levey') || msgLower.includes('glukosa')) {
        targetTab = 'levey-jennings';
      } else if (titleLower.includes('review') || msgLower.includes('verifikasi')) {
        targetTab = 'qc-review';
      } else if (titleLower.includes('ketidaksesuaian') || titleLower.includes('nc') || msgLower.includes('non-conformity')) {
        targetTab = 'non-conformity';
      } else if (titleLower.includes('pemeliharaan') || titleLower.includes('instrumen')) {
        targetTab = 'master-data';
      } else {
        targetTab = 'dashboard';
      }
    }

    if (targetTab === 'westgard') {
      targetTab = 'levey-jennings';
    }

    switch (targetTab) {
      case 'qc-review':
        return { tabName: 'Verifikasi & Review QC', targetTab };
      case 'levey-jennings':
        return { tabName: 'Grafik Levey-Jennings', targetTab };
      case 'capa':
        return { tabName: 'Tindakan Korektif (CAPA)', targetTab };
      case 'non-conformity':
        return { tabName: 'Laporan Ketidaksesuaian (NC)', targetTab };
      case 'master-data':
        return { tabName: 'Data Master Instrumen', targetTab };
      case 'qc-input':
        return { tabName: 'Input Hasil QC', targetTab };
      default:
        return { tabName: 'Dashboard Utama', targetTab: targetTab || 'dashboard' };
    }
  };

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsRead();
    onNotificationsUpdated(StorageService.getNotifications());
  };

  const handleNotificationClick = (n: AppNotification) => {
    // 1. Mark notification as read
    StorageService.markNotificationRead(n.id);
    onNotificationsUpdated(StorageService.getNotifications());

    // 2. Resolve destination tab and item payload
    const { targetTab } = getDestinationLabel(n);

    const payload: any = {
      id: n.linkId,
      resultId: n.linkId,
      qcId: n.linkId,
      capaId: n.linkId,
      ncId: n.linkId,
      parameterId: n.linkId?.startsWith('param-') ? n.linkId : undefined,
      instrumentId: n.linkId?.startsWith('inst-') ? n.linkId : undefined,
      notifId: n.id,
      fromNotification: true,
      title: n.title
    };

    // Fallback ID associations based on demo notifications if linkId wasn't populated
    if (!payload.id) {
      if (targetTab === 'qc-review') {
        payload.id = 'QC-DEMO-GLU-029';
      } else if (targetTab === 'levey-jennings') {
        payload.parameterId = 'param-cst-glu';
      } else if (targetTab === 'capa') {
        payload.id = 'CAPA-2026-001';
      } else if (targetTab === 'non-conformity') {
        payload.id = 'NC-2026-001';
      }
    }

    // 3. Navigate directly to the destination view
    onNavigateToTab(targetTab, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pusat Notifikasi & Alarm QC</h3>
                <p className="text-[11px] text-slate-500">Klik notifikasi untuk membuka halaman terkait</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
              >
                Tandai dibaca
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <Bell className="h-8 w-8 mx-auto text-slate-300 opacity-60" />
                <p className="font-semibold text-slate-600">Tidak ada notifikasi aktif.</p>
                <p className="text-[11px]">Semua peringatan dan hasil QC dalam status terpantau normal.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const { tabName } = getDestinationLabel(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 shadow-2xs hover:shadow-xs group ${
                      n.read 
                        ? 'bg-white hover:bg-slate-50 border-slate-200/80 opacity-80' 
                        : 'bg-emerald-50/30 hover:bg-emerald-50/70 border-emerald-200/90 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        {n.type === 'danger' && <XCircle className="h-4 w-4 text-rose-600 shrink-0" />}
                        {n.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                        {n.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
                        {n.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        <span className="group-hover:text-emerald-800 transition-colors">{n.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" title="Belum dibaca" />
                        )}
                        <span className="text-[10px] font-mono text-slate-400">{n.timestamp.slice(11, 16)}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px]">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <span>Arahkan ke: {tabName}</span>
                      </span>
                      <span className="flex items-center gap-0.5 font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>Buka sekarang</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
