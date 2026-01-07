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
    return (
      <div className="rounded-xl bg-zinc-950 border border-red-900/10 p-6 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Alert Sources</h3>
        <p className="text-sm text-zinc-500 text-center py-8">No alerts in the last 24 hours</p>
      </div>
    );

  return (
    <div className="rounded-xl bg-zinc-950 border border-red-900/10 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Alert Sources</h3>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-zinc-800">
            <TableHead className="text-zinc-500">Project</TableHead>
            <TableHead className="text-zinc-500">Environment</TableHead>
            <TableHead className="text-right text-zinc-500">Alerts</TableHead>
            <TableHead className="text-right text-zinc-500">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source, index) => (
            <TableRow key={`${source.project}-${source.environment}-${index}`} className="hover:bg-red-900/10 border-zinc-800 transition-colors">
              <TableCell className="font-medium text-zinc-200">{source.project}</TableCell>
              <TableCell>
                <span className="px-2 py-1 rounded-full text-xs bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {source.environment}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-zinc-300">{source.count}</TableCell>
              <TableCell className="text-right text-zinc-500">{source.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
