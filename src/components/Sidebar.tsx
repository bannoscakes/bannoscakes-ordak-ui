import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Clock,
  ChevronLeft,
  Cake,
  ClipboardList
} from "lucide-react";
import { Button } from "./ui/button";
import { TallCakeIcon } from "./TallCakeIcon";
import { OrdakLogo } from "./OrdakLogo";
import { safePushState } from "@/lib/safeNavigate";
import { useAuth } from "@/hooks/useAuth";

// Set of clickable navigation item IDs for O(1) lookup
const CLICKABLE_NAV_IDS = new Set([
  "dashboard",
  "orders",
  "bannos-production",
  "flourlane-production",
  "bannos-monitor",
  "flourlane-monitor",
  "bannos-analytics",
  "flourlane-analytics",
  "staff-analytics",
  "staff",
  "time-payroll",
  "inventory",
  "bannos-settings",
  "flourlane-settings",
]);

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: ClipboardList, label: "Orders", id: "orders", adminOnly: true },
  { icon: Cake, label: "Bannos Production", id: "bannos-production", isProduction: true },
  { icon: TallCakeIcon, label: "Flourlane Production", id: "flourlane-production", isProduction: true },
  { icon: Cake, label: "Bannos Monitor", id: "bannos-monitor", isMonitor: true },
  { icon: TallCakeIcon, label: "Flourlane Monitor", id: "flourlane-monitor", isMonitor: true },
  { icon: Cake, label: "Bannos Analytics", id: "bannos-analytics", isAnalytics: true },
  { icon: TallCakeIcon, label: "Flourlane Analytics", id: "flourlane-analytics", isAnalytics: true },
  { icon: Users, label: "Staff Analytics", id: "staff-analytics", isAnalytics: true },
  { icon: Users, label: "Staff", id: "staff", isStaff: true },
  { icon: Clock, label: "Time & Payroll", id: "time-payroll", adminOnly: true, isStaff: true },
  { icon: Package, label: "Inventory", id: "inventory" },
  { icon: Settings, label: "Bannos Settings", id: "bannos-settings", isSettings: true },
  { icon: Settings, label: "Flourlane Settings", id: "flourlane-settings", isSettings: true },
];

export function Sidebar({ collapsed, onCollapse, activeView, onViewChange }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`p-2 rounded-md bg-[#FF6B00] ${collapsed ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2' : 'cursor-default'}`}
              onClick={collapsed ? () => onCollapse(false) : undefined}
              tabIndex={collapsed ? 0 : -1}
              aria-label="Expand sidebar"
              aria-expanded={!collapsed}
            >
              <OrdakLogo className="h-6 w-6" variant="light" />
            </button>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-semibold text-sidebar-foreground">Ordak</h1>
                <p className="text-sm text-muted-foreground">Manufacturing Hub</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapse(true)}
              className="p-2 hover:bg-sidebar-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.filter(item => {
          // Filter by admin role
          if (item.adminOnly && !isAdmin) return false;
          return true;
        }).map((item, index) => {
          const isActive = activeView === item.id;
          const isClickable = CLICKABLE_NAV_IDS.has(item.id);

          return (
            <div key={index} className="relative">
              {item.isProduction && !collapsed && item.id === "bannos-production" && (
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
                    // Single URL architecture - all navigation stays on "/" with query params
                    // Convention: "page" for production queues, "view" for other pages
                    if (item.id === "bannos-production" || item.id === "flourlane-production") {
                      // Production queues use "page" parameter (canonical for queue navigation)
                      safePushState(`/?page=${item.id}`);
                    } else if (item.id === "staff") {
                      safePushState('/?view=staff');
                    } else if (item.id === "time-payroll") {
                      safePushState('/?view=time-payroll');
                    } else if (item.id === "bannos-settings") {
                      safePushState('/?view=bannos-settings');
                    } else if (item.id === "flourlane-settings") {
                      safePushState('/?view=flourlane-settings');
                    } else {
                      // Default to root with view parameter
                      safePushState(`/?view=${item.id}`);
                    }
                    onViewChange(item.id);
                  }
                }}
                disabled={!isClickable}
              >
                <item.icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </Button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}