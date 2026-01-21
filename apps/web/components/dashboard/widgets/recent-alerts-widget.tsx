'use client';

import { WidgetWrapper } from './widget-wrapper';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  title: string;
  severity: string;
  status: string;
  lastSeenAt: string;
}

interface RecentAlertsWidgetProps {
  title: string;
  data: Alert[] | null;
  loading: boolean;
  error?: string | null;
}

const severityStyles: Record<string, string> = {
    CRITICAL: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30 border-red-200 dark:border-red-900',
    HIGH: 'text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30 border-orange-200 dark:border-orange-900',
    MEDIUM: 'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-900',
    LOW: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 border-blue-200 dark:border-blue-900',
    INFO: 'text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800 border-gray-200 dark:border-gray-800',
};

export function RecentAlertsWidget({ title, data, loading, error }: RecentAlertsWidgetProps) {
  return (
    <WidgetWrapper title={title} loading={loading} error={error} className="p-0">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {data?.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {alert.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(alert.lastSeenAt), { addSuffix: true })}
              </p>
            </div>
            <div className={`ml-4 rounded-full border px-2 py-0.5 text-xs font-medium ${severityStyles[alert.severity] || severityStyles.INFO}`}>
              {alert.severity}
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && !loading && !error && (
             <div className="flex h-32 items-center justify-center text-sm text-gray-500">
                No recent alerts
            </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
