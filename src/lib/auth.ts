import { getSupabase } from './supabase';
import { clearSupabaseAuthStorage } from './supabase-storage';
import { queryClient } from './query-client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'Staff' | 'Supervisor' | 'Admin';
  store: 'bannos' | 'flourlane' | 'both';
  fullName: string;
  isActive: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

class AuthService {
  private supabase = getSupabase();
  private authState: AuthState = {
    user: null,
    session: null,
    loading: true
  };
  private listeners: ((state: AuthState) => void)[] = [];
  // Guard to prevent duplicate loadUserProfile calls for the same user (fixes #500)
  private loadedUserId: string | null = null;
  // Cache in-flight promises to deduplicate concurrent calls
  private loadingPromises: Map<string, Promise<void>> = new Map();
  // Store unsubscribe function for potential cleanup (e.g., testing scenarios)
  private unsubscribeAuth: (() => void) | null = null;
  // Track if an explicit sign-out occurred (to guard against stale profile loads)
  private isSignedOut = false;

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // CRITICAL FIX (#596): Set up auth listener BEFORE any async work.
      // In Chrome, getSession() can take longer due to storage access timing,
      // creating a race window where SIGNED_IN events are missed if user
      // signs in during initialization.
      //
      // IMPORTANT: Keep callback lightweight - don't await Supabase calls inside!
      // Async Supabase calls (RPC, queries) in this callback cause deadlocks
      // because supabase-js has an internal session lock (see gotrue-js#762).
      const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
        // SIGNED_OUT: Handle synchronously (no Supabase calls needed)
        if (event === 'SIGNED_OUT') {
          // Mark as signed out FIRST to guard against in-flight profile loads
          this.isSignedOut = true;
          // Clear React Query cache to prevent stale data bleeding between user sessions
          queryClient.clear();
          this.loadedUserId = null;
          this.updateAuthState({ user: null, session: null, loading: false });
          return;
        }

        // TOKEN_REFRESHED: Handle synchronously (just update session, no profile reload)
        if (event === 'TOKEN_REFRESHED') {
          if (session && this.authState.user) {
            // Update session without re-fetching profile from DB
            // Keep loadedUserId as-is (user.id doesn't change on refresh)
            this.updateAuthState({ session, loading: false });
          }
          return;
        }

        // INITIAL_SESSION, SIGNED_IN, or any event with valid session:
        // DEFER profile loading to avoid blocking the callback and causing deadlocks
        if (session?.user) {
          // Clear signed-out flag since we're starting a new session
          this.isSignedOut = false;
          // setTimeout(0) breaks out of the callback's execution context,
          // allowing Supabase's internal session lock to be released before
          // we make any RPC calls. This prevents the deadlock.
          setTimeout(() => {
            this.loadUserProfile(session.user, session);
          }, 0);
          return;
        }

