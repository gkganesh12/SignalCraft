'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TopSource {
  project: string;
  environment: string;
  count: number;
  percentage: number;
}

interface TopSourcesTableProps {
  sources: TopSource[];
}

export function TopSourcesTable({ sources }: TopSourcesTableProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Top Alert Sources</h3>
        <p className="text-sm text-gray-400 text-center py-8">No alerts in the last 24 hours</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Top Alert Sources</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead className="text-right">Alerts</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source, index) => (
            <TableRow key={`${source.project}-${source.environment}-${index}`}>
              <TableCell className="font-medium">{source.project}</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                  {source.environment}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">{source.count}</TableCell>
              <TableCell className="text-right text-gray-500">{source.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
