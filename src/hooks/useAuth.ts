import { useState, useEffect } from 'react';
import { authService, type AuthState, type AuthUser } from '../lib/auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  });

  useEffect(() => {
    // Subscribe to auth state changes
    // The subscribe method immediately calls the listener with current state
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    signIn: authService.signIn.bind(authService),
    signOut: authService.signOut.bind(authService),
    signUp: authService.signUp.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    canAccessStore: authService.canAccessStore.bind(authService)
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
  }, [auth.loading, auth.user, auth.hasRole, requiredRole]);

  return auth;
}

export function useRequireStore(store: 'bannos' | 'flourlane') {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && auth.user && !auth.canAccessStore(store)) {
      console.log(`User cannot access store: ${store}`);
    }
  }, [auth.loading, auth.user, auth.canAccessStore, store]);

  return auth;
}

export type { AuthUser, AuthState };
