import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface TopApp {
  app: string;
  category: string;
  activeSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

interface TopTitle {
  app: string;
  windowTitle: string;
  category: string;
  activeSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

interface ActivityTopAppsProps {
  topApps: TopApp[];
  topTitles: TopTitle[];
  lang: 'ru' | 'en';
}

function useThemeColors() {
  const [colors, setColors] = useState<Record<string, string>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const vars = ['--accent', '--accent2', '--muted', '--warn', '--success', '--danger', '--border', '--surface', '--surface2', '--text', '--bg'];
    const result: Record<string, string> = {};
    for (const v of vars) result[v] = style.getPropertyValue(v).trim();
    setColors(result);
  }, []);
  return colors;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

const PIE_COLOR_VARS = ['--accent', '--accent2', '--warn', '--success', '--danger', '--muted'];

const CustomPieTooltip = ({ active, payload, theme, lang, totals }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const timePct = totals.activeSec > 0 ? ((d.activeSec / totals.activeSec) * 100).toFixed(1) : '0';
  const keysPct = totals.keys > 0 ? ((d.keys / totals.keys) * 100).toFixed(1) : '0';
  const clicksPct = totals.clicks > 0 ? ((d.clicks / totals.clicks) * 100).toFixed(1) : '0';
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.app}</div>
      <div style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 11, marginBottom: 4 }}>{d.category}</div>
      <div>{lang === 'ru' ? 'Время' : 'Time'}: <strong>{formatDuration(d.activeSec)}</strong> <span style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 11 }}>({timePct}%)</span></div>
      <div>{lang === 'ru' ? 'Клавиши' : 'Keys'}: {d.keys.toLocaleString()} <span style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 11 }}>({keysPct}%)</span></div>
      <div>{lang === 'ru' ? 'Клики' : 'Clicks'}: {d.clicks.toLocaleString()} <span style={{ color: theme['--muted'] || '#a7b3c2', fontSize: 11 }}>({clicksPct}%)</span></div>
    </div>
  );
};

