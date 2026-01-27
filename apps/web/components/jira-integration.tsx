'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JiraStatus {
  configured: boolean;
  status?: string | null;
  baseUrl?: string | null;
  projectKey?: string | null;
  issueType?: string | null;
  autoCreateCritical?: boolean;
  webhookTokenConfigured?: boolean;
  oauthConnected?: boolean;
}

export function JiraIntegration() {
  const [status, setStatus] = useState<JiraStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState('workspace_id');
  const [form, setForm] = useState({
    baseUrl: '',
    email: '',
    apiToken: '',
    projectKey: '',
    issueType: 'Task',
    autoCreateCritical: false,
    webhookToken: '',
  });

  useEffect(() => {
    const loadStatus = async () => {
      const res = await fetch('/api/integrations/jira/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setForm((prev) => ({
          ...prev,
          baseUrl: data.baseUrl ?? prev.baseUrl,
          projectKey: data.projectKey ?? prev.projectKey,
          issueType: data.issueType ?? prev.issueType,
          autoCreateCritical: data.autoCreateCritical ?? prev.autoCreateCritical,
        }));
      }
    };

    loadStatus();
  }, []);

  useEffect(() => {
    const loadWorkspace = async () => {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          setWorkspaceId(data.id);
        }
      }
    };

    loadWorkspace();
  }, []);

  const updateForm = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: form.baseUrl,
          email: form.email,
          apiToken: form.apiToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Connection successful');
      } else {
        setMessage(data.error || 'Connection failed');
      }
    } catch (_error) {
      setMessage('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/integrations/jira/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Jira configuration saved');
        const statusRes = await fetch('/api/integrations/jira/status');
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
      } else {
        setMessage(data.error || 'Failed to save configuration');
      }
    } catch (_error) {
      setMessage('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/95 p-6 shadow-lg shadow-stone-900/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Jira</h2>
          <p className="mt-1 text-sm text-stone-500">
            Create tickets automatically and sync resolution status.
          </p>
        </div>
        <span className="text-xs text-stone-500">
          {status?.configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <div className="text-sm text-stone-600">
            OAuth connection: {status?.oauthConnected ? 'Connected' : 'Not connected'}
          </div>
          <Button
            asChild
            variant="secondary"
            className="bg-white text-stone-700 hover:bg-stone-100"
          >
            <a href="/api/integrations/jira/connect">Connect Jira OAuth</a>
          </Button>
        </div>
        <Input
          placeholder="Jira base URL (https://your-domain.atlassian.net)"
          value={form.baseUrl}
          onChange={(e) => updateForm('baseUrl', e.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Jira email"
            value={form.email}
            onChange={(e) => updateForm('email', e.target.value)}
          />
          <Input
            placeholder="Jira API token"
            type="password"
            value={form.apiToken}
            onChange={(e) => updateForm('apiToken', e.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Project key (e.g., OPS)"
            value={form.projectKey}
            onChange={(e) => updateForm('projectKey', e.target.value)}
          />
          <Input
            placeholder="Issue type (Task, Bug, Incident)"
            value={form.issueType}
            onChange={(e) => updateForm('issueType', e.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Webhook token (optional)"
            value={form.webhookToken}
            onChange={(e) => updateForm('webhookToken', e.target.value)}
          />
          <label className="flex items-center gap-3 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={form.autoCreateCritical}
              onChange={(e) => updateForm('autoCreateCritical', e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-red-600 focus:ring-red-500/30"
            />
            Auto-create Jira tickets for critical alerts
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={loading}
            className="bg-stone-100 text-stone-700 hover:bg-stone-200"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-stone-900"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {message && <div className="text-sm text-stone-600">{message}</div>}

        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-700">
          <div className="font-semibold">Jira Webhook URL</div>
          <div className="mt-1 break-all font-mono">
            {`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5050'}/api/v1/webhooks/jira?workspaceId=${workspaceId}&token=YOUR_TOKEN`}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            Use this in Jira Automation or Webhooks to sync resolved issues.
          </div>
        </div>
      </div>
    </div>
  );
}
