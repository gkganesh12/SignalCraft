'use client';

import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

const severityConfig: Record<string, { label: string; className: string; icon: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700', icon: '🔴' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700', icon: '🟠' },
  MEDIUM: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  LOW: { label: 'Low', className: 'bg-blue-100 text-blue-700', icon: '🔵' },
  INFO: { label: 'Info', className: 'bg-gray-100 text-gray-600', icon: 'ℹ️' },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity] || { label: severity, className: 'bg-gray-100 text-gray-700', icon: '⚪' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
