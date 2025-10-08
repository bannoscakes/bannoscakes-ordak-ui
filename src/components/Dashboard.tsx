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
import { ErrorTest } from "./ErrorTest";
import { LoginForm } from "./Auth/LoginForm";
import { Toaster } from "./ui/sonner";
import { ErrorBoundary } from "./ErrorBoundary";

// Import real RPCs for dashboard stats
import { getQueueStats } from "../lib/rpc-client";
import type { Stage, StoreKey, StatsByStore } from "@/types/stage";
import { makeEmptyCounts } from "@/types/stage";
import { useAuthContext } from "../contexts/AuthContext";

interface DashboardProps {
  onNavigateToSignup?: () => void;
}

export function Dashboard({ onNavigateToSignup }: DashboardProps = {}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  const [dashboardStats, setDashboardStats] = useState<StatsByStore>({
    bannos: makeEmptyCounts(),
    flourlane: makeEmptyCounts(),
  });
  
  // Get authentication state
  const { user, loading: authLoading } = useAuthContext();
  
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
      // Fetch stats from both stores using the dedicated stats RPC
      const [bannosStats, flourlaneStats] = await Promise.all([
        getQueueStats("bannos"),
        getQueueStats("flourlane")
      ]);
      
      // Map RPC stats to our StatsByStore format
      const stats: StatsByStore = {
        bannos: {
          total: Number(bannosStats?.total_orders || 0),
          filling: Number(bannosStats?.filling_count || 0),
          covering: Number(bannosStats?.covering_count || 0),
          decorating: Number(bannosStats?.decorating_count || 0),
          packing: Number(bannosStats?.packing_count || 0),
          complete: Number(bannosStats?.complete_count || 0),
          unassigned: Number(bannosStats?.unassigned_count || 0),
        },
        flourlane: {
          total: Number(flourlaneStats?.total_orders || 0),
          filling: Number(flourlaneStats?.filling_count || 0),
          covering: Number(flourlaneStats?.covering_count || 0),
          decorating: Number(flourlaneStats?.decorating_count || 0),
          packing: Number(flourlaneStats?.packing_count || 0),
          complete: Number(flourlaneStats?.complete_count || 0),
          unassigned: Number(flourlaneStats?.unassigned_count || 0),
        },
      };
      
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }

  
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
              <StaffWorkspacePage />
            </ErrorBoundary>
          );
        case "supervisor-workspace":
          return (
            <ErrorBoundary>
              <SupervisorWorkspacePage 
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
        case "error-test":
          return (
            <ErrorBoundary>
              <ErrorTest />
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
              <DashboardContent stats={dashboardStats} onRefresh={loadDashboardStats} onNavigateToSignup={onNavigateToSignup} />
            </ErrorBoundary>
          );
      }
    } catch (error) {
      console.error('Error rendering dashboard content:', error);
      return (
        <ErrorBoundary>
          <DashboardContent stats={dashboardStats} onRefresh={loadDashboardStats} onNavigateToSignup={onNavigateToSignup} />
        </ErrorBoundary>
      );
    }
  };

  // Show login form if no user is authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Bannos Cakes</h1>
            <p className="text-muted-foreground">Please sign in to access the system</p>
          </div>
          <LoginForm onSuccess={() => window.location.reload()} userType="staff" />
          {onNavigateToSignup && (
            <div className="mt-4 text-center">
              <button
                onClick={onNavigateToSignup}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Don't have an account? Create one
              </button>
            </div>
          )}
        </div>
        <Toaster />
      </div>
    );
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-muted rounded-lg mb-4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

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
          <Header onRefresh={loadDashboardStats} />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}