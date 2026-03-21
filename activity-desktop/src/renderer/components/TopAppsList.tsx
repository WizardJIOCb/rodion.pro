import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { TopAppEntry, TopTitleEntry, SortKey } from '../utils/aggregateTimeline';
import { getCategoryColor } from '../utils/categoryColors';

// ── Helpers ──

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: 'time', label: 'Time' },
  { key: 'keys', label: 'Keys' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'scroll', label: 'Scroll' },
];

const APP_COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8',
  '#4dd0e1', '#aed581', '#ff8a65', '#f06292', '#7986cb',
];

// ── Donut Tooltip ──

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '8px 12px', fontSize: '0.8125rem',
    }}>
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{d.app}</div>
      <div style={{ color: 'var(--text-dim)' }}>{formatDuration(d.activeSec)} ({d.pct}%)</div>
    </div>
  );
}

// ── Props ──

interface Props {
  apps: TopAppEntry[];
  topTitles?: TopTitleEntry[];
  sortKey?: SortKey;
  onSortChange?: (key: SortKey) => void;
  expandedApp?: string | null;
  onExpandApp?: (app: string | null) => void;
  showDonut?: boolean;
  max?: number;
}

export function TopAppsList({
  apps,
  topTitles = [],
  sortKey = 'time',
  onSortChange,
  expandedApp = null,
  onExpandApp,
  showDonut = false,
  max = 10,
}: Props) {
  // Sort apps by selected key
  const sorted = useMemo(() => {
    const arr = [...apps];
    switch (sortKey) {
      case 'time':   return arr.sort((a, b) => b.activeSec - a.activeSec);
      case 'keys':   return arr.sort((a, b) => b.keys - a.keys);
      case 'clicks': return arr.sort((a, b) => b.clicks - a.clicks);
      case 'scroll': return arr.sort((a, b) => b.scroll - a.scroll);
    }
  }, [apps, sortKey]);

  const visible = sorted.slice(0, max);
  const totalActiveSec = apps.reduce((s, a) => s + a.activeSec, 0);

  if (!visible.length) {
    return <div className="text-sm text-[var(--text-dim)] py-4 text-center">No app data yet</div>;
  }

  const topValue = visible[0] ? (sortKey === 'time' ? visible[0].activeSec : visible[0][sortKey]) : 1;

  // Donut data
  const donutData = useMemo(() => {
    return visible.slice(0, 8).map(a => ({
      ...a,
      pct: totalActiveSec > 0 ? ((a.activeSec / totalActiveSec) * 100).toFixed(1) : '0',
    }));
  }, [visible, totalActiveSec]);

  return (
    <div className="space-y-3">
      {/* Sort pills */}
      {onSortChange && (
        <div className="flex gap-1.5 flex-wrap">
          {SORT_LABELS.map(s => (
            <button
              key={s.key}
              onClick={() => onSortChange(s.key)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                sortKey === s.key
                  ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--accent)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Donut chart */}
      {showDonut && donutData.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: 140, height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="activeSec"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 10 }} position={{ x: 0, y: -10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-base font-bold text-[var(--accent)]">{formatDuration(totalActiveSec)}</div>
              <div className="text-xs text-[var(--text-dim)]">total</div>
            </div>
          </div>

          {/* Donut legend */}
          <div className="flex-1 space-y-1 min-w-0">
            {donutData.map((app, i) => (
              <div key={app.app} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: APP_COLORS[i % APP_COLORS.length] }} />
                <span className="text-[var(--text)] truncate flex-1">{app.app}</span>
                <span className="text-[var(--text-dim)] flex-shrink-0">{app.pct}%</span>
                <span className="text-[var(--text-dim)] flex-shrink-0 w-14 text-right">{formatDuration(app.activeSec)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App list */}
      <div className="space-y-1">
        {visible.map((app) => {
          const isExpanded = expandedApp === app.app;
          const barValue = sortKey === 'time' ? app.activeSec : app[sortKey];
          const pct = topValue > 0 ? (barValue / topValue) * 100 : 0;
          const appPct = totalActiveSec > 0 ? ((app.activeSec / totalActiveSec) * 100).toFixed(1) : '0';
          const appTitles = topTitles.filter(t => t.app === app.app).slice(0, 15);

          return (
            <div key={app.app}>
              {/* App row */}
              <div
                className={`flex items-center gap-2 text-sm py-1.5 px-1.5 rounded cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${isExpanded ? 'bg-[var(--bg-hover)]' : ''}`}
                onClick={() => onExpandApp?.(isExpanded ? null : app.app)}
              >
                {/* Chevron */}
                {onExpandApp && (
                  <span className={`chevron text-[var(--text-dim)] text-xs flex-shrink-0 ${isExpanded ? 'chevron-open' : ''}`}>
                    &#9654;
                  </span>
                )}
                {/* Category dot */}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(app.category) }} />
                {/* App name */}
                <span className="text-[var(--text)] truncate flex-1 min-w-0">{app.app}</span>
                {/* Stats */}
                <span className="text-[var(--text-dim)] flex-shrink-0 text-xs">{app.keys.toLocaleString()}</span>
                <span className="text-[var(--text-dim)] flex-shrink-0 text-xs">{app.clicks.toLocaleString()}</span>
                <span className="text-[var(--text-dim)] flex-shrink-0 text-xs">{appPct}%</span>
                <span className="text-[var(--text)] flex-shrink-0 w-14 text-right font-medium">{formatDuration(app.activeSec)}</span>
              </div>

              {/* Progress bar */}
              <div className="ml-6 mr-1 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--bg)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: getCategoryColor(app.category) }}
                />
              </div>

              {/* Expanded window titles */}
              {isExpanded && appTitles.length > 0 && (
                <div className="ml-6 mt-1.5 mb-2.5 space-y-1">
                  {appTitles.map((title, i) => {
                    const titlePct = app.activeSec > 0 ? (title.activeSec / app.activeSec) * 100 : 0;
                    return (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--text-dim)] flex-shrink-0">|-</span>
                          <span className="text-[var(--text)] truncate flex-1 min-w-0" title={title.windowTitle}>
                            {title.windowTitle || '(no title)'}
                          </span>
                          <span className="text-[var(--text-dim)] flex-shrink-0">{title.keys.toLocaleString()}</span>
                          <span className="text-[var(--text)] flex-shrink-0 w-12 text-right">{formatDuration(title.activeSec)}</span>
                        </div>
                        <div className="ml-4 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--bg)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${titlePct}%`, backgroundColor: getCategoryColor(title.category), opacity: 0.6 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
