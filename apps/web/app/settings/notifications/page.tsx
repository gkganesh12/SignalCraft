'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    defaultChannel: '#alerts',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    escalationEnabled: true,
    escalationMinutes: 15,
  });

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setPrefs(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading preferences...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500">Configure how and when you receive alerts</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl space-y-8">
        
        {/* Default Channel */}
        <div className="space-y-4">
          <Label>Default Notification Channel</Label>
          <div className="grid gap-2">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={prefs.defaultChannel} 
              onChange={(e) => setPrefs({...prefs, defaultChannel: e.target.value})}
            >
                <option value="#alerts">#alerts</option>
                <option value="#critical">#critical</option>
                <option value="#general">#general</option>
            </select>
            <p className="text-xs text-gray-500">Where alerts are sent if no specific routing rule matches</p>
          </div>
        </div>

        <hr />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Quiet Hours</Label>
              <p className="text-sm text-gray-500">Suppress low-priority alerts during specific times</p>
            </div>
            <Switch 
              checked={prefs.quietHoursEnabled} 
              onCheckedChange={(checked) => setPrefs({...prefs, quietHoursEnabled: checked})}
            />
          </div>
        </div>

        {/* Escalation */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Escalation Policy</Label>
              <p className="text-sm text-gray-500">Escalate unacknowledged critical alerts</p>
            </div>
            <Switch 
               checked={prefs.escalationEnabled}
               onCheckedChange={(checked) => setPrefs({...prefs, escalationEnabled: checked})}
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
