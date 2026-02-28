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

const ActivityDashboard: React.FC<ActivityDashboardProps> = ({ lang = 'en' }) => {
  const [nowData, setNowData] = useState<ActivityNow | null>(null);
  const [statsData, setStatsData] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceId] = useState('pc-main');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCategoryChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
  }, []);

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

        // Load today's stats
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        const categoryParam = selectedCategories.length > 0 ? `&category=${selectedCategories.join(',')}` : '';
        const statsResponse = await fetch(
          `/api/activity/v1/stats?deviceId=${deviceId}&from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}&group=hour${categoryParam}`
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
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        const categoryParam = selectedCategories.length > 0 ? `&category=${selectedCategories.join(',')}` : '';
        const statsResponse = await fetch(
          `/api/activity/v1/stats?deviceId=${deviceId}&from=${startOfDay.toISOString()}&to=${endOfDay.toISOString()}&group=hour${categoryParam}`
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
  }, [deviceId, selectedCategories]);

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
      },
      ru: {
        'activity.now': 'Сейчас',
        'activity.todayTotals': 'Сегодня Всего',
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
                {getTimeSinceUpdate(nowData.updatedAt)}
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
          <div className="card p-6 text-center text-muted">No activity data available</div>
        )}
      </section>

      {/* Today's Totals */}
      {nowData && (
        <section>
          <h2 className="text-2xl font-bold text-text mb-6">{t('activity.todayTotals')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{nowData.countsToday.keys.toLocaleString()}</div>
              <div className="text-sm text-muted">{t('activity.keys')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{nowData.countsToday.clicks.toLocaleString()}</div>
              <div className="text-sm text-muted">{t('activity.clicks')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{nowData.countsToday.scroll.toLocaleString()}</div>
              <div className="text-sm text-muted">{t('activity.scrolls')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{formatDuration(nowData.countsToday.activeSec)}</div>
              <div className="text-sm text-muted">{t('activity.activeTime')}</div>
            </div>
          </div>
        </section>
      )}

      {/* Activity Timeline Chart */}
      {statsData && statsData.series && (
        <ActivityTimelineChart
          series={statsData.series}
          seriesByWindow={statsData.seriesByWindow}
          windowLabels={statsData.windowLabels}
          lang={lang}
          onCategoryChange={handleCategoryChange}
          selectedCategories={selectedCategories}
        />
      )}

      {/* Top Apps with Pie Chart and Expandable Window Titles */}
      {statsData && statsData.topApps && statsData.topApps.length > 0 && (
        <ActivityTopApps
          topApps={statsData.topApps}
          topTitles={statsData.topTitles || []}
          lang={lang}
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