'use client';

import { WidgetWrapper } from './widget-wrapper';

interface AlertCountWidgetProps {
  title: string;
  data: { count: number } | null;
  loading: boolean;
  error?: string | null;
}

export function AlertCountWidget({ title, data, loading, error }: AlertCountWidgetProps) {
  return (
    <WidgetWrapper title={title} loading={loading} error={error}>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {data?.count ?? '-'}
        </div>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total Alerts</div>
      </div>
    </WidgetWrapper>
  );
}
