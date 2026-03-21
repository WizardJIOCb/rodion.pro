import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TimeSeriesPoint } from '../../utils/aggregateTimeline';

interface Props {
  data: TimeSeriesPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as TimeSeriesPoint;
  const mins = Math.round(p.activeSec / 60);
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
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{p.label}</div>
      <div style={{ color: 'var(--accent)' }}>{mins}m active</div>
      {p.keys > 0 && <div style={{ color: 'var(--text-dim)' }}>{p.keys.toLocaleString()} keys</div>}
    </div>
  );
}

export function MiniTimeSeriesChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="text-xs text-[var(--text-dim)] py-6 text-center">
        No activity data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
        <defs>
          <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4fc3f7" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#4fc3f7" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="activeSec"
          stroke="#4fc3f7"
          strokeWidth={2}
          fill="url(#activeGrad)"
          dot={false}
          activeDot={{ r: 3, fill: '#4fc3f7' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
