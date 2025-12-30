import { useState, useEffect } from 'react';
import { authService, type AuthState, type AuthUser } from '../lib/auth';

export function useAuth() {
  // Initialize from authService directly to avoid stale initial state (fixes #501)
  const [authState, setAuthState] = useState<AuthState>(() => ({
    user: authService.getCurrentUser(),
    session: authService.getCurrentSession(),
    loading: authService.isLoading()
  }));

  useEffect(() => {
    // Subscribe to auth state changes, skip initial fire since we init from authService
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
    }, { skipInitial: true });

    // Re-sync state to catch any updates between initial render and subscription
    // This fixes the race condition where initializeAuth() completes before subscription
    setAuthState({
      user: authService.getCurrentUser(),
      session: authService.getCurrentSession(),
      loading: authService.isLoading()
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
        return;
      }

      if (requiredRole && !auth.hasRole(requiredRole)) {
        // Redirect to unauthorized page or show error
        return;
      }
    }
  }, [auth.loading, auth.user, requiredRole]);

  return auth;
}

export function useRequireStore(_store: 'bannos' | 'flourlane') {
  const auth = useAuth();
  return auth;
}

export type { AuthUser, AuthState };
