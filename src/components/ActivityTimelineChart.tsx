import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface SeriesPoint {
  t: string;
  activeSec: number;
  afkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

type ChartMode = 'metrics' | 'byWindow';

interface ActivityTimelineChartProps {
  series: SeriesPoint[];
  seriesByWindow?: Array<{ t: string; [key: string]: string | number }>;
  windowLabels?: string[];
  lang: 'ru' | 'en';
  onCategoryChange: (categories: string[]) => void;
  selectedCategories: string[];
  group?: '15min' | 'hour' | 'day';
  timeRange?: '1h' | '4h' | 'today' | '7d' | '30d' | 'custom';
}

interface MetricConfig {
  key: keyof SeriesPoint;
  labelEn: string;
  labelRu: string;
  colorVar: string;
  yAxisId: 'time' | 'count';
  type: 'area' | 'line';
  defaultOn: boolean;
}

const METRICS: MetricConfig[] = [
  { key: 'activeSec', labelEn: 'Active Time', labelRu: 'Активное время', colorVar: '--accent', yAxisId: 'time', type: 'area', defaultOn: true },
  { key: 'afkSec', labelEn: 'AFK Time', labelRu: 'Неактивен', colorVar: '--muted', yAxisId: 'time', type: 'area', defaultOn: false },
  { key: 'keys', labelEn: 'Keys', labelRu: 'Клавиши', colorVar: '--accent2', yAxisId: 'count', type: 'line', defaultOn: true },
  { key: 'clicks', labelEn: 'Clicks', labelRu: 'Клики', colorVar: '--warn', yAxisId: 'count', type: 'line', defaultOn: true },
  { key: 'scroll', labelEn: 'Scroll', labelRu: 'Прокрутка', colorVar: '--success', yAxisId: 'count', type: 'line', defaultOn: false },
];

const CATEGORIES = [
  { key: '', labelEn: 'All', labelRu: 'Все' },
  { key: 'coding', labelEn: 'Coding', labelRu: 'Кодинг' },
  { key: 'browser', labelEn: 'Browser', labelRu: 'Браузер' },
  { key: 'entertainment', labelEn: 'Entertainment', labelRu: 'Развлечения' },
  { key: 'comms', labelEn: 'Comms', labelRu: 'Общение' },
  { key: 'system', labelEn: 'System', labelRu: 'Система' },
  { key: 'unknown', labelEn: 'Unknown', labelRu: 'Неизвестно' },
];

const WINDOW_COLOR_VARS = ['--accent', '--accent2', '--warn', '--success', '--danger', '--muted'];

function useThemeColors() {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const vars = ['--accent', '--accent2', '--muted', '--warn', '--success', '--danger', '--border', '--surface', '--text', '--bg'];
    const result: Record<string, string> = {};
    for (const v of vars) {
      result[v] = style.getPropertyValue(v).trim();
    }
    setColors(result);
  }, []);

  return colors;
}

function formatTimeTick(sec: number): string {
  if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${sec}s`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const SingleMetricTooltip = ({ active, payload, label, metric, theme, lang }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const value = metric.yAxisId === 'time'
    ? formatDuration(entry.value)
    : entry.value.toLocaleString();

  return (
    <div
      style={{
        backgroundColor: theme['--surface'] || '#111823',
        border: `1px solid ${theme['--border'] || '#243244'}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: theme['--text'] || '#e7eef7',
        fontSize: 13,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: theme['--muted'] || '#a7b3c2' }}>
          {lang === 'ru' ? metric.labelRu : metric.labelEn}:
        </span>
        <span style={{ fontWeight: 500 }}>{value}</span>
      </div>
    </div>
  );
};