const ActivityTopApps: React.FC<ActivityTopAppsProps> = ({ topApps, topTitles, lang }) => {
  const theme = useThemeColors();
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const pieData = useMemo(() =>
    topApps.slice(0, 10).map(a => ({
      ...a,
      name: a.app,
      value: a.activeSec,
    })),
    [topApps],
  );

  const pieColors = useMemo(() =>
    PIE_COLOR_VARS.map(v => theme[v] || '#888'),
    [theme],
  );

  const totalActiveSec = useMemo(() =>
    topApps.reduce((sum, a) => sum + a.activeSec, 0),
    [topApps],
  );

  const totals = useMemo(() => ({
    activeSec: topApps.reduce((sum, a) => sum + a.activeSec, 0),
    keys: topApps.reduce((sum, a) => sum + a.keys, 0),
    clicks: topApps.reduce((sum, a) => sum + a.clicks, 0),
  }), [topApps]);

  const titlesForApp = useMemo(() => {
    if (!expandedApp) return [];
    return topTitles
      .filter(t => t.app === expandedApp && t.windowTitle)
      .sort((a, b) => b.activeSec - a.activeSec);
  }, [expandedApp, topTitles]);

  const t = lang === 'ru'
    ? {
        title: 'Топ Приложений',
        noData: 'Нет данных',
        time: 'Время',
        keys: 'Клавиши',
        clicks: 'Клики',
        noTitles: 'Нет данных о заголовках окон',
        windowDetails: 'Детали по окнам',
      }
    : {
        title: 'Top Applications',
        noData: 'No data',
        time: 'Time',
        keys: 'Keys',
        clicks: 'Clicks',
        noTitles: 'No window title data',
        windowDetails: 'Window Details',
      };

  if (!topApps.length) {
    return (
      <section>
        <h2 className="text-2xl font-bold text-text mb-6">{t.title}</h2>
        <div className="card p-6 text-center text-muted">{t.noData}</div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-text mb-6">{t.title}</h2>

      {/* Pie chart */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-full lg:w-1/2" style={{ minHeight: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="value"
                  stroke={theme['--border'] || '#243244'}
                  strokeWidth={1}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip theme={theme} lang={lang} totals={totals} />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="text-center -mt-[155px] pointer-events-none">
              <div className="text-lg font-bold text-text">{formatDuration(totalActiveSec)}</div>
              <div className="text-xs text-muted">{lang === 'ru' ? 'всего' : 'total'}</div>
            </div>
            <div style={{ height: 115 }} /> {/* spacer to offset the negative margin */}
          </div>

          {/* Legend */}
          <div className="w-full lg:w-1/2 space-y-1.5">
            {pieData.map((app, i) => (
              <div key={app.app} className="flex items-center gap-2 text-sm">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: pieColors[i % pieColors.length],
                    flexShrink: 0,
                  }}
                />
                <span className="font-mono truncate flex-1" title={app.app}>{app.app}</span>
                <span className="text-muted text-xs whitespace-nowrap">{totalActiveSec > 0 ? ((app.activeSec / totalActiveSec) * 100).toFixed(1) : '0'}%</span>
                <span className="text-accent font-medium whitespace-nowrap">{formatDuration(app.activeSec)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable app list */}
      <div className="space-y-1">
        {topApps.map((app, i) => {
          const isExpanded = expandedApp === app.app;
          const appTitles = isExpanded ? titlesForApp : [];
          const pct = totalActiveSec > 0 ? ((app.activeSec / totalActiveSec) * 100).toFixed(1) : '0';

          return (
            <div key={`${app.app}-${app.category}`} className="card p-0 overflow-hidden">
              {/* App row */}
              <button
                onClick={() => setExpandedApp(isExpanded ? null : app.app)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/80 cursor-pointer"
                style={{ background: 'transparent' }}
              >
                {/* Chevron */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M6 4l4 4-4 4" stroke={theme['--muted'] || '#a7b3c2'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Color dot */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: pieColors[i % pieColors.length],
                    flexShrink: 0,
                  }}
                />

                {/* App name */}
                <span className="font-mono text-sm truncate flex-1">{app.app}</span>

                {/* Time bar + metrics */}
                <div className="flex items-center gap-4 text-xs flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-muted">
                    <span>{t.keys}:</span>
                    <span className="text-text">{app.keys.toLocaleString()}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-muted">
                    <span>{t.clicks}:</span>
                    <span className="text-text">{app.clicks.toLocaleString()}</span>
                  </div>
                  <span className="text-muted">{pct}%</span>
                  <span className="text-accent font-medium w-16 text-right">{formatDuration(app.activeSec)}</span>
                  <span className="capitalize text-muted w-20 text-right hidden md:block">{app.category}</span>
                </div>
              </button>

              {/* Progress bar */}
              <div className="px-4 pb-1">
                <div className="w-full h-1 rounded-full" style={{ backgroundColor: `${theme['--border'] || '#243244'}60` }}>
                  <div
                    className="h-1 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (app.activeSec / (topApps[0]?.activeSec || 1)) * 100)}%`,
                      backgroundColor: pieColors[i % pieColors.length],
                    }}
                  />
                </div>
              </div>

              {/* Expanded: window titles */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-2" style={{ backgroundColor: `${theme['--surface2'] || '#0f1620'}` }}>
                  <div className="text-xs text-muted mb-2 font-medium">{t.windowDetails}</div>
                  {appTitles.length === 0 ? (
                    <div className="text-xs text-muted italic py-2">{t.noTitles}</div>
                  ) : (
                    <div className="space-y-1.5">
                      {appTitles.slice(0, 15).map((title, ti) => (
                        <div key={ti} className="flex items-center gap-2 text-xs">
                          <span className="text-muted flex-shrink-0">|-</span>
                          <span className="truncate flex-1" title={title.windowTitle}>
                            {title.windowTitle || '(no title)'}
                          </span>
                          <span className="text-muted flex-shrink-0">{title.keys.toLocaleString()} {t.keys.toLowerCase()}</span>
                          <span className="text-muted flex-shrink-0">{title.clicks.toLocaleString()} {t.clicks.toLowerCase()}</span>
                          <span className="text-accent font-medium flex-shrink-0 w-14 text-right">
                            {formatDuration(title.activeSec)}
                          </span>
                          {/* Mini progress bar */}
                          <div className="w-16 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: `${theme['--border'] || '#243244'}60` }}>
                            <div
                              className="h-1 rounded-full"
                              style={{
                                width: `${Math.min(100, (title.activeSec / (app.activeSec || 1)) * 100)}%`,
                                backgroundColor: pieColors[i % pieColors.length],
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ActivityTopApps;
