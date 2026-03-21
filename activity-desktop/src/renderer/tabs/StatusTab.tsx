import React from 'react';
import { useCollectorState } from '../hooks/useCollectorState';
import { useSyncStatus } from '../hooks/useSyncStatus';

const api = window.activityAPI;

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function StatusTab() {
  const state = useCollectorState();
  const sync = useSyncStatus();

  if (!state) return <div className="text-[var(--text-dim)]">Connecting...</div>;

  const handlePause = (minutes: number) => api.pause(minutes);
  const handleResume = () => api.resume();

  return (
    <div className="space-y-4">
      {/* Current activity card */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Current Activity</h2>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${state.isPaused ? 'bg-[var(--warning)]' : state.isAfk ? 'bg-[var(--text-dim)]' : 'bg-[var(--success)]'}`} />
          <div>
            <div className="text-sm font-medium">
              {state.isPaused ? 'Paused' : state.isAfk ? 'AFK' : state.now?.app ?? 'Unknown'}
            </div>
            <div className="text-xs text-[var(--text-dim)]">{state.category}</div>
          </div>
        </div>
        {state.now && !state.isPaused && (
          <div className="text-xs text-[var(--text-dim)] truncate">{state.now.title}</div>
        )}
        {state.isPaused && state.pauseUntil && (
          <div className="text-xs text-[var(--warning)]">
            Until {new Date(state.pauseUntil).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Pause/Resume controls */}
      <div className="flex gap-2">
        {state.isPaused ? (
          <button onClick={handleResume} className="px-3 py-1.5 text-xs rounded bg-[var(--success)] text-white hover:opacity-90">
            Resume
          </button>
        ) : (
          <>
            <button onClick={() => handlePause(15)} className="px-3 py-1.5 text-xs rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]">
              Pause 15m
            </button>
            <button onClick={() => handlePause(60)} className="px-3 py-1.5 text-xs rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]">
              Pause 1h
            </button>
          </>
        )}
      </div>

      {/* Today's totals */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Today</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-lg font-bold text-[var(--accent)]">{formatDuration(state.todayTotals.activeSec)}</div>
            <div className="text-xs text-[var(--text-dim)]">Active</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.keys.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">Keys</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.clicks.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">Clicks</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.scroll.toLocaleString()}</div>
            <div className="text-xs text-[var(--text-dim)]">Scroll</div>
          </div>
        </div>
      </div>

      {/* Sync status */}
      {sync && (
        <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Sync</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Status</span>
              <span className={sync.isOnline ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                {sync.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Queue</span>
              <span>{sync.queuedCount}</span>
            </div>
            {sync.failedCount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Failed</span>
                <span className="text-[var(--error)]">{sync.failedCount}</span>
              </div>
            )}
            {sync.lastSyncAt && (
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Last sync</span>
                <span>{new Date(sync.lastSyncAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