const WindowTooltip = ({ active, payload, label, theme, windowColors }: any) => {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, e: any) => sum + (e.value || 0), 0);
  const sorted = [...payload].filter((e: any) => e.value > 0).sort((a: any, b: any) => b.value - a.value);

  return (
    <div
      style={{
        backgroundColor: theme['--surface'] || '#111823',
        border: `1px solid ${theme['--border'] || '#243244'}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: theme['--text'] || '#e7eef7',
        fontSize: 13,
        maxWidth: 360,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {sorted.map((entry: any) => {
        const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
        return (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: windowColors[entry.dataKey] || entry.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.dataKey}
            </span>
            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: 12 }}>
              {formatDuration(entry.value)} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
};

const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({
  series,
  seriesByWindow,
  windowLabels,
  lang,
  onCategoryChange,
  selectedCategories,
  group = 'hour',
  timeRange = '4h',
}) => {
  const theme = useThemeColors();
  const [mode, setMode] = useState<ChartMode>('metrics');

  // Single metric selection (simplified from multi-toggle)
  const [selectedMetric, setSelectedMetric] = useState<keyof SeriesPoint>('activeSec');

  // Format time range label
  const rangeLabels: Record<string, { en: string; ru: string }> = {
    '1h': { en: 'Last hour', ru: 'Последний час' },
    '4h': { en: 'Last 4 hours', ru: 'Последние 4 часа' },
    'today': { en: 'Today', ru: 'Сегодня' },
    '7d': { en: 'Last 7 days', ru: 'Последние 7 дней' },
    '30d': { en: 'Last 30 days', ru: 'Последние 30 дней' },
    'custom': { en: 'Custom range', ru: 'Выбранный период' },
  };
  const rangeLabel = rangeLabels[timeRange]?.[lang] || timeRange;

  const toggleCategory = (catKey: string) => {
    if (catKey === '') {
      onCategoryChange([]);
      return;
    }
    const current = new Set(selectedCategories);
    if (current.has(catKey)) {
      current.delete(catKey);
    } else {
      current.add(catKey);
    }
    onCategoryChange(Array.from(current));
  };

  const transformedData = useMemo(() =>
    series.map(p => {
      const d = new Date(p.t);
      let timeLabel: string;
      if (group === 'day') {
        timeLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (group === '15min') {
        timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else {
        timeLabel = `${d.getHours().toString().padStart(2, '0')}:00`;
      }
      return {
        ...p,
        hourLabel: timeLabel,
      };
    }),
    [series, group],
  );

  // Prepare stacked area data for "By Window" mode
  const windowChartData = useMemo(() => {
    if (!seriesByWindow || seriesByWindow.length === 0) {
      return { data: [], keys: [] as string[], colors: {} as Record<string, string> };
    }

    // Use server-provided label ordering, fallback to extracting from data
    const keys = windowLabels && windowLabels.length > 0
      ? windowLabels
      : (() => {
          const keySet = new Set<string>();
          for (const point of seriesByWindow) {
            for (const k of Object.keys(point)) {
              if (k !== 't') keySet.add(k);
            }
          }
          const arr = Array.from(keySet);
          // Put "Other" last
          arr.sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return a.localeCompare(b);
          });
          return arr;
        })();

    // Assign colors cycling through palette; "Other" gets muted + opacity
    const colors: Record<string, string> = {};
    let colorIdx = 0;
    for (const key of keys) {
      if (key === 'Other') {
        colors[key] = `${theme['--muted'] || '#888'}`;
      } else {
        const cssVar = WINDOW_COLOR_VARS[colorIdx % WINDOW_COLOR_VARS.length] as string;
        colors[key] = theme[cssVar] || '#888';
        colorIdx++;
      }
    }

    const data = seriesByWindow.map(p => {
      const d = new Date(p.t as string);
      let timeLabel: string;
      if (group === 'day') {
        timeLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (group === '15min') {
        timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } else {
        timeLabel = `${d.getHours().toString().padStart(2, '0')}:00`;
      }
      return {
        ...p,
        hourLabel: timeLabel,
      };
    });

    return { data, keys, colors };
  }, [seriesByWindow, windowLabels, theme, group]);

  const currentMetric = METRICS.find(m => m.key === selectedMetric)!;
  const isTimeMetric = currentMetric.yAxisId === 'time';
  const hasWindowData = seriesByWindow && seriesByWindow.length > 0;

  const resolveColor = (cssVar: string) => theme[cssVar] || '#888';

  const t = lang === 'ru'
    ? { timeline: 'Хронология активности', showing: rangeLabel, metrics: 'Метрики', categories: 'Категории', byWindow: 'По окнам', noWindowData: 'Нет данных по окнам' }
    : { timeline: 'Activity Timeline', showing: rangeLabel, metrics: 'Metrics', categories: 'Categories', byWindow: 'By Window', noWindowData: 'No window data available' };

  if (!series.length) {
    return (
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text">{t.timeline}</h2>
        </div>

        {/* Category filter chips — always visible */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-muted self-center mr-1">{t.categories}:</span>
          {CATEGORIES.map(cat => {
            const isAll = cat.key === '';
            const isOn = isAll ? selectedCategories.length === 0 : selectedCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono transition-all duration-200 border cursor-pointer"
                style={{
                  backgroundColor: isOn ? `${theme['--accent'] || '#38e8d6'}15` : 'transparent',
                  borderColor: isOn ? (theme['--accent'] || '#38e8d6') : (theme['--border'] || '#243244'),
                  color: isOn ? (theme['--accent'] || '#38e8d6') : (theme['--muted'] || '#a7b3c2'),
                }}
              >
                {lang === 'ru' ? cat.labelRu : cat.labelEn}
              </button>
            );
          })}
        </div>

        <div className="card p-6 text-center text-muted">
          {lang === 'ru' ? 'Нет данных за выбранный период' : 'No data for selected period'}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-text">{t.timeline}</h2>
        <div className="text-sm text-muted">{t.showing}</div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setMode('metrics')}
          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 border cursor-pointer"
          style={{
            backgroundColor: mode === 'metrics' ? `${theme['--accent'] || '#38e8d6'}20` : 'transparent',
            borderColor: mode === 'metrics' ? (theme['--accent'] || '#38e8d6') : (theme['--border'] || '#243244'),
            color: mode === 'metrics' ? (theme['--accent'] || '#38e8d6') : (theme['--muted'] || '#a7b3c2'),
          }}
        >
          {t.metrics}
        </button>
        <button
          onClick={() => setMode('byWindow')}
          disabled={!hasWindowData}
          className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 border cursor-pointer"
          style={{
            backgroundColor: mode === 'byWindow' ? `${theme['--accent'] || '#38e8d6'}20` : 'transparent',
            borderColor: mode === 'byWindow' ? (theme['--accent'] || '#38e8d6') : (theme['--border'] || '#243244'),
            color: mode === 'byWindow' ? (theme['--accent'] || '#38e8d6') : (theme['--muted'] || '#a7b3c2'),
            opacity: hasWindowData ? 1 : 0.4,
            cursor: hasWindowData ? 'pointer' : 'default',
          }}
        >
          {t.byWindow}
        </button>
      </div>

      {/* Metric toggle pills (only in metrics mode) - single selection */}
      {mode === 'metrics' && (
        <div className="flex flex-wrap gap-2 mb-3">
          {METRICS.map(m => {
            const isOn = selectedMetric === m.key;
            const color = resolveColor(m.colorVar);
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer"
                style={{
                  backgroundColor: isOn ? `${color}20` : 'transparent',
                  borderColor: isOn ? color : (theme['--border'] || '#243244'),
                  color: isOn ? color : (theme['--muted'] || '#a7b3c2'),
                  opacity: isOn ? 1 : 0.6,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    opacity: isOn ? 1 : 0.3,
                  }}
                />
                {lang === 'ru' ? m.labelRu : m.labelEn}
              </button>
            );
          })}
        </div>
      )}

      {/* Window legend pills (only in byWindow mode) */}
      {mode === 'byWindow' && windowChartData.keys.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {windowChartData.keys.map(key => {
            const color = windowChartData.colors[key] || '#888';
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${color}15`,
                  borderColor: `${color}40`,
                  color: theme['--text'] || '#e7eef7',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    opacity: key === 'Other' ? 0.5 : 1,
                  }}
                />
                {key}
              </span>
            );
          })}
        </div>
      )}

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-muted self-center mr-1">{t.categories}:</span>
        {CATEGORIES.map(cat => {
          const isAll = cat.key === '';
          const isOn = isAll ? selectedCategories.length === 0 : selectedCategories.includes(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono transition-all duration-200 border cursor-pointer"
              style={{
                backgroundColor: isOn ? `${theme['--accent'] || '#38e8d6'}15` : 'transparent',
                borderColor: isOn ? (theme['--accent'] || '#38e8d6') : (theme['--border'] || '#243244'),
                color: isOn ? (theme['--accent'] || '#38e8d6') : (theme['--muted'] || '#a7b3c2'),
              }}
            >
              {lang === 'ru' ? cat.labelRu : cat.labelEn}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {mode === 'byWindow' && !hasWindowData ? (
        <div className="card p-6 text-center text-muted">{t.noWindowData}</div>
      ) : (
        <div className="card p-4">
          <ResponsiveContainer width="100%" height={350}>
            {mode === 'metrics' ? (
              <ComposedChart data={transformedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${theme['--border'] || '#243244'}80`} />
                <XAxis
                  dataKey="hourLabel"
                  tick={{ fill: theme['--muted'] || '#a7b3c2', fontSize: 11 }}
                  axisLine={{ stroke: theme['--border'] || '#243244' }}
                  tickLine={{ stroke: theme['--border'] || '#243244' }}
                />
                <YAxis
                  yAxisId="main"
                  tick={{ fill: theme['--muted'] || '#a7b3c2', fontSize: 11 }}
                  axisLine={{ stroke: theme['--border'] || '#243244' }}
                  tickLine={false}
                  tickFormatter={isTimeMetric ? formatTimeTick : (v) => v.toLocaleString()}
                  width={50}
                />
                <Tooltip
                  content={
                    <SingleMetricTooltip
                      metric={currentMetric}
                      theme={theme}
                      lang={lang}
                    />
                  }
                />
                {currentMetric.type === 'area' ? (
                  <Area
                    yAxisId="main"
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={resolveColor(currentMetric.colorVar)}
                    fill={`${resolveColor(currentMetric.colorVar)}30`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: resolveColor(currentMetric.colorVar) }}
                  />
                ) : (
                  <Line
                    yAxisId="main"
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={resolveColor(currentMetric.colorVar)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: resolveColor(currentMetric.colorVar) }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </ComposedChart>
            ) : (
              <ComposedChart data={windowChartData.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${theme['--border'] || '#243244'}80`} />
                <XAxis
                  dataKey="hourLabel"
                  tick={{ fill: theme['--muted'] || '#a7b3c2', fontSize: 11 }}
                  axisLine={{ stroke: theme['--border'] || '#243244' }}
                  tickLine={{ stroke: theme['--border'] || '#243244' }}
                />
                <YAxis
                  yAxisId="time"
                  tick={{ fill: theme['--muted'] || '#a7b3c2', fontSize: 11 }}
                  axisLine={{ stroke: theme['--border'] || '#243244' }}
                  tickLine={false}
                  tickFormatter={formatTimeTick}
                  width={45}
                />
                <Tooltip
                  content={
                    <WindowTooltip
                      theme={theme}
                      windowColors={windowChartData.colors}
                    />
                  }
                />
                {windowChartData.keys.map(windowKey => (
                  <Area
                    key={windowKey}
                    yAxisId="time"
                    type="monotone"
                    dataKey={windowKey}
                    stackId="windows"
                    stroke={windowChartData.colors[windowKey]}
                    fill={windowChartData.colors[windowKey]}
                    strokeWidth={1}
                    fillOpacity={windowKey === 'Other' ? 0.35 : 0.75}
                  />
                ))}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default ActivityTimelineChart;
