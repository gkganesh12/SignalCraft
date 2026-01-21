'use client';

import { useEffect, useState, useCallback } from 'react';
import { FilterBar } from '@/components/alerts/filter-bar';
import { AlertTable } from '@/components/alerts/alert-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AlertGroup {
  id: string;
  title: string;
  severity: string;
  status: string;
  environment: string;
  project: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  assignee?: { displayName: string; email: string } | null;
}

interface PaginatedResponse {
  data: AlertGroup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const defaultFilters = {
  status: [] as string[],
  severity: [] as string[],
  environment: [] as string[],
  project: [] as string[],
  search: '',
};

const defaultOptions = {
  statuses: ['OPEN', 'ACK', 'SNOOZED', 'RESOLVED'],
  severities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
  environments: [] as string[],
  projects: [] as string[],
};

export default function AlertsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [options, _setOptions] = useState(defaultOptions);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('lastSeenAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status.length) params.set('status', filters.status.join(','));
      if (filters.severity.length) params.set('severity', filters.severity.join(','));
      if (filters.environment.length) params.set('environment', filters.environment.join(','));
      if (filters.project.length) params.set('project', filters.project.join(','));
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/alert-groups?${params}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/alert-groups/${id}/resolve`, { method: 'POST' });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Inbox</h1>
          <p className="text-gray-500 mt-1">
            {data?.total ?? 0} total alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={fetchAlerts} variant="outline" size="sm">
            Refresh
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        options={options}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Table */}
      {data && (
        <>
          <AlertTable
            alerts={data.data}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(data.page - 1) * data.limit + 1} to{' '}
              {Math.min(data.page * data.limit, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasPrevious}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasNext}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
