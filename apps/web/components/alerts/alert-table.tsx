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
  // Impact Estimation
  userCount?: number | null;
  velocityPerHour?: number | null;
  // Resolution Memory
  resolutionNotes?: string | null;
  assignee?: {
    displayName: string;
    email: string;
  } | null;
}

function getImpactBadge(userCount?: number | null, velocityPerHour?: number | null): React.ReactNode {
  if (userCount && userCount >= 50) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/40" title={`${userCount} users affected`}>
        🔴
      </span>
    );
  }
  if (userCount && userCount >= 10) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-900/40" title={`${userCount} users affected`}>
        🟠
      </span>
    );
  }
  if (velocityPerHour && velocityPerHour >= 10) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-900/40" title={`${velocityPerHour.toFixed(1)}/hr velocity`}>
        ⚡
      </span>
    );
  }
  return null;
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
      className="cursor-pointer text-zinc-500 hover:bg-transparent hover:text-white transition-colors"
      onClick={() => onSort(field)}
    >
      {children}
      {getSortIndicator(field)}
    </TableHead>
  );

  if (alerts.length === 0) {
    return (
      <div className="bg-zinc-950 border border-red-900/10 rounded-xl p-8 text-center">
        <p className="text-zinc-500">No alerts found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-red-900/10 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-red-900/10 hover:bg-transparent">
            <SortableHeader field="lastSeenAt"><span className="text-zinc-500">Time</span></SortableHeader>
            <TableHead className="text-zinc-500">Title</TableHead>
            <SortableHeader field="severity"><span className="text-zinc-500">Severity</span></SortableHeader>
            <SortableHeader field="status"><span className="text-zinc-500">Status</span></SortableHeader>
            <TableHead className="text-zinc-500">Environment</TableHead>
            <SortableHeader field="count"><span className="text-zinc-500">Count</span></SortableHeader>
            <TableHead className="text-zinc-500">Assignee</TableHead>
            <TableHead className="text-right text-zinc-500">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
             <TableRow key={alert.id} className="hover:bg-red-900/5 transition-colors border-red-900/10">
              <TableCell className="text-sm text-zinc-500">
                {formatRelativeTime(alert.lastSeenAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/alerts/${alert.id}`}
                    className="font-medium text-white hover:text-red-400 transition-colors"
                  >
                    {alert.title}
                  </Link>
                  {getImpactBadge(alert.userCount, alert.velocityPerHour)}
                  {alert.resolutionNotes && (
                    <span className="text-zinc-600" title="Has resolution notes">
                      📝
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{alert.project}</p>
              </TableCell>
              <TableCell>
                <SeverityBadge severity={alert.severity} />
              </TableCell>
              <TableCell>
                <StatusBadge status={alert.status} />
              </TableCell>
              <TableCell>
                <span className="px-2 py-1 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded text-xs">
                  {alert.environment}
                </span>
              </TableCell>
              <TableCell className="font-mono text-sm text-zinc-300">{alert.count}</TableCell>
              <TableCell className="text-sm text-zinc-500">
                {alert.assignee?.displayName || 'Unassigned'}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {alert.status === 'OPEN' && onAcknowledge && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Ack
                  </Button>
                )}
                {(alert.status === 'OPEN' || alert.status === 'ACK') && onResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
