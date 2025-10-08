import { useState, useEffect } from 'react';
// import { authService, type AuthState, type AuthUser } from '../lib/auth'; // Module doesn't exist

// Temporary types until auth module is implemented
interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  });

  useEffect(() => {
    // Temporary: Set loading to false since authService doesn't exist yet
    setAuthState(prev => ({ ...prev, loading: false }));
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    signIn: async () => { console.log('signIn not implemented'); },
    signOut: async () => { console.log('signOut not implemented'); },
    signUp: async () => { console.log('signUp not implemented'); },
    hasRole: (role: string) => { console.log('hasRole not implemented', role); return false; },
    canAccessStore: (store: string) => { console.log('canAccessStore not implemented', store); return false; }
  };
}

export function useRequireAuth(requiredRole?: 'Staff' | 'Supervisor' | 'Admin') {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading) {
      if (!auth.user) {
        // Redirect to login or show login modal
        console.log('User not authenticated');
        return;
      }

      if (requiredRole && !auth.hasRole(requiredRole)) {
        // Redirect to unauthorized page or show error
        console.log(`User lacks required role: ${requiredRole}`);
        return;
      }
    }
  }, [auth.loading, auth.user, requiredRole]);

  return auth;
}

export function useRequireStore(store: 'bannos' | 'flourlane') {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && auth.user && !auth.canAccessStore(store)) {
      console.log(`User cannot access store: ${store}`);
    }
  }, [auth.loading, auth.user, store]);

  return auth;
}

export type { AuthUser, AuthState };
