'use client';

import { useEffect, useState } from 'react';
import { 
    Globe, 
    Terminal, 
    MousePointerClick, 
    Navigation, 
    User, 
    Bug,
    Info,
    AlertTriangle,
    XCircle,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

interface Breadcrumb {
    id: string;
    type: string;
    category: string | null;
    message: string;
    level: string;
    data: Record<string, unknown> | null;
    timestamp: string;
}

interface BreadcrumbTimelineProps {
    alertGroupId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
    http: <Globe className="w-4 h-4" />,
    console: <Terminal className="w-4 h-4" />,
    click: <MousePointerClick className="w-4 h-4" />,
    navigation: <Navigation className="w-4 h-4" />,
    user: <User className="w-4 h-4" />,
    debug: <Bug className="w-4 h-4" />,
    default: <Info className="w-4 h-4" />,
};

const levelColors: Record<string, string> = {
    debug: 'text-zinc-500 border-zinc-700',
    info: 'text-blue-400 border-blue-800/30',
    warning: 'text-yellow-400 border-yellow-800/30',
    error: 'text-red-400 border-red-800/30',
};

const levelIcons: Record<string, React.ReactNode> = {
    debug: <Bug className="w-3 h-3" />,
    info: <Info className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
};

export function BreadcrumbTimeline({ alertGroupId }: BreadcrumbTimelineProps) {
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        async function fetchBreadcrumbs() {
            try {
                const res = await fetch(`/api/alert-groups/${alertGroupId}/breadcrumbs`);
                if (res.ok) {
                    const data = await res.json();
                    setBreadcrumbs(data);
                }
            } catch (err) {
                console.error('Failed to fetch breadcrumbs:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchBreadcrumbs();
    }, [alertGroupId]);

    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-red-500" />
                    Breadcrumb Timeline
                </h3>
                <div className="animate-pulse space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 bg-zinc-800/50 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (breadcrumbs.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-red-500" />
                    Breadcrumb Timeline
                </h3>
                <p className="text-zinc-500 text-sm">No breadcrumbs available for this alert.</p>
                <p className="text-zinc-600 text-xs mt-1">
                    Breadcrumbs show events that occurred before the error.
                </p>
            </div>
        );
    }

    function formatTime(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
    }

    function toggleExpand(id: string) {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-red-500" />
                    Breadcrumb Timeline
                </h3>
                <span className="text-xs text-zinc-500">{breadcrumbs.length} events</span>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-zinc-800"></div>

                <div className="space-y-1">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="relative flex items-start gap-3 group">
                            {/* Timeline dot */}
                            <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-zinc-950 ${levelColors[crumb.level] || levelColors.info}`}>
                                {typeIcons[crumb.type] || typeIcons.default}
                            </div>

                            {/* Content */}
                            <div 
                                className={`flex-1 p-3 rounded-lg border transition-all cursor-pointer ${
                                    index === breadcrumbs.length - 1 
                                        ? 'bg-red-950/30 border-red-900/30' 
                                        : 'bg-zinc-800/30 border-white/5 hover:bg-zinc-800/50'
                                }`}
                                onClick={() => crumb.data && toggleExpand(crumb.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500 font-mono">
                                            {formatTime(crumb.timestamp)}
                                        </span>
                                        <span className={`px-1.5 py-0.5 text-xs rounded ${levelColors[crumb.level] || ''} bg-opacity-20`}>
                                            {crumb.type}
                                            {crumb.category && ` • ${crumb.category}`}
                                        </span>
                                    </div>
                                    {crumb.data && (
                                        <button className="text-zinc-500 hover:text-white">
                                            {expanded[crumb.id] ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-300 mt-1 line-clamp-2">{crumb.message}</p>
                                
                                {/* Expanded data */}
                                {expanded[crumb.id] && crumb.data && (
                                    <div className="mt-2 p-2 bg-zinc-950/50 rounded text-xs font-mono text-zinc-400 overflow-x-auto">
                                        <pre>{JSON.stringify(crumb.data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
