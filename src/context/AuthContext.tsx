'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../lib/authService';
import { dataService, seedMockData } from '../lib/dataService';
import { UserProfile, Workspace } from '../types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sundra_active_workspace_id', workspace.id);
    }
  };

  // Fetch workspaces and set active workspace
  const refreshWorkspaces = async (targetUser: UserProfile = user!) => {
    if (!targetUser) return;
    try {
      let list = await dataService.getWorkspaces(targetUser.id);
      
      // If user has no workspaces (e.g. newly registered via Supabase), auto-create one
      if (list.length === 0) {
        const defaultName = `${targetUser.full_name.split(' ')[0]}'s Workspace`;
        const { data: newWs } = await dataService.createWorkspace(defaultName, targetUser.id);
        if (newWs) {
          list = [newWs];
        }
      }
      
      setWorkspaces(list);

      // Determine active workspace
      let active = null;
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('sundra_active_workspace_id');
        if (storedId) {
          active = list.find((w) => w.id === storedId) || null;
        }
      }
      
      if (!active && list.length > 0) {
        active = list[0];
      }
      
      if (active) {
        setActiveWorkspace(active);
      } else {
        setActiveWorkspaceState(null);
      }
    } catch (err) {
      console.error('Error loading workspaces:', err);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const { user: profile, error } = await authService.getCurrentUser();
      if (profile) {
        setUser(profile);
        
        // Seed mock database if in Local-First Mode
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          seedMockData(profile.id, profile.email, profile.full_name);
        }
        
        await refreshWorkspaces(profile);
      } else {
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sundra_active_workspace_id');
      }
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hook into initial session load
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle route protection
  useEffect(() => {
    if (loading) return;

    const publicPages = ['/login', '/register', '/forgot-password'];
    const isPublicPage = publicPages.includes(pathname);

    if (!user && !isPublicPage) {
      // Redirect to login if unauthenticated on dashboard
      router.push('/login');
    } else if (user && isPublicPage) {
      // Redirect to dashboard if logged in on login/register pages
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        refreshWorkspaces,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
