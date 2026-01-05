'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RoutingRule {
  id: string;
  name: string;
}

interface DeleteRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RoutingRule | null;
  onSuccess: () => void;
}

export function DeleteRuleDialog({ open, onOpenChange, rule, onSuccess }: DeleteRuleDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!rule) return;

    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`/api/routing-rules/${rule.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to delete rule');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Routing Rule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the rule &quot;{rule?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Deleting...' : 'Delete Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
