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
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize routing based on user role
    const initializeRouting = async () => {
      try {
        if (!user) return;

        // Get current URL path
        const pathname = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        // Determine if user is trying to access a specific workspace via URL
        const isStaffWorkspace = pathname === "/workspace/staff" || urlParams.get("view") === "staff";
        const isSupervisorWorkspace = pathname === "/workspace/supervisor" || urlParams.get("view") === "supervisor";
        const isDashboard = pathname === "/" || pathname === "/dashboard" || (!isStaffWorkspace && !isSupervisorWorkspace);

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
          redirectToRoleLanding(user.role);
        }
      } catch (error) {
        console.error('Error initializing routing:', error);
        // Fallback to role-based landing
        if (user) {
          redirectToRoleLanding(user.role);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeRouting();
  }, [user]);

  // Helper function to redirect to role-appropriate landing page
  const redirectToRoleLanding = (role: 'Staff' | 'Supervisor' | 'Admin') => {
    try {
      switch (role) {
        case 'Admin':
          window.history.pushState({}, '', '/dashboard');
          break;
        case 'Supervisor':
          window.history.pushState({}, '', '/workspace/supervisor');
          break;
        case 'Staff':
          window.history.pushState({}, '', '/workspace/staff');
          break;
        default:
          console.warn('Unknown role:', role);
          window.history.pushState({}, '', '/dashboard');
      }
    } catch (error) {
      console.error('Error redirecting:', error);
    }
  };

  // Show loading while routing is being determined
  if (isInitializing) return <Spinner />;

  // Route guards - protect routes by role
  if (!user) {
    return <LoginForm onSuccess={() => {}} />;
  }

  // Determine current view based on URL and role
  const pathname = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const isStaffWorkspace = pathname === "/workspace/staff" || urlParams.get("view") === "staff";
  const isSupervisorWorkspace = pathname === "/workspace/supervisor" || urlParams.get("view") === "supervisor";
  const isDashboard = pathname === "/" || pathname === "/dashboard" || (!isStaffWorkspace && !isSupervisorWorkspace);

  // Route guards with proper role checking
  if (isStaffWorkspace) {
    if (user.role !== 'Staff') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Staff" />;
    }
    return <StaffWorkspacePage onSignOut={signOut} />;
  }

  if (isSupervisorWorkspace) {
    if (user.role !== 'Supervisor' && user.role !== 'Admin') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Supervisor or Admin" />;
    }
    return <SupervisorWorkspacePage 
      onSignOut={signOut}
      onNavigateToBannosQueue={() => navigateToQueue('bannos')}
      onNavigateToFlourlaneQueue={() => navigateToQueue('flourlane')}
    />;
  }

  if (isDashboard) {
    if (user.role !== 'Admin') {
      return <UnauthorizedAccess userRole={user.role} requiredRole="Admin" />;
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
 * Queue navigation helper
 */
function navigateToQueue(queueType: 'bannos' | 'flourlane') {
  try {
    const url = `/?page=${queueType}-production&view=unassigned`;
    window.history.pushState({}, '', url);
    // Reload the page to trigger the routing logic
    window.location.reload();
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

/**
 * Unauthorized access component
 */
function UnauthorizedAccess({ userRole, requiredRole }: { userRole: string; requiredRole: string }) {
  const { signOut } = useAuth();
  
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
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go to Dashboard
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