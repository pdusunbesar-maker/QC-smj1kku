import React from 'react';
import {
  LayoutDashboard,
  ClipboardPenLine,
  CheckCircle2,
  LineChart,
  ShieldAlert,
  AlertTriangle,
  FolderGit2,
  Network,
  FileSpreadsheet,
  Database,
  History,
  Settings,
  Users,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingReviewCount: number;
  openCapaCount: number;
  activeViolationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  pendingReviewCount,
  openCapaCount,
  activeViolationsCount,
}) => {
  const { role, logout, user } = useAuth();

  const navigationItems = [
    {
      group: 'UTAMA',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Mutu',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'qc-input',
          label: 'Input Hasil QC',
          icon: ClipboardPenLine,
          badge: null,
          roleRestricted: role === 'viewer',
        },
        {
          id: 'qc-review',
          label: 'QC Review & Approval',
          icon: CheckCircle2,
          badge: pendingReviewCount > 0 ? `${pendingReviewCount}` : null,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
      ],
    },
    {
      group: 'ANALISIS KONTROL MUTU',
      items: [
        {
          id: 'levey-jennings',
          label: 'Grafik Levey-Jennings',
          icon: LineChart,
          badge: null,
        },
        {
          id: 'westgard',
          label: 'Westgard Rules',
          icon: ShieldAlert,
          badge: activeViolationsCount > 0 ? `${activeViolationsCount}` : null,
          badgeColor: 'bg-rose-100 text-rose-800',
        },
      ],
    },
    {
      group: 'PENYIMPANGAN & PERBAIKAN',
      items: [
        {
          id: 'non-conformity',
          label: 'Penyimpangan (NC)',
          icon: AlertTriangle,
          badge: null,
        },
        {
          id: 'capa',
          label: 'CAPA Management',
          icon: FolderGit2,
          badge: openCapaCount > 0 ? `${openCapaCount}` : null,
          badgeColor: 'bg-indigo-100 text-indigo-800',
        },
        {
          id: 'rca',
          label: 'RCA (Fishbone & 5-Why)',
          icon: Network,
          badge: null,
        },
      ],
    },
    {
      group: 'DOKUMENTASI & PENGATURAN',
      items: [
        {
          id: 'reports',
          label: 'Laporan & Ekspor',
          icon: FileSpreadsheet,
          badge: null,
        },
        {
          id: 'master-data',
          label: 'Master Data Lab',
          icon: Database,
          badge: null,
        },
        {
          id: 'user-management',
          label: 'Hak Akses Pengguna',
          icon: Users,
          badge: null,
        },
        {
          id: 'audit-trail',
          label: 'Audit Trail',
          icon: History,
          badge: null,
        },
        {
          id: 'settings',
          label: 'Supabase & Konfigurasi',
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">L-QCMS Menu</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationItems.map((section, idx) => (
            <div key={idx}>
              <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info & User Card */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/70 space-y-2.5">
          <div className="flex items-center gap-2.5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs shrink-0">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition-colors"
              title="Keluar dari sesi ini dan kembali ke login"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-200/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">RSUD S.M. Jamaludin I</span>
          </div>
        </div>
      </aside>
    </>
  );
};
