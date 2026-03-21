import type { LocalTimelineEntry } from '../../shared/types';

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

export interface AggregatedTimeline {
  series: TimeSeriesPoint[];
  topApps: TopAppEntry[];
  topCategories: TopCategoryEntry[];
  activityBar: ActivityBarSegment[];
  totals: TimelineTotals;
}

export function aggregateTimeline(
  entries: LocalTimelineEntry[],
  intervalMinutes = 15,
): AggregatedTimeline {
  return {
    series: groupByInterval(entries, intervalMinutes),
    topApps: computeTopApps(entries),
    topCategories: computeTopCategories(entries),
    activityBar: computeActivityBar(entries),
    totals: computeTotals(entries),
  };
}

function floorToInterval(date: Date, intervalMinutes: number): Date {
  const d = new Date(date);
  d.setMinutes(Math.floor(d.getMinutes() / intervalMinutes) * intervalMinutes, 0, 0);
  return d;
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
      const hours = bucket.getHours().toString().padStart(2, '0');
      const mins = bucket.getMinutes().toString().padStart(2, '0');
      point = {
        t: key,
        label: `${hours}:${mins}`,
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

export function computeActivityBar(entries: LocalTimelineEntry[]): ActivityBarSegment[] {
  // Build 5-minute slots (288 per day)
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

  // Merge adjacent slots with the same category
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
