'use client';

import { useEffect, useState } from 'react';
import { Activity, ArrowUpCircle, ArrowDownCircle, Clock, Zap } from 'lucide-react';

interface UptimeCheck {
    id: string;
    name: string;
    url: string;
    method: string;
    interval: number;
    enabled: boolean;
    lastStatus: string | null;
    lastCheckedAt: string | null;
    uptimePercentage: number;
    avgResponseTime: number | null;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    up: {
        bg: 'bg-green-900/30',
        text: 'text-green-400',
        icon: <ArrowUpCircle className="w-4 h-4 text-green-400" />,
    },
    down: {
        bg: 'bg-red-900/30',
        text: 'text-red-400',
        icon: <ArrowDownCircle className="w-4 h-4 text-red-400" />,
    },
    degraded: {
        bg: 'bg-yellow-900/30',
        text: 'text-yellow-400',
        icon: <Clock className="w-4 h-4 text-yellow-400" />,
    },
};

export function UptimeStatusWidget() {
    const [checks, setChecks] = useState<UptimeCheck[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchChecks() {
            try {
                const res = await fetch('/api/uptime/checks');
                if (res.ok) {
                    const data = await res.json();
                    setChecks(data);
                }
            } catch (err) {
                console.error('Failed to fetch uptime checks:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchChecks();

        // Refresh every 30 seconds
        const interval = setInterval(fetchChecks, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Uptime Monitoring</h3>
                </div>
                <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-zinc-800/50 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (checks.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Uptime Monitoring</h3>
                </div>
                <div className="text-center py-4">
                    <p className="text-zinc-500 text-sm">No uptime checks configured.</p>
                    <p className="text-zinc-600 text-xs mt-1">
                        Add endpoint monitors to track service availability.
                    </p>
                </div>
            </div>
        );
    }

    const allUp = checks.every((c) => c.lastStatus === 'up' || c.lastStatus === null);
    const anyDown = checks.some((c) => c.lastStatus === 'down');

    return (
        <div className={`border rounded-xl p-6 ${
            anyDown 
                ? 'bg-gradient-to-r from-red-950/30 to-zinc-900/50 border-red-900/20' 
                : 'bg-zinc-900/50 border-white/5'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Uptime Monitoring</h3>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full border ${
                    allUp 
                        ? 'bg-green-900/30 text-green-400 border-green-900/50' 
                        : anyDown 
                            ? 'bg-red-900/30 text-red-400 border-red-900/50' 
                            : 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50'
                }`}>
                    {allUp ? 'All Systems Operational' : anyDown ? 'System Issues' : 'Degraded'}
                </span>
            </div>

            <div className="space-y-2">
                {checks.map((check) => {
                    const statusStyle = statusColors[check.lastStatus ?? 'up'] ?? statusColors.up;
                    
                    return (
                        <div
                            key={check.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${statusStyle.bg} border-white/5`}
                        >
                            <div className="flex items-center gap-3">
                                {statusStyle.icon}
                                <div>
                                    <p className="text-sm font-medium text-white">{check.name}</p>
                                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{check.url}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <p className={`text-sm font-medium ${statusStyle.text}`}>
                                        {check.uptimePercentage}%
                                    </p>
                                    <p className="text-xs text-zinc-500">uptime</p>
                                </div>
                                {check.avgResponseTime && (
                                    <div className="flex items-center gap-1 text-zinc-400">
                                        <Zap className="w-3 h-3" />
                                        <span className="text-xs">{check.avgResponseTime}ms</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
