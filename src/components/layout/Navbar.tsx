import React, { useState } from 'react';
import { 
  Bell, 
  Database, 
  LogOut, 
  Shield, 
  UserCheck, 
  Menu,
  ChevronDown,
  Camera,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LaboratoryInfo, AppNotification, UserRole } from '../../types';

interface NavbarProps {
  labInfo: LaboratoryInfo;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onOpenDatabaseSettings: () => void;
  onOpenUserProfile?: () => void;
  onToggleSidebarMobile: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

// Map each tab to readable group and title for breadcrumbs
const TAB_BREADCRUMBS: Record<string, { group: string; title: string }> = {
  'dashboard': { group: 'Utama', title: 'Dashboard Mutu' },
  'qc-input': { group: 'Utama', title: 'Input Hasil QC' },
  'qc-review': { group: 'Utama', title: 'QC Review & Approval' },
  'levey-jennings': { group: 'Analisis Kontrol Mutu', title: 'Grafik Levey-Jennings' },
  'westgard': { group: 'Analisis Kontrol Mutu', title: 'Westgard Multirules' },
  'non-conformity': { group: 'Penyimpangan & Perbaikan', title: 'Penyimpangan (NC)' },
  'capa': { group: 'Penyimpangan & Perbaikan', title: 'CAPA Management' },
  'rca': { group: 'Penyimpangan & Perbaikan', title: 'Root Cause Analysis' },
  'reports': { group: 'Dokumentasi & Pengaturan', title: 'Laporan & Ekspor' },
  'master-data': { group: 'Dokumentasi & Pengaturan', title: 'Master Data Lab' },
  'user-management': { group: 'Dokumentasi & Pengaturan', title: 'Hak Akses Pengguna' },
  'audit-trail': { group: 'Dokumentasi & Pengaturan', title: 'Audit Trail' },
  'settings': { group: 'Dokumentasi & Pengaturan', title: 'Supabase & Konfigurasi' },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  notifications,
  onOpenNotifications,
  onOpenDatabaseSettings,
  onOpenUserProfile,
  onToggleSidebarMobile,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const { user, role, switchRole, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentCrumb = TAB_BREADCRUMBS[activeTab] || { group: 'Sistem', title: 'L-QCMS' };

  const roleLabels: Record<string, { label: string; badgeClass: string }> = {
    admin: { label: 'Administrator', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
    supervisor: { label: 'Supervisor / PJ Mutu', badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
    analis: { label: 'Ahli Teknologi Lab (ATLM)', badgeClass: 'text-teal-700 bg-teal-50 border-teal-200' },
    viewer: { label: 'Viewer (Read-Only)', badgeClass: 'text-slate-600 bg-slate-100 border-slate-200' },
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-6 shadow-2xs select-none">
      
      {/* Zone 1: Navigation Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Collapse Toggle Button */}
        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Perluas menu samping" : "Persempit menu samping"}
            aria-label="Toggle sidebar collapse"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Page Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-[#0B5FA5] hidden sm:inline">
            L-QCMS
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <span className="text-slate-500 hidden md:inline">
            {currentCrumb.group}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden md:inline" />
          <h2 className="font-bold text-[#172033] text-sm sm:text-base leading-none">
            {currentCrumb.title}
          </h2>
        </div>
      </div>

      {/* Zone 2: Realtime Telemetry Indicator */}
      <div className="hidden xl:flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Lab Sentral Terpadu</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-500 text-[11px]">Monitoring QC Aktif</span>
        </div>
      </div>

      {/* Zone 3: Quick Action, Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Supabase Database Settings */}
        <button
          type="button"
          onClick={onOpenDatabaseSettings}
          title="Konfigurasi Supabase & Skrip SQL"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#0B5FA5] bg-white hover:bg-blue-50/70 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
        >
          <Database className="h-3.5 w-3.5 text-[#0B5FA5]" />
          <span className="hidden md:inline font-mono">Supabase</span>
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          title="Notifikasi & Peringatan QC"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white font-mono shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile & Role Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all text-left shadow-2xs cursor-pointer"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-7 w-7 rounded-md object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#082B49] text-white font-bold text-xs">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-[#172033] leading-tight truncate max-w-[130px]">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 capitalize font-medium">
                {roleLabels[role]?.label || role}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowRoleMenu(false)} 
              />
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Summary Header */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-[#082B49] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{user.email}</p>
                    <p className="text-[9px] text-slate-400">NIP: {user.nip || '-'}</p>
                  </div>
                </div>

                {/* Profile Photo Edit */}
                <div className="py-1 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenUserProfile) onOpenUserProfile();
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#0B5FA5] bg-blue-50/80 hover:bg-blue-100/70 rounded-md transition-colors text-left cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5 text-[#0B5FA5]" />
                    <span>Profil Saya & Ubah Foto</span>
                  </button>
                </div>

                {/* Role Switcher */}
                <div className="py-2">
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Ganti Peran (Role Switcher)
                  </div>
                  {(['admin', 'supervisor', 'analis', 'viewer'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        switchRole(r);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                        role === r
                          ? 'bg-slate-100 font-bold text-[#0B5FA5]'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{roleLabels[r].label}</span>
                      {role === r && <UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>

                {/* Management and Logout Links */}
                <div className="border-t border-slate-100 pt-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('user-management');
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors font-medium text-left cursor-pointer"
                  >
                    <Shield className="h-3.5 w-3.5 text-slate-500" />
                    <span>Kelola Hak Akses Pengguna</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors text-left font-semibold cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
