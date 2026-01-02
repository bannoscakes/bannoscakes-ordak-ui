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
  private isRecoveringSession = false;
  // Guard to prevent duplicate loadUserProfile calls for the same user (fixes #500)
  private loadedUserId: string | null = null;
  // Cache in-flight promises to deduplicate concurrent calls
  private loadingPromises: Map<string, Promise<void>> = new Map();

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Get initial session
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }

      if (session?.user) {
        await this.loadUserProfile(session.user, session);
      } else {
        this.updateAuthState({ user: null, session: null, loading: false });
      }

      // Listen for auth changes with explicit event handling
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: Only logout on explicit SIGNED_OUT event
        if (event === 'SIGNED_OUT') {
          // Clear React Query cache to prevent stale data bleeding between user sessions
          // This handles sign-outs from other tabs or session invalidations
          queryClient.clear();
          this.updateAuthState({ user: null, session: null, loading: false });
          return;
        }

        // Handle token refresh - just update session, don't re-fetch profile
        if (event === 'TOKEN_REFRESHED') {
          if (session && this.authState.user) {
            // Update session without re-fetching profile from DB
            // Keep loadedUserId as-is (user.id doesn't change on refresh)
            this.updateAuthState({ session, loading: false });
          }
          return;
        }

        // Handle initial session with no data - try to recover
        if (event === 'INITIAL_SESSION' && !session) {
          console.warn('INITIAL_SESSION with no session data - attempting recovery');
          const recovered = await this.recoverSession();
          if (!recovered) {
            this.updateAuthState({ user: null, session: null, loading: false });
          }
          return;
        }

        // Handle signed in event
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserProfile(session.user, session);
          return;
        }

        // For any other case with valid session, load profile
        if (session?.user) {
          await this.loadUserProfile(session.user, session);
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  /**
   * Attempt to recover session from storage
   * Prevents random logouts due to transient session loss
   */
  private async recoverSession(): Promise<boolean> {
    if (this.isRecoveringSession) {
      return false;
    }

    this.isRecoveringSession = true;

    try {
      // Try to get session again
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Session recovery failed:', error);
        return false;
      }

      if (session?.user) {
        await this.loadUserProfile(session.user, session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session recovery error:', error);
      return false;
    } finally {
      this.isRecoveringSession = false;
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
