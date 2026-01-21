'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils'; // Assuming default shadcn/utility helper exists

interface WidgetWrapperProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
  children: ReactNode;
  onRefresh?: () => void;
}

export function WidgetWrapper({
  title,
  loading = false,
  error,
  className,
  children,
  onRefresh,
}: WidgetWrapperProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900", className)}>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
