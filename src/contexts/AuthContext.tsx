import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, type AuthUser } from '../hooks/useAuth';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string, store: string) => Promise<{ success: boolean; error?: string }>;
  hasRole: (requiredRole: 'Staff' | 'Supervisor' | 'Admin') => boolean;
  canAccessStore: (store: 'bannos' | 'flourlane') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for role-based access control
interface WithAuthProps {
  requiredRole?: 'Staff' | 'Supervisor' | 'Admin';
  requiredStore?: 'bannos' | 'flourlane';
  fallback?: ReactNode;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading, hasRole, canAccessStore } = useAuthContext();
    const { requiredRole, requiredStore, fallback = <div>Access denied</div> } = options;

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return <div>Please sign in</div>;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      return <>{fallback}</>;
    }

    if (requiredStore && !canAccessStore(requiredStore)) {
      return <>{fallback}</>;
    }

    return <Component {...props} />;
  };
}
