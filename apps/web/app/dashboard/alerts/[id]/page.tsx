'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/alerts/status-badge';
import { SeverityBadge } from '@/components/alerts/severity-badge';
import { AiSuggestionCard } from '@/components/alerts/ai-suggestion-card';
import { CorrelatedAlertsCard } from '@/components/alerts/correlated-alerts-card';
import { PostmortemModal } from '@/components/alerts/postmortem-modal';
import { BreadcrumbTimeline } from '@/components/alerts/breadcrumb-timeline';
import { SessionReplayPlayer } from '@/components/alerts/session-replay-player';
import { Pencil, Save, X, ArrowLeft } from 'lucide-react';

interface AlertDetail {
  id: string;
  title: string;
  severity: string;
  status: string;
  environment: string;
  project: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  runbookUrl: string | null;
  resolutionNotes: string | null;
  lastResolvedBy: string | null;
  avgResolutionMins: number | null;
  resolvedAt: string | null;
  userCount: number | null;
  velocityPerHour: number | null;
  assignee?: { id: string; displayName: string; email: string } | null;
  alertEvents: Array<{
    id: string;
    title: string;
    message: string;
    occurredAt: string;
  }>;
  notifications: Array<{
    id: string;
    target: string;
    targetRef: string;
    status: string;
    sentAt: string;
    errorMessage: string | null;
  }>;
  isAnomalous?: boolean;
}

