import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storage';
import { 
  LaboratoryInfo, 
  Instrument, 
  Parameter, 
  ControlMaterial, 
  QCResult, 
  WestgardRuleConfig, 
  NonConformity, 
  CAPA, 
  AuditLog, 
  AppNotification 
} from './types';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { QCInputView } from './components/qc/QCInputView';
import { QCReviewView } from './components/qc/QCReviewView';
import { LeveyJenningsChart } from './components/chart/LeveyJenningsChart';
import { WestgardRulesView } from './components/westgard/WestgardRulesView';
import { NonConformityView } from './components/nonconformity/NonConformityView';
import { CAPAView } from './components/capa/CAPAView';
import { RCAView } from './components/rca/RCAView';
import { ReportsView } from './components/reports/ReportsView';
import { MasterDataView } from './components/master/MasterDataView';
import { UserManagementView } from './components/users/UserManagementView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { DatabaseSettingsModal } from './components/settings/DatabaseSettingsModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { LoginPage } from './components/auth/LoginPage';

function AppContent() {
  const { user, role, isAuthenticated } = useAuth();

  // App Global State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [navigationPayload, setNavigationPayload] = useState<any>(null);

  // Entities State
  const [labInfo, setLabInfo] = useState<LaboratoryInfo>(() => StorageService.getLabInfo());
  const [instruments, setInstruments] = useState<Instrument[]>(() => StorageService.getInstruments());
  const [parameters, setParameters] = useState<Parameter[]>(() => StorageService.getParameters());
  const [controls, setControls] = useState<ControlMaterial[]>(() => StorageService.getControlMaterials());
  const [qcResults, setQcResults] = useState<QCResult[]>(() => StorageService.getQCResults());
  const [westgardRules, setWestgardRules] = useState<WestgardRuleConfig[]>(() => StorageService.getWestgardRules());
  const [nonConformities, setNonConformities] = useState<NonConformity[]>(() => StorageService.getNonConformities());
  const [capas, setCapas] = useState<CAPA[]>(() => StorageService.getCAPAs());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => StorageService.getNotifications());

  // UI Modals & Drawers
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDatabaseSettingsOpen, setIsDatabaseSettingsOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Parameter selected for Levey-Jennings chart view
  const [selectedChartParamId, setSelectedChartParamId] = useState<string>(
    parameters[0]?.id || ''
  );

  // Refresh all state from storage
  const handleReloadAll = () => {
    setLabInfo(StorageService.getLabInfo());
    setInstruments(StorageService.getInstruments());
    setParameters(StorageService.getParameters());
    setControls(StorageService.getControlMaterials());
    setQcResults(StorageService.getQCResults());
    setWestgardRules(StorageService.getWestgardRules());
    setNonConformities(StorageService.getNonConformities());
    setCapas(StorageService.getCAPAs());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
  };

  // Real-time synchronization & initial hydration from Supabase
  useEffect(() => {
    // 1. Initial hydration from Supabase
    StorageService.syncFromSupabase(() => {
      handleReloadAll();
    });

    // 2. Real-time changes subscription across all tables
    const unsubscribe = StorageService.subscribeToRealtime(() => {
      handleReloadAll();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // If user is not authenticated, show professional Login Page directly
  if (!isAuthenticated) {
    return <LoginPage labInfo={labInfo} />;
  }

  const selectedChartParam = parameters.find(p => p.id === selectedChartParamId) || parameters[0];

  const handleNavigateToTab = (tab: string, itemData?: any) => {
    if (tab === 'settings') {
      setIsDatabaseSettingsOpen(true);
      return;
    }
    setActiveTab(tab);
    setNavigationPayload(itemData || null);
    if (itemData?.parameterId) {
      setSelectedChartParamId(itemData.parameterId);
    }
  };

  // Badge counters
  const pendingReviewCount = qcResults.filter(r => r.reviewStatus === 'pending').length;
  const openCapaCount = capas.filter(c => c.status !== 'closed').length;
  const activeViolationsCount = qcResults.reduce((acc, r) => acc + (r.violations?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        labInfo={labInfo}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenDatabaseSettings={() => setIsDatabaseSettingsOpen(true)}
        onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          pendingReviewCount={pendingReviewCount}
          openCapaCount={openCapaCount}
          activeViolationsCount={activeViolationsCount}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <DashboardView
                qcResults={qcResults}
                capas={capas}
                nonConformities={nonConformities}
                instruments={instruments}
                parameters={parameters}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 2. QC Input View */}
            {activeTab === 'qc-input' && (
              <QCInputView
                instruments={instruments}
                parameters={parameters}
                controls={controls}
                existingResults={qcResults}
                onResultAdded={(newR) => {
                  setQcResults(StorageService.getQCResults());
                  setNotifications(StorageService.getNotifications());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 3. QC Review & Approval View */}
            {activeTab === 'qc-review' && (
              <QCReviewView
                results={qcResults}
                onResultUpdated={(updatedR) => {
                  setQcResults(StorageService.getQCResults());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onResultDeleted={(deletedId) => {
                  setQcResults(StorageService.getQCResults());
                  setAuditLogs(StorageService.getAuditLogs());
                  setNotifications(StorageService.getNotifications());
                }}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 4. Levey-Jennings Chart View */}
            {activeTab === 'levey-jennings' && (
              <div className="space-y-4">
                {/* Parameter Selection Ribbon */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Pilih Parameter Uji:</span>
                    <select
                      value={selectedChartParamId}
                      onChange={(e) => setSelectedChartParamId(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                    >
                      {parameters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.code}] - Target Mean: {p.targetMean} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-[11px]">
                      {qcResults.filter(r => r.parameterId === selectedChartParamId).length} Data Pengukuran Tersedia
                    </span>
                  </div>
                </div>

                {selectedChartParam && (
                  <LeveyJenningsChart
                    parameter={selectedChartParam}
                    results={qcResults}
                    onCreateCapa={(res) => handleNavigateToTab('capa', { fromQc: res })}
                    onCreateNC={(res) => handleNavigateToTab('non-conformity', { fromQc: res })}
                  />
                )}
              </div>
            )}

            {/* 5. Westgard Rules View */}
            {activeTab === 'westgard' && (
              <WestgardRulesView
                rules={westgardRules}
                onRulesUpdated={(updated) => setWestgardRules(updated)}
                qcResults={qcResults}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 6. Non-Conformity View */}
            {activeTab === 'non-conformity' && (
              <NonConformityView
                nonConformities={nonConformities}
                instruments={instruments}
                parameters={parameters}
                qcResults={qcResults}
                initialData={navigationPayload}
                onNCAdded={(newNC) => {
                  setNonConformities(StorageService.getNonConformities());
                  setNotifications(StorageService.getNotifications());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onNCUpdated={(upNC) => {
                  setNonConformities(StorageService.getNonConformities());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onNCDeleted={(deletedId) => {
                  setNonConformities(StorageService.getNonConformities());
                  setAuditLogs(StorageService.getAuditLogs());
                  setNotifications(StorageService.getNotifications());
                }}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 7. CAPA View */}
            {activeTab === 'capa' && (
              <CAPAView
                capas={capas}
                initialData={navigationPayload}
                onCapaAdded={(newC) => {
                  setCapas(StorageService.getCAPAs());
                  setNotifications(StorageService.getNotifications());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onCapaUpdated={(upC) => {
                  setCapas(StorageService.getCAPAs());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
                onCapaDeleted={(deletedId) => {
                  setCapas(StorageService.getCAPAs());
                  setAuditLogs(StorageService.getAuditLogs());
                  setNotifications(StorageService.getNotifications());
                }}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 8. RCA (Fishbone & 5 Why) View */}
            {activeTab === 'rca' && (
              <RCAView
                capas={capas}
                selectedCapaId={navigationPayload?.capaId}
                onCapaUpdated={(upC) => {
                  setCapas(StorageService.getCAPAs());
                  setAuditLogs(StorageService.getAuditLogs());
                }}
              />
            )}

            {/* 9. Reports View */}
            {activeTab === 'reports' && (
              <ReportsView
                labInfo={labInfo}
                results={qcResults}
                parameters={parameters}
                instruments={instruments}
                capas={capas}
                nonConformities={nonConformities}
                onLabInfoUpdated={(info) => setLabInfo(info)}
              />
            )}

            {/* 10. Master Data View */}
            {activeTab === 'master-data' && (
              <MasterDataView
                labInfo={labInfo}
                instruments={instruments}
                parameters={parameters}
                controls={controls}
                onLabInfoUpdated={(info) => setLabInfo(info)}
                onInstrumentsUpdated={(insts) => setInstruments(insts)}
                onParametersUpdated={(params) => setParameters(params)}
                onControlsUpdated={(ctrls) => setControls(ctrls)}
              />
            )}

            {/* 11. Hak Akses Pengguna View */}
            {activeTab === 'user-management' && (
              <UserManagementView />
            )}

            {/* 12. Audit Trail View */}
            {activeTab === 'audit-trail' && (
              <AuditTrailView logs={auditLogs} />
            )}
          </div>
        </main>
      </div>

      {/* Database & Supabase Settings Modal */}
      <DatabaseSettingsModal
        isOpen={isDatabaseSettingsOpen}
        onClose={() => setIsDatabaseSettingsOpen(false)}
        onResetData={handleReloadAll}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onNotificationsUpdated={(notifs) => setNotifications(notifs)}
        onNavigateToTab={handleNavigateToTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
