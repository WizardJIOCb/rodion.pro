import React from 'react';
import type { TopAppEntry } from '../utils/aggregateTimeline';
import { getCategoryColor } from '../utils/categoryColors';

interface Props {
  apps: TopAppEntry[];
  max?: number;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TopAppsList({ apps, max = 5 }: Props) {
  const visible = apps.slice(0, max);
  if (!visible.length) {
    return (
      <div className="text-xs text-[var(--text-dim)] py-4 text-center">
        No app data yet
      </div>
    );
  }

  const topActiveSec = visible[0]?.activeSec ?? 1;

  return (
    <div className="space-y-1.5">
      {visible.map((app) => {
        const pct = topActiveSec > 0 ? (app.activeSec / topActiveSec) * 100 : 0;
        return (
          <div key={app.app}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-[var(--text)] truncate flex-1 mr-2">{app.app}</span>
              <span className="text-[var(--text-dim)] flex-shrink-0">{formatDuration(app.activeSec)}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--bg)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getCategoryColor(app.category),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
