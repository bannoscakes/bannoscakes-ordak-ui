import { useState, useEffect, useMemo } from "react";
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
import { getQueue } from "../lib/rpc-client";
import type { Stage, StoreKey, StatsByStore } from "@/types/stage";
import { makeEmptyCounts } from "@/types/stage";

interface DashboardProps {
  onSignOut?: () => void;
}

export function Dashboard({ onSignOut }: DashboardProps = {}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
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
  
  // Load dashboard stats from real data
  async function loadDashboardStats() {
    try {
      // Fetch orders from both stores
      const [bannosOrders, flourlaneOrders] = await Promise.all([
        getQueue({ store: "bannos", limit: 1000 }),
        getQueue({ store: "flourlane", limit: 1000 })
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
          
          // Count unassigned
          if (order.assignee_id === null && order.stage !== 'Complete') {
            stats[store].unassigned++;
          }
        }
      });
      
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  // Type guard for stage keys
  const isStage = (s: string): s is Stage =>
    ["total","filling","covering","decorating","packing","complete","unassigned"].includes(s as Stage);
  
  // Load stats on mount and when view changes
  useEffect(() => {
    loadDashboardStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Check URL parameters to determine initial view
  useEffect(() => {
    try {
      const currentUrlParams = new URLSearchParams(window.location.search);
      const page = currentUrlParams.get('page');
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
        setActiveView(page);
      } else {
        setActiveView('dashboard');
      }
    } catch (error) {
      console.error('Error parsing dashboard URL:', error);
      setActiveView('dashboard');
    }
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
              <BannosMonitorPage stats={dashboardStats.bannos} />
            </ErrorBoundary>
          );
        case "flourlane-monitor":
          return (
            <ErrorBoundary>
              <FlourlaneMonitorPage stats={dashboardStats.flourlane} />
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
                staffName="John Doe"
                onSignOut={() => setActiveView('dashboard')}
              />
            </ErrorBoundary>
          );
        case "supervisor-workspace":
          return (
            <ErrorBoundary>
              <SupervisorWorkspacePage 
                supervisorName="Jane Supervisor"
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
          <Header onRefresh={loadDashboardStats} onSignOut={onSignOut} />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}