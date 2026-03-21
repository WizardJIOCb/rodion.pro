import React from 'react';
import { useCollectorState } from '../hooks/useCollectorState';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useTimeline } from '../hooks/useTimeline';
import { MiniTimeSeriesChart } from '../components/charts/MiniTimeSeriesChart';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { TopAppsList } from '../components/TopAppsList';
import { LivePulse } from '../components/LivePulse';
import { TimeSinceUpdate } from '../components/TimeSinceUpdate';

const api = window.activityAPI;

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function todayStr(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

export function StatusTab() {
  const { state, refresh } = useCollectorState();
  const sync = useSyncStatus();
  const { aggregated } = useTimeline(todayStr());

  if (!state) return <div className="text-[var(--text-dim)]">Connecting...</div>;

  const handlePause = async (minutes: number) => {
    await api.pause(minutes);
    refresh();
  };
  const handleResume = async () => {
    await api.resume();
    refresh();
  };

  return (
    <div className="space-y-3">
      {/* Current activity card */}
      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">Current Activity</h2>
          <div className="flex items-center gap-1.5">
            <TimeSinceUpdate lastTick={state.lastTick} />
            <LivePulse active={!state.isPaused && !state.isAfk} size={6} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${state.isPaused ? 'bg-[var(--warning)]' : state.isAfk ? 'bg-[var(--text-dim)]' : 'bg-[var(--success)]'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">
              {state.isPaused ? 'Paused' : state.isAfk ? 'AFK' : state.now?.app ?? 'Unknown'}
            </div>
            <div className="text-xs text-[var(--text-dim)]">{state.category}</div>
          </div>
        </div>
        {state.now && !state.isPaused && (
          <div className="text-xs text-[var(--text-dim)] truncate mt-1">{state.now.title}</div>
        )}
        {state.isPaused && state.pauseUntil && (
          <div className="text-xs text-[var(--warning)] mt-1">
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
      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Today</h2>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-lg font-bold text-[var(--accent)]">{formatDuration(state.todayTotals.activeSec)}</div>
            <div className="text-[10px] text-[var(--text-dim)]">Active</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.keys.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--text-dim)]">Keys</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.clicks.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--text-dim)]">Clicks</div>
          </div>
          <div>
            <div className="text-lg font-bold">{state.todayTotals.scroll.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--text-dim)]">Scroll</div>
          </div>
        </div>
      </div>

      {/* Activity chart */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Activity Today</h2>
          <MiniTimeSeriesChart data={aggregated.series} />
        </div>
      )}

      {/* Category breakdown */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Categories</h2>
          <CategoryDonut
            data={aggregated.topCategories}
            totalActiveSec={aggregated.totals.activeSec}
          />
        </div>
      )}

      {/* Top apps */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Top Apps</h2>
          <TopAppsList apps={aggregated.topApps} max={5} />
        </div>
      )}

      {/* Sync status */}
      {sync && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">Sync</h2>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${sync.isOnline ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {sync.isOnline ? 'Online' : 'Offline'}
              </span>
              <LivePulse active={sync.isOnline} size={6} />
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Queue</span>
              <span>
                {sync.queuedCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <LivePulse active color="var(--warning)" size={4} />
                    {sync.queuedCount} events
                  </span>
                ) : (
                  <span className="text-[var(--success)]">all synced</span>
                )}
              </span>
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
                <span className="flex items-center gap-1.5">
                  {new Date(sync.lastSyncAt).toLocaleTimeString()}
                  <TimeSinceUpdate lastTick={sync.lastSyncAt} />
                </span>
              </div>
            )}
            {sync.consecutiveFailures > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Retries</span>
                <span className="text-[var(--warning)]">{sync.consecutiveFailures} failures</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
