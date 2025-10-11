// App.tsx (integrated with real Supabase auth)

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
import { StaffSignInPage } from "./components/StaffSignInPage";
import { StaffWorkspacePage } from "./components/StaffWorkspacePage";
import { SupervisorSignInPage } from "./components/SupervisorSignInPage";
import { SupervisorWorkspacePage } from "./components/SupervisorWorkspacePage";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Tiny spinner (fallback if you don't have one)
function Spinner() {
  return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
}

type AppView = 'dashboard' | 'staff-signin' | 'staff-workspace' | 'supervisor-signin' | 'supervisor-workspace';

interface StaffSession {
  email: string;
  name: string;
}

interface SupervisorSession {
  email: string;
  name: string;
}

/**
 * Wrap the entire app with the AuthProvider once.
 */
export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}

/**
 * Your original view-based app now gates rendering on auth.
 * - If loading: show spinner
 * - If not signed-in: show real LoginForm
 * - If signed-in: render your normal view switch (unchanged)
 */
function RootApp() {
  const { user, loading } = useAuth();

  // Panic route still works: /logout
  if (typeof window !== "undefined" && window.location.pathname === "/logout") {
    return <Logout />;
  }

  if (loading) return <Spinner />;
  if (!user) return <LoginForm onSuccess={() => {}} />; // 🔐 real login when signed out

  // ✅ signed in: use your existing view logic
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

      if (isStaffWorkspace) {
        setCurrentView("staff-signin");
      } else if (isSupervisorWorkspace) {
        setCurrentView("supervisor-signin");
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

  const handleStaffSignIn = (email: string, pin: string) => {
    try {
      // TODO: Implement real authentication
      // This will be replaced with actual API call to authenticate staff
      const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      setStaffSession({ email, name });
      setCurrentView('staff-workspace');
      
      window.history.pushState({}, '', '/workspace/staff');
    } catch (error) {
      console.error('Staff sign in error:', error);
    }
  };

  const handleStaffSignOut = () => {
    try {
      setStaffSession(null);
      setCurrentView('dashboard');
      
      window.history.pushState({}, '', '/');
    } catch (error) {
      console.error('Staff sign out error:', error);
    }
  };

  const handleSupervisorSignIn = (email: string, pin: string) => {
    try {
      // TODO: Implement real authentication
      // This will be replaced with actual API call to authenticate supervisor
      const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
      setSupervisorSession({ email, name });
      setCurrentView('supervisor-workspace');
      
      window.history.pushState({}, '', '/workspace/supervisor');
    } catch (error) {
      console.error('Supervisor sign in error:', error);
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

  // ⬇️ this is your original render switch (unchanged)
  if (currentView === "staff-signin") {
    return <StaffSignInPage onSignIn={handleStaffSignIn} />;
  }
  if (currentView === "staff-workspace") {
    return <StaffWorkspacePage 
      onSignOut={handleStaffSignOut}
    />;
  }
  if (currentView === "supervisor-signin") {
    return <SupervisorSignInPage onSignIn={handleSupervisorSignIn} />;
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