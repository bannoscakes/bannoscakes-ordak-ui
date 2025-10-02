import { 
  LayoutDashboard, 
  Factory, 
  Monitor, 
  BarChart3, 
  Users, 
  Package,
  Settings,
  Clock,
  ChevronLeft,
  ChevronRight,
  Cake,
  Wheat
} from "lucide-react";
import { Button } from "./ui/button";
import { TallCakeIcon } from "./TallCakeIcon";

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Cake, label: "Bannos Production", id: "bannos-production", badge: "8", isProduction: true },
  { icon: TallCakeIcon, label: "Flourlane Production", id: "flourlane-production", badge: "4", isProduction: true },
  { icon: Cake, label: "Bannos Monitor", id: "bannos-monitor", badge: "13", isMonitor: true },
  { icon: TallCakeIcon, label: "Flourlane Monitor", id: "flourlane-monitor", badge: "12", isMonitor: true },
  { icon: Cake, label: "Bannos Analytics", id: "bannos-analytics", isAnalytics: true },
  { icon: TallCakeIcon, label: "Flourlane Analytics", id: "flourlane-analytics", isAnalytics: true },
  { icon: Users, label: "Staff Analytics", id: "staff-analytics", isAnalytics: true },
  { icon: Users, label: "Staff", id: "staff", badge: "6", isStaff: true },
  { icon: Users, label: "Staff Workspace", id: "staff-workspace", isStaff: true },
  { icon: Users, label: "Supervisor Workspace", id: "supervisor-workspace", isStaff: true },
  { icon: Clock, label: "Time & Payroll", id: "time-payroll", adminOnly: true, isStaff: true },
  { icon: Package, label: "Inventory", id: "inventory", badge: "3" },
  { icon: Settings, label: "Bannos Settings", id: "bannos-settings", isSettings: true },
  { icon: Settings, label: "Flourlane Settings", id: "flourlane-settings", isSettings: true },
];

export function Sidebar({ collapsed, onCollapse, activeView, onViewChange }: SidebarProps) {
  // Mock current user role (in real app, this would come from auth context)
  const currentUserRole = "Admin";
  const isAdmin = currentUserRole === "Admin";
  return (
    <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-medium text-sidebar-foreground">Manufactory</h1>
              <p className="text-sm text-muted-foreground">Production Hub</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapse(!collapsed)}
            className="p-2 hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
          const isActive = activeView === item.id;
          const isClickable = item.id === "dashboard" || item.id === "bannos-production" || item.id === "flourlane-production" || item.id === "bannos-monitor" || item.id === "flourlane-monitor" || item.id === "bannos-analytics" || item.id === "flourlane-analytics" || item.id === "staff-analytics" || item.id === "staff" || item.id === "staff-workspace" || item.id === "supervisor-workspace" || item.id === "time-payroll" || item.id === "inventory" || item.id === "bannos-settings" || item.id === "flourlane-settings";
          
          return (
            <div key={index} className="relative">
              {item.isProduction && !collapsed && index > 0 && navigationItems[index - 1]?.id === "dashboard" && (
                <div className="text-xs text-muted-foreground px-4 py-2 font-medium">
                  Production
                </div>
              )}
              {item.isMonitor && !collapsed && index > 0 && navigationItems[index - 1]?.id === "flourlane-production" && (
                <div className="text-xs text-muted-foreground px-4 py-2 font-medium">
                  Monitors
                </div>
              )}
              {item.isAnalytics && !collapsed && index > 0 && navigationItems.filter(item => !item.adminOnly || isAdmin)[index - 1]?.id === "flourlane-monitor" && (
                <div className="text-xs text-muted-foreground px-4 py-2 font-medium">
                  Analytics
                </div>
              )}
              {item.id === "staff" && !collapsed && (
                <div className="text-xs text-muted-foreground px-4 py-2 font-medium">
                  Staff
                </div>
              )}
              {item.isSettings && !collapsed && index > 0 && navigationItems.filter(item => !item.adminOnly || isAdmin)[index - 1]?.id === "inventory" && (
                <div className="text-xs text-muted-foreground px-4 py-2 font-medium">
                  Settings
                </div>
              )}
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start transition-all duration-200 ${
                  collapsed ? 'px-3' : 'px-4'
                } ${(item.isProduction || item.isMonitor || item.isAnalytics || item.isStaff || item.isSettings) && !collapsed ? 'ml-4 w-[calc(100%-1rem)]' : ''} ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' : 'hover:bg-sidebar-accent text-sidebar-foreground'} ${!isClickable ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (isClickable) {
                    if (item.id === "staff") {
                      window.history.pushState({}, '', '/staff');
                    } else if (item.id === "staff-workspace") {
                      window.history.pushState({}, '', '/workspace/staff');
                    } else if (item.id === "supervisor-workspace") {
                      window.history.pushState({}, '', '/workspace/supervisor');
                    } else if (item.id === "time-payroll") {
                      window.history.pushState({}, '', '/admin/time');
                    } else if (item.id === "bannos-settings") {
                      window.history.pushState({}, '', '/bannos/settings');
                    } else if (item.id === "flourlane-settings") {
                      window.history.pushState({}, '', '/flourlane/settings');
                    }
                    onViewChange(item.id);
                  }
                }}
                disabled={!isClickable}
              >
                <item.icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}