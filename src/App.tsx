import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { StaffWorkspacePage } from "./components/StaffWorkspacePage";
import { SupervisorWorkspacePage } from "./components/SupervisorWorkspacePage";
import { MessagesPage } from "./components/messaging/MessagesPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { LoginForm } from "./components/Auth/LoginForm";
import { SignupForm } from "./components/Auth/SignupForm";

type AppView = 'dashboard' | 'staff-signin' | 'staff-workspace' | 'supervisor-signin' | 'supervisor-workspace' | 'signup' | 'messages';

// Component to handle role-based routing
function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuthContext();

  // Handle role-based routing when user is authenticated
  useEffect(() => {
    console.log('=== ROUTING DEBUG ===');
    console.log('authLoading:', authLoading);
    console.log('user:', user);
    console.log('currentView:', currentView);
    
    if (!authLoading && user) {
      console.log('User authenticated, role:', user.role);
      
      // Redirect based on user role
      switch (user.role) {
        case 'Admin':
          console.log('Setting view to dashboard for Admin');
          setCurrentView('dashboard');
          break;
        case 'Supervisor':
          console.log('Setting view to supervisor-workspace for Supervisor');
          setCurrentView('supervisor-workspace');
          break;
        case 'Staff':
          console.log('Setting view to staff-workspace for Staff');
          setCurrentView('staff-workspace');
          break;
        default:
          console.log('Setting view to dashboard for unknown role');
          setCurrentView('dashboard');
      }
    } else if (!authLoading && !user) {
      console.log('No user authenticated, setting view to dashboard');
      // No user authenticated, show dashboard with login option
      setCurrentView('dashboard');
    }
    console.log('=== ROUTING DEBUG END ===');
  }, [user, authLoading]);

  // Check URL on mount and set initial view (for direct URL access)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      const viewParam = urlParams.get('view');
      
      const isStaffWorkspace = pathname === '/workspace/staff' || viewParam === 'staff';
      const isSupervisorWorkspace = pathname === '/workspace/supervisor' || viewParam === 'supervisor';
      const isMessages = pathname === '/messages' || viewParam === 'messages';

      // Only override if user is not authenticated or URL explicitly specifies workspace
      if (!user) {
        if (isStaffWorkspace) {
          setCurrentView('staff-workspace');
        } else if (isSupervisorWorkspace) {
          setCurrentView('supervisor-workspace');
        } else if (isMessages) {
          setCurrentView('messages');
        } else {
          setCurrentView('dashboard');
        }
      } else if (user && isMessages) {
        // Allow authenticated users to access messages
        setCurrentView('messages');
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      setCurrentView('dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleNavigateToSignup = () => {
    setCurrentView('signup');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('dashboard');
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

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-muted rounded-lg mb-4 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    // Show signup form
    if (currentView === 'signup') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <SignupForm 
            onSuccess={handleNavigateToLogin}
            onCancel={handleNavigateToLogin}
          />
        </div>
      );
    }

    // Show staff workspace with authentication
    if (currentView === 'staff-workspace') {
      return (
        <ProtectedRoute requiredRole="Staff" userType="staff">
          <div className="min-h-screen bg-background">
            <StaffWorkspacePage />
          </div>
        </ProtectedRoute>
      );
    }

    // Show supervisor workspace with authentication
    if (currentView === 'supervisor-workspace') {
      return (
        <ProtectedRoute requiredRole="Supervisor" userType="supervisor">
          <div className="min-h-screen bg-background">
            <SupervisorWorkspacePage 
              onNavigateToBannosQueue={handleNavigateToBannosQueue}
              onNavigateToFlourlaneQueue={handleNavigateToFlourlaneQueue}
            />
          </div>
        </ProtectedRoute>
      );
    }

    // Show messages page
    if (currentView === 'messages') {
      return (
        <ProtectedRoute requiredRole="Admin" userType="admin">
          <div className="min-h-screen bg-background">
            <MessagesPage />
          </div>
        </ProtectedRoute>
      );
    }

    // Default to dashboard with signup option
    return (
      <div className="min-h-screen bg-background">
        <Dashboard onNavigateToSignup={handleNavigateToSignup} />
      </div>
    );
  };

  return renderMainContent();
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}