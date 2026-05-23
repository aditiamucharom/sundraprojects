'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataService } from '@/lib/dataService';
import { authService } from '@/lib/authService';
import { UserProfile, Workspace } from '@/types';
import { ShieldAlert, Users, Layers, FolderHeart, ShieldCheck, Trash, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
  const [stats, setStats] = useState({ users: 0, workspaces: 0, projects: 0, tasks: 0 });
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);

  // New User Creation States
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Super Admin' | 'Owner' | 'Admin/Manager' | 'Member'>('Member');
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Security check: Redirect if not a Super Admin
  useEffect(() => {
    if (user && user.role !== 'Super Admin') {
      router.replace('/dashboard/today');
    }
  }, [user, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch system-wide profiles
      const profiles = await dataService.getSystemUsers();
      setUsersList(profiles);

      // 2. Fetch system-wide workspaces
      const workspaces = await dataService.getSystemWorkspaces();
      setWorkspacesList(workspaces);

      // 3. Fetch system-wide counts
      const totalProjects = await dataService.getSystemProjectsCount();
      const totalTasks = await dataService.getSystemTasksCount();

      setStats({
        users: profiles.length,
        workspaces: workspaces.length,
        projects: totalProjects,
        tasks: totalTasks,
      });
    } catch (err) {
      console.error('Super Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Super Admin') {
      loadAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRoleChange = async (targetUserId: string, newRole: 'Super Admin' | 'Owner' | 'Admin/Manager' | 'Member') => {
    try {
      await dataService.updateUserProfile(targetUserId, { role: newRole });
      setSuccess('User role updated successfully.');
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetName: string) => {
    if (targetUserId === user?.id) {
      alert('You cannot delete your own account!');
      return;
    }
    if (confirm(`CRITICAL: Are you sure you want to permanently delete user "${targetName}"?\nThis will purge their profile from the system.`)) {
      try {
        await dataService.deleteUser(targetUserId);
        setSuccess(`User ${targetName} deleted.`);
        await loadAdminData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (confirm(`CRITICAL: Are you sure you want to permanently delete workspace "${workspaceName}"?\nAll internal projects and tasks will be erased.`)) {
      try {
        await dataService.deleteWorkspace(workspaceId);
        setSuccess(`Workspace "${workspaceName}" deleted.`);
        await loadAdminData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    // Simple validations
    if (!newFullName.trim()) {
      setFormError('Full Name is required.');
      setFormLoading(false);
      return;
    }
    if (!newEmail.trim()) {
      setFormError('Email is required.');
      setFormLoading(false);
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      setFormLoading(false);
      return;
    }

    try {
      const { data, error } = await authService.adminCreateUser(
        newEmail.trim(),
        newPassword,
        newFullName.trim(),
        newRole
      );

      if (error) {
        setFormError(error.message || 'Error creating user.');
      } else {
        setFormSuccess(`User "${newFullName}" created successfully.`);
        // Reset form
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('Member');
        // Refresh system directories
        await loadAdminData();
        // Clear success message after 5 seconds
        setTimeout(() => setFormSuccess(null), 5000);
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  if (!user || user.role !== 'Super Admin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3.5">
        <div className="h-10 w-10 bg-apple-purple/10 text-apple-purple flex items-center justify-center rounded-xl border border-apple-purple/20">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Super Admin Control</h2>
          <p className="text-sm text-text-secondary mt-1">Global platform metrics, users database, and tenant workspaces.</p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-apple-green/10 border border-apple-green/20 rounded-xl text-xs font-semibold text-apple-green text-center">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20 text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-apple-blue"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border-custom p-5 rounded-2xl shadow-custom-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Platform Users</p>
                <p className="text-2xl font-extrabold text-foreground mt-1.5">{stats.users}</p>
              </div>
              <Users className="h-8 w-8 text-apple-blue opacity-80" />
            </div>

            <div className="bg-card border border-border-custom p-5 rounded-2xl shadow-custom-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Total Workspaces</p>
                <p className="text-2xl font-extrabold text-foreground mt-1.5">{stats.workspaces}</p>
              </div>
              <Layers className="h-8 w-8 text-apple-orange opacity-80" />
            </div>

            <div className="bg-card border border-border-custom p-5 rounded-2xl shadow-custom-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Total Lists</p>
                <p className="text-2xl font-extrabold text-foreground mt-1.5">{stats.projects}</p>
              </div>
              <FolderHeart className="h-8 w-8 text-apple-pink opacity-80" />
            </div>

            <div className="bg-card border border-border-custom p-5 rounded-2xl shadow-custom-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Total Reminders</p>
                <p className="text-2xl font-extrabold text-foreground mt-1.5">{stats.tasks}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-apple-green opacity-80" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create New User Card */}
            <div className="lg:col-span-1 bg-card border border-border-custom rounded-2xl shadow-custom-sm overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-border-custom bg-sidebar/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-apple-blue" />
                  Create New User
                </h3>
              </div>
              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-apple-red/10 border border-apple-red/20 rounded-xl text-xs font-semibold text-apple-red">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-apple-green/10 border border-apple-green/20 rounded-xl text-xs font-semibold text-apple-green">
                    {formSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-background border border-border-custom text-sm px-3.5 py-2 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-apple-blue w-full placeholder:text-text-secondary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="bg-background border border-border-custom text-sm px-3.5 py-2 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-apple-blue w-full placeholder:text-text-secondary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="bg-background border border-border-custom text-sm pl-3.5 pr-10 py-2 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-apple-blue w-full placeholder:text-text-secondary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    System Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="bg-background border border-border-custom text-sm px-3.5 py-2 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-apple-blue w-full"
                  >
                    <option value="Member">Member</option>
                    <option value="Admin/Manager">Admin/Manager</option>
                    <option value="Owner">Owner</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-2.5 px-4 bg-apple-blue hover:bg-apple-blue/90 disabled:bg-apple-blue/50 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-apple-blue/10 hover:shadow-apple-blue/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Directories Grid */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Directory Card */}
              <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border-custom bg-sidebar/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Users Directory</h3>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border-custom">
                  {usersList.map((usr) => (
                    <div key={usr.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center min-w-0">
                        <img
                          src={usr.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${usr.full_name}`}
                          alt={usr.full_name}
                          className="h-9 w-9 rounded-xl border border-border-custom flex-shrink-0"
                        />
                        <div className="ml-3 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{usr.full_name}</p>
                          <p className="text-xs text-text-secondary truncate">{usr.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <select
                          value={usr.role}
                          onChange={(e) => handleRoleChange(usr.id, e.target.value as any)}
                          className="bg-background border border-border-custom text-xs font-semibold px-2.5 py-1.5 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-apple-blue"
                        >
                          <option value="Member">Member</option>
                          <option value="Admin/Manager">Admin/Manager</option>
                          <option value="Owner">Owner</option>
                          <option value="Super Admin">Super Admin</option>
                        </select>

                        <button
                          onClick={() => handleDeleteUser(usr.id, usr.full_name)}
                          className="p-2 hover:bg-apple-red/10 text-text-secondary hover:text-apple-red rounded-lg transition-all cursor-pointer"
                          title="Delete account"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspaces Administration Card */}
              <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border-custom bg-sidebar/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Workspaces Administration</h3>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border-custom">
                  {workspacesList.map((ws) => (
                    <div key={ws.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ws.name}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5 truncate">ID: {ws.id}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteWorkspace(ws.id, ws.name)}
                        className="p-2 hover:bg-apple-red/10 text-text-secondary hover:text-apple-red rounded-lg transition-all cursor-pointer"
                        title="Delete Workspace"
                      >
                        <Trash className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
