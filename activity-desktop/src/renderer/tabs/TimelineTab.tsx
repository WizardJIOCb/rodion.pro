import React, { useState } from 'react';
import { useTimeline } from '../hooks/useTimeline';
import { ActivityBar24h } from '../components/charts/ActivityBar24h';
import { DaySummaryCard } from '../components/charts/DaySummaryCard';
import { getCategoryColor } from '../utils/categoryColors';
import { LivePulse } from '../components/LivePulse';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

export function TimelineTab() {
  const [date, setDate] = useState(todayStr);
  const { entries, aggregated, loading, lastRefresh } = useTimeline(date);
  const isToday = date === todayStr();

  // Group consecutive entries by app+category
  const grouped: Array<{
    app: string;
    category: string;
    start: string;
    end: string;
    count: number;
    totalActiveSec: number;
  }> = [];

  for (const entry of entries) {
    const last = grouped[grouped.length - 1];
    if (last && last.app === entry.app && last.category === entry.category) {
      last.end = entry.createdAt;
      last.count++;
      last.totalActiveSec += entry.activeSec;
    } else {
      grouped.push({
        app: entry.app,
        category: entry.category,
        start: entry.createdAt,
        end: entry.createdAt,
        count: 1,
        totalActiveSec: entry.activeSec,
      });
    }
  }

  const longestGroup = Math.max(...grouped.map(g => g.totalActiveSec), 1);

  return (
    <div className="space-y-3">
      {/* Date picker + live indicator */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)]"
        />
        <span className="text-xs text-[var(--text-dim)]">
          {loading ? 'Loading...' : `${entries.length} events`}
        </span>
        {isToday && !loading && (
          <span className="flex items-center gap-1 ml-auto text-[10px] text-[var(--success)]">
            <LivePulse active size={5} />
            LIVE
          </span>
        )}
      </div>

      {/* Day summary */}
      {aggregated && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <DaySummaryCard totals={aggregated.totals} />
        </div>
      )}

      {/* 24h activity bar */}
      {aggregated && aggregated.activityBar.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">24h Overview</h2>
          <ActivityBar24h segments={aggregated.activityBar} />
        </div>
      )}

      {/* Timeline entries */}
      <div>
        {grouped.length === 0 ? (
          <div className="text-sm text-[var(--text-dim)] py-8 text-center">
            {loading ? 'Loading activity...' : 'No activity recorded'}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline connector line */}
            <div
              className="absolute left-[11px] top-2 bottom-2 w-px"
              style={{ background: 'var(--border)' }}
            />

            <div className="space-y-0.5">
              {grouped.map((g, i) => {
                const durPct = (g.totalActiveSec / longestGroup) * 100;
                const showEndTime = g.start !== g.end;
                return (
                  <div
                    key={i}
                    className="flex items-stretch gap-3 bg-[var(--bg-card)] rounded px-3 py-2 border border-[var(--border)] relative"
                  >
                    {/* Category dot on timeline */}
                    <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: 8 }}>
                      <div
                        className="w-2 h-2 rounded-full z-10"
                        style={{ backgroundColor: getCategoryColor(g.category) }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate">{g.app}</div>
                        <div className="text-xs text-[var(--text-dim)] flex-shrink-0 ml-2">
                          {formatTime(g.start)}{showEndTime ? ` - ${formatTime(g.end)}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="text-xs text-[var(--text-dim)]">{g.category}</div>
                        <div className="text-xs text-[var(--text-dim)]">
                          {Math.round(g.totalActiveSec / 60)}m
                        </div>
                      </div>
                      {/* Mini duration bar */}
                      <div
                        className="mt-1 rounded-full overflow-hidden"
                        style={{ height: 3, background: 'var(--bg)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${durPct}%`,
                            backgroundColor: getCategoryColor(g.category),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
