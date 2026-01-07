'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Package, TrendingUp, TrendingDown } from 'lucide-react';

interface ReleaseHealth {
    id: string;
    version: string;
    environment: string;
    deployedAt: string;
    errorCount: number;
    affectedUsers: number;
    deltaFromPrevious: number;
}

export function ReleaseHealthWidget() {
    const [releases, setReleases] = useState<ReleaseHealth[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReleases() {
            try {
                const res = await fetch('/api/releases/health?limit=5');
                if (res.ok) {
                    const data = await res.json();
                    setReleases(data);
                }
            } catch (err) {
                console.error('Failed to fetch release health:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchReleases();
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Release Health</h3>
                </div>
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-zinc-800 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (releases.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Release Health</h3>
                </div>
                <p className="text-zinc-500 text-sm">No releases tracked yet.</p>
                <p className="text-zinc-600 text-xs mt-2">
                    Releases are automatically tracked from incoming error data.
                </p>
            </div>
        );
    }

    function formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold text-white">Release Health</h3>
                </div>
                <span className="text-xs text-zinc-500">Last 5 releases</span>
            </div>

            <div className="space-y-3">
                {releases.map((release, index) => (
                    <div
                        key={release.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            index === 0
                                ? 'bg-zinc-800/50 border-red-900/30'
                                : 'bg-zinc-800/30 border-white/5'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-white">
                                        {release.version}
                                    </span>
                                    {index === 0 && (
                                        <span className="px-1.5 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900/50">
                                            Latest
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                    <span>{release.environment}</span>
                                    <span>•</span>
                                    <span>{formatTimeAgo(release.deployedAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-sm font-medium text-white">
                                    {release.errorCount} errors
                                </div>
                                <div className="text-xs text-zinc-500">
                                    {release.affectedUsers} users
                                </div>
                            </div>

                            {release.deltaFromPrevious !== 0 && (
                                <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                        release.deltaFromPrevious > 0
                                            ? 'bg-red-900/30 text-red-400'
                                            : 'bg-green-900/30 text-green-400'
                                    }`}
                                >
                                    {release.deltaFromPrevious > 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    {release.deltaFromPrevious > 0 ? '+' : ''}
                                    {release.deltaFromPrevious}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
