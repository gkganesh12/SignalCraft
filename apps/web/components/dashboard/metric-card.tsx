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
        'rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
          </div>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
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
