'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AiSuggestion {
  enabled: boolean;
  suggestion: {
    suggestion: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
}

interface AiSuggestionCardProps {
  alertId: string;
}

export function AiSuggestionCard({ alertId }: AiSuggestionCardProps) {
  const [data, setData] = useState<AiSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchSuggestion() {
      try {
        const res = await fetch(`/api/alert-groups/${alertId}/ai-suggestion`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch AI suggestion', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSuggestion();
    return () => { mounted = false; };
  }, [alertId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-violet-950/50 to-indigo-950/50 border-violet-800/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
             <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
             <span className="font-medium text-violet-300">Analyzing past resolutions...</span>
          </div>
          <div className="h-4 bg-violet-800/30 rounded w-3/4 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.enabled || !data.suggestion) {
    return null; 
  }

  const { suggestion, confidence } = data.suggestion;
  
  const confidenceColors = {
    high: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/30',
    medium: 'bg-yellow-950/50 text-yellow-400 border-yellow-800/30',
    low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  const confidenceLabels = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
  };

  return (
    <Card className="bg-gradient-to-r from-violet-950/30 to-indigo-950/30 border-violet-800/20">
       <CardContent className="p-6">
         <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
           <div className="flex items-center gap-2">
             <Sparkles className="w-5 h-5 text-violet-400" />
             <h3 className="font-semibold text-violet-300">AI Resolution Suggestion</h3>
           </div>
           <span className={`text-xs px-2 py-1 rounded-full border font-medium ${confidenceColors[confidence]}`}>
             {confidenceLabels[confidence]}
           </span>
         </div>
         <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
           {suggestion}
         </p>
         <div className="mt-4 pt-4 border-t border-violet-800/30 text-xs text-violet-500">
           Based on similar resolved alerts in this project
         </div>
       </CardContent>
    </Card>
  );
}
