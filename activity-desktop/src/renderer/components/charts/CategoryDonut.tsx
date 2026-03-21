import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { TopCategoryEntry } from '../../utils/aggregateTimeline';
import { getCategoryColor } from '../../utils/categoryColors';

interface Props {
  data: TopCategoryEntry[];
  totalActiveSec: number;
  mode?: 'donut' | 'bars';
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TopCategoryEntry;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: '0.8125rem',
    }}>
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{d.category}</div>
      <div style={{ color: 'var(--text-dim)' }}>{formatDuration(d.activeSec)} ({d.percentage}%)</div>
    </div>
  );
}

function CategoryBars({ data }: { data: TopCategoryEntry[] }) {
  const maxSec = data[0]?.activeSec || 1;

  return (
    <div className="space-y-2">
      {data.map(cat => {
        const pct = maxSec > 0 ? (cat.activeSec / maxSec) * 100 : 0;
        return (
          <div key={cat.category}>
            <div className="flex items-center gap-2 text-sm mb-0.5">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getCategoryColor(cat.category) }} />
              <span className="text-[var(--text)] capitalize flex-1 truncate">{cat.category}</span>
              <span className="text-[var(--text-dim)] flex-shrink-0">{formatDuration(cat.activeSec)}</span>
              <span className="text-[var(--text-dim)] flex-shrink-0 w-10 text-right">{cat.percentage}%</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: 'var(--bg)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: getCategoryColor(cat.category) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryDonut({ data, totalActiveSec, mode = 'donut' }: Props) {
  if (!data.length) {
    return <div className="text-sm text-[var(--text-dim)] py-6 text-center">No category data yet</div>;
  }

  if (mode === 'bars') {
    return <CategoryBars data={data} />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: 130, height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="activeSec"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={56}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={getCategoryColor(entry.category)} />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 10, pointerEvents: 'none' }}
              position={{ x: 0, y: -10 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-base font-bold text-[var(--accent)]">{formatDuration(totalActiveSec)}</div>
          <div className="text-xs text-[var(--text-dim)]">total</div>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 min-w-0">
        {data.slice(0, 6).map(cat => (
          <div key={cat.category} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getCategoryColor(cat.category) }} />
            <span className="text-[var(--text)] truncate flex-1">{cat.category}</span>
            <span className="text-[var(--text-dim)] flex-shrink-0">{cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
