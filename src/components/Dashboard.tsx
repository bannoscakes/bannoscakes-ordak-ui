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
import { Toaster } from "./ui/sonner";
import { ErrorBoundary } from "./ErrorBoundary";

export function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  
  // Parse URL parameters once and cache them
  const { viewFilter, staffFilter } = useMemo(() => {
    if (!urlParams) return { viewFilter: null, staffFilter: null };
    
    return {
      viewFilter: urlParams.get('view'),
      staffFilter: urlParams.get('staff')
    };
  }, [urlParams]);
  
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
              <BannosProductionPage initialFilter={viewFilter} />
            </ErrorBoundary>
          );
        case "flourlane-production":
          return (
            <ErrorBoundary>
              <FlourlaneProductionPage initialFilter={viewFilter} />
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
          <Header />
        </ErrorBoundary>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}