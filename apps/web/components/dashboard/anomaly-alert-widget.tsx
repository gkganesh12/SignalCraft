'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface AnomalyAlert {
    alertGroupId: string;
    title: string;
    severity: string;
    currentVelocity: number;
    baselineVelocity: number;
    percentageIncrease: number;
    detectedAt: string;
}

const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-950/50 text-red-400 border-red-900/30',
    HIGH: 'bg-orange-950/50 text-orange-400 border-orange-900/30',
    MEDIUM: 'bg-yellow-950/50 text-yellow-400 border-yellow-900/30',
    LOW: 'bg-blue-950/50 text-blue-400 border-blue-900/30',
    INFO: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function AnomalyAlertWidget() {
    const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnomalies() {
            try {
                const res = await fetch('/api/alert-groups/anomalies');
                if (res.ok) {
                    const data = await res.json();
                    setAnomalies(data);
                }
            } catch (err) {
                console.error('Failed to fetch anomalies:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchAnomalies();

        // Refresh every 2 minutes
        const interval = setInterval(fetchAnomalies, 120000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-red-950/30 to-orange-950/30 border border-red-900/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                    <h3 className="font-semibold text-white">Anomaly Detection</h3>
                </div>
                <div className="animate-pulse space-y-2">
                    <div className="h-8 bg-zinc-800/50 rounded"></div>
                    <div className="h-8 bg-zinc-800/50 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (anomalies.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-white">Anomaly Detection</h3>
                    </div>
                    <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900/50">
                        All Normal
                    </span>
                </div>
                <p className="text-zinc-500 text-sm">No anomalies detected. Error rates are within normal bounds.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-red-950/30 to-orange-950/30 border border-red-900/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                    <h3 className="font-semibold text-white">Anomaly Detection</h3>
                </div>
                <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-900/50 animate-pulse">
                    {anomalies.length} Detected
                </span>
            </div>

            <div className="space-y-3">
                {anomalies.slice(0, 5).map((anomaly) => (
                    <Link
                        key={anomaly.alertGroupId}
                        href={`/dashboard/alerts/${anomaly.alertGroupId}`}
                        className="block p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white font-medium truncate max-w-[60%]">
                                {anomaly.title}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${severityColors[anomaly.severity] || severityColors.INFO}`}>
                                {anomaly.severity}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1 text-red-400">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{Math.round(anomaly.percentageIncrease)}%</span>
                            </div>
                            <span className="text-zinc-500">
                                {anomaly.currentVelocity.toFixed(1)}/hr (baseline: {anomaly.baselineVelocity.toFixed(1)}/hr)
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {anomalies.length > 5 && (
                <div className="mt-3 text-center">
                    <Link href="/dashboard/alerts" className="text-xs text-red-400 hover:text-red-300">
                        View all {anomalies.length} anomalies →
                    </Link>
                </div>
            )}
        </div>
    );
}