interface User {
  id: string;
  displayName: string | null;
  email: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function AlertDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const { user } = useUser();
  const id = params.id as string;
  
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ assigneeUserId: string; runbookUrl: string }>({
    assigneeUserId: '',
    runbookUrl: '',
  });

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchAlert = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch alert');
      const data = await res.json();
      setAlert(data);
      if (!isEditing) {
        setEditForm({
          assigneeUserId: data.assignee?.id || '',
          runbookUrl: data.runbookUrl || '',
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  }, []);

  useEffect(() => {
    fetchAlert();
    fetchUsers();
    const interval = setInterval(fetchAlert, 15000);
    return () => clearInterval(interval);
  }, [fetchAlert, fetchUsers]);

  const handleAction = async (action: 'acknowledge' | 'snooze') => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/alert-groups/${id}/${action}`, { method: 'POST' });
      if (res.ok) fetchAlert();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setActionLoading(true);
      const resolverName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.emailAddresses?.[0]?.emailAddress || 'Unknown';
      
      const res = await fetch(`/api/alert-groups/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resolutionNotes: resolutionNotes || undefined,
          resolvedBy: resolverName,
        }),
      });
      if (res.ok) {
        setShowResolveModal(false);
        setResolutionNotes('');
        fetchAlert();
      }
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/alert-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigneeUserId: editForm.assigneeUserId || null,
          runbookUrl: editForm.runbookUrl || null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchAlert();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500">{error || 'Alert not found'}</p>
          <Link href="/dashboard/alerts">
            <Button className="mt-4 bg-red-600 hover:bg-red-700">Back to Alerts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-red-400 transition-colors">Dashboard</Link>
        <span>›</span>
        <Link href="/dashboard/alerts" className="hover:text-red-400 transition-colors">Alerts</Link>
        <span>›</span>
        <span className="text-white truncate max-w-xs">{alert.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{alert.title}</h1>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <p className="text-zinc-400">
              {alert.project} • {alert.environment}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <SessionReplayPlayer alertGroupId={alert.id} />
            {alert.status === 'RESOLVED' && (
              <PostmortemModal alertGroupId={alert.id} />
            )}
            {alert.status === 'OPEN' && (
              <Button
                onClick={() => handleAction('acknowledge')}
                disabled={actionLoading}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-0"
              >
                Acknowledge
              </Button>
            )}
            {(alert.status === 'OPEN' || alert.status === 'ACK') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction('snooze')}
                  disabled={actionLoading}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Snooze
                </Button>
                <Button
                  onClick={() => setShowResolveModal(true)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Resolve
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-white">Details</h3>
             {!isEditing ? (
               <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                 <Pencil className="w-4 h-4 mr-2" />
                 Edit
               </Button>
             ) : (
               <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={actionLoading} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
               </div>
             )}
          </div>
          
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-zinc-500">First Seen</dt>
              <dd className="font-medium text-white">{formatDate(alert.firstSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Last Seen</dt>
              <dd className="font-medium text-white">{formatDate(alert.lastSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Event Count</dt>
              <dd className="font-mono font-medium text-white">{alert.count}</dd>
            </div>
            
            <div className="flex justify-between items-center h-9">
              <dt className="text-zinc-500">Assignee</dt>
              <dd className="font-medium min-w-[200px] text-right text-white">
                {isEditing ? (
                  <select
                    className="w-full px-2 py-1 border border-white/10 rounded text-sm bg-black/20 text-white focus:ring-red-500/50 focus:border-red-500/50"
                    value={editForm.assigneeUserId}
                    onChange={(e) => setEditForm({ ...editForm, assigneeUserId: e.target.value })}
                  >
                    <option value="" className="bg-zinc-900">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-zinc-900">{u.displayName || u.email}</option>
                    ))}
                  </select>
                ) : (
                  alert.assignee?.displayName || <span className="text-zinc-500">Unassigned</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-zinc-500">Runbook</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {isEditing ? (
                   <Input 
                      className="h-8 text-sm bg-black/20 border-white/10 text-white"
                      placeholder="https://..."
                      value={editForm.runbookUrl}
                      onChange={(e) => setEditForm({...editForm, runbookUrl: e.target.value})}
                   />
                ) : (
                  alert.runbookUrl ? (
                    <a
                      href={alert.runbookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 hover:underline"
                    >
                      View Runbook
                    </a>
                  ) : (
                    <span className="text-zinc-600 text-sm">None</span>
                  )
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notifications */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Notification History</h3>
          {alert.notifications.length === 0 ? (
            <p className="text-zinc-600 text-sm">No notifications sent</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alert.notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm p-2 bg-zinc-800/50 rounded border border-white/5">
                  <span className="text-zinc-300">{n.targetRef}</span>
                  <span className={n.status === 'SENT' ? 'text-emerald-400' : 'text-red-400'}>
                    {n.status}
                  </span>
                  <span className="text-zinc-500">{formatRelativeTime(n.sentAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion */}
      <AiSuggestionCard alertId={alert.id} />

      {/* Breadcrumb Timeline */}
      <BreadcrumbTimeline alertGroupId={alert.id} />

      {/* Correlated Alerts */}
      <CorrelatedAlertsCard alertId={alert.id} />

      {/* Resolution Memory & Impact Estimation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resolution History */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🔄</span> Resolution History
          </h3>
          {alert.resolutionNotes ? (
            <div className="space-y-4">
              <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-4">
                <p className="text-sm text-zinc-300 italic">&quot;{alert.resolutionNotes}&quot;</p>
                {alert.lastResolvedBy && (
                  <p className="text-xs text-zinc-500 mt-2">
                    — Last resolved by {alert.lastResolvedBy}
                    {alert.resolvedAt && ` on ${formatDate(alert.resolvedAt)}`}
                  </p>
                )}
              </div>
              {alert.avgResolutionMins && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Avg resolution time:</span>
                  <span className="font-mono font-medium text-white">
                    {alert.avgResolutionMins < 60 
                      ? `${alert.avgResolutionMins} min` 
                      : `${Math.round(alert.avgResolutionMins / 60 * 10) / 10} hr`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-zinc-500 text-sm">No resolution history yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Add resolution notes when resolving alerts to build institutional knowledge
              </p>
            </div>
          )}
        </div>

        {/* Impact Estimation */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span> Impact Estimation
          </h3>
          <div className="space-y-4">
            {/* Impact Badge */}
            <div className="flex items-center gap-3">
              {alert.userCount && alert.userCount >= 50 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-950/50 text-red-400 border border-red-900/30">
                  🔴 High Impact
                </span>
              ) : alert.userCount && alert.userCount >= 10 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-950/50 text-orange-400 border border-orange-900/30">
                  🟠 Medium Impact
                </span>
              ) : alert.velocityPerHour && alert.velocityPerHour >= 10 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-950/50 text-yellow-400 border border-yellow-900/30">
                  ⚡ High Velocity
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                  🟢 Low Impact
                </span>
              )}
            </div>

            {/* Metrics */}
            <dl className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-3">
                <dt className="text-xs text-zinc-500 uppercase tracking-wide">Users Affected</dt>
                <dd className="text-2xl font-bold text-white mt-1">
                  {alert.userCount ?? '—'}
                </dd>
              </div>
              <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-3">
                <dt className="text-xs text-zinc-500 uppercase tracking-wide">Velocity/Hour</dt>
                <dd className="text-2xl font-bold text-white mt-1">
                  {alert.velocityPerHour ? alert.velocityPerHour.toFixed(1) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Event Timeline</h3>
        {alert.alertEvents.length === 0 ? (
          <p className="text-zinc-600 text-sm">No events recorded</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alert.alertEvents.map((event) => (
              <div key={event.id} className="border-l-2 border-red-900/30 pl-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{formatRelativeTime(event.occurredAt)}</span>
                </div>
                <p className="font-medium text-white mt-1">{event.title}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{event.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Resolve Alert</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Optionally add notes about how this alert was resolved. This helps team members fix similar issues faster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full px-3 py-2 border border-white/10 bg-black/20 rounded-lg resize-none text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              rows={4}
              placeholder="What fixed this alert? (e.g., 'Restarted the payments-api pod')"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolutionNotes('');
                }}
                disabled={actionLoading}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? 'Resolving...' : 'Resolve Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
