'use client';

import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'same';
  trendPercent?: number;
  suffix?: string;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  trendPercent,
  suffix,
  description,
  className,
}: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend || trend === 'same') return 'text-gray-500';
    // For some metrics, up is bad (alerts), for others up is good (ack rate)
    return trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'same') return '→';
    return trend === 'up' ? '↑' : '↓';
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-zinc-950 border border-red-900/10 p-6 shadow-sm hover:shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:border-red-500/30 transition-all duration-300',
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -translate-x-full animate-scan" />
      </div>
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
          </div>
          {description && (
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          )}
        </div>
        
        {trend && trendPercent !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
            <span>{getTrendIcon()}</span>
            <span>{trendPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
