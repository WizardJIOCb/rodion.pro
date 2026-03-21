import React from 'react';
import type { TimelineTotals } from '../../utils/aggregateTimeline';

interface Props {
  totals: TimelineTotals;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DaySummaryCard({ totals }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div>
        <div className="text-base font-bold text-[var(--accent)]">{formatDuration(totals.activeSec)}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Active</div>
      </div>
      <div>
        <div className="text-base font-bold">{totals.keys.toLocaleString()}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Keys</div>
      </div>
      <div>
        <div className="text-base font-bold">{totals.clicks.toLocaleString()}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Clicks</div>
      </div>
      <div>
        <div className="text-base font-bold">{totals.scroll.toLocaleString()}</div>
        <div className="text-[10px] text-[var(--text-dim)]">Scroll</div>
      </div>
    </div>
  );
}
