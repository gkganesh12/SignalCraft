'use client';

import { useEffect, useState } from 'react';
import { Users, Mail, Shield, Trash2, UserPlus, RefreshCw } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  displayName: string | null;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (res.ok) {
        setInviteEmail('');
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch('/api/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMembers(members.filter((m) => m.id !== userId));
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-900/20 text-red-400 border-red-700/30';
      case 'MEMBER':
        return 'bg-blue-900/20 text-blue-400 border-blue-700/30';
      case 'VIEWER':
        return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
      default:
        return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/30';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Members</h1>
          <p className="text-zinc-400 mt-1">Manage your workspace team</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Members</h1>
          <p className="text-zinc-400 mt-1">Manage your workspace team and permissions</p>
        </div>
        <button
          onClick={fetchMembers}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Invite Member */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-red-400" />
          Invite Team Member
        </h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500">No team members yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Member
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Joined
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-900/20 rounded-full flex items-center justify-center">
                        <span className="text-red-400 font-medium">
                          {member.displayName
                            ? member.displayName.charAt(0).toUpperCase()
                            : member.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {member.displayName || member.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-zinc-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${getRoleBadgeColor(
                        member.role
                      )} bg-black/50`}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">
                    {new Date(member.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Role Permissions
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRoleBadgeColor('ADMIN')}`}>
              Admin
            </div>
            <p className="text-sm text-zinc-400 flex-1">
              Full access to workspace settings, team management, and all features
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRoleBadgeColor('MEMBER')}`}>
              Member
            </div>
            <p className="text-sm text-zinc-400 flex-1">
              Can view and manage alerts, create routing rules, and configure integrations
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRoleBadgeColor('VIEWER')}`}>
              Viewer
            </div>
            <p className="text-sm text-zinc-400 flex-1">
              Read-only access to alerts and analytics, cannot make changes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
