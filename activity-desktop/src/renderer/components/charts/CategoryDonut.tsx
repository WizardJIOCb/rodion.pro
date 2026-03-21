import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { TopCategoryEntry } from '../../utils/aggregateTimeline';
import { getCategoryColor } from '../../utils/categoryColors';

interface Props {
  data: TopCategoryEntry[];
  totalActiveSec: number;
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
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{d.category}</div>
      <div style={{ color: 'var(--text-dim)' }}>
        {formatDuration(d.activeSec)} ({d.percentage}%)
      </div>
    </div>
  );
}

export function CategoryDonut({ data, totalActiveSec }: Props) {
  if (!data.length) {
    return (
      <div className="text-xs text-[var(--text-dim)] py-6 text-center">
        No category data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Donut chart */}
      <div className="relative" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="activeSec"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={52}
              paddingAngle={2}
              strokeWidth={0}
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
        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="text-sm font-bold text-[var(--accent)]">
            {formatDuration(totalActiveSec)}
          </div>
          <div className="text-[10px] text-[var(--text-dim)]">total</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1 min-w-0">
        {data.slice(0, 6).map((cat) => (
          <div key={cat.category} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getCategoryColor(cat.category) }}
            />
            <span className="text-[var(--text)] truncate flex-1">{cat.category}</span>
            <span className="text-[var(--text-dim)] flex-shrink-0">{cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
