'use client';

import { useEffect, useState } from 'react';
import { Play, Pause, XCircle, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionReplayPlayerProps {
    alertGroupId: string;
}

interface SessionReplayData {
    hasReplay: boolean;
    id?: string;
    sessionId?: string;
    duration?: number;
    events?: unknown[];
}

export function SessionReplayPlayer({ alertGroupId }: SessionReplayPlayerProps) {
    const [replayData, setReplayData] = useState<SessionReplayData | null>(null);
    const [loading, setLoading] = useState(true);
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        async function checkReplay() {
            try {
                const res = await fetch(`/api/alert-groups/${alertGroupId}/session-replay`);
                if (res.ok) {
                    const data = await res.json();
                    setReplayData(data);
                }
            } catch (err) {
                console.error('Failed to check session replay:', err);
            } finally {
                setLoading(false);
            }
        }
        checkReplay();
    }, [alertGroupId]);

    if (loading) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className="border-zinc-700 text-zinc-500"
            >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking replay...
            </Button>
        );
    }

    if (!replayData?.hasReplay) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className="border-zinc-700 text-zinc-500"
                title="No session replay available for this alert"
            >
                <Film className="w-4 h-4 mr-2" />
                No Replay
            </Button>
        );
    }

    function formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return (
        <>
            <Button
                onClick={() => setPlayerOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white"
            >
                <Play className="w-4 h-4 mr-2" />
                Watch Replay
                {replayData.duration && (
                    <span className="ml-2 text-xs opacity-75">
                        ({formatDuration(replayData.duration)})
                    </span>
                )}
            </Button>

            {/* Replay Modal */}
            {playerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                    <div className="bg-zinc-900 rounded-xl border border-white/10 w-[90vw] max-w-6xl max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <Film className="w-5 h-5 text-violet-400" />
                                <span className="font-medium text-white">Session Replay</span>
                                <span className="text-sm text-zinc-500">
                                    Session: {replayData.sessionId?.slice(0, 8)}...
                                </span>
                            </div>
                            <button
                                onClick={() => setPlayerOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <XCircle className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Player */}
                        <div className="relative bg-zinc-950 aspect-video flex items-center justify-center">
                            {/* Placeholder for rrweb-player */}
                            <div className="text-center">
                                <Film className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500 text-lg">Session Replay Player</p>
                                <p className="text-zinc-600 text-sm mt-2">
                                    Install rrweb-player to enable playback
                                </p>
                                <code className="text-xs text-zinc-600 mt-4 block">
                                    npm install rrweb-player
                                </code>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPlaying(!playing)}
                                className="border-zinc-700 text-white hover:bg-zinc-800"
                            >
                                {playing ? (
                                    <Pause className="w-4 h-4 mr-2" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                {playing ? 'Pause' : 'Play'}
                            </Button>
                            {replayData.duration && (
                                <span className="text-sm text-zinc-500">
                                    Duration: {formatDuration(replayData.duration)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
