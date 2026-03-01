import { useState, useEffect, useCallback } from 'react';
import ActivityTimelineChart from './ActivityTimelineChart';
import ActivityTopApps from './ActivityTopApps';

interface ActivityNow {
  deviceId: string;
  updatedAt: string;
  now: {
    app: string | null;
    windowTitle: string | null;
    category: string;
    isAfk: boolean;
  };
  countsToday: {
    keys: number;
    clicks: number;
    scroll: number;
    activeSec: number;
  };
}

interface ActivityStats {
  from: string;
  to: string;
  group: string;
  series: Array<{
    t: string;
    activeSec: number;
    afkSec: number;
    keys: number;
    clicks: number;
    scroll: number;
  }>;
  topApps: Array<{
    app: string;
    category: string;
    activeSec: number;
    keys: number;
    clicks: number;
    scroll: number;
  }>;
  topCategories: Array<{
    category: string;
    activeSec: number;
  }>;
  topTitles: Array<{
    app: string;
    windowTitle: string;
    category: string;
    activeSec: number;
    keys: number;
    clicks: number;
    scroll: number;
  }>;
  seriesByWindow?: Array<{ t: string; [key: string]: string | number }>;
  windowLabels?: string[];
}

interface ActivityDashboardProps {
  lang?: 'ru' | 'en';
}

interface PeriodSummary {
  keys: number;
  clicks: number;
  scroll: number;
  activeSec: number;
}

type PeriodKey = 'today' | 'week' | 'month' | 'allTime';

type TimeRange = '1h' | '4h' | 'today' | '7d' | '30d' | 'custom';

interface TimeRangeConfig {
  from: Date;
  to: Date;
  group: '15min' | 'hour' | 'day';
}

function getTimeRangeConfig(range: TimeRange, customFrom?: Date, customTo?: Date): TimeRangeConfig {
  const now = new Date();
  const to = new Date(now);
  to.setSeconds(59, 999);

  switch (range) {
    case '1h': {
      const from = new Date(now.getTime() - 60 * 60 * 1000);
      return { from, to, group: '15min' };
    }
    case '4h': {
      const from = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      return { from, to, group: '15min' };
    }
    case 'today': {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to, group: 'hour' };
    }
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to, group: 'day' };
    }
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to, group: 'day' };
    }
    case 'custom': {
      if (!customFrom || !customTo) {
        // Fallback to today
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        return { from, to, group: 'hour' };
      }
      const diffMs = customTo.getTime() - customFrom.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      let group: '15min' | 'hour' | 'day';
      if (diffHours <= 12) group = '15min';
      else if (diffHours <= 48) group = 'hour';
      else group = 'day';
      return { from: customFrom, to: customTo, group };
    }
    default:
      return getTimeRangeConfig('4h');
  }
}

