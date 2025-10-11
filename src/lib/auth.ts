import { getSupabase } from './supabase';
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

      // Listen for auth changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          await this.loadUserProfile(session.user, session);
        } else {
          this.updateAuthState({ user: null, session: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  private async loadUserProfile(user: User, session: Session) {
    try {
      console.log('Loading user profile for:', user.email, 'User ID:', user.id);
      
      // Check if user.id exists
      if (!user.id) {
        console.error('User ID is null or undefined');
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }
      
      // Get user profile from staff_shared table using get_staff_member
      const { data, error } = await this.supabase.rpc('get_staff_member', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error loading user profile:', error);
        this.updateAuthState({ user: null, session: null, loading: false });
        return;
      }

      console.log('User profile data:', data);

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

        console.log('Created auth user:', authUser);
        this.updateAuthState({ user: authUser, session: session, loading: false });
      } else {
        console.error('User profile not found in staff_shared table for user:', user.id);
        this.updateAuthState({ user: null, session: null, loading: false });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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
      const { data, error } = await this.supabase.auth.signInWithPassword({
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
      console.log('=== SIGNOUT DEBUG START ===');
      console.log('Current auth state before signout:', this.authState);
      console.log('Supabase session before signout:', await this.supabase.auth.getSession());
      
      console.log('Calling supabase.auth.signOut()...');
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      
      console.log('Supabase signOut successful');
      console.log('Supabase session after signout:', await this.supabase.auth.getSession());
      
      // Force update auth state
      console.log('Updating auth state to null...');
      this.updateAuthState({ user: null, session: null, loading: false });
      console.log('Auth state after update:', this.authState);
      
      // Clear any local storage
      console.log('Clearing localStorage...');
      localStorage.removeItem('sb-iwavciibrspfjezujydc-auth-token');
      sessionStorage.clear();
      
      console.log('=== SIGNOUT DEBUG END ===');
      
      // Reload page to ensure clean state
      console.log('Reloading page in 500ms...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Sign out error:', error);
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

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Create singleton instance
export const authService = new AuthService();
export default authService;
