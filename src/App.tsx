import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { StaffSignInPage } from "./components/StaffSignInPage";
import { StaffWorkspacePage } from "./components/StaffWorkspacePage";
import { SupervisorSignInPage } from "./components/SupervisorSignInPage";
import { SupervisorWorkspacePage } from "./components/SupervisorWorkspacePage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { Label } from "./components/ui/label";

type AppView = 'dashboard' | 'staff-signin' | 'staff-workspace' | 'supervisor-signin' | 'supervisor-workspace';

interface StaffSession {
  email: string;
  name: string;
}

interface SupervisorSession {
  email: string;
  name: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [supervisorSession, setSupervisorSession] = useState<SupervisorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check URL on mount and set initial view
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      const viewParam = urlParams.get('view');
      
      const isStaffWorkspace = pathname === '/workspace/staff' || viewParam === 'staff';
      const isSupervisorWorkspace = pathname === '/workspace/supervisor' || viewParam === 'supervisor';

      if (isStaffWorkspace) {
        setCurrentView('staff-signin');
      } else if (isSupervisorWorkspace) {
        setCurrentView('supervisor-signin');
      } else {
        // Default to dashboard but require authentication
        setCurrentView('dashboard');
        setIsAuthenticated(false); // Force login first
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      setCurrentView('dashboard');
      setIsAuthenticated(false);
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

  const handleMainDashboardSignIn = (email: string, password: string) => {
    try {
      // TODO: Implement real authentication
      // For now, just set authenticated to true
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Main dashboard sign in error:', error);
    }
  };

  const handleMainDashboardSignOut = () => {
    try {
      setIsAuthenticated(false);
      setStaffSession(null);
      setSupervisorSession(null);
      setCurrentView('dashboard');
      
      window.history.pushState({}, '', '/');
    } catch (error) {
      console.error('Main dashboard sign out error:', error);
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
    // Show staff signin for staff workspace access without session
    if (currentView === 'staff-signin' && !staffSession) {
      return (
        <div className="min-h-screen bg-background">
          <StaffSignInPage onSignIn={handleStaffSignIn} />
        </div>
      );
    }

    // Show staff workspace if signed in
    if (currentView === 'staff-workspace' && staffSession) {
      return (
        <div className="min-h-screen bg-background">
          <StaffWorkspacePage 
            staffName={staffSession.name}
            onSignOut={handleStaffSignOut}
          />
        </div>
      );
    }

    // Show supervisor signin for supervisor workspace access without session
    if (currentView === 'supervisor-signin' && !supervisorSession) {
      return (
        <div className="min-h-screen bg-background">
          <SupervisorSignInPage onSignIn={handleSupervisorSignIn} />
        </div>
      );
    }

    // Show supervisor workspace if signed in
    if (currentView === 'supervisor-workspace' && supervisorSession) {
      return (
        <div className="min-h-screen bg-background">
          <SupervisorWorkspacePage 
            supervisorName={supervisorSession.name}
            onSignOut={handleSupervisorSignOut}
            onNavigateToBannosQueue={handleNavigateToBannosQueue}
            onNavigateToFlourlaneQueue={handleNavigateToFlourlaneQueue}
          />
        </div>
      );
    }

    // Show login screen if not authenticated for dashboard
    if (currentView === 'dashboard' && !isAuthenticated) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Welcome to Bannos Cakes</h1>
                <p className="text-muted-foreground mt-2">Please sign in to continue</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    defaultValue="admin@bannoscakes.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    defaultValue="admin123"
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => handleMainDashboardSignIn("admin@bannoscakes.com", "admin123")}
                >
                  Sign In
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Default credentials: admin@bannoscakes.com / admin123</p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Show dashboard if authenticated
    if (currentView === 'dashboard' && isAuthenticated) {
      return (
        <div className="min-h-screen bg-background">
          <Dashboard onSignOut={handleMainDashboardSignOut} />
        </div>
      );
    }

    // Fallback to login
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Welcome to Bannos Cakes</h1>
              <p className="text-muted-foreground mt-2">Please sign in to continue</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  defaultValue="admin@bannoscakes.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  defaultValue="admin123"
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => handleMainDashboardSignIn("admin@bannoscakes.com", "admin123")}
              >
                Sign In
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Default credentials: admin@bannoscakes.com / admin123</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      {renderMainContent()}
    </ErrorBoundary>
  );
}