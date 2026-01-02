import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "./ui/sonner";
import { ErrorBoundary } from "./ErrorBoundary";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { safePushState, NAVIGATION_EVENT } from "@/lib/safeNavigate";

// Page-level spinner for lazy-loaded sub-pages
function PageSpinner() {
  return <LoadingSpinner className="h-64" />;
}

// Lazy-loaded pages for code splitting
// Note: .then(m => ({ default: m.ComponentName })) is needed because
// these components use named exports, not default exports
const DashboardContent = lazy(() => import("./DashboardContent").then(m => ({ default: m.DashboardContent })));
const StaffPage = lazy(() => import("./StaffPage").then(m => ({ default: m.StaffPage })));
const InventoryPage = lazy(() => import("./inventory-v2").then(m => ({ default: m.InventoryPage })));
const BannosProductionPage = lazy(() => import("./BannosProductionPage").then(m => ({ default: m.BannosProductionPage })));
const FlourlaneProductionPage = lazy(() => import("./FlourlaneProductionPage").then(m => ({ default: m.FlourlaneProductionPage })));
const BannosMonitorPage = lazy(() => import("./BannosMonitorPage").then(m => ({ default: m.BannosMonitorPage })));
const FlourlaneMonitorPage = lazy(() => import("./FlourlaneMonitorPage").then(m => ({ default: m.FlourlaneMonitorPage })));
const BannosAnalyticsPage = lazy(() => import("./BannosAnalyticsPage").then(m => ({ default: m.BannosAnalyticsPage })));
const FlourlaneAnalyticsPage = lazy(() => import("./FlourlaneAnalyticsPage").then(m => ({ default: m.FlourlaneAnalyticsPage })));
const StaffAnalyticsPage = lazy(() => import("./StaffAnalyticsPage").then(m => ({ default: m.StaffAnalyticsPage })));
const SettingsPage = lazy(() => import("./SettingsPage").then(m => ({ default: m.SettingsPage })));
const TimePayrollPage = lazy(() => import("./TimePayrollPage").then(m => ({ default: m.TimePayrollPage })));
const OrdersPage = lazy(() => import("./OrdersPage").then(m => ({ default: m.OrdersPage })));

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

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
    
    // Parse URL on mount
    handleUrlChange();
    
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handleUrlChange);
    // Listen for programmatic navigation via custom event (fixes #498 - no more pushState patching)
    window.addEventListener(NAVIGATION_EVENT, handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(NAVIGATION_EVENT, handleUrlChange);
    };
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case "orders":
        return <OrdersPage />;
      case "bannos-production":
        return (
          <BannosProductionPage
            initialFilter={viewFilter}
            onBackToWorkspace={isSupervisor ? handleBackToWorkspace : undefined}
          />
        );
      case "flourlane-production":
        return (
          <FlourlaneProductionPage
            initialFilter={viewFilter}
            onBackToWorkspace={isSupervisor ? handleBackToWorkspace : undefined}
          />
        );
      case "bannos-monitor":
        return <BannosMonitorPage />;
      case "flourlane-monitor":
        return <FlourlaneMonitorPage />;
      case "bannos-analytics":
        return <BannosAnalyticsPage />;
      case "flourlane-analytics":
        return <FlourlaneAnalyticsPage />;
      case "staff-analytics":
        return <StaffAnalyticsPage />;
      case "staff":
        return <StaffPage />;
      case "inventory":
        return <InventoryPage />;
      case "bannos-settings":
        return (
          <SettingsPage store="bannos" onBack={() => {
            safePushState('/');
            setActiveView("dashboard");
          }} />
        );
      case "flourlane-settings":
        return (
          <SettingsPage store="flourlane" onBack={() => {
            safePushState('/');
            setActiveView("dashboard");
          }} />
        );
      case "time-payroll":
        return (
          <TimePayrollPage
            initialStaffFilter={staffFilter || undefined}
            onBack={() => {
              safePushState('/');
              setActiveView("dashboard");
            }}
          />
        );
      case "dashboard":
      default:
        return <DashboardContent />;
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
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Toaster />
    </div>
  );
}