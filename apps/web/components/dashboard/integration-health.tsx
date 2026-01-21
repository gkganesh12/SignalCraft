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
  healthy: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  disconnected: 'bg-gray-100 text-gray-500',
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
    <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Integration Health</h3>
      <div className="space-y-3">
        {integrations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No integrations configured</p>
        ) : (
          integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-lg">
                  {integration.type === 'SLACK' ? '💬' : '🐛'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{integration.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatLastActivity(integration.lastActivity)}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[integration.status]}`}
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
