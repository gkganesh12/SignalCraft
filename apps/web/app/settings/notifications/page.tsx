'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState({
    defaultChannel: '',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    escalationEnabled: true,
    escalationMinutes: 15,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await new Promise((r) => setTimeout(r, 500));
      setMessage({ type: 'success', text: 'Notification preferences saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-500 mt-1">Configure how and when notifications are sent</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 space-y-6">
        {/* Default Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Slack Channel
          </label>
          <input
            type="text"
            value={preferences.defaultChannel}
            onChange={(e) => setPreferences({ ...preferences, defaultChannel: e.target.value })}
            placeholder="#alerts"
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Channel to send alerts when no routing rule matches
          </p>
        </div>

        {/* Escalation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Auto-Escalation
              </label>
              <p className="text-xs text-gray-500">
                Escalate alerts if not acknowledged
              </p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, escalationEnabled: !preferences.escalationEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferences.escalationEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  preferences.escalationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {preferences.escalationEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escalation Time (minutes)
              </label>
              <input
                type="number"
                value={preferences.escalationMinutes}
                onChange={(e) => setPreferences({ ...preferences, escalationMinutes: parseInt(e.target.value) || 15 })}
                min={1}
                max={120}
                className="w-32 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quiet Hours
              </label>
              <p className="text-xs text-gray-500">
                Suppress non-critical notifications during these hours
              </p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, quietHoursEnabled: !preferences.quietHoursEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferences.quietHoursEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  preferences.quietHoursEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {preferences.quietHoursEnabled && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursStart: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
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
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
