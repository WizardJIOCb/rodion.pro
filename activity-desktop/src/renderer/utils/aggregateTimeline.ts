import type { LocalTimelineEntry } from '../../shared/types';

// ── Types ──

export type TimeRange = '1h' | '4h' | 'today' | '7d' | '30d';
export type MetricKey = 'activeSec' | 'afkSec' | 'keys' | 'clicks' | 'scroll';
export type SortKey = 'time' | 'keys' | 'clicks' | 'scroll';

export interface TimeSeriesPoint {
  t: string;
  label: string;
  activeSec: number;
  afkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export interface TopAppEntry {
  app: string;
  category: string;
  activeSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export interface TopTitleEntry {
  app: string;
  windowTitle: string;
  category: string;
  activeSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export interface TopCategoryEntry {
  category: string;
  activeSec: number;
  percentage: number;
}

export interface ActivityBarSegment {
  startMinute: number;
  endMinute: number;
  category: string;
  activeSec: number;
}

export interface TimelineTotals {
  activeSec: number;
  afkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export interface PeriodSummary {
  activeSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export interface AggregatedTimeline {
  series: TimeSeriesPoint[];
  topApps: TopAppEntry[];
  topTitles: TopTitleEntry[];
  topCategories: TopCategoryEntry[];
  activityBar: ActivityBarSegment[];
  totals: TimelineTotals;
}

// ── Time Range Config ──

export function getTimeRangeConfig(range: TimeRange): { from: string; to: string; intervalMinutes: number } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  let intervalMinutes: number;

  switch (range) {
    case '1h':
      from = new Date(now.getTime() - 60 * 60 * 1000);
      intervalMinutes = 5;
      break;
    case '4h':
      from = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      intervalMinutes = 15;
      break;
    case 'today':
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      intervalMinutes = 15;
      break;
    case '7d':
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      intervalMinutes = 60;
      break;
    case '30d':
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      intervalMinutes = 1440;
      break;
  }

  return { from: from.toISOString(), to, intervalMinutes };
}

// ── Main Aggregation ──

export function aggregateTimeline(
  entries: LocalTimelineEntry[],
  intervalMinutes = 15,
): AggregatedTimeline {
  return {
    series: groupByInterval(entries, intervalMinutes),
    topApps: computeTopApps(entries),
    topTitles: computeTopTitles(entries),
    topCategories: computeTopCategories(entries),
    activityBar: computeActivityBar(entries),
    totals: computeTotals(entries),
  };
}

// ── Interval Bucketing ──

function floorToInterval(date: Date, intervalMinutes: number): Date {
  const d = new Date(date);
  if (intervalMinutes >= 1440) {
    // Daily: floor to start of day
    d.setHours(0, 0, 0, 0);
  } else if (intervalMinutes >= 60) {
    // Hourly: floor to start of hour
    d.setMinutes(0, 0, 0);
  } else {
    d.setMinutes(Math.floor(d.getMinutes() / intervalMinutes) * intervalMinutes, 0, 0);
  }
  return d;
}

function formatBucketLabel(bucket: Date, intervalMinutes: number): string {
  if (intervalMinutes >= 1440) {
    // Daily: DD.MM
    const dd = bucket.getDate().toString().padStart(2, '0');
    const mm = (bucket.getMonth() + 1).toString().padStart(2, '0');
    return `${dd}.${mm}`;
  }
  if (intervalMinutes >= 60) {
    // Hourly: HH:00
    return `${bucket.getHours().toString().padStart(2, '0')}:00`;
  }
  // Sub-hourly: HH:MM
  const hours = bucket.getHours().toString().padStart(2, '0');
  const mins = bucket.getMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function groupByInterval(
  entries: LocalTimelineEntry[],
  intervalMinutes: number,
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const bucket = floorToInterval(d, intervalMinutes);
    const key = bucket.toISOString();

    let point = buckets.get(key);
    if (!point) {
      point = {
        t: key,
        label: formatBucketLabel(bucket, intervalMinutes),
        activeSec: 0,
        afkSec: 0,
        keys: 0,
        clicks: 0,
        scroll: 0,
      };
      buckets.set(key, point);
    }

    point.activeSec += entry.activeSec;
    point.afkSec += entry.afkSec;
    point.keys += entry.keys;
    point.clicks += entry.clicks;
    point.scroll += entry.scroll;
  }

  return Array.from(buckets.values()).sort((a, b) => a.t.localeCompare(b.t));
}

// ── Top Apps ──

export function computeTopApps(entries: LocalTimelineEntry[]): TopAppEntry[] {
  const apps = new Map<string, TopAppEntry>();

  for (const entry of entries) {
    let app = apps.get(entry.app);
    if (!app) {
      app = {
        app: entry.app,
        category: entry.category,
        activeSec: 0,
        keys: 0,
        clicks: 0,
        scroll: 0,
      };
      apps.set(entry.app, app);
    }
    app.activeSec += entry.activeSec;
    app.keys += entry.keys;
    app.clicks += entry.clicks;
    app.scroll += entry.scroll;
  }

  return Array.from(apps.values()).sort((a, b) => b.activeSec - a.activeSec);
}

// ── Top Titles (Window details per app) ──

export function computeTopTitles(entries: LocalTimelineEntry[]): TopTitleEntry[] {
  const titles = new Map<string, TopTitleEntry>();

  for (const entry of entries) {
    const key = `${entry.app}\0${entry.windowTitle || ''}`;
    let t = titles.get(key);
    if (!t) {
      t = {
        app: entry.app,
        windowTitle: entry.windowTitle || '',
        category: entry.category,
        activeSec: 0,
        keys: 0,
        clicks: 0,
        scroll: 0,
      };
      titles.set(key, t);
    }
    t.activeSec += entry.activeSec;
    t.keys += entry.keys;
    t.clicks += entry.clicks;
    t.scroll += entry.scroll;
  }

  return Array.from(titles.values()).sort((a, b) => b.activeSec - a.activeSec);
}

// ── Top Categories ──

export function computeTopCategories(entries: LocalTimelineEntry[]): TopCategoryEntry[] {
  const cats = new Map<string, number>();
  let totalActive = 0;

  for (const entry of entries) {
    cats.set(entry.category, (cats.get(entry.category) || 0) + entry.activeSec);
    totalActive += entry.activeSec;
  }

  return Array.from(cats.entries())
    .map(([category, activeSec]) => ({
      category,
      activeSec,
      percentage: totalActive > 0 ? Math.round((activeSec / totalActive) * 100) : 0,
    }))
    .sort((a, b) => b.activeSec - a.activeSec);
}

// ── Activity Bar (24h) ──

export function computeActivityBar(entries: LocalTimelineEntry[]): ActivityBarSegment[] {
  const SLOT_MINUTES = 5;
  const SLOTS = 288;
  const slots: Array<{ category: string; activeSec: number } | null> = new Array(SLOTS).fill(null);

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const minuteOfDay = d.getHours() * 60 + d.getMinutes();
    const slotIdx = Math.min(Math.floor(minuteOfDay / SLOT_MINUTES), SLOTS - 1);

    const existing = slots[slotIdx];
    if (!existing || entry.activeSec > existing.activeSec) {
      slots[slotIdx] = { category: entry.category, activeSec: (existing?.activeSec || 0) + entry.activeSec };
    }
  }

  const segments: ActivityBarSegment[] = [];
  let current: ActivityBarSegment | null = null;

  for (let i = 0; i < SLOTS; i++) {
    const slot = slots[i];
    if (!slot) {
      if (current) {
        segments.push(current);
        current = null;
      }
      continue;
    }

    if (current && current.category === slot.category) {
      current.endMinute = (i + 1) * SLOT_MINUTES;
      current.activeSec += slot.activeSec;
    } else {
      if (current) segments.push(current);
      current = {
        startMinute: i * SLOT_MINUTES,
        endMinute: (i + 1) * SLOT_MINUTES,
        category: slot.category,
        activeSec: slot.activeSec,
      };
    }
  }
  if (current) segments.push(current);

  return segments;
}

// ── Totals ──

export function computeTotals(entries: LocalTimelineEntry[]): TimelineTotals {
  let activeSec = 0, afkSec = 0, keys = 0, clicks = 0, scroll = 0;
  for (const entry of entries) {
    activeSec += entry.activeSec;
    afkSec += entry.afkSec;
    keys += entry.keys;
    clicks += entry.clicks;
    scroll += entry.scroll;
  }
  return { activeSec, afkSec, keys, clicks, scroll };
}
