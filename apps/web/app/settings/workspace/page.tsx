'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export default function WorkspaceSettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Fetch workspace info
    const fetchWorkspace = async () => {
      try {
        // For now, use mock data - in production, call the API
        setWorkspace({
          id: 'ws_demo',
          name: 'My Workspace',
          createdAt: new Date().toISOString(),
        });
        setName('My Workspace');
      } catch (err) {
        console.error('Failed to fetch workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      // In production, call the API to update
      await new Promise((r) => setTimeout(r, 500));
      setWorkspace((prev) => (prev ? { ...prev, name } : null));
      setMessage({ type: 'success', text: 'Workspace settings saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="text-gray-500 mt-1">Manage your workspace configuration</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 space-y-6">
        {/* Workspace Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Workspace ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace ID
          </label>
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm text-gray-600">
            {workspace?.id}
          </div>
        </div>

        {/* Created Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Created
          </label>
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
            {workspace?.createdAt && new Date(workspace.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
