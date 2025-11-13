import React, { useEffect, useState, useRef } from "react";

// ✅ real auth system (from the audit)
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import type { AuthUser } from "./lib/auth";
import { safePushState } from "./lib/safeNavigate";

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

// Fade transition wrapper to prevent flickering during auth state changes
function FadeTransition({ children, transitionKey }: { children: React.ReactNode; transitionKey: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const previousKey = useRef(transitionKey);
  const timeoutRef = useRef<number | null>(null);
  const rafRef1 = useRef<number | null>(null);
  const rafRef2 = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup function to cancel all pending animations
    const cancelAllAnimations = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef1.current !== null) {
        cancelAnimationFrame(rafRef1.current);
        rafRef1.current = null;
      }
      if (rafRef2.current !== null) {
        cancelAnimationFrame(rafRef2.current);
        rafRef2.current = null;
      }
    };

    if (previousKey.current !== transitionKey) {
      // Key changed - fade out, then update children, then fade in
      setIsVisible(false);

      timeoutRef.current = window.setTimeout(() => {
        setDisplayChildren(children);
        previousKey.current = transitionKey;
        // Small delay to ensure DOM update completes before fading in
        rafRef1.current = requestAnimationFrame(() => {
          rafRef2.current = requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      }, 150); // Match the transition duration
    } else {
      // Initial render or same key - just fade in
      setDisplayChildren(children);
      rafRef1.current = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }

    // Cancel all animations on cleanup
    return cancelAllAnimations;
  }, [children, transitionKey]);

  return (
    <div
      style={{
        transition: 'opacity 150ms ease-in-out',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {displayChildren}
    </div>
  );
}

// Reconnecting indicator for auth recovery
function ReconnectingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-lg text-muted-foreground">Reconnecting...</p>
      </div>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        Session temporarily unavailable. Attempting to restore your connection...
      </p>
    </div>
  );
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
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // ✅ CRITICAL: Hooks must be called unconditionally at the top level
  // If loading takes too long (> 3s), show reconnecting indicator
  useEffect(() => {
    if (!loading) {
      setShowReconnecting(false);
      setHasInitialized(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowReconnecting(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading]);

  // Handle panic logout route
  if (typeof window !== "undefined" && window.location.pathname === "/logout") {
    return <Logout />;
  }

  // Show loading while auth is initializing (only on initial load, not during transitions)
  if (loading && !hasInitialized) {
    return showReconnecting ? <ReconnectingIndicator /> : <Spinner />;
  }

  // Use transition key based on auth state to enable smooth fades
  const transitionKey = user ? `authenticated-${user.id}` : 'unauthenticated';

  // Show login form if not authenticated
  if (!user) {
    return (
      <FadeTransition transitionKey={transitionKey}>
        <LoginForm onSuccess={() => {}} />
      </FadeTransition>
    );
  }

  // User is authenticated - route by role
  return (
    <FadeTransition transitionKey={transitionKey}>
      <RoleBasedRouter />
    </FadeTransition>
  );
}

/**
 * Role-based routing system
 * Routes users to appropriate landing page based on their role
 */
function RoleBasedRouter() {
  // ✅ All hooks declared unconditionally at the top
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
  const redirectToRoleLanding = () => {
    // Always redirect to root path "/" - role-based routing is internal
    safePushState('/');
  };

  // ✅ Single effect that handles all routing logic - ROLE-BASED, not URL-based
  useEffect(() => {
    if (!user) {
      return;
    }

    // Single URL architecture - ensure all users are on "/"
    const workspace = getCurrentWorkspace();
    if (!workspace.isRootPath) {
      // Redirect to root path if not already there
      redirectToRoleLanding();
    }

    console.log(`User ${(user as AuthUser).fullName} (${(user as AuthUser).role}) accessing single URL architecture`);
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
  const url = `/?page=${queueType}-production&view=unassigned`;
  // Use safe navigation to prevent /false routes
  safePushState(url);
}

// UnauthorizedAccess component removed - not needed with single URL architecture