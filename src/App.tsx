import React, { lazy, Suspense, useEffect, useState, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";

// ✅ real auth system (from the audit)
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { safePushState, NAVIGATION_EVENT } from "./lib/safeNavigate";

// ✅ Modern login page with Ordak branding
import { ModernLoginPage } from "./components/Auth/ModernLoginPage";

// ✅ panic sign-out route
import Logout from "./components/Logout";

// ✅ Error boundary (needed before lazy components load)
import { ErrorBoundary } from "./components/ErrorBoundary";

// ✅ Shared loading spinner for Suspense fallbacks
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// ✅ Single realtime subscription for unread message count (fixes #594)
import { UnreadCountSubscriptionProvider } from "./hooks/useUnreadCount";

// ✅ High-priority order notifications
import { HighPriorityNotificationProvider } from "./components/HighPriorityNotificationProvider";

// Full-screen spinner for page-level loading states
function Spinner() {
  return <LoadingSpinner size="lg" className="min-h-screen" />;
}

// Wrapper for lazy-loaded pages with error boundary and loading state
function LazyPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// ⛳ Lazy-loaded workspace pages for code splitting
// Note: .then(m => ({ default: m.ComponentName })) is needed because
// these components use named exports, not default exports
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const StaffWorkspacePage = lazy(() => import("./components/StaffWorkspacePage").then(m => ({ default: m.StaffWorkspacePage })));
const SupervisorWorkspacePage = lazy(() => import("./components/SupervisorWorkspacePage").then(m => ({ default: m.SupervisorWorkspacePage })));

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
  }, [transitionKey]); // Only depend on transitionKey - children will be captured from current render

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
        <LoadingSpinner />
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </QueryClientProvider>
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
        <ModernLoginPage onSuccess={() => {}} />
      </FadeTransition>
    );
  }

  // User is authenticated - route by role
  return (
    <FadeTransition transitionKey={transitionKey}>
      <UnreadCountSubscriptionProvider>
        <HighPriorityNotificationProvider>
          <RoleBasedRouter />
        </HighPriorityNotificationProvider>
      </UnreadCountSubscriptionProvider>
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
  // State triggers re-render on URL change; value not read directly (we read window.location)
  const [, setUrlTrigger] = useState(0);

  // Listen for URL changes (popstate for back/forward, custom event for programmatic navigation)
  // Fixes #498: No longer patches pushState/replaceState - uses custom event from safePushState instead
  useEffect(() => {
    const handleUrlChange = () => {
      setUrlTrigger(n => n + 1);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener(NAVIGATION_EVENT, handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener(NAVIGATION_EVENT, handleUrlChange);
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

  }, [user]); // Only re-evaluate on user changes, not URL (fixes #499)

  // ✅ Early returns AFTER all hooks have been declared
  if (!user) {
    return <ModernLoginPage onSuccess={() => {}} />;
  }

  // Single URL architecture - route by USER ROLE, not URL
  // All users access "/" but see different interfaces based on their role
  
  if (user.role === 'Staff') {
    return (
      <LazyPageWrapper>
        <StaffWorkspacePage onSignOut={signOut} />
      </LazyPageWrapper>
    );
  }

  if (user.role === 'Supervisor') {
    // Check if supervisor is navigating to a production queue
    // URL Convention: "page" is the canonical parameter for production queues
    // - navigateToQueue() sets ?page=bannos-production or ?page=flourlane-production
    // - Sidebar also uses ?page= for production queues (standardized)
    // - "view" is used for other pages (staff, inventory, etc.)
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const isViewingQueue = page === 'bannos-production' || page === 'flourlane-production';

    if (isViewingQueue) {
      // Show Dashboard with queue view for supervisors
      return (
        <LazyPageWrapper>
          <Dashboard onSignOut={signOut} />
        </LazyPageWrapper>
      );
    }

    return (
      <LazyPageWrapper>
        <SupervisorWorkspacePage
          onSignOut={signOut}
          onNavigateToBannosQueue={() => navigateToQueue('bannos')}
          onNavigateToFlourlaneQueue={() => navigateToQueue('flourlane')}
        />
      </LazyPageWrapper>
    );
  }

  if (user.role === 'Admin') {
    return (
      <LazyPageWrapper>
        <Dashboard onSignOut={signOut} />
      </LazyPageWrapper>
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