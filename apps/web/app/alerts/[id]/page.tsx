'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/alerts/status-badge';
import { SeverityBadge } from '@/components/alerts/severity-badge';
import { Pencil, Save, X } from 'lucide-react';

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
  const id = params.id as string;
  
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ assigneeUserId: string; runbookUrl: string }>({
    assigneeUserId: '',
    runbookUrl: '',
  });

  const fetchAlert = useCallback(async () => {
    try {
      const res = await fetch(`/api/alert-groups/${id}`);
      if (!res.ok) throw new Error('Failed to fetch alert');
      const data = await res.json();
      setAlert(data);
      if (!isEditing) { // Only update form if not editing to avoid overwriting user input
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

  const handleAction = async (action: 'acknowledge' | 'resolve' | 'snooze') => {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600">{error || 'Alert not found'}</p>
          <Link href="/alerts">
            <Button className="mt-4">Back to Alerts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
        <span className="mx-2">›</span>
        <Link href="/alerts" className="hover:text-blue-600">Alerts</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{alert.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{alert.title}</h1>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <p className="text-gray-500">
              {alert.project} • {alert.environment}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {alert.status === 'OPEN' && (
              <Button
                onClick={() => handleAction('acknowledge')}
                disabled={actionLoading}
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
                >
                  Snooze
                </Button>
                <Button
                  onClick={() => handleAction('resolve')}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
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
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-medium text-gray-900">Details</h3>
             {!isEditing ? (
               <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                 <Pencil className="w-4 h-4 mr-2" />
                 Edit
               </Button>
             ) : (
               <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={actionLoading}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={actionLoading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
               </div>
             )}
          </div>
          
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">First Seen</dt>
              <dd className="font-medium">{formatDate(alert.firstSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Seen</dt>
              <dd className="font-medium">{formatDate(alert.lastSeenAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Event Count</dt>
              <dd className="font-mono font-medium">{alert.count}</dd>
            </div>
            
            <div className="flex justify-between items-center h-9">
              <dt className="text-gray-500">Assignee</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {isEditing ? (
                  <select
                    className="w-full px-2 py-1 border rounded text-sm bg-white"
                    value={editForm.assigneeUserId}
                    onChange={(e) => setEditForm({ ...editForm, assigneeUserId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                    ))}
                  </select>
                ) : (
                  alert.assignee?.displayName || 'Unassigned'
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center min-h-[36px]">
              <dt className="text-gray-500">Runbook</dt>
              <dd className="font-medium min-w-[200px] text-right">
                {isEditing ? (
                   <Input 
                      className="h-8 text-sm"
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
                      className="text-blue-600 hover:underline"
                    >
                      View Runbook
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">None</span>
                  )
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notifications */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
          <h3 className="font-medium text-gray-900 mb-4">Notification History</h3>
          {alert.notifications.length === 0 ? (
            <p className="text-gray-400 text-sm">No notifications sent</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alert.notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">{n.targetRef}</span>
                  <span className={n.status === 'SENT' ? 'text-emerald-600' : 'text-red-600'}>
                    {n.status}
                  </span>
                  <span className="text-gray-400">{formatRelativeTime(n.sentAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-4">Event Timeline</h3>
        {alert.alertEvents.length === 0 ? (
          <p className="text-gray-400 text-sm">No events recorded</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alert.alertEvents.map((event) => (
              <div key={event.id} className="border-l-2 border-gray-200 pl-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{formatRelativeTime(event.occurredAt)}</span>
                </div>
                <p className="font-medium text-gray-900 mt-1">{event.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{event.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
