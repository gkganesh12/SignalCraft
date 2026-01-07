'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SeverityBadge } from './severity-badge';

interface CorrelatedAlert {
  id: string;
  title: string;
  severity: string;
  status: string;
  lastSeenAt: string;
}

export function CorrelatedAlertsCard({ alertId }: { alertId: string }) {
  const [correlatedAlerts, setCorrelatedAlerts] = useState<CorrelatedAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCorrelations() {
      try {
        const res = await fetch(`/api/alert-groups/${alertId}/related`);
        if (res.ok) {
          const data = await res.json();
          setCorrelatedAlerts(data);
        }
      } catch (error) {
        console.error('Failed to fetch correlations', error);
      } finally {
        setLoading(false);
      }
    }

    if (alertId) {
      fetchCorrelations();
    }
  }, [alertId]);

  if (loading || correlatedAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-lg">🔗</span> Correlated Alerts
        <span className="text-xs font-normal text-zinc-500 ml-2">
          (Alerts that frequently occur with this one)
        </span>
      </h3>
      
      <div className="space-y-3">
        {correlatedAlerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg group hover:bg-zinc-800 transition-colors border border-white/5">
            <div className="flex items-center gap-3">
              <SeverityBadge severity={alert.severity} className="shrink-0" />
              <div className="min-w-0">
                <Link 
                  href={`/dashboard/alerts/${alert.id}`}
                  className="font-medium text-white truncate hover:text-red-400 block transition-colors"
                >
                  {alert.title}
                </Link>
                <p className="text-xs text-zinc-500">
                  Last seen {new Date(alert.lastSeenAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
