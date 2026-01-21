'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  ACK: { label: 'Acknowledged', className: 'bg-yellow-100 text-yellow-700' },
  SNOOZED: { label: 'Snoozed', className: 'bg-purple-100 text-purple-700' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-700' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
