import React, { useState, useEffect } from 'react';
import type { LocalTimelineEntry } from '../../shared/types';

const api = window.activityAPI;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CATEGORY_COLORS: Record<string, string> = {
  coding: '#4fc3f7',
  browser: '#ff9800',
  comms: '#ab47bc',
  meetings: '#ef5350',
  productivity: '#66bb6a',
  office: '#5c6bc0',
  design: '#ec407a',
  media: '#26a69a',
  games: '#d4e157',
  devops: '#8d6e63',
  system: '#78909c',
  utilities: '#bdbdbd',
  unknown: '#616161',
};

export function TimelineTab() {
  const [entries, setEntries] = useState<LocalTimelineEntry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    api.getTimeline(from, to).then(setEntries);
  }, [date]);

  // Group consecutive entries by app+category
  const grouped: Array<{ app: string; category: string; start: string; end: string; count: number; totalActiveSec: number }> = [];
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

  return (
    <div className="space-y-3">
      {/* Date picker */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)]"
        />
        <span className="text-xs text-[var(--text-dim)]">{entries.length} events</span>
      </div>

      {/* Timeline entries */}
      <div className="space-y-1">
        {grouped.length === 0 ? (
          <div className="text-sm text-[var(--text-dim)] py-8 text-center">No activity recorded</div>
        ) : (
          grouped.map((g, i) => (
            <div key={i} className="flex items-center gap-3 bg-[var(--bg-card)] rounded px-3 py-2 border border-[var(--border)]">
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[g.category] || CATEGORY_COLORS.unknown }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{g.app}</div>
                <div className="text-xs text-[var(--text-dim)]">{g.category}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-[var(--text-dim)]">{formatTime(g.start)}</div>
                <div className="text-xs text-[var(--text-dim)]">
                  {Math.round(g.totalActiveSec / 60)}m
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
