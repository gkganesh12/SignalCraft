'use client';

import { useEffect, useState, useCallback } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertsTrendChart } from '@/components/dashboard/alerts-trend-chart';
import { TopSourcesTable } from '@/components/dashboard/top-sources-table';
import { IntegrationHealthList } from '@/components/dashboard/integration-health';
import { ReleaseHealthWidget } from '@/components/dashboard/release-health-widget';
import { AnomalyAlertWidget } from '@/components/dashboard/anomaly-alert-widget';
import { UptimeStatusWidget } from '@/components/dashboard/uptime-status-widget';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardData {
  alerts24h: {
    groups: { value: number; trend: 'up' | 'down' | 'same'; trendPercent: number };
    events: { value: number; trend: 'up' | 'down' | 'same'; trendPercent: number };
  };
  deduplicationRatio: { value: number; trend: 'up' | 'down' | 'same'; trendPercent: number };
  acknowledgmentRate: { value: number; trend: 'up' | 'down' | 'same'; trendPercent: number };
  topNoisySources: Array<{ project: string; environment: string; count: number; percentage: number }>;
  integrationHealth: Array<{
    id: string;
    type: string;
    name: string;
    connected: boolean;
    healthy: boolean;
    lastActivity: string | null;
    status: 'healthy' | 'warning' | 'error' | 'disconnected';
  }>;
  generatedAt: string;
}

interface TrendData {
  hour: string;
  count: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/overview');
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const dashboardData = await res.json();
      setData(dashboardData);
      setLastUpdated(new Date());
      setError(null);

      // Generate mock trend data based on alerts count
      // In production, this would come from /api/dashboard/alerts-trend
      const mockTrend: TrendData[] = [];
      for (let i = 23; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        mockTrend.push({
          hour: date.toISOString(),
          count: Math.floor(Math.random() * (dashboardData.alerts24h?.events?.value || 10) / 24),
        });
      }
      setTrendData(mockTrend);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16 mb-6">
            <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <img src="/logo.png" alt="Loading..." className="relative h-16 w-16 object-contain animate-bounce" />
          </div>
          <p className="text-zinc-500 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-900/20 text-red-500 p-4 rounded-lg border border-red-900/30">
            <p className="font-medium">Error loading dashboard</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button onClick={fetchDashboard} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Overview of your alert activity and system health
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchDashboard} variant="outline" size="sm" className="bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white">
            Refresh
          </Button>
          <Link href="/dashboard/alerts">
            <Button className="bg-red-600 hover:bg-red-700 text-white border-0">View All Alerts</Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Alert Groups (24h)"
          value={data?.alerts24h?.groups?.value ?? 0}
          trend={data?.alerts24h?.groups?.trend}
          trendPercent={data?.alerts24h?.groups?.trendPercent}
          description="Unique alert groups created"
        />
        <MetricCard
          title="Alert Events (24h)"
          value={data?.alerts24h?.events?.value ?? 0}
          trend={data?.alerts24h?.events?.trend}
          trendPercent={data?.alerts24h?.events?.trendPercent}
          description="Total alert events received"
        />
        <MetricCard
          title="Deduplication Rate"
          value={`${data?.deduplicationRatio?.value ?? 0}%`}
          trend={data?.deduplicationRatio?.trend}
          trendPercent={data?.deduplicationRatio?.trendPercent}
          description="Noise reduction from grouping"
        />
        <MetricCard
          title="Acknowledgment Rate"
          value={`${data?.acknowledgmentRate?.value ?? 0}%`}
          trend={data?.acknowledgmentRate?.trend}
          trendPercent={data?.acknowledgmentRate?.trendPercent}
          description="Alerts acknowledged or resolved"
        />
      </div>

      {/* Anomaly Detection */}
      <AnomalyAlertWidget />

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsTrendChart data={trendData} />
        <TopSourcesTable sources={data?.topNoisySources ?? []} />
      </div>

      {/* Release Health */}
      <ReleaseHealthWidget />

      {/* Uptime Monitoring */}
      <UptimeStatusWidget />

      {/* Integration Health */}
      <IntegrationHealthList integrations={data?.integrationHealth ?? []} />
    </div>
  );
}
