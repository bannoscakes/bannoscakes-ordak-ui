import React, { useEffect, useState } from "react";

// ✅ real auth system (from the audit)
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";

// ✅ real login screen
import { LoginForm } from "./components/Auth/LoginForm";

// ✅ panic sign-out route
import Logout from "./components/Logout";

// ⛳ your existing stuff (keep these)
import { Dashboard } from "./components/Dashboard";
import { StaffWorkspacePage } from "./components/StaffWorkspacePage";
import { SupervisorWorkspacePage } from "./components/SupervisorWorkspacePage";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Tiny spinner (fallback if you don't have one)
function Spinner() {
  return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
}

type AppView = 'dashboard' | 'staff-workspace' | 'supervisor-workspace';

interface StaffSession {
  email: string;
  name: string;
}

interface SupervisorSession {
  email: string;
  name: string;
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}

function RootApp() {
  const { user, loading } = useAuth();

  if (typeof window !== "undefined" && window.location.pathname === "/logout") {
    return <Logout />;
  }
  
  if (loading) return <Spinner />;
  if (!user) return <LoginForm onSuccess={() => {}} />; // 🔐 real login

  return <MainViews />;
}

/**
 * Your existing view-switch stays the same.
 * If you already have a function like renderMainContent()/currentView,
 * keep it here unchanged.
 */
function MainViews() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [supervisorSession, setSupervisorSession] = useState<SupervisorSession | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      const viewParam = urlParams.get("view");

      const isStaffWorkspace =
        pathname === "/workspace/staff" || viewParam === "staff";
      const isSupervisorWorkspace =
        pathname === "/workspace/supervisor" || viewParam === "supervisor";

      // Auth is now handled above - no more mock sign-in redirects
      if (isStaffWorkspace) {
        setCurrentView("staff-workspace");
      } else if (isSupervisorWorkspace) {
        setCurrentView("supervisor-workspace");
      } else {
        setCurrentView("dashboard");
      }
    } catch (err) {
      console.error("Error parsing URL:", err);
      setCurrentView("dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock sign-in handlers removed - using real auth now
  const handleStaffSignOut = () => {
    try {
      setStaffSession(null);
      setCurrentView('dashboard');
      window.history.pushState({}, '', '/');
    } catch (error) {
      console.error('Staff sign out error:', error);
    }
  };

  const handleSupervisorSignOut = () => {
    try {
      setSupervisorSession(null);
      setCurrentView('dashboard');
      window.history.pushState({}, '', '/');
    } catch (error) {
      console.error('Supervisor sign out error:', error);
    }
  };

  const handleNavigateToBannosQueue = () => {
    try {
      window.history.pushState({}, '', '/?page=bannos-production&view=unassigned');
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleNavigateToFlourlaneQueue = () => {
    try {
      window.history.pushState({}, '', '/?page=flourlane-production&view=unassigned');
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  if (isLoading) return <Spinner />;

  // Render workspace views - auth is handled above
  if (currentView === "staff-workspace") {
    return <StaffWorkspacePage 
      onSignOut={handleStaffSignOut}
    />;
  }
  if (currentView === "supervisor-workspace") {
    return <SupervisorWorkspacePage 
      onSignOut={handleSupervisorSignOut}
      onNavigateToBannosQueue={handleNavigateToBannosQueue}
      onNavigateToFlourlaneQueue={handleNavigateToFlourlaneQueue}
    />;
  }

  // default: dashboard
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}