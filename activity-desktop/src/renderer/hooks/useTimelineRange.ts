import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LocalTimelineEntry } from '../../shared/types';
import {
  aggregateTimeline,
  computeTotals,
  getTimeRangeConfig,
  type AggregatedTimeline,
  type TimeRange,
  type PeriodSummary,
} from '../utils/aggregateTimeline';

const api = window.activityAPI;

export interface PeriodSummaries {
  today: PeriodSummary | null;
  week: PeriodSummary | null;
  month: PeriodSummary | null;
  allTime: PeriodSummary | null;
}

export function useTimelineRange(range: TimeRange, categories: string[]) {
  const [rawEntries, setRawEntries] = useState<LocalTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodSummaries, setPeriodSummaries] = useState<PeriodSummaries>({
    today: null, week: null, month: null, allTime: null,
  });
  const periodFetchedRef = useRef(false);

  // Fetch main timeline data
  const fetchData = useCallback(async () => {
    const { from, to } = getTimeRangeConfig(range);
    const data = await api.getTimeline(from, to);
    setRawEntries(data);
    setLoading(false);
  }, [range]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Refresh on sync updates
  useEffect(() => {
    const unsub = api.onSyncUpdate(() => { fetchData(); });
    return unsub;
  }, [fetchData]);

  // Fetch period summaries (today/week/month/allTime) once + refresh every 60s
  const fetchPeriods = useCallback(async () => {
    const now = new Date();

    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEntries = await api.getTimeline(todayStart.toISOString(), now.toISOString());
    const todaySummary = computeTotals(todayEntries);

    // This week (Monday start)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEntries = await api.getTimeline(weekStart.toISOString(), now.toISOString());
    const weekSummary = computeTotals(weekEntries);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEntries = await api.getTimeline(monthStart.toISOString(), now.toISOString());
    const monthSummary = computeTotals(monthEntries);

    // All time (30 days back - local retention limit)
    const allStart = new Date(now);
    allStart.setDate(allStart.getDate() - 30);
    allStart.setHours(0, 0, 0, 0);
    const allEntries = await api.getTimeline(allStart.toISOString(), now.toISOString());
    const allSummary = computeTotals(allEntries);

    setPeriodSummaries({
      today: { activeSec: todaySummary.activeSec, keys: todaySummary.keys, clicks: todaySummary.clicks, scroll: todaySummary.scroll },
      week: { activeSec: weekSummary.activeSec, keys: weekSummary.keys, clicks: weekSummary.clicks, scroll: weekSummary.scroll },
      month: { activeSec: monthSummary.activeSec, keys: monthSummary.keys, clicks: monthSummary.clicks, scroll: monthSummary.scroll },
      allTime: { activeSec: allSummary.activeSec, keys: allSummary.keys, clicks: allSummary.clicks, scroll: allSummary.scroll },
    });
  }, []);

  useEffect(() => {
    fetchPeriods();
    const id = setInterval(fetchPeriods, 60000);
    return () => clearInterval(id);
  }, [fetchPeriods]);

  // Client-side category filtering + aggregation (no IPC call on filter change)
  const { entries, aggregated } = useMemo(() => {
    const filtered = categories.length > 0
      ? rawEntries.filter(e => categories.includes(e.category))
      : rawEntries;

    const { intervalMinutes } = getTimeRangeConfig(range);
    return {
      entries: filtered,
      aggregated: filtered.length > 0 ? aggregateTimeline(filtered, intervalMinutes) : null,
    };
  }, [rawEntries, categories, range]);

  return { entries, aggregated, periodSummaries, loading };
}