        // INITIAL_SESSION with no session: Try recovery for Chrome storage timing issues
        if (event === 'INITIAL_SESSION') {
          // Chrome's storage access can be slow. Attempt recovery before giving up.
          setTimeout(() => {
            this.recoverSession();
          }, 0);
          return;
        }
      });

      // Store unsubscribe function for potential cleanup
      this.unsubscribeAuth = () => subscription.unsubscribe();

      // NOTE: No separate getSession() call needed here.
      // The INITIAL_SESSION event fires immediately when the listener is set up,
      // providing the current session from storage. This approach:
      // 1. Prevents race conditions (listener catches all events from the start)
      // 2. Avoids redundant storage reads (INITIAL_SESSION already has the session)
      // 3. Centralizes all session handling in one place

    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  /**
   * Attempt to recover session from storage.
   * Called when INITIAL_SESSION fires without session data.
   * Chrome's storage access can be slow, so this provides a fallback.
   */
  private async recoverSession(): Promise<void> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Session recovery failed:', error);
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }

      if (session?.user) {
        // Found a session - load the profile
        this.isSignedOut = false;
        await this.loadUserProfile(session.user, session);
      } else {
        // No session found - user is genuinely not logged in
        this.updateAuthState({ user: null, session: null, loading: false });
      }
    } catch (error) {
      console.error('Session recovery error:', error);
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  private async loadUserProfile(user: User, session: Session): Promise<void> {
    const userId = user.id;

    // Guard: Skip if already loaded for this user
    if (this.loadedUserId === userId) {
      return;
    }

    // Check for in-flight promise to deduplicate concurrent calls
    const existingPromise = this.loadingPromises.get(userId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create and cache the loading promise
    const loadPromise = this.executeLoadUserProfile(user, session, userId);
    this.loadingPromises.set(userId, loadPromise);

    try {
      await loadPromise;
    } finally {
      // Always clean up the promise cache
      this.loadingPromises.delete(userId);
    }
  }

  private async executeLoadUserProfile(user: User, session: Session, userId: string): Promise<void> {
    try {
      // Check if user.id exists
      if (!userId) {
        console.error('User ID is null or undefined');
        this.loadedUserId = null;
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }

      // Get user profile from staff_shared table using get_staff_member
      const { data, error } = await this.supabase.rpc('get_staff_member', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error loading user profile:', error);
        this.loadedUserId = null;
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }

      if (data && data.length > 0) {
        // Guard against stale profile load:
        // 1. If user signed out while this was in-flight
        // 2. If a different user logged in (fast user-switch scenario)
        if (this.isSignedOut) {
          console.warn('Profile load completed but user signed out. Discarding stale data.');
          return;
        }

        // Check if the current session belongs to the same user we loaded profile for
        // This prevents cross-user data leakage in fast user-switch scenarios
        const currentSessionUserId = this.authState.session?.user?.id;
        if (currentSessionUserId && currentSessionUserId !== userId) {
          console.warn(`Profile load for user ${userId} completed but current session is for ${currentSessionUserId}. Discarding stale data.`);
          return;
        }

        const profile = data[0];
        const authUser: AuthUser = {
          id: profile.user_id,
          email: user.email || '',
          role: profile.role as 'Staff' | 'Supervisor' | 'Admin',
          store: profile.store as 'bannos' | 'flourlane' | 'both',
          fullName: profile.full_name,
          isActive: profile.is_active
        };

        this.loadedUserId = userId; // Mark as loaded on success
        this.updateAuthState({ user: authUser, session: session, loading: false });
      } else {
        console.error('User profile not found in staff_shared table for user:', userId);
        this.loadedUserId = null;
        this.updateAuthState({ user: null, session: null, loading: false });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.loadedUserId = null;
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  private updateAuthState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState };
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Public methods
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }

      // Clear React Query cache to prevent stale data bleeding between user sessions
      queryClient.clear();

      // Clear any persisted auth storage regardless of current config, since
      // a previous session may have been stored before persistence was
      // disabled.
      if (typeof window !== 'undefined') {
        clearSupabaseAuthStorage();

        // Clear URL params to prevent stale routing on next login
        // (e.g., supervisor logging in with leftover ?page= from previous session)
        if (window.location.search) {
          window.history.replaceState({}, '', '/');
        }
      }

      // Update auth state - React will handle re-rendering
      this.loadedUserId = null; // Reset guard for next login
      this.updateAuthState({ user: null, session: null, loading: false });

    } catch (error) {
      console.error('Sign out error:', error);
      this.loadedUserId = null;
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  async signUp(email: string, password: string, fullName: string, role: string, store: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First create the auth user
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Then create the staff profile
        const { error: profileError } = await this.supabase.rpc('upsert_staff_member', {
          p_user_id: data.user.id,
          p_full_name: fullName,
          p_role: role,
          p_store: store,
          p_phone: null,
          p_email: email,
          p_is_active: true
        });

        if (profileError) {
          console.error('Error creating staff profile:', profileError);
          return { success: false, error: 'Account created but profile setup failed' };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.authState.user;
  }

  getCurrentSession(): Session | null {
    return this.authState.session;
  }

  isLoading(): boolean {
    return this.authState.loading;
  }

  hasRole(requiredRole: 'Staff' | 'Supervisor' | 'Admin'): boolean {
    if (!this.authState.user) return false;

    const roleHierarchy = {
      'Staff': 1,
      'Supervisor': 2,
      'Admin': 3
    };

    return roleHierarchy[this.authState.user.role] >= roleHierarchy[requiredRole];
  }

  canAccessStore(store: 'bannos' | 'flourlane'): boolean {
    if (!this.authState.user) return false;
    return this.authState.user.store === 'both' || this.authState.user.store === store;
  }

  /**
   * Cleanup method for testing scenarios or architecture changes.
   * Unsubscribes from auth state changes and clears pending operations.
   */
  destroy(): void {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
    this.listeners = [];
    this.loadingPromises.clear();
    this.isSignedOut = false;
  }

  subscribe(listener: (state: AuthState) => void, options?: { skipInitial?: boolean }): () => void {
    this.listeners.push(listener);
    // Optionally skip immediate fire to prevent duplicate state updates during mount (fixes #501)
    if (!options?.skipInitial) {
      listener(this.authState);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Create singleton instance
export const authService = new AuthService();
export default authService;
