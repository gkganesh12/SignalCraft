'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { FileText, Download } from 'lucide-react';

interface PostmortemModalProps {
  alertGroupId: string;
  className?: string;
}

export function PostmortemModal({ alertGroupId, className }: PostmortemModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alert-groups/${alertGroupId}/postmortem`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate report');
      const data = await res.json();
      setReport(data.report);
    } catch (error) {
      console.error(error);
      alert('Failed to generate postmortem');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (report) {
      navigator.clipboard.writeText(report);
      alert('Copied to clipboard');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white ${className}`} size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Generate Postmortem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Incident Postmortem</DialogTitle>
          <DialogDescription className="text-zinc-400">
            AI-generated analysis of the incident lifecycle, root cause, and learnings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-[300px] p-4 bg-zinc-900/50 rounded-md border border-white/5 text-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Spinner />
              <p className="text-zinc-500 animate-pulse">Analyzing incident data...</p>
            </div>
          ) : report ? (
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap font-mono text-zinc-300">
              {report}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Button onClick={generateReport} className="bg-red-600 hover:bg-red-700 text-white">Generate Draft Report</Button>
              <p className="text-xs text-zinc-500">
                Uses AI to summarize events, correlations, and resolutions.
              </p>
            </div>
          )}
        </div>

        {report && (
          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={copyToClipboard} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
               Copy Markdown
             </Button>
             <Button onClick={() => setIsOpen(false)} className="bg-red-600 hover:bg-red-700">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
