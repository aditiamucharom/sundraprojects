'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataService } from '@/lib/dataService';
import { Sun, Moon, Sparkles, User, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, activeWorkspace, refreshUser, refreshWorkspaces } = useAuth();
  const router = useRouter();

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Workspace fields state
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSuccess, setWorkspaceSuccess] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [completionSound, setCompletionSound] = useState(true);

  // Load current theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sundra_theme') as 'light' | 'dark' | null;
      setTheme(savedTheme || 'light');
      const savedSound = localStorage.getItem('sundra_completion_sound') !== 'false';
      setCompletionSound(savedSound);
    }
  }, []);

  // Sync state with active user and workspace
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setAvatarUrl(user.avatar_url || '');
    }
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
  }, [user, activeWorkspace]);

  const isWorkspaceOwner = activeWorkspace && user && activeWorkspace.owner_id === user.id;

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const { error } = await dataService.updateUserProfile(user.id, {
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null
      });

      if (error) {
        setProfileError(error.message || 'Failed to update profile.');
      } else {
        setProfileSuccess(true);
        await refreshUser();
      }
    } catch (err: any) {
      setProfileError(err.message || 'An unexpected error occurred.');
    }
  };

  // Handle Workspace Rename
  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !user) return;
    setWorkspaceError(null);
    setWorkspaceSuccess(false);

    try {
      const { error } = await dataService.updateWorkspace(activeWorkspace.id, {
        name: workspaceName.trim()
      });

      if (error) {
        setWorkspaceError(error.message || 'Failed to update workspace.');
      } else {
        setWorkspaceSuccess(true);
        await refreshWorkspaces();
      }
    } catch (err: any) {
      setWorkspaceError(err.message || 'An unexpected error occurred.');
    }
  };

  // Handle Workspace Delete
  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace || !user) return;
    const msg = `WARNING: Are you sure you want to delete the workspace "${activeWorkspace.name}"?\nThis will permanently delete all projects and tasks in this workspace. This action cannot be undone!`;
    if (confirm(msg)) {
      try {
        await dataService.deleteWorkspace(activeWorkspace.id);
        alert('Workspace deleted successfully.');
        // Refresh workspaces and user, router pushes back to today or triggers re-creation
        await refreshWorkspaces();
        router.push('/dashboard/today');
      } catch (err) {
        console.error(err);
        alert('Failed to delete workspace.');
      }
    }
  };

  // Switch Theme helper
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('sundra_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    setCompletionSound(enabled);
    localStorage.setItem('sundra_completion_sound', enabled ? 'true' : 'false');
  };

  if (!user || !activeWorkspace) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-text-secondary mt-1">Configure your personal preferences and workspace metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Profile Settings Card */}
        <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-custom">
            <User className="h-5 w-5 text-apple-blue" />
            <h3 className="font-bold text-foreground">My Profile</h3>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-apple-green/10 border border-apple-green/20 rounded-xl text-xs font-semibold text-apple-green text-center">
              Profile updated successfully!
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-apple-red/10 border border-apple-red/20 rounded-xl text-xs font-semibold text-apple-red text-center">
              {profileError}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Avatar Image URL</label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-apple-blue hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-custom-sm active:scale-98 transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </form>
        </div>

        {/* Workspace Management Card */}
        <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-custom">
            <SettingsIcon className="h-5 w-5 text-apple-blue" />
            <h3 className="font-bold text-foreground">Workspace Configuration</h3>
          </div>

          {workspaceSuccess && (
            <div className="p-3 bg-apple-green/10 border border-apple-green/20 rounded-xl text-xs font-semibold text-apple-green text-center">
              Workspace settings saved!
            </div>
          )}

          {workspaceError && (
            <div className="p-3 bg-apple-red/10 border border-apple-red/20 rounded-xl text-xs font-semibold text-apple-red text-center">
              {workspaceError}
            </div>
          )}

          {isWorkspaceOwner ? (
            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-apple-blue hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-custom-sm active:scale-98 transition-all cursor-pointer"
              >
                Rename Workspace
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Workspace Name</label>
                <input
                  type="text"
                  disabled
                  value={workspaceName}
                  className="w-full rounded-xl border border-border-custom bg-background/50 px-4 py-3 text-text-secondary shadow-sm text-sm cursor-not-allowed"
                />
              </div>
              <div className="p-3.5 bg-background border border-border-custom rounded-xl flex items-center space-x-2.5 text-xs text-text-secondary">
                <AlertTriangle className="h-4.5 w-4.5 text-apple-orange flex-shrink-0" />
                <span>Only the workspace owner can rename or delete this workspace.</span>
              </div>
            </div>
          )}

          {/* Delete workspace area */}
          {isWorkspaceOwner && (
            <div className="pt-4 border-t border-border-custom space-y-3">
              <div className="flex items-center space-x-2 text-apple-red">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Danger Zone</span>
              </div>
              <p className="text-xs text-text-secondary">Permanently delete this workspace and all associated list cards. This is irreversible.</p>
              <button
                onClick={handleDeleteWorkspace}
                className="w-full py-3 border border-apple-red hover:bg-apple-red/10 text-apple-red font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                Delete Workspace
              </button>
            </div>
          )}
        </div>

        {/* Display Settings Card */}
        <div className="col-span-1 md:col-span-2 bg-card border border-border-custom rounded-2xl shadow-custom-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-custom">
            <Sparkles className="h-5 w-5 text-apple-blue" />
            <h3 className="font-bold text-foreground">Display & Styling</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Aesthetic Theme Mode</p>
              <p className="text-xs text-text-secondary mt-0.5">Toggle between light or dark workspace interface.</p>
            </div>

            <div className="inline-flex rounded-xl bg-background border border-border-custom p-0.5 shadow-custom-sm">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  theme === 'light' ? 'bg-card text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                <Sun className="h-3.5 w-3.5 mr-1.5" /> Light Mode
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  theme === 'dark' ? 'bg-card text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                <Moon className="h-3.5 w-3.5 mr-1.5" /> Dark Mode
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-t border-border-custom/50 pt-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Completion Sound Effects</p>
              <p className="text-xs text-text-secondary mt-0.5">Play a signature Apple Reminders chime when checking off tasks.</p>
            </div>

            <div className="inline-flex rounded-xl bg-background border border-border-custom p-0.5 shadow-custom-sm">
              <button
                type="button"
                onClick={() => handleSoundToggle(true)}
                className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  completionSound ? 'bg-card text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                On
              </button>
              <button
                type="button"
                onClick={() => handleSoundToggle(false)}
                className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !completionSound ? 'bg-card text-foreground shadow-custom-sm font-bold' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                Off
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
