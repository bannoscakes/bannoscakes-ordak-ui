import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { DashboardContent } from "./DashboardContent";
import { StaffPage } from "./StaffPage";
import { InventoryPage } from "./InventoryPage";
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

// Import real RPCs for dashboard stats
import { getQueue, getQueueCached } from "../lib/rpc-client";
import type { Stage, StoreKey, StatsByStore } from "@/types/stage";
import { makeEmptyCounts } from "@/types/stage";

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);
  const [dashboardStats, setDashboardStats] = useState<StatsByStore>({
    bannos: makeEmptyCounts(),
    flourlane: makeEmptyCounts(),
  });
  
  // Parse URL parameters once and cache them
  const { viewFilter, staffFilter } = useMemo(() => {
    if (!urlParams) return { viewFilter: null, staffFilter: null };
    
    return {
      viewFilter: urlParams.get('view'),
      staffFilter: urlParams.get('staff')
    };
  }, [urlParams]);
  
  // Load dashboard stats from real data - wrapped in useCallback to prevent stale closures
  const loadDashboardStats = useCallback(async (bypassCache = false) => {
    // If already refreshing, return the existing promise to wait for completion
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }
    
    // Prevent concurrent loads using ref to avoid re-renders
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    // Create and store the refresh promise
    refreshPromise.current = (async () => {
      // Type guard for stage keys - defined inside to avoid recreating useCallback
      const isStage = (s: string): s is Stage =>
        ["total","filling","covering","decorating","packing","complete","unassigned"].includes(s as Stage);

      try {
      // Fetch orders from both stores (bypass cache if manual refresh)
      const [bannosOrders, flourlaneOrders] = await Promise.all([
        bypassCache 
          ? getQueue({ store: "bannos", limit: 1000 })
          : getQueueCached({ store: "bannos", limit: 1000 }),
        bypassCache
          ? getQueue({ store: "flourlane", limit: 1000 })
          : getQueueCached({ store: "flourlane", limit: 1000 })
      ]);
      
      const orders = [...bannosOrders, ...flourlaneOrders];
      
      // Count orders by store and stage
      const stats: StatsByStore = {
        bannos: makeEmptyCounts(),
        flourlane: makeEmptyCounts(),
      };
      
      orders.forEach((order: any) => {
        const store = (order.store || (order.id.startsWith('bannos') ? 'bannos' : 'flourlane')) as StoreKey;
        if (store in stats) {
          stats[store].total++;
          
          // Count by stage
          const stageLower = order.stage?.toLowerCase() || 'filling';
          if (isStage(stageLower)) {
            stats[store][stageLower] = (stats[store][stageLower] ?? 0) + 1;
          }
          
          // Count unassigned (use lowercased stage for consistency)
          if (order.assignee_id === null && stageLower !== 'complete') {
            stats[store].unassigned++;
          }
        }
      });
      
        setDashboardStats(stats);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();
    
    return refreshPromise.current;
  }, []);
  
  // Load stats on mount and refresh every 30 seconds (only when tab is visible)
  useEffect(() => {
    loadDashboardStats(); // Initial load uses cache for fast startup
    
    // Refresh stats every 30 seconds, bypass cache for fresh data
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadDashboardStats(true); // Bypass cache for auto-refresh
      }
    }, 30000);
    
    // Also refresh when tab becomes visible again, bypass cache for fresh data
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardStats(true); // Bypass cache when tab becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDashboardStats]);
  
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
    
    // Hook into programmatic navigation (pushState/replaceState)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleUrlChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleUrlChange();
    };
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const renderContent = () => {
    try {
      switch (activeView) {
        case "bannos-production":
          return (
            <ErrorBoundary>
              <BannosProductionPage 
                initialFilter={viewFilter}
                stats={dashboardStats.bannos}
                onRefresh={loadDashboardStats}
              />
            </ErrorBoundary>
          );
        case "flourlane-production":
          return (
            <ErrorBoundary>
              <FlourlaneProductionPage 
                initialFilter={viewFilter}
                stats={dashboardStats.flourlane}
                onRefresh={loadDashboardStats}
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
              <DashboardContent stats={dashboardStats} onRefresh={loadDashboardStats} />
            </ErrorBoundary>
          );
      }
    } catch (error) {
      console.error('Error rendering dashboard content:', error);
      return (
        <ErrorBoundary>
          <DashboardContent stats={dashboardStats} onRefresh={loadDashboardStats} />
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
          <Header onRefresh={() => loadDashboardStats(true)} onSignOut={onSignOut} />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}