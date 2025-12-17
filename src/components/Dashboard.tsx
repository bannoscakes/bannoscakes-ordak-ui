import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DashboardContent } from "./DashboardContent";
import { StaffPage } from "./StaffPage";
import { InventoryPage } from "./inventory-v2";
import { BannosProductionPage } from "./BannosProductionPage";
import { FlourlaneProductionPage } from "./FlourlaneProductionPage";
import { BannosMonitorPage } from "./BannosMonitorPage";
import { FlourlaneMonitorPage } from "./FlourlaneMonitorPage";
import { BannosAnalyticsPage } from "./BannosAnalyticsPage";
import { FlourlaneAnalyticsPage } from "./FlourlaneAnalyticsPage";
import { StaffAnalyticsPage } from "./StaffAnalyticsPage";
import { SettingsPage } from "./SettingsPage";
import { TimePayrollPage } from "./TimePayrollPage";
import { StaffWorkspacePage } from "./StaffWorkspacePage";
import { SupervisorWorkspacePage } from "./SupervisorWorkspacePage";
import { BarcodeTest } from "./BarcodeTest";
import { Toaster } from "./ui/sonner";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { safePushState } from "@/lib/safeNavigate";

// Helper to compute initial activeView from URL (avoids intermediate render states)
function getActiveViewFromUrl(): string {
  if (typeof window === 'undefined') return 'dashboard';

  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  const view = urlParams.get('view');
  const path = window.location.pathname;

  if (path === '/bannos/settings') return 'bannos-settings';
  if (path === '/flourlane/settings') return 'flourlane-settings';
  if (path === '/staff') return 'staff';
  if (path === '/admin/time') return 'time-payroll';
  if (page) return page;
  if (view) return view;
  return 'dashboard';
}

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Initialize activeView from URL to avoid intermediate "dashboard" state
  const [activeView, setActiveView] = useState(getActiveViewFromUrl);

  // Check if user is a supervisor (used to show back button on queue pages)
  const isSupervisor = user?.role === 'Supervisor';

  // Handler for supervisor to return to workspace
  // Note: safePushState('/') clears the ?page= param, which triggers App.tsx
  // to re-route supervisors back to SupervisorWorkspacePage (role-based routing)
  const handleBackToWorkspace = () => {
    safePushState('/');
  };
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  
  // Parse URL parameters once and cache them
  const { viewFilter, staffFilter } = useMemo(() => {
    if (!urlParams) return { viewFilter: null, staffFilter: null };
    
    return {
      viewFilter: urlParams.get('view'),
      staffFilter: urlParams.get('staff')
    };
  }, [urlParams]);
  
  // Track current URL for change detection
  // RoleBasedRouter (App.tsx) handles URL change detection and re-renders Dashboard
  // when navigation happens. By including currentUrl in deps, this effect re-runs
  // whenever Dashboard re-renders with a new URL.
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Parse URL parameters and update view reactively
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const currentUrlParams = new URLSearchParams(window.location.search);
        const page = currentUrlParams.get('page');
        const view = currentUrlParams.get('view');
        const path = window.location.pathname;

        setUrlParams(currentUrlParams);

        // Handle settings routes
        if (path === '/bannos/settings') {
          setActiveView('bannos-settings');
        } else if (path === '/flourlane/settings') {
          setActiveView('flourlane-settings');
        } else if (path === '/staff') {
          setActiveView('staff');
        } else if (path === '/admin/time') {
          setActiveView('time-payroll');
        } else if (page) {
          // Use 'page' parameter for page selection when present
          // Note: 'view' parameter is used as a filter within that page (e.g., ?page=bannos-production&view=unassigned)
          setActiveView(page);
        } else if (view) {
          // Sidebar navigation uses 'view' parameter for page selection (e.g., ?view=inventory, ?view=dashboard)
          setActiveView(view);
        } else {
          setActiveView('dashboard');
        }
      } catch (error) {
        console.error('Error parsing dashboard URL:', error);
        setActiveView('dashboard');
      }
    };

    // Parse URL (runs on mount and whenever URL changes)
    handleUrlChange();

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handleUrlChange);

    // NOTE: We intentionally do NOT patch pushState/replaceState here.
    // RoleBasedRouter (App.tsx) already patches these and handles URL change detection.
    // Having multiple components patch the same global functions causes race conditions
    // and unpredictable navigation behavior (the "reload required" bug).

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [currentUrl]); // Re-run when URL changes (triggered by RoleBasedRouter re-render)

  const renderContent = () => {
    try {
      switch (activeView) {
        case "bannos-production":
          return (
            <ErrorBoundary>
              <BannosProductionPage
                initialFilter={viewFilter}
                onBackToWorkspace={isSupervisor ? handleBackToWorkspace : undefined}
              />
            </ErrorBoundary>
          );
        case "flourlane-production":
          return (
            <ErrorBoundary>
              <FlourlaneProductionPage
                initialFilter={viewFilter}
                onBackToWorkspace={isSupervisor ? handleBackToWorkspace : undefined}
              />
            </ErrorBoundary>
          );
        case "bannos-monitor":
          return (
            <ErrorBoundary>
              <BannosMonitorPage />
            </ErrorBoundary>
          );
        case "flourlane-monitor":
          return (
            <ErrorBoundary>
              <FlourlaneMonitorPage />
            </ErrorBoundary>
          );
        case "bannos-analytics":
          return (
            <ErrorBoundary>
              <BannosAnalyticsPage />
            </ErrorBoundary>
          );
        case "flourlane-analytics":
          return (
            <ErrorBoundary>
              <FlourlaneAnalyticsPage />
            </ErrorBoundary>
          );
        case "staff-analytics":
          return (
            <ErrorBoundary>
              <StaffAnalyticsPage />
            </ErrorBoundary>
          );
        case "staff":
          return (
            <ErrorBoundary>
              <StaffPage />
            </ErrorBoundary>
          );
        case "staff-workspace":
          return (
            <ErrorBoundary>
              <StaffWorkspacePage 
                onSignOut={() => setActiveView('dashboard')}
              />
            </ErrorBoundary>
          );
        case "supervisor-workspace":
          return (
            <ErrorBoundary>
              <SupervisorWorkspacePage 
                onSignOut={() => setActiveView('dashboard')}
                onNavigateToBannosQueue={() => setActiveView('bannos-production')}
                onNavigateToFlourlaneQueue={() => setActiveView('flourlane-production')}
              />
            </ErrorBoundary>
          );
        case "inventory":
          return (
            <ErrorBoundary>
              <InventoryPage />
            </ErrorBoundary>
          );
        case "bannos-settings":
          return (
            <ErrorBoundary>
              <SettingsPage store="bannos" onBack={() => {
                window.history.pushState({}, '', '/');
                setActiveView("dashboard");
              }} />
            </ErrorBoundary>
          );
        case "flourlane-settings":
          return (
            <ErrorBoundary>
              <SettingsPage store="flourlane" onBack={() => {
                window.history.pushState({}, '', '/');
                setActiveView("dashboard");
              }} />
            </ErrorBoundary>
          );
        case "barcode-test":
          return (
            <ErrorBoundary>
              <BarcodeTest />
            </ErrorBoundary>
          );
        case "time-payroll":
          return (
            <ErrorBoundary>
              <TimePayrollPage 
                initialStaffFilter={staffFilter || undefined}
                onBack={() => {
                  window.history.pushState({}, '', '/');
                  setActiveView("dashboard");
                }}
              />
            </ErrorBoundary>
          );
        case "dashboard":
        default:
          return (
            <ErrorBoundary>
              <DashboardContent />
            </ErrorBoundary>
          );
      }
    } catch (error) {
      console.error('Error rendering dashboard content:', error);
      return (
        <ErrorBoundary>
          <DashboardContent />
        </ErrorBoundary>
      );
    }
  };

  return (
    <div className="flex h-screen bg-muted/30">
      <ErrorBoundary>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onCollapse={setSidebarCollapsed}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      </ErrorBoundary>
      <div className="flex-1 flex flex-col overflow-hidden">
        <ErrorBoundary>
          <Header onSignOut={onSignOut} />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}