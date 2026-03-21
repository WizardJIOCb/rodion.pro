import React, { useState, useCallback } from 'react';
import { useCollectorState } from '../hooks/useCollectorState';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useTimelineRange } from '../hooks/useTimelineRange';
import { MiniTimeSeriesChart } from '../components/charts/MiniTimeSeriesChart';
import { CategoryDonut } from '../components/charts/CategoryDonut';
import { TopAppsList } from '../components/TopAppsList';
import { LivePulse } from '../components/LivePulse';
import { TimeSinceUpdate } from '../components/TimeSinceUpdate';
import type { TimeRange, MetricKey, SortKey, PeriodSummary } from '../utils/aggregateTimeline';

const api = window.activityAPI;

// ── Helpers ──

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Constants ──

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '1h', label: '1h' },
  { key: '4h', label: '4h' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
];

const METRIC_PILLS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'activeSec', label: 'Active',  color: '#4fc3f7' },
  { key: 'afkSec',    label: 'AFK',     color: '#8892a4' },
  { key: 'keys',      label: 'Keys',    color: '#ff9800' },
  { key: 'clicks',    label: 'Clicks',  color: '#f44336' },
  { key: 'scroll',    label: 'Scroll',  color: '#4caf50' },
];

const CATEGORY_CHIPS: { key: string; label: string }[] = [
  { key: '',              label: 'All' },
  { key: 'coding',        label: 'Coding' },
  { key: 'browser',       label: 'Browser' },
  { key: 'entertainment', label: 'Entertain' },
  { key: 'comms',         label: 'Comms' },
  { key: 'system',        label: 'System' },
  { key: 'unknown',       label: 'Unknown' },
];

type PeriodKey = 'today' | 'week' | 'month' | 'allTime';

const PERIOD_SECTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: 'allTime', label: 'All Time' },
];

// ── Period Summary Row ──

function PeriodRow({ label, summary, isOpen, onToggle }: {
  label: string;
  summary: PeriodSummary | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2.5 px-2 text-sm hover:bg-[var(--bg-hover)] transition-colors rounded"
      >
        <div className="flex items-center gap-2">
          <span className={`chevron text-[var(--text-dim)] text-xs ${isOpen ? 'chevron-open' : ''}`}>&#9654;</span>
          <span className="text-[var(--text)] font-medium">{label}</span>
        </div>
        <span className="text-[var(--accent)] font-semibold">
          {summary ? formatDuration(summary.activeSec) : '...'}
        </span>
      </button>
      <div
        className="accordion-body"
        style={{ maxHeight: isOpen ? 90 : 0, opacity: isOpen ? 1 : 0 }}
      >
        {summary && (
          <div className="grid grid-cols-4 gap-2 px-3 pb-3 text-center">
            <div>
              <div className="text-base font-bold">{summary.keys.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)]">Keys</div>
            </div>
            <div>
              <div className="text-base font-bold">{summary.clicks.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)]">Clicks</div>
            </div>
            <div>
              <div className="text-base font-bold">{summary.scroll.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)]">Scroll</div>
            </div>
            <div>
              <div className="text-base font-bold text-[var(--accent)]">{formatDuration(summary.activeSec)}</div>
              <div className="text-xs text-[var(--text-dim)]">Active</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main StatusTab ──

export function StatusTab() {
  const { state, refresh } = useCollectorState();
  const sync = useSyncStatus();

  // Dashboard state
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [metric, setMetric] = useState<MetricKey>('activeSec');
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<PeriodKey>>(new Set(['today']));
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const { aggregated, periodSummaries, loading } = useTimelineRange(timeRange, categories);

  // Use real-time today totals from collector state for "Today" period
  const effectivePeriodSummaries = {
    ...periodSummaries,
    today: state?.todayTotals ? {
      activeSec: state.todayTotals.activeSec,
      keys: state.todayTotals.keys,
      clicks: state.todayTotals.clicks,
      scroll: state.todayTotals.scroll,
    } : periodSummaries.today,
  };

  const handlePause = async (minutes: number) => {
    await api.pause(minutes);
    refresh();
  };
  const handleResume = async () => {
    await api.resume();
    refresh();
  };

  const togglePeriod = useCallback((key: PeriodKey) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    if (cat === '') {
      setCategories([]);
    } else {
      setCategories(prev => {
        if (prev.includes(cat)) return prev.filter(c => c !== cat);
        return [...prev, cat];
      });
    }
  }, []);

  if (!state) return <div className="text-[var(--text-dim)]">Connecting...</div>;

  return (
    <div className="space-y-3">
      {/* ── Current Activity ── */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-wider text-[var(--text-dim)]">Current Activity</h2>
          <div className="flex items-center gap-2">
            <TimeSinceUpdate lastTick={state.lastTick} />
            <LivePulse active={!state.isPaused && !state.isAfk} size={8} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${state.isPaused ? 'bg-[var(--warning)]' : state.isAfk ? 'bg-[var(--text-dim)]' : 'bg-[var(--success)]'}`} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold truncate">
              {state.isPaused ? 'Paused' : state.isAfk ? 'AFK' : state.now?.app ?? 'Unknown'}
            </div>
            <div className="text-sm text-[var(--text-dim)]">{state.category}</div>
          </div>
        </div>
        {state.now && !state.isPaused && (
          <div className="text-sm text-[var(--text-dim)] truncate mt-1">{state.now.title}</div>
        )}
        {state.isPaused && state.pauseUntil && (
          <div className="text-sm text-[var(--warning)] mt-1">
            Until {new Date(state.pauseUntil).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* ── Pause/Resume ── */}
      <div className="flex gap-2">
        {state.isPaused ? (
          <button onClick={handleResume} className="px-4 py-2 text-sm rounded bg-[var(--success)] text-white hover:opacity-90">
            Resume
          </button>
        ) : (
          <>
            <button onClick={() => handlePause(15)} className="px-4 py-2 text-sm rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]">
              Pause 15m
            </button>
            <button onClick={() => handlePause(60)} className="px-4 py-2 text-sm rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]">
              Pause 1h
            </button>
          </>
        )}
      </div>

      {/* ── Time Range Selector ── */}
      <div className="flex gap-1.5">
        {TIME_RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setTimeRange(r.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === r.key
                ? 'bg-[var(--accent)] text-[var(--bg)] font-semibold'
                : 'bg-[var(--bg-card)] text-[var(--text-dim)] border border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Period Summaries ── */}
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden">
        {PERIOD_SECTIONS.map(p => (
          <PeriodRow
            key={p.key}
            label={p.label}
            summary={effectivePeriodSummaries[p.key]}
            isOpen={expandedPeriods.has(p.key)}
            onToggle={() => togglePeriod(p.key)}
          />
        ))}
      </div>

      {/* ── Activity Chart ── */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-sm uppercase tracking-wider text-[var(--text-dim)] mb-3">Activity Timeline</h2>

        {/* Metric pills */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {METRIC_PILLS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                metric === m.key
                  ? 'border-current font-medium'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)]'
              }`}
              style={metric === m.key ? { color: m.color, borderColor: m.color, backgroundColor: `${m.color}18` } : undefined}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
            </button>
          ))}
        </div>

        {/* Category filter chips */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {CATEGORY_CHIPS.map(c => {
            const isAll = c.key === '';
            const isActive = isAll ? categories.length === 0 : categories.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleCategory(c.key)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] font-medium'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)]'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        {loading ? (
          <div className="text-sm text-[var(--text-dim)] py-6 text-center">Loading...</div>
        ) : aggregated ? (
          <MiniTimeSeriesChart data={aggregated.series} metric={metric} height={200} />
        ) : (
          <div className="text-sm text-[var(--text-dim)] py-6 text-center">No data for selected range</div>
        )}
      </div>

      {/* ── Top Apps ── */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
          <h2 className="text-sm uppercase tracking-wider text-[var(--text-dim)] mb-3">Top Apps</h2>
          <TopAppsList
            apps={aggregated.topApps}
            topTitles={aggregated.topTitles}
            sortKey={sortKey}
            onSortChange={setSortKey}
            expandedApp={expandedApp}
            onExpandApp={setExpandedApp}
            showDonut
            max={10}
          />
        </div>
      )}

      {/* ── Category Breakdown ── */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
          <h2 className="text-sm uppercase tracking-wider text-[var(--text-dim)] mb-3">Categories</h2>
          <CategoryDonut
            data={aggregated.topCategories}
            totalActiveSec={aggregated.totals.activeSec}
            mode="bars"
          />
        </div>
      )}

      {/* ── Sync Status ── */}
      {sync && (
        <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm uppercase tracking-wider text-[var(--text-dim)]">Sync</h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${sync.isOnline ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {sync.isOnline ? 'Online' : 'Offline'}
              </span>
              <LivePulse active={sync.isOnline} size={8} />
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Queue</span>
              <span>
                {sync.queuedCount > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <LivePulse active color="var(--warning)" size={5} />
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
