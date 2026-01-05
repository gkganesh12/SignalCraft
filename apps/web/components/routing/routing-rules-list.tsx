'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { RuleFormDialog } from '@/components/routing/rule-form-dialog';
import { DeleteRuleDialog } from '@/components/routing/delete-rule-dialog';

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
  createdAt: string;
  updatedAt: string;
}

interface RulesResponse {
  rules: RoutingRule[];
  total: number;
}

export function RoutingRulesList() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<RoutingRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/routing-rules');
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data: RulesResponse = await res.json();
      setRules(data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleEnabled = async (rule: RoutingRule) => {
    const endpoint = rule.enabled
      ? `/api/routing-rules/${rule.id}/disable`
      : `/api/routing-rules/${rule.id}/enable`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle rule');
      await fetchRules();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const formatConditions = (conditions: ConditionGroup): string => {
    const allConditions = conditions.all ?? [];
    const anyConditions = conditions.any ?? [];
    const total = allConditions.length + anyConditions.length;
    return `${total} condition${total !== 1 ? 's' : ''}`;
  };

  const formatActions = (actions: RuleActions): string => {
    const parts: string[] = [];
    if (actions.slackChannelId) parts.push('Slack');
    if (actions.mentionHere) parts.push('@here');
    if (actions.escalateAfterMinutes) parts.push(`Escalate ${actions.escalateAfterMinutes}m`);
    return parts.join(', ') || 'None';
  };

  if (loading) {
    return (
      <Card className="bg-white/80">
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
          <CardDescription>Loading rules...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/80">
        <CardHeader>
          <CardTitle>Routing Rules</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchRules}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Routing Rules</CardTitle>
            <CardDescription>
              Define conditions to route alerts to specific Slack channels with escalation settings.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            + New Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No routing rules configured yet.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>Create your first rule</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Priority</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className={!rule.enabled ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm">{rule.priority}</TableCell>
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {rule.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatConditions(rule.conditions)}</TableCell>
                    <TableCell className="text-sm">{formatActions(rule.actions)}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleEnabled(rule)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRule(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRule(rule)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Rule Dialog */}
      <RuleFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchRules}
      />

      {/* Edit Rule Dialog */}
      <RuleFormDialog
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
        rule={editingRule ?? undefined}
        onSuccess={fetchRules}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteRuleDialog
        open={!!deletingRule}
        onOpenChange={(open) => !open && setDeletingRule(null)}
        rule={deletingRule}
        onSuccess={fetchRules}
      />
    </>
  );
}
