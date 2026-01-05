'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface RuleActions {
  slackChannelId: string;
  mentionHere?: boolean;
  mentionChannel?: boolean;
  escalateAfterMinutes?: number;
  escalationChannelId?: string;
}

interface ActionBuilderProps {
  actions: RuleActions;
  onChange: (actions: RuleActions) => void;
}

interface SlackChannel {
  id: string;
  name: string;
}

export function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch('/api/integrations/slack/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const updateAction = <K extends keyof RuleActions>(key: K, value: RuleActions[K]) => {
    onChange({ ...actions, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Slack Channel */}
      <div>
        <label className="block text-sm font-medium mb-1">Slack Channel *</label>
        {loadingChannels ? (
          <p className="text-sm text-muted-foreground">Loading channels...</p>
        ) : channels.length > 0 ? (
          <select
            value={actions.slackChannelId}
            onChange={(e) => updateAction('slackChannelId', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a channel...</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <Input
              value={actions.slackChannelId}
              onChange={(e) => updateAction('slackChannelId', e.target.value)}
              placeholder="Enter channel ID (e.g., C123456)"
            />
            <p className="text-xs text-muted-foreground">
              Connect Slack in Integrations to see available channels.
            </p>
          </div>
        )}
      </div>

      {/* Mention Options */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Mentions</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={actions.mentionHere ?? false}
              onChange={(e) => updateAction('mentionHere', e.target.checked)}
              className="rounded border-gray-300"
            />
            @here
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={actions.mentionChannel ?? false}
              onChange={(e) => updateAction('mentionChannel', e.target.checked)}
              className="rounded border-gray-300"
            />
            @channel
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Use @here for online members, @channel for all members.
        </p>
      </div>

      {/* Escalation Settings */}
      <div className="border-t pt-4 mt-4">
        <label className="block text-sm font-medium mb-2">Escalation (Optional)</label>
        <div className="flex items-center gap-3">
          <span className="text-sm">Escalate after</span>
          <Input
            type="number"
            value={actions.escalateAfterMinutes ?? ''}
            onChange={(e) =>
              updateAction('escalateAfterMinutes', e.target.value ? parseInt(e.target.value) : undefined)
            }
            placeholder="15"
            min={1}
            max={1440}
            className="w-20"
          />
          <span className="text-sm">minutes if not acknowledged</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Leave empty to disable escalation. The escalation will be cancelled if the alert is acknowledged.
        </p>
      </div>

      {/* Escalation Channel (if escalation is enabled) */}
      {actions.escalateAfterMinutes && actions.escalateAfterMinutes > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Escalation Channel (Optional)</label>
          {channels.length > 0 ? (
            <select
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Same as notification channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={actions.escalationChannelId ?? ''}
              onChange={(e) => updateAction('escalationChannelId', e.target.value || undefined)}
              placeholder="Optional: Different channel for escalations"
            />
          )}
        </div>
      )}
    </div>
  );
}
