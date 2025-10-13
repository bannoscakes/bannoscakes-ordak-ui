import React, { useEffect, useState } from "react";

// ✅ real auth system (from the audit)
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import type { AuthUser } from "./lib/auth";

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

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}

function RootApp() {
  const { user, loading } = useAuth();

  // Handle panic logout route
  if (typeof window !== "undefined" && window.location.pathname === "/logout") {
    return <Logout />;
  }
  
  // Show loading while auth is initializing
  if (loading) return <Spinner />;
  
  // Show login form if not authenticated
  if (!user) return <LoginForm onSuccess={() => {}} />;

  // User is authenticated - route by role
  return <RoleBasedRouter />;
}

/**
 * Role-based routing system
 * Routes users to appropriate landing page based on their role
 */
function RoleBasedRouter() {
  // ✅ All hooks declared unconditionally at the top
  const { user, signOut } = useAuth();
  const [currentUrl, setCurrentUrl] = useState(window.location.href);
  const [didRoute, setDidRoute] = useState(false);

  // Listen for URL changes (including browser back/forward)
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href);
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleUrlChange);
    
    // Also listen for programmatic navigation
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleUrlChange();
    };

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  // Single URL architecture - all users use "/" and route internally by role
  const getCurrentWorkspace = () => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // All users use the root path "/" - no role-specific URLs
    const isRootPath = pathname === "/";
    
    return {
      pathname,
      urlParams,
      isRootPath,
      // These are determined by user role, not URL
      isStaffWorkspace: false, // Will be determined by user role
      isSupervisorWorkspace: false, // Will be determined by user role  
      isDashboard: false // Will be determined by user role
    };
  };

  // Single URL architecture - all users stay on "/"
  const redirectToRoleLanding = (role: 'Staff' | 'Supervisor' | 'Admin') => {
    try {
      // Always redirect to root path "/" - role-based routing is internal
      window.history.pushState({}, '', '/');
    } catch (error) {
      console.error('Error redirecting:', error);
    }
  };

  // ✅ Single effect that handles all routing logic - ROLE-BASED, not URL-based
  useEffect(() => {
    if (!user) {
      setDidRoute(true);
      return;
    }

    // Single URL architecture - ensure all users are on "/"
    const workspace = getCurrentWorkspace();
    if (!workspace.isRootPath) {
      // Redirect to root path if not already there
      redirectToRoleLanding((user as AuthUser).role);
    }

    console.log(`User ${(user as AuthUser).fullName} (${(user as AuthUser).role}) accessing single URL architecture`);

    setDidRoute(true);
  }, [user, currentUrl]); // Re-evaluate on user or URL changes

  // ✅ Early returns AFTER all hooks have been declared
  if (!user) {
    return <LoginForm onSuccess={() => {}} />;
  }

  // Single URL architecture - route by USER ROLE, not URL
  // All users access "/" but see different interfaces based on their role
  
  if (user.role === 'Staff') {
    return <StaffWorkspacePage onSignOut={signOut} />;
  }

  if (user.role === 'Supervisor') {
    return <SupervisorWorkspacePage 
      onSignOut={signOut}
      onNavigateToBannosQueue={() => navigateToQueue('bannos')}
      onNavigateToFlourlaneQueue={() => navigateToQueue('flourlane')}
    />;
  }

  if (user.role === 'Admin') {
    return (
      <ErrorBoundary>
        <Dashboard onSignOut={signOut} />
      </ErrorBoundary>
    );
  }

  // Fallback - shouldn't reach here
  return <Spinner />;
}

/**
 * Queue navigation helper - SPA compatible
 */
function navigateToQueue(queueType: 'bannos' | 'flourlane') {
  try {
    const url = `/?page=${queueType}-production&view=unassigned`;
    // Use pushState which is already patched to trigger handleUrlChange
    // No need to manually dispatch popstate event as it causes double triggering
    window.history.pushState({}, '', url);
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

// UnauthorizedAccess component removed - not needed with single URL architecture