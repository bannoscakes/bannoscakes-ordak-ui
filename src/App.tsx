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
  const { user, signOut } = useAuth();
  const [currentUrl, setCurrentUrl] = useState(window.location.href);

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

  // Centralized workspace determination logic
  const getCurrentWorkspace = () => {
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for specific workspace routes first
    const isStaffWorkspace = pathname === "/workspace/staff" || urlParams.get("view") === "staff";
    const isSupervisorWorkspace = pathname === "/workspace/supervisor" || urlParams.get("view") === "supervisor";
    
    // Dashboard is only the root path, dashboard path, or when no specific view is set AND no workspace path
    const isDashboard = (pathname === "/" || pathname === "/dashboard") && 
                       !pathname.includes("/workspace/") && 
                       !urlParams.get("view") &&
                       !urlParams.get("page");
    
    return {
      pathname,
      urlParams,
      isStaffWorkspace,
      isSupervisorWorkspace,
      isDashboard
    };
  };

  // Helper function to get expected URL for a role
  const getExpectedUrlForRole = (role: 'Staff' | 'Supervisor' | 'Admin') => {
    switch (role) {
      case 'Admin':
        return '/dashboard';
      case 'Supervisor':
        return '/workspace/supervisor';
      case 'Staff':
        return '/workspace/staff';
      default:
        return '/dashboard';
    }
  };

  // Helper function to redirect to role-appropriate landing page
  const redirectToRoleLanding = (role: 'Staff' | 'Supervisor' | 'Admin') => {
    try {
      const expectedUrl = getExpectedUrlForRole(role);
      window.history.pushState({}, '', expectedUrl);
    } catch (error) {
      console.error('Error redirecting:', error);
    }
  };

  // Route guards - protect routes by role
  if (!user) {
    return <LoginForm onSuccess={() => {}} />;
  }

  // Check for route mismatches and redirect if needed
  useEffect(() => {
    if (!user) return;

    // Calculate workspace inside effect to react to URL changes
    const workspace = getCurrentWorkspace();
    const { isStaffWorkspace, isSupervisorWorkspace, isDashboard, pathname } = workspace;

    // Route by role with URL respect
    if (isStaffWorkspace && user.role === 'Staff') {
      // Staff accessing staff workspace - allow
      console.log('Staff accessing staff workspace');
    } else if (isSupervisorWorkspace && (user.role === 'Supervisor' || user.role === 'Admin')) {
      // Supervisor/Admin accessing supervisor workspace - allow
      console.log('Supervisor/Admin accessing supervisor workspace');
    } else if (isDashboard && user.role === 'Admin') {
      // Admin accessing dashboard - allow
      console.log('Admin accessing dashboard');
    } else {
      // Route mismatch - redirect to appropriate landing page
      console.log(`Role mismatch: User role ${user.role}, trying to access ${pathname}`);
      
      // Prevent infinite loops by checking if we're already at the correct URL
      const expectedUrl = getExpectedUrlForRole(user.role);
      if (window.location.pathname !== expectedUrl) {
        redirectToRoleLanding(user.role);
      }
    }
  }, [user, currentUrl]); // Re-evaluate on user or URL changes

  // Get current workspace for rendering (outside useEffect to avoid stale closure)
  const workspace = getCurrentWorkspace();

  // Route guards with proper role checking
  if (workspace.isStaffWorkspace) {
    if (user.role !== 'Staff') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Staff" onNavigateToDashboard={() => redirectToRoleLanding(user.role)} />;
    }
    return <StaffWorkspacePage onSignOut={signOut} />;
  }

  if (workspace.isSupervisorWorkspace) {
    if (user.role !== 'Supervisor' && user.role !== 'Admin') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Supervisor or Admin" onNavigateToDashboard={() => redirectToRoleLanding(user.role)} />;
    }
    return <SupervisorWorkspacePage 
      onSignOut={signOut}
      onNavigateToBannosQueue={() => navigateToQueue('bannos')}
      onNavigateToFlourlaneQueue={() => navigateToQueue('flourlane')}
    />;
  }

  if (workspace.isDashboard) {
    if (user.role !== 'Admin') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Admin" onNavigateToDashboard={() => redirectToRoleLanding(user.role)} />;
    }
    return (
      <ErrorBoundary>
        <Dashboard />
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

/**
 * Unauthorized access component - SPA compatible with role-appropriate navigation
 */
function UnauthorizedAccess({ 
  userRole, 
  requiredRole, 
  onNavigateToDashboard 
}: { 
  userRole: string; 
  requiredRole: string;
  onNavigateToDashboard: () => void;
}) {
  const { signOut } = useAuth();
  
  // Get appropriate button text based on user role
  const getNavigationButtonText = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'Go to Dashboard';
      case 'Supervisor':
        return 'Go to Supervisor Workspace';
      case 'Staff':
        return 'Go to Staff Workspace';
      default:
        return 'Go to Dashboard';
    }
  };
  
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <div className="max-w-md mx-auto p-6 bg-background rounded-lg shadow-lg">
        <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Your role ({userRole}) does not have permission to access this area.
          Required role: {requiredRole}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onNavigateToDashboard}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {getNavigationButtonText(userRole)}
          </button>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}