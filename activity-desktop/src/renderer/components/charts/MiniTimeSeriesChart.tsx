import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TimeSeriesPoint, MetricKey } from '../../utils/aggregateTimeline';

const METRIC_CONFIG: Record<MetricKey, { color: string; label: string; type: 'area' | 'line' }> = {
  activeSec: { color: '#4fc3f7', label: 'Active', type: 'area' },
  afkSec:    { color: '#8892a4', label: 'AFK',    type: 'area' },
  keys:      { color: '#ff9800', label: 'Keys',   type: 'line' },
  clicks:    { color: '#f44336', label: 'Clicks', type: 'line' },
  scroll:    { color: '#4caf50', label: 'Scroll', type: 'line' },
};

function formatSeconds(sec: number): string {
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec)}s`;
}

interface Props {
  data: TimeSeriesPoint[];
  metric?: MetricKey;
  height?: number;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const point = p.payload as TimeSeriesPoint;
  const metric = p.dataKey as MetricKey;
  const cfg = METRIC_CONFIG[metric];
  const value = point[metric] as number;
  const isTime = metric === 'activeSec' || metric === 'afkSec';
  const formatted = isTime ? formatSeconds(value) : value.toLocaleString();

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: '0.8125rem',
    }}>
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{point.label}</div>
      <div style={{ color: cfg.color }}>{cfg.label}: {formatted}</div>
    </div>
  );
}

export function MiniTimeSeriesChart({ data, metric = 'activeSec', height = 200 }: Props) {
  if (!data.length) {
    return (
      <div className="text-sm text-[var(--text-dim)] py-6 text-center">
        No activity data yet
      </div>
    );
  }

  const cfg = METRIC_CONFIG[metric];
  const isTime = metric === 'activeSec' || metric === 'afkSec';
  const gradId = `grad_${metric}`;

  return (
    <div className="chart-fade">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cfg.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={cfg.color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: 'var(--text-dim)', fontSize: '0.75rem' }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => isTime ? formatSeconds(v) : v.toLocaleString()}
          />
          <Tooltip content={<ChartTooltip />} />
          {cfg.type === 'area' ? (
            <Area
              type="monotone"
              dataKey={metric}
              stroke={cfg.color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: cfg.color }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={metric}
              stroke={cfg.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: cfg.color }}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
