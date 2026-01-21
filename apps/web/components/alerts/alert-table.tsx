'use client';

import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from './status-badge';
import { SeverityBadge } from './severity-badge';
import { Button } from '@/components/ui/button';

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
  assignee?: {
    displayName: string;
    email: string;
  } | null;
}

interface AlertTableProps {
  alerts: AlertGroup[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function AlertTable({
  alerts,
  sortBy,
  sortOrder,
  onSort,
  onAcknowledge,
  onResolve,
}: AlertTableProps) {
  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => onSort(field)}
    >
      {children}
      {getSortIndicator(field)}
    </TableHead>
  );

  if (alerts.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-8 text-center">
        <p className="text-gray-500">No alerts found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="lastSeenAt">Time</SortableHeader>
            <TableHead>Title</TableHead>
            <SortableHeader field="severity">Severity</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <TableHead>Environment</TableHead>
            <SortableHeader field="count">Count</SortableHeader>
            <TableHead>Assignee</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id} className="hover:bg-gray-50/50">
              <TableCell className="text-sm text-gray-500">
                {formatRelativeTime(alert.lastSeenAt)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/alerts/${alert.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {alert.title}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">{alert.project}</p>
              </TableCell>
              <TableCell>
                <SeverityBadge severity={alert.severity} />
              </TableCell>
              <TableCell>
                <StatusBadge status={alert.status} />
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  {alert.environment}
                </span>
              </TableCell>
              <TableCell className="font-mono text-sm">{alert.count}</TableCell>
              <TableCell className="text-sm text-gray-500">
                {alert.assignee?.displayName || 'Unassigned'}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {alert.status === 'OPEN' && onAcknowledge && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Ack
                  </Button>
                )}
                {(alert.status === 'OPEN' || alert.status === 'ACK') && onResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(alert.id)}
                  >
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
