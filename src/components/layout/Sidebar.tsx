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
  X,
  Camera,
  Scan,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  pendingReviewCount: number;
  openCapaCount: number;
  activeViolationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
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
          id: 'qc-scan',
          label: 'Scan QC',
          icon: Camera,
          badge: null,
          roleRestricted: role === 'viewer',
        },
        {
          id: 'qc-hematologi',
          label: 'Scan Struk Dirui 3980',
          icon: Scan,
          badge: 'OCR',
          badgeColor: 'bg-blue-400/20 text-blue-300 border border-blue-300/30',
          roleRestricted: role === 'viewer',
        },
        {
          id: 'qc-review',
          label: 'QC Review & Approval',
          icon: CheckCircle2,
          badge: pendingReviewCount > 0 ? `${pendingReviewCount}` : null,
          badgeColor: 'bg-amber-400/20 text-amber-300 border border-amber-300/30',
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
          badgeColor: 'bg-rose-400/20 text-rose-300 border border-rose-300/30',
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
          id: 'capa-dashboard',
          label: 'CAPA Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'capa',
          label: 'CAPA Management',
          icon: FolderGit2,
          badge: openCapaCount > 0 ? `${openCapaCount}` : null,
          badgeColor: 'bg-indigo-400/20 text-indigo-300 border border-indigo-300/30',
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
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex h-full max-h-[100dvh] md:max-h-full min-h-0 flex-col bg-[#082B49] text-white transition-all duration-200 ease-in-out md:static md:translate-x-0 border-r border-[#0E3D66] shadow-xl md:shadow-none select-none ${
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        } ${isOpenMobile ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header: Logo & Branding */}
        <div className={`shrink-0 flex items-center justify-between border-b border-[#0E3D66] ${
          isCollapsed ? 'h-16 px-3 justify-center' : 'h-16 px-4'
        }`}>
          {/* Logo & Text (When expanded or mobile) */}
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/logo_kayong_utara.png"
                alt="Logo RSUD SMJ I"
                className="max-h-full max-w-full object-contain drop-shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_kayong_utara.png';
                }}
              />
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-white tracking-tight text-sm leading-none">
                    L-QCMS
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">
                    v2.5
                  </span>
                </div>
                <p className="text-[10px] text-cyan-200/80 leading-tight mt-0.5 truncate font-medium">
                  RSUD S.M. Jamaludin I
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
                isCollapsed ? 'hidden' : ''
              }`}
              title={isCollapsed ? 'Perluas Menu Samping' : 'Persempit Menu Samping'}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items (Scrollable with generous padding) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-2.5 py-4 pb-20 space-y-5 scroll-smooth">
          {navigationItems.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {/* Group Heading (only when expanded or mobile) */}
              {(!isCollapsed || isOpenMobile) ? (
                <div className="px-2.5 pb-1.5 text-[10px] font-mono font-bold tracking-wider text-cyan-200/50 uppercase">
                  {section.group}
                </div>
              ) : (
                <div className="my-2 border-t border-white/10 mx-2" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isRestricted = item.roleRestricted;

                  if (isRestricted) return null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex w-full items-center rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                        isCollapsed && !isOpenMobile
                          ? 'justify-center p-2.5'
                          : 'justify-between px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-white/10 text-white font-semibold border-l-[3px] border-[#22B8CF] shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#22B8CF]'
                              : 'text-slate-400 group-hover:text-cyan-300'
                          }`}
                        />
                        {(!isCollapsed || isOpenMobile) && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {/* Badge Counter */}
                      {item.badge && (
                        <>
                          {(!isCollapsed || isOpenMobile) ? (
                            <span
                              className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                                item.badgeColor || 'bg-white/20 text-white'
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#082B49]" />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card & Logout (Fixed at Bottom) */}
        <div className={`shrink-0 border-t border-[#0E3D66] bg-[#06213A] p-3 space-y-2 select-none ${
          isCollapsed && !isOpenMobile ? 'p-2 flex flex-col items-center' : ''
        }`}>
          {(!isCollapsed || isOpenMobile) ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-lg object-cover border border-white/20"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-700 text-white font-bold text-xs">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#06213A]" />
                </div>

                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-cyan-200/70 truncate capitalize font-mono">
                    {user.role}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Keluar dari sesi ini dan kembali ke login"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-cyan-200/50 font-mono pt-1 border-t border-white/5">
                <span className="truncate">Laboratorium Patologi Klinik</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div 
                className="relative cursor-pointer"
                title={`${user.name} (${user.role})`}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-lg object-cover border border-white/20"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-700 text-white font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-[#06213A]" />
              </div>

              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                  title="Perluas Menu Samping"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="text-rose-400 hover:text-rose-300 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
                title="Keluar (Logout)"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
