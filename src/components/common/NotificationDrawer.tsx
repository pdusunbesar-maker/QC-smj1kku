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

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsRead();
    onNotificationsUpdated(StorageService.getNotifications());
  };

  const handleNotificationClick = (n: AppNotification) => {
    StorageService.markNotificationRead(n.id);
    onNotificationsUpdated(StorageService.getNotifications());
    if (n.linkTab) {
      onNavigateToTab(n.linkTab, { id: n.linkId });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">Pusat Notifikasi & Alarm QC</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Tandai semua dibaca
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Tidak ada notifikasi aktif.
              </div>
            ) : (
              notifications.map((n) => {
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-lg text-xs cursor-pointer transition-colors space-y-1 ${
                      n.read ? 'bg-white hover:bg-slate-50 opacity-70' : 'bg-slate-50/90 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        {n.type === 'danger' && <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                        {n.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        {n.type === 'info' && <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        {n.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        <span>{n.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{n.timestamp.slice(11, 16)}</span>
                    </div>

                    <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>

                    {n.linkTab && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 pt-1">
                        <span>Buka menu terkait</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    )}
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
