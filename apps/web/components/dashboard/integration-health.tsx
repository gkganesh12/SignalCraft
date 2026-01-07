'use client';

interface IntegrationHealth {
  id: string;
  type: string;
  name: string;
  connected: boolean;
  healthy: boolean;
  lastActivity: string | null;
  status: 'healthy' | 'warning' | 'error' | 'disconnected';
}

interface IntegrationHealthListProps {
  integrations: IntegrationHealth[];
}

const statusColors = {
  healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  disconnected: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const statusLabels = {
  healthy: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  disconnected: 'Not Connected',
};

export function IntegrationHealthList({ integrations }: IntegrationHealthListProps) {
  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'No activity';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="rounded-xl bg-zinc-950 border border-red-900/10 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Integration Health</h3>
      <div className="space-y-3">
        {integrations.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No integrations configured</p>
        ) : (
          integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-lg border border-zinc-800">
                  {integration.type === 'SLACK' ? '💬' : '🐛'}
                </div>
                <div>
                  <p className="font-medium text-zinc-200">{integration.name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatLastActivity(integration.lastActivity)}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[integration.status]}`}
              >
                {statusLabels[integration.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
