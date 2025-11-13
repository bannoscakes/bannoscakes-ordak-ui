import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { LoginForm } from './LoginForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Staff' | 'Supervisor' | 'Admin';
  requiredStore?: 'bannos' | 'flourlane';
  fallback?: React.ReactNode;
  userType?: 'staff' | 'supervisor';
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredStore,
  fallback,
  userType = 'staff'
}: ProtectedRouteProps) {
  const { user, loading, hasRole, canAccessStore } = useAuthContext();

  console.log('ProtectedRoute - loading:', loading, 'user:', user, 'requiredRole:', requiredRole);

  // Skip loading check - App.tsx handles initial auth load
  // Only show loading during first initialization, not during transitions
  // This prevents flashing loading states when switching between auth states

  if (!user) {
    console.log('ProtectedRoute - no user, showing login form');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoginForm onSuccess={() => {
          // Auth state will update and trigger re-render - no reload needed
          console.log('✅ Login successful - auth state will update');
        }} userType={userType} />
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You need {requiredRole} permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredStore && !canAccessStore(requiredStore)) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have access to the {requiredStore} store.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience components for specific role requirements
export function StaffRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="Staff" userType="staff" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function SupervisorRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="Supervisor" userType="supervisor" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="Admin" userType="supervisor" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}
