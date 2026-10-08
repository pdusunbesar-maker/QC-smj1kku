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
import { MasterDataView } from './components/master/MasterDataView';
import { QCReviewView } from './components/qc/QCReviewView';
import { QCScanView } from './components/qc/QCScanView';
import { QCVerificationView } from './components/qc/QCVerificationView';
import { LeveyJenningsChart } from './components/chart/LeveyJenningsChart';
import { WestgardRulesView } from './components/westgard/WestgardRulesView';
import { NonConformityView } from './components/nonconformity/NonConformityView';
import { CAPAView } from './components/capa/CAPAView';
import { CAPADashboardView } from './components/capa/CAPADashboardView';
import { RCAView } from './components/rca/RCAView';
import { ReportsView } from './components/reports/ReportsView';
import { UserManagementView } from './components/users/UserManagementView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { DatabaseSettingsModal } from './components/settings/DatabaseSettingsModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { UserProfileModal } from './components/users/UserProfileModal';

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
  const [qcLots, setQcLots] = useState<QCLot[]>(() => StorageService.getQCLots());
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
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [scannedResults, setScannedResults] = useState<any[]>([]);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scannedDocumentMeta, setScannedDocumentMeta] = useState<any>(null);

  // Desktop sidebar collapse state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('lqcms_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('lqcms_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    setQcLots(StorageService.getQCLots());
    setQcResults(StorageService.getQCResults());
    setWestgardRules(StorageService.getWestgardRules());
    setNonConformities(StorageService.getNonConformities());
    setCapas(StorageService.getCAPAs());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
  };

  // Real-time synchronization & initial hydration from Supabase & Local Custom Events
  useEffect(() => {
    // 1. Initial hydration from Supabase
    StorageService.syncFromSupabase(() => {
      handleReloadAll();
    });

    // 2. Real-time changes subscription across all remote tables
    const unsubscribe = StorageService.subscribeToRealtime(() => {
      handleReloadAll();
    });

    // 3. Listen to local custom data updates and cross-tab storage changes
    const handleLocalUpdate = () => {
      handleReloadAll();
    };

    window.addEventListener('lqcms_data_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('lqcms_data_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
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
    <div className="h-screen min-h-[100dvh] w-full bg-[#F5F7FA] flex flex-col antialiased overflow-hidden print:bg-white print:h-auto print:min-h-0 print:overflow-visible print:block font-sans text-[#172033]">
      {/* Top Navbar */}
      <div className="shrink-0 w-full print:hidden">
        <Navbar
          labInfo={labInfo}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          notifications={notifications}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onOpenDatabaseSettings={() => setIsDatabaseSettingsOpen(true)}
          onOpenUserProfile={() => setIsUserProfileModalOpen(true)}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
        />
      </div>

      <div className="flex flex-1 w-full min-h-0 overflow-hidden print:block print:overflow-visible">
        {/* Left Sidebar */}
        <div className="shrink-0 h-full min-h-0 flex flex-col print:hidden">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            pendingReviewCount={pendingReviewCount}
            openCapaCount={openCapaCount}
            activeViolationsCount={activeViolationsCount}
          />
        </div>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full print:p-0 print:m-0 print:overflow-visible print:w-full">
          <div className="w-full max-w-[1440px] mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0">
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <DashboardView
                qcResults={qcResults}
                capas={capas}
                nonConformities={nonConformities}
                instruments={instruments}
                parameters={parameters}
                auditLogs={auditLogs}
                initialData={navigationPayload}
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

            {/* 3. Scan QC View */}
            {activeTab === 'qc-scan' && (
              <QCScanView 
                controls={controls}
                parameters={parameters}
                instruments={instruments}
                onScanComplete={(results, previewUrl, docMeta) => {
                  setScannedResults(results);
                  setScanPreviewUrl(previewUrl);
                  setScannedDocumentMeta(docMeta);
                  setActiveTab('qc-verification');
                }} 
              />
            )}

            {/* 4. Scan QC Verification View */}
            {activeTab === 'qc-verification' && (
              <QCVerificationView 
                extractedData={scannedResults}
                previewUrl={scanPreviewUrl}
                documentMeta={scannedDocumentMeta}
                parameters={parameters}
                instruments={instruments}
                controls={controls}
                existingResults={qcResults}
                onSave={(savedData) => {
                  setQcResults(StorageService.getQCResults());
                  setNotifications(StorageService.getNotifications());
                  setAuditLogs(StorageService.getAuditLogs());
                  setScannedResults([]);
                  setScanPreviewUrl(null);
                  setScannedDocumentMeta(null);
                }}
                onRetakeScan={() => setActiveTab('qc-scan')}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 5. QC Review & Approval View */}
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
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
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
                    labInfo={labInfo}
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

            {/* 7a. CAPA Dashboard */}
            {activeTab === 'capa-dashboard' && (
              <CAPADashboardView
                capas={capas}
                onNavigateToTab={handleNavigateToTab}
              />
            )}

            {/* 7b. CAPA View */}
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
                qcLots={qcLots}
                onQCLotsUpdated={(lots) => setQcLots(lots)}
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
      {/* User Profile & Photo Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
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
