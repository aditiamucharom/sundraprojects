import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile, UserRole } from '../types';
import { createClient } from '@supabase/supabase-js';

const MOCK_PROFILES_KEY = 'sundra_profiles';
const MOCK_SESSION_KEY = 'sundra_session';

// Helper to generate UUIDs locally
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get mock profiles from LocalStorage
function getLocalProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MOCK_PROFILES_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save mock profiles to LocalStorage
function saveLocalProfiles(profiles: UserProfile[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(profiles));
}

export const authService = {
  async signUp(email: string, password: string, fullName: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { data, error };
    } else {
      // Mock SignUp
      const profiles = getLocalProfiles();
      const exists = profiles.some((p) => p.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return { data: null, error: { message: 'Email already exists.' } };
      }

      // First user becomes Super Admin
      const role: UserRole = profiles.length === 0 ? 'Super Admin' : 'Member';
      const userId = generateUUID();
      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        id: userId,
        full_name: fullName,
        email: email,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        role: role,
        created_at: now,
        updated_at: now,
      };

      profiles.push(newProfile);
      saveLocalProfiles(profiles);

      // Save session
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(newProfile));
      return { data: { user: newProfile }, error: null };
    }
  },

  async adminCreateUser(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'Member'
  ): Promise<{ data: UserProfile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        // Create a temporary client that does not persist session
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });

        // 1. Sign up the user
        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (signUpError || !signUpData.user) {
          return { data: null, error: signUpError };
        }

        const newUser = signUpData.user;

        // 2. Wait briefly for the trigger to insert the users_profile row
        // and update the user role if it's different from the default (Member)
        if (role !== 'Member') {
          let profileUpdated = false;
          for (let i = 0; i < 5; i++) {
            const { data: profile } = await supabase
              .from('users_profile')
              .select('*')
              .eq('id', newUser.id)
              .single();

            if (profile) {
              const { error: updateErr } = await supabase
                .from('users_profile')
                .update({ role, updated_at: new Date().toISOString() })
                .eq('id', newUser.id);
              
              if (!updateErr) {
                profileUpdated = true;
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // 3. Fetch final profile
        const { data: finalProfile, error: profileError } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', newUser.id)
          .single();

        if (profileError) {
          return { data: null, error: profileError };
        }

        return { data: finalProfile as UserProfile, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    } else {
      // Mock adminCreateUser
      const profiles = getLocalProfiles();
      const exists = profiles.some((p) => p.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return { data: null, error: { message: 'Email already exists.' } };
      }

      const userId = generateUUID();
      const now = new Date().toISOString();
      const newProfile: UserProfile = {
        id: userId,
        full_name: fullName,
        email: email,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        role: role,
        created_at: now,
        updated_at: now,
      };

      profiles.push(newProfile);
      saveLocalProfiles(profiles);
      return { data: newProfile, error: null };
    }
  },

  async signIn(email: string, password: string): Promise<{ data: any; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } else {
      // Mock SignIn
      const profiles = getLocalProfiles();
      const profile = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!profile) {
        return { data: null, error: { message: 'Invalid login credentials. User not found.' } };
      }

      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(profile));
      return { data: { user: profile }, error: null };
    }
  },

  async signOut(): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      return { error };
    } else {
      localStorage.removeItem(MOCK_SESSION_KEY);
      return { error: null };
    }
  },

  async getCurrentUser(): Promise<{ user: UserProfile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { user: null, error: authError };

        // Fetch user profile details
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) return { user: null, error: profileError };
        return { user: profile as UserProfile, error: null };
      } catch (err) {
        return { user: null, error: err };
      }
    } else {
      // Mock GetUser
      if (typeof window === 'undefined') return { user: null, error: null };
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (!session) return { user: null, error: null };
      const parsedSession = JSON.parse(session);
      
      // Refresh user profile details from list
      const profiles = getLocalProfiles();
      const currentProfile = profiles.find((p) => p.id === parsedSession.id);
      return { user: currentProfile || parsedSession, error: null };
    }
  },

  async resetPassword(email: string): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      return { error };
    } else {
      const profiles = getLocalProfiles();
      const exists = profiles.some((p) => p.email.toLowerCase() === email.toLowerCase());
      if (!exists) {
        return { error: { message: 'No account registered with this email address.' } };
      }
      console.log(`[Mock Reset Password] Email request simulated for ${email}`);
      return { error: null };
    }
  },

  async updateProfile(userId: string, fullName: string, avatarUrl: string | null): Promise<{ data: UserProfile | null; error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users_profile')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();
      return { data: data as UserProfile | null, error };
    } else {
      const profiles = getLocalProfiles();
      const index = profiles.findIndex((p) => p.id === userId);
      if (index === -1) {
        return { data: null, error: { message: 'Profile not found.' } };
      }

      const updated = {
        ...profiles[index],
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      profiles[index] = updated;
      saveLocalProfiles(profiles);

      // Sync active session if it's the current user
      const session = localStorage.getItem(MOCK_SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.id === userId) {
          localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(updated));
        }
      }
      return { data: updated, error: null };
    }
  },

  // Developer utility to list all mock profiles in Local-First Mode
  async getAllProfiles(): Promise<UserProfile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('users_profile').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error(error);
        return [];
      }
      return data || [];
    } else {
      return getLocalProfiles();
    }
  },

  // Super Admin utility to update users roles
  async updateUserRole(userId: string, role: UserRole): Promise<{ error: any }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('users_profile')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);
      return { error };
    } else {
      const profiles = getLocalProfiles();
      const index = profiles.findIndex((p) => p.id === userId);
      if (index === -1) return { error: { message: 'User not found' } };
      
      profiles[index].role = role;
      profiles[index].updated_at = new Date().toISOString();
      saveLocalProfiles(profiles);
      return { error: null };
    }
  }
};
