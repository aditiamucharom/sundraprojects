'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dataService } from '@/lib/dataService';
import { UserProfile, WorkspaceMember } from '@/types';
import { Users, Plus, Trash, UserCheck, Shield, Award, Mail } from 'lucide-react';

interface HydratedMember extends UserProfile {
  workspaceMemberId: string;
  workspaceRole: 'Owner' | 'Admin' | 'Member';
}

export default function TeamsPage() {
  const { user, activeWorkspace } = useAuth();
  
  const [members, setMembers] = useState<HydratedMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin/Manager' | 'Member'>('Member');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load team members
  const loadMembers = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const rawMembers = await dataService.getWorkspaceMembers(activeWorkspace.id);
      
      const hydrated: HydratedMember[] = rawMembers.map((m) => {
        const u = m.user || {
          id: m.user_id,
          full_name: 'Collaborator',
          email: 'invited@sundra.com',
          avatar_url: null,
          role: 'Member' as const,
          created_at: m.created_at,
          updated_at: m.created_at
        };
        return {
          ...u,
          workspaceMemberId: m.id,
          workspaceRole: m.role === 'Admin/Manager' ? 'Admin' : m.role as any
        };
      });

      // Sort by role precedence (Owner > Admin > Member)
      hydrated.sort((a, b) => {
        const order = { Owner: 1, Admin: 2, Member: 3 };
        return order[a.workspaceRole] - order[b.workspaceRole];
      });

      setMembers(hydrated);
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // Determine current user's role in the workspace
  const currentUserMembership = members.find((m) => m.id === user?.id);
  const currentUserRole = currentUserMembership?.workspaceRole || 'Member';
  const canManage = currentUserRole === 'Owner' || currentUserRole === 'Admin' || user?.role === 'Super Admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace || !user) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Check if user already in workspace
      const alreadyMember = members.find((m) => m.email.toLowerCase() === inviteEmail.trim().toLowerCase());
      if (alreadyMember) {
        setError('User is already a member of this workspace.');
        setSubmitting(false);
        return;
      }

      // 2. Perform mock/real lookup
      const { data: targetUser, error: findError } = await dataService.findUserByEmail(inviteEmail.trim());
      
      if (findError || !targetUser) {
        // Fallback for demonstration in local mode: auto-create user profile
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const mockName = inviteEmail.split('@')[0].replace('.', ' ');
          const formattedName = mockName.charAt(0).toUpperCase() + mockName.slice(1);
          
          // Seed the user first
          const { data: newUser } = await dataService.createUserProfile(
            `usr_${Math.random().toString(36).substr(2, 9)}`,
            inviteEmail.trim(),
            formattedName,
            'Member'
          );

          if (newUser) {
            const { error: inviteErr } = await dataService.addWorkspaceMember(activeWorkspace.id, newUser.id, inviteRole);
            if (inviteErr) {
              setError(inviteErr.message || 'Failed to add member.');
            } else {
              setSuccess(`Simulated: ${formattedName} has been added as ${inviteRole}.`);
              await loadMembers();
            }
          }
        } else {
          setError('User with this email was not found. They must register first.');
        }
      } else {
        // Real user found, add them
        const { error: inviteErr } = await dataService.addWorkspaceMember(activeWorkspace.id, targetUser.id, inviteRole);
        if (inviteErr) {
          setError(inviteErr.message || 'Failed to add member.');
        } else {
          setSuccess(`${targetUser.full_name} has been added to the workspace.`);
          await loadMembers();
        }
      }
      
      setInviteEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, membershipId: string, newRole: 'Admin' | 'Member') => {
    if (!canManage) return;
    try {
      const dbRole = newRole === 'Admin' ? 'Admin/Manager' : 'Member';
      await dataService.updateWorkspaceMemberRole(membershipId, dbRole);
      setSuccess('Member role updated successfully.');
      await loadMembers();
    } catch (err) {
      console.error(err);
      setError('Failed to update member role.');
    }
  };

  const handleRemoveMember = async (workspaceId: string, userId: string, memberName: string) => {
    if (!canManage) return;
    if (confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      try {
        await dataService.removeWorkspaceMember(workspaceId, userId);
        setSuccess(`${memberName} removed from workspace.`);
        await loadMembers();
      } catch (err) {
        console.error(err);
        setError('Failed to remove member.');
      }
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'Owner') return <Award className="h-4 w-4 text-apple-orange mr-1.5" />;
    if (role === 'Admin') return <Shield className="h-4 w-4 text-apple-blue mr-1.5" />;
    return <UserCheck className="h-4 w-4 text-apple-green mr-1.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Teams & Members</h2>
        <p className="text-sm text-text-secondary mt-1">Manage collaborators and permissions within this workspace.</p>
      </div>

      {success && (
        <div className="p-3 bg-apple-green/10 border border-apple-green/20 rounded-xl text-xs font-semibold text-apple-green text-center">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-apple-red/10 border border-apple-red/20 rounded-xl text-xs font-semibold text-apple-red text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Members List Table Card */}
        <div className="lg:col-span-2 bg-card border border-border-custom rounded-2xl shadow-custom-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-custom bg-sidebar/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Workspace Members</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-secondary">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-apple-blue"></div>
            </div>
          ) : (
            <div className="divide-y divide-border-custom">
              {members.map((m) => (
                <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center min-w-0">
                    <img
                      src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.full_name}`}
                      alt={m.full_name}
                      className="h-10 w-10 rounded-xl border border-border-custom"
                    />
                    <div className="ml-3.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                      <p className="text-xs text-text-secondary truncate">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    {/* Role Display/Edit */}
                    <div className="flex items-center bg-background/50 border border-border-custom px-3 py-1.5 rounded-xl text-xs">
                      {getRoleIcon(m.workspaceRole)}
                      {m.workspaceRole === 'Owner' || !canManage || m.id === user?.id ? (
                        <span className="font-semibold text-foreground">{m.workspaceRole}</span>
                      ) : (
                        <select
                          value={m.workspaceRole}
                          onChange={(e) => handleRoleChange(m.id, m.workspaceMemberId, e.target.value as any)}
                          className="bg-transparent border-0 font-semibold text-foreground focus:ring-0 p-0 text-xs cursor-pointer focus:outline-none"
                        >
                          <option value="Member">Member</option>
                          <option value="Admin">Admin</option>
                        </select>
                      )}
                    </div>

                    {/* Delete button */}
                    {canManage && m.workspaceRole !== 'Owner' && m.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(activeWorkspace!.id, m.id, m.full_name)}
                        className="p-2 bg-background border border-border-custom hover:bg-apple-red/10 text-text-secondary hover:text-apple-red rounded-xl transition-all cursor-pointer"
                        title="Remove member"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite/Add Member Panel Card */}
        {canManage && (
          <div className="bg-card border border-border-custom rounded-2xl shadow-custom-sm p-6 space-y-4">
            <div>
              <h3 className="font-bold text-foreground">Add Team Member</h3>
              <p className="text-xs text-text-secondary mt-0.5">Invite a member to collaborate on this workspace's projects.</p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-text-secondary" />
                  <input
                    type="email"
                    required
                    placeholder="collaborator@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-custom bg-background text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm transition-all"
                  />
                </div>
              </div>

               <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-xl border border-border-custom bg-background px-4 py-3 text-foreground shadow-sm focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none text-sm cursor-pointer"
                >
                  <option value="Member">Member (View & edit tasks)</option>
                  <option value="Admin/Manager">Admin/Manager (Add projects, invite members)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center py-3 bg-apple-blue hover:opacity-90 text-white font-semibold text-sm rounded-xl shadow-custom-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add Member
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
