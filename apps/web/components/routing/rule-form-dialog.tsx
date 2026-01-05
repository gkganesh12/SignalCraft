'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConditionBuilder } from './condition-builder';
import { ActionBuilder } from './action-builder';

interface RuleCondition {
  field: string;
  operator: string;
  value: string | string[];
}

interface ConditionGroup {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

interface RuleActions {
  slackChannelId: string;
  mentionHere?: boolean;
  escalateAfterMinutes?: number;
}

interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  conditions: ConditionGroup;
  actions: RuleActions;
  priority: number;
  enabled: boolean;
}

interface RuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: RoutingRule;
  onSuccess: () => void;
}

const defaultConditions: ConditionGroup = {
  all: [{ field: 'environment', operator: 'equals', value: 'prod' }],
};

const defaultActions: RuleActions = {
  slackChannelId: '',
  mentionHere: false,
  escalateAfterMinutes: undefined,
};

export function RuleFormDialog({ open, onOpenChange, rule, onSuccess }: RuleFormDialogProps) {
  const isEditing = !!rule;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState<ConditionGroup>(defaultConditions);
  const [actions, setActions] = useState<RuleActions>(defaultActions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description ?? '');
      setPriority(rule.priority);
      setConditions(rule.conditions);
      setActions(rule.actions);
    } else {
      setName('');
      setDescription('');
      setPriority(0);
      setConditions(defaultConditions);
      setActions(defaultActions);
    }
    setError(null);
  }, [rule, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (!actions.slackChannelId) {
      setError('Slack channel is required');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      priority,
      conditions,
      actions,
      enabled: rule?.enabled ?? true,
    };

    try {
      setSaving(true);
      const url = isEditing ? `/api/routing-rules/${rule.id}` : '/api/routing-rules';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to save rule');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Routing Rule' : 'Create Routing Rule'}</DialogTitle>
          <DialogDescription>
            Define conditions to match alerts and actions to take when they match.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rule Metadata */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rule Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Critical Production Alerts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                min={0}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers = higher priority. Rules are evaluated in priority order.
              </p>
            </div>
          </div>

          {/* Conditions Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-3">Conditions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Define when this rule should match. All conditions must be true (AND logic).
            </p>
            <ConditionBuilder conditions={conditions} onChange={setConditions} />
          </div>

          {/* Actions Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-3">Actions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Define what happens when this rule matches.
            </p>
            <ActionBuilder actions={actions} onChange={setActions} />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
