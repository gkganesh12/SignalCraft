'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { workflowClient } from '@/lib/services/workflow-client';
import { WorkflowExecution, Workflow } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Clock, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WorkflowHistoryPage({ params }: { params: { id: string } }) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const workspaceId = 'default-workspace';
      const [wf, execs] = await Promise.all([
        workflowClient.get(params.id, workspaceId),
        workflowClient.getExecutions(params.id, workspaceId),
      ]);
      setWorkflow(wf);
      setExecutions(execs);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
             Run History: {workflow?.name}
           </h1>
           <p className="text-sm text-gray-500">
             View past executions and logs for this automation.
           </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800">
           {executions.length === 0 ? (
             <li className="p-12 text-center text-gray-500">No runs recorded yet.</li>
           ) : (
             executions.map((exec) => (
                <li key={exec.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(exec.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase">
                          {exec.status}
                        </p>
                        <p className="text-xs text-gray-500">
                          Started {formatDistanceToNow(new Date(exec.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      ID: {exec.id.slice(0, 8)}
                    </div>
                  </div>
                  
                  {/* Logs Preview */}
                  {exec.logs && exec.logs.length > 0 && (
                    <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-xs text-green-400">
                       <div className="flex items-center gap-2 mb-2 text-gray-500">
                         <Terminal className="h-3 w-3" /> Logs
                       </div>
                       {exec.logs.map((log, i) => (
                         <div key={i} className="truncate">{log}</div>
                       ))}
                    </div>
                  )}
                </li>
             ))
           )}
        </ul>
      </div>
    </div>
  );
}
