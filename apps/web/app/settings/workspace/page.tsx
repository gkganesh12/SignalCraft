'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WorkspaceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    fetch('/api/settings/workspace')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setName(data.name || '');
          setId(data.id || '');
          setCreatedAt(data.createdAt || '');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error) {
      console.error(error);
      // Ideally show toast
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="text-gray-500">Manage your workspace preferences</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="workspace-id">Workspace ID</Label>
          <Input id="workspace-id" value={id} disabled className="bg-gray-50 font-mono text-sm" />
          <p className="text-xs text-gray-500">Unique identifier for this workspace</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input 
            id="workspace-name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        
        {createdAt && (
          <div className="text-sm text-gray-500">
            Created on {new Date(createdAt).toLocaleDateString()}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
