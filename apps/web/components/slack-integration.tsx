'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
  defaultChannel?: string | null;
}

export function SlackIntegration() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/slack/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false }));
  }, []);

  const loadChannels = async () => {
    const res = await fetch('/api/integrations/slack/channels');
    if (res.ok) {
      setChannels(await res.json());
    }
  };

  const disconnect = async () => {
    setLoading(true);
    await fetch('/api/integrations/slack/disconnect', { method: 'POST' });
    setStatus({ connected: false });
    setLoading(false);
  };

  const setDefaultChannel = async (channelId: string) => {
    await fetch('/api/integrations/slack/default-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId }),
    });
    setStatus((prev) => (prev ? { ...prev, defaultChannel: channelId } : prev));
  };

  if (!status) {
    return (
      <Card className="bg-white/80">
        <CardHeader>
          <CardTitle>Slack</CardTitle>
          <CardDescription>Loading integration status...</CardDescription>
        </CardHeader>
        <CardContent>
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80">
      <CardHeader>
        <CardTitle>Slack</CardTitle>
        <CardDescription>
          {status.connected
            ? `Connected to ${status.teamName ?? 'workspace'}`
            : 'Connect Slack to deliver alert notifications.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="/api/integrations/slack/connect">Reconnect</a>
              </Button>
              <Button variant="outline" onClick={disconnect} disabled={loading}>
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
              <Button variant="secondary" onClick={loadChannels}>
                Load channels
              </Button>
            </div>
            {channels.length > 0 && (
              <div className="grid gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setDefaultChannel(channel.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      status.defaultChannel === channel.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-white'
                    }`}
                  >
                    #{channel.name}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <Button asChild>
            <a href="/api/integrations/slack/connect">Connect Slack</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