const ActivityDashboard: React.FC<ActivityDashboardProps> = ({ lang = 'en' }) => {
  const [nowData, setNowData] = useState<ActivityNow | null>(null);
  const [statsData, setStatsData] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId] = useState('pc-main');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<PeriodKey>>(new Set(['today']));
  const [periodStats, setPeriodStats] = useState<Record<PeriodKey, PeriodSummary | null>>({
    today: null,
    week: null,
    month: null,
    allTime: null,
  });
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  
  // Time range selector state
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activity.range');
      if (saved && ['1h', '4h', 'today', '7d', '30d', 'custom'].includes(saved)) {
        return saved as TimeRange;
      }
    }
    return '4h';
  });
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [currentGroup, setCurrentGroup] = useState<'15min' | 'hour' | 'day'>('hour');

  const handleCategoryChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
  }, []);

  // Persist time range selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activity.range', timeRange);
    }
  }, [timeRange]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load current activity
        // For now, we'll make the API endpoints available to the activity dashboard
        // without strict device authentication since the dashboard runs on the same origin
        const nowResponse = await fetch(`/api/activity/v1/now?deviceId=${deviceId}`);
        if (!nowResponse.ok) throw new Error('Failed to load current activity');
        const nowData = await nowResponse.json();
        setNowData(nowData);

        // Load stats based on selected time range
        const config = getTimeRangeConfig(
          timeRange,
          timeRange === 'custom' ? new Date(customFrom) : undefined,
          timeRange === 'custom' ? new Date(customTo) : undefined
        );
        setCurrentGroup(config.group);
        
        const categoryParam = selectedCategories.length > 0 ? `&category=${selectedCategories.join(',')}` : '';
        const statsResponse = await fetch(
          `/api/activity/v1/stats?deviceId=${deviceId}&from=${config.from.toISOString()}&to=${config.to.toISOString()}&group=${config.group}${categoryParam}`
        );
        if (!statsResponse.ok) throw new Error('Failed to load statistics');
        const statsData = await statsResponse.json();
        setStatsData(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Set up SSE connection for live updates
    // Since the dashboard is part of the same application, we can allow access
    const eventSource = new EventSource(`/api/activity/v1/stream?deviceId=${deviceId}`);
    
    const onNow = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setNowData(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.addEventListener('now', onNow);
    eventSource.onopen = () => console.log('[activity] SSE open');
    eventSource.onerror = (err) => console.error('[activity] SSE error', err);

    // Refresh stats periodically to keep charts updated
    const statsTimer = setInterval(async () => {
      try {
        const config = getTimeRangeConfig(
          timeRange,
          timeRange === 'custom' ? new Date(customFrom) : undefined,
          timeRange === 'custom' ? new Date(customTo) : undefined
        );
        
        const categoryParam = selectedCategories.length > 0 ? `&category=${selectedCategories.join(',')}` : '';
        const statsResponse = await fetch(
          `/api/activity/v1/stats?deviceId=${deviceId}&from=${config.from.toISOString()}&to=${config.to.toISOString()}&group=${config.group}${categoryParam}`
        );
        if (!statsResponse.ok) throw new Error('Failed to load statistics');
        const statsData = await statsResponse.json();
        setStatsData(statsData);
      } catch (err) {
        console.error('Error refreshing stats:', err);
      }
    }, 60000); // Refresh stats every minute
    
    // Also poll for now data as fallback in case SSE fails
    const nowTimer = setInterval(async () => {
      try {
        const nowResponse = await fetch(`/api/activity/v1/now?deviceId=${deviceId}`);
        if (!nowResponse.ok) throw new Error('Failed to load current activity');
        const nowData = await nowResponse.json();
        setNowData(nowData);
      } catch (err) {
        console.error('Error refreshing now data:', err);
      }
    }, 10000); // Refresh now data every 10 seconds

    return () => {
      eventSource.removeEventListener('now', onNow);
      eventSource.close();
      clearInterval(statsTimer);
      clearInterval(nowTimer);
    };
  }, [deviceId, selectedCategories, timeRange, customFrom, customTo]);

  // Load period summaries (week, month, all time)
  useEffect(() => {
    const fetchPeriodStats = async (from: Date, to: Date): Promise<PeriodSummary | null> => {
      try {
        const res = await fetch(
          `/api/activity/v1/stats?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}&group=day`
        );
        if (!res.ok) return null;
        const data = await res.json();
        const apps: Array<{ activeSec: number; keys: number; clicks: number; scroll: number }> = data.topApps || [];
        return apps.reduce(
          (acc, a) => ({
            keys: acc.keys + a.keys,
            clicks: acc.clicks + a.clicks,
            scroll: acc.scroll + a.scroll,
            activeSec: acc.activeSec + a.activeSec,
          }),
          { keys: 0, clicks: 0, scroll: 0, activeSec: 0 },
        );
      } catch {
        return null;
      }
    };

    const now = new Date();

    // Week: Monday 00:00
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Month: 1st of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // All time: far past
    const allTimeStart = new Date(2020, 0, 1, 0, 0, 0, 0);

    Promise.all([
      fetchPeriodStats(weekStart, now),
      fetchPeriodStats(monthStart, now),
      fetchPeriodStats(allTimeStart, now),
    ]).then(([week, month, allTime]) => {
      setPeriodStats(prev => ({ ...prev, week, month, allTime }));
    });
  }, [deviceId]);

  // Live timer for "Last Update"
  useEffect(() => {
    if (!nowData) return;
    const update = () => {
      const diffSeconds = Math.floor((Date.now() - new Date(nowData.updatedAt).getTime()) / 1000);
      if (diffSeconds < 60) setTimeSinceUpdate(`${diffSeconds}s ago`);
      else if (diffSeconds < 3600) setTimeSinceUpdate(`${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s ago`);
      else setTimeSinceUpdate(`${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m ago`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [nowData?.updatedAt]);

  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp: string) => {
    const now = new Date();
    const lastUpdate = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}m ago`;
    }
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  };

  // Format seconds to human readable
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface rounded w-1/4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-surface rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  // Translation function
  const t = (key: string) => {
    const translations = {
      en: {
        'activity.now': 'Now',
        'activity.todayTotals': "Today's Totals",
        'activity.weekTotals': 'This Week',
        'activity.monthTotals': 'This Month',
        'activity.allTimeTotals': 'All Time',
        'activity.timeline': 'Activity Timeline',
        'activity.topApps': 'Top Applications',
        'activity.topCategories': 'Usage by Category',
        'activity.detailedAnalysis': 'Detailed Analysis',
        'activity.mostUsed': 'Most Used',
        'activity.leastUsed': 'Least Used',
        'activity.productivity': 'Productivity',
        'activity.codingTime': 'Coding Time',
        'activity.communication': 'Communication',
        'activity.browserTime': 'Browser Time',
        'activity.application': 'Application',
        'activity.time': 'Time',
        'activity.category': 'Category',
        'activity.keys': 'Keys',
        'activity.clicks': 'Clicks',
        'activity.scrolls': 'Scrolls',
        'activity.activeTime': 'Active Time',
        'activity.status': 'Status',
        'activity.activeApp': 'Active App',
        'activity.lastUpdate': 'Last Update',
        'activity.todayActive': 'Today Active',
        'activity.idle': 'Idle',
        'activity.unknown': 'Unknown',
        'activity.showingHours': 'Showing {count} hours of activity',
        'activity.range.1h': '1h',
        'activity.range.4h': '4h',
        'activity.range.today': 'Today',
        'activity.range.7d': '7d',
        'activity.range.30d': '30d',
        'activity.range.custom': 'Custom',
        'activity.range.from': 'From',
        'activity.range.to': 'To',
        'activity.range.apply': 'Apply',
        'activity.noData': 'No activity data available',
        'activity.privacy': 'We store counters only (keys/clicks/scroll/active time). No actual text/keystrokes content is recorded.',
      },
      ru: {
        'activity.now': 'Сейчас',
        'activity.todayTotals': 'Сегодня Всего',
        'activity.weekTotals': 'За неделю',
        'activity.monthTotals': 'За месяц',
        'activity.allTimeTotals': 'За всё время',
        'activity.timeline': 'Хронология активности',
        'activity.topApps': 'Топ Приложений',
        'activity.topCategories': 'Категории использования',
        'activity.detailedAnalysis': 'Детальный анализ',
        'activity.mostUsed': 'Чаще всего',
        'activity.leastUsed': 'Реже всего',
        'activity.productivity': 'Продуктивность',
        'activity.codingTime': 'Время кодинга',
        'activity.communication': 'Коммуникации',
        'activity.browserTime': 'Время в браузере',
        'activity.application': 'Приложение',
        'activity.time': 'Время',
        'activity.category': 'Категория',
        'activity.keys': 'Клавиши',
        'activity.clicks': 'Клики',
        'activity.scrolls': 'Прокрутки',
        'activity.activeTime': 'Активное время',
        'activity.status': 'Статус',
        'activity.activeApp': 'Активное приложение',
        'activity.lastUpdate': 'Последнее обновление',
        'activity.todayActive': 'Активность сегодня',
        'activity.idle': 'Неактивен',
        'activity.unknown': 'Неизвестно',
        'activity.showingHours': 'Показано {count} часов активности',
        'activity.range.1h': '1ч',
        'activity.range.4h': '4ч',
        'activity.range.today': 'Сегодня',
        'activity.range.7d': '7д',
        'activity.range.30d': '30д',
        'activity.range.custom': 'Период',
        'activity.range.from': 'От',
        'activity.range.to': 'До',
        'activity.range.apply': 'Применить',
        'activity.noData': 'Нет данных об активности',
        'activity.privacy': 'Мы храним только счётчики (клавиши/клики/прокрутка/активное время). Тексты и содержимое не записываются.',
      }
    };

    return translations[lang][key as keyof typeof translations.en] || key;
  };

  return (
    <div className="space-y-8">
      {/* Now Section */}
      <section>
        <h2 className="text-2xl font-bold text-text mb-6">{t('activity.now')}</h2>
        {nowData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="text-sm text-muted mb-1">{t('activity.status')}</div>
              <div className="text-xl capitalize">
                {nowData.now.isAfk ? t('activity.idle') : nowData.now.category || t('activity.unknown')}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-muted mb-1">{t('activity.activeApp')}</div>
              <div className="text-xl">
                {nowData.now.app || 'N/A'}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-muted mb-1">{t('activity.lastUpdate')}</div>
              <div className="text-xl">
                {timeSinceUpdate}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-muted mb-1">{t('activity.todayActive')}</div>
              <div className="text-xl">
                {formatDuration(nowData.countsToday.activeSec)}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center text-muted">{t('activity.noData')}</div>
        )}
      </section>

      {/* Privacy Notice */}
      <div className="text-xs text-muted bg-surface/50 border border-border rounded-md px-3 py-2 flex items-start gap-2">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>{t('activity.privacy')}</span>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {(['1h', '4h', 'today', '7d', '30d', 'custom'] as TimeRange[]).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className="px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 border cursor-pointer"
            style={{
              backgroundColor: timeRange === range ? 'var(--accent)' : 'transparent',
              borderColor: timeRange === range ? 'var(--accent)' : 'var(--border)',
              color: timeRange === range ? 'var(--bg)' : 'var(--muted)',
            }}
          >
            {t(`activity.range.${range}`)}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {timeRange === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 p-3 bg-surface/50 border border-border rounded-md">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">{t('activity.range.from')}</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 rounded border border-border bg-bg text-text text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">{t('activity.range.to')}</label>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 rounded border border-border bg-bg text-text text-sm"
            />
          </div>
        </div>
      )}

      {/* Period Summary Accordion */}
      {nowData && (() => {
        const periods: { key: PeriodKey; labelKey: string }[] = [
          { key: 'today', labelKey: 'activity.todayTotals' },
          { key: 'week', labelKey: 'activity.weekTotals' },
          { key: 'month', labelKey: 'activity.monthTotals' },
          { key: 'allTime', labelKey: 'activity.allTimeTotals' },
        ];

        const getSummary = (key: PeriodKey): PeriodSummary | null => {
          if (key === 'today') {
            return nowData ? {
              keys: nowData.countsToday.keys,
              clicks: nowData.countsToday.clicks,
              scroll: nowData.countsToday.scroll,
              activeSec: nowData.countsToday.activeSec,
            } : null;
          }
          return periodStats[key];
        };

        return (
          <section className="space-y-2">
            {periods.map(({ key, labelKey }) => {
              const isOpen = expandedPeriods.has(key);
              const summary = getSummary(key);
              return (
                <div key={key} className="card p-0 overflow-hidden">
                  <button
                    onClick={() => setExpandedPeriods(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/80 cursor-pointer"
                    style={{ background: 'transparent' }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted" />
                    </svg>
                    <span className="text-lg font-bold text-text flex-1">{t(labelKey)}</span>
                    {summary && (
                      <span className="text-accent font-medium text-sm">{formatDuration(summary.activeSec)}</span>
                    )}
                    {!summary && key !== 'today' && (
                      <span className="text-muted text-sm">...</span>
                    )}
                  </button>
                  {isOpen && summary && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-4 text-center">
                          <div className="text-2xl font-bold text-accent">{summary.keys.toLocaleString()}</div>
                          <div className="text-sm text-muted">{t('activity.keys')}</div>
                        </div>
                        <div className="card p-4 text-center">
                          <div className="text-2xl font-bold text-accent">{summary.clicks.toLocaleString()}</div>
                          <div className="text-sm text-muted">{t('activity.clicks')}</div>
                        </div>
                        <div className="card p-4 text-center">
                          <div className="text-2xl font-bold text-accent">{summary.scroll.toLocaleString()}</div>
                          <div className="text-sm text-muted">{t('activity.scrolls')}</div>
                        </div>
                        <div className="card p-4 text-center">
                          <div className="text-2xl font-bold text-accent">{formatDuration(summary.activeSec)}</div>
                          <div className="text-sm text-muted">{t('activity.activeTime')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })()}

      {/* Activity Timeline Chart */}
      {statsData && (
        <ActivityTimelineChart
          series={statsData.series || []}
          seriesByWindow={statsData.seriesByWindow}
          windowLabels={statsData.windowLabels}
          lang={lang}
          onCategoryChange={handleCategoryChange}
          selectedCategories={selectedCategories}
          group={currentGroup}
        />
      )}

      {/* Top Apps with Pie Chart and Expandable Window Titles */}
      {statsData && statsData.topApps && statsData.topApps.length > 0 && (
        <ActivityTopApps
          topApps={statsData.topApps}
          topTitles={statsData.topTitles || []}
          lang={lang}
          selectedCategories={selectedCategories}
        />
      )}

      {/* Top Categories */}
      {statsData && statsData.topCategories && statsData.topCategories.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-text mb-6">{t('activity.topCategories')}</h2>
          <div className="space-y-4">
            {statsData.topCategories.map((cat, index) => (
              <div key={index} className="card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="capitalize font-medium text-lg">{cat.category}</span>
                  <span className="text-accent font-semibold">{formatDuration(cat.activeSec)}</span>
                </div>
                <div className="w-full bg-surface rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-accent to-accent/80 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(cat.activeSec / (statsData.topCategories[0]?.activeSec || 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right text-sm text-muted mt-1">
                  {((cat.activeSec / (statsData.topCategories.reduce((sum, c) => sum + c.activeSec, 0) || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detailed Analysis */}
      {statsData && statsData.topApps && statsData.topApps.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-text mb-6">{t('activity.detailedAnalysis')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4 text-accent">{t('activity.mostUsed')}</h3>
              <div className="space-y-3">
                {statsData.topApps.slice(0, 3).map((app, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-mono text-sm">{app.app}</span>
                    <span className="text-muted">{formatDuration(app.activeSec)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4 text-accent">{t('activity.leastUsed')}</h3>
              <div className="space-y-3">
                {statsData.topApps.slice(-3).reverse().map((app, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-mono text-sm">{app.app}</span>
                    <span className="text-muted">{formatDuration(app.activeSec)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4 text-accent">{t('activity.productivity')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">{t('activity.codingTime')}</span>
                  <span className="text-sm">
                    {formatDuration(statsData.topApps.filter(a => a.category === 'coding').reduce((sum, a) => sum + a.activeSec, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">{t('activity.communication')}</span>
                  <span className="text-sm">
                    {formatDuration(statsData.topApps.filter(a => a.category === 'comms').reduce((sum, a) => sum + a.activeSec, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">{t('activity.browserTime')}</span>
                  <span className="text-sm">
                    {formatDuration(statsData.topApps.filter(a => a.category === 'browser').reduce((sum, a) => sum + a.activeSec, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ActivityDashboard;