'use client';

import { WidgetWrapper } from './widget-wrapper';

interface SeverityData {
  severity: string;
  count: number;
}

interface AlertsBySeverityWidgetProps {
  title: string;
  data: SeverityData[] | null;
  loading: boolean;
  error?: string | null;
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-500',
};

export function AlertsBySeverityWidget({ title, data, loading, error }: AlertsBySeverityWidgetProps) {
  const maxCount = data?.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  return (
    <WidgetWrapper title={title} loading={loading} error={error}>
      <div className="space-y-4">
        {data?.map((item) => (
          <div key={item.severity} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">{item.severity}</span>
              <span className="text-gray-500">{item.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full ${severityColors[item.severity] || 'bg-gray-500'}`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && !loading && !error && (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No data available
            </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
