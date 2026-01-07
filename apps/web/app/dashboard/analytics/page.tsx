'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Activity,
  Users,
  Zap
} from 'lucide-react';

interface AnalyticsData {
  // Time-based metrics
  alertsOverTime: { date: string; count: number }[];
  resolvedAverageTime: number; // in minutes
  
  // Breakdown metrics
  alertsBySeverity: { severity: string; count: number }[];
  alertsByProject: { project: string; count: number }[];
  alertsByEnvironment: { environment: string; count: number }[];
  
  // Summary metrics
  totalAlerts: number;
  resolvedAlerts: number;
  openAlerts: number;
  mttr: number; // Mean Time To Resolution in minutes
  resolutionRate: number; // percentage
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-zinc-500',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/dashboard/analytics?range=${timeRange}`);
        if (res.ok) {
          const analytics = await res.json();
          setData(analytics);
        } else {
          // Generate sample data for demo
          setData(generateSampleData());
        }
      } catch {
        setData(generateSampleData());
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [timeRange]);

  function generateSampleData(): AnalyticsData {
    const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const alertsOverTime = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      alertsOverTime.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 50) + 10,
      });
    }
    
    return {
      alertsOverTime,
      resolvedAverageTime: 47,
      alertsBySeverity: [
        { severity: 'CRITICAL', count: 12 },
        { severity: 'HIGH', count: 34 },
        { severity: 'MEDIUM', count: 67 },
        { severity: 'LOW', count: 45 },
        { severity: 'INFO', count: 23 },
      ],
      alertsByProject: [
        { project: 'payments-api', count: 45 },
        { project: 'user-service', count: 38 },
        { project: 'web-frontend', count: 32 },
        { project: 'auth-service', count: 28 },
        { project: 'notifications', count: 18 },
      ],
      alertsByEnvironment: [
        { environment: 'production', count: 89 },
        { environment: 'staging', count: 42 },
        { environment: 'development', count: 30 },
      ],
      totalAlerts: 181,
      resolvedAlerts: 142,
      openAlerts: 39,
      mttr: 47,
      resolutionRate: 78.5,
    };
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-zinc-400 mt-1">Operational insights and metrics</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxAlertCount = Math.max(...data.alertsOverTime.map(d => d.count));
  const totalBySeverity = data.alertsBySeverity.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-zinc-400 mt-1">Operational insights and metrics</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-zinc-400">Total Alerts</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totalAlerts}</p>
          <p className="text-xs text-zinc-500 mt-1">in selected period</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-zinc-400">Resolution Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.resolutionRate}%</p>
          <p className="text-xs text-zinc-500 mt-1">{data.resolvedAlerts} resolved</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-zinc-400">Avg. Resolution Time</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {data.mttr < 60 ? `${data.mttr}m` : `${(data.mttr / 60).toFixed(1)}h`}
          </p>
          <p className="text-xs text-zinc-500 mt-1">mean time to resolution</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm text-zinc-400">Open Alerts</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.openAlerts}</p>
          <p className="text-xs text-zinc-500 mt-1">require attention</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts Over Time */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-white">Alerts Over Time</h3>
          </div>
          <div className="h-48 flex items-end gap-1">
            {data.alertsOverTime.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-red-600/80 rounded-t hover:bg-red-500 transition-colors cursor-pointer"
                  style={{ height: `${(day.count / maxAlertCount) * 100}%`, minHeight: '4px' }}
                  title={`${day.date}: ${day.count} alerts`}
                ></div>
                {data.alertsOverTime.length <= 7 && (
                  <span className="text-[10px] text-zinc-600">{day.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts by Severity */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-white">Alerts by Severity</h3>
          </div>
          <div className="space-y-3">
            {data.alertsBySeverity.map((item) => (
              <div key={item.severity} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{item.severity}</span>
                  <span className="text-white font-medium">{item.count}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${severityColors[item.severity] || 'bg-zinc-500'} rounded-full transition-all`}
                    style={{ width: `${(item.count / totalBySeverity) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Project */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-white">Top Projects</h3>
          </div>
          <div className="space-y-3">
            {data.alertsByProject.map((item, i) => (
              <div key={item.project} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-sm text-zinc-300">{item.project}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Environment */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-white">Alerts by Environment</h3>
          </div>
          <div className="space-y-4">
            {data.alertsByEnvironment.map((item) => {
              const percentage = (item.count / data.totalAlerts) * 100;
              return (
                <div key={item.environment} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-300 capitalize">{item.environment}</span>
                    <span className="text-sm text-zinc-400">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
