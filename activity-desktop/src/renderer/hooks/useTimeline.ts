import { useState, useEffect, useRef, useCallback } from 'react';
import type { LocalTimelineEntry } from '../../shared/types';
import { aggregateTimeline, type AggregatedTimeline } from '../utils/aggregateTimeline';

const api = window.activityAPI;

function todayStr(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

export function useTimeline(date: string) {
  const [entries, setEntries] = useState<LocalTimelineEntry[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const fetchData = useCallback(async () => {
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    const data = await api.getTimeline(from, to);
    setEntries(data);
    setAggregated(aggregateTimeline(data, 15));
    setLoading(false);
    setLastRefresh(Date.now());
  }, [date]);

  // Initial fetch on mount and when date changes
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10s when viewing today
  useEffect(() => {
    if (date !== todayStr()) return;

    const id = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(id);
  }, [date, fetchData]);

  // Also refresh immediately on sync updates (marks become synced)
  useEffect(() => {
    const unsub = api.onSyncUpdate(() => {
      fetchData();
    });
    return unsub;
  }, [fetchData]);

  return { entries, aggregated, loading, lastRefresh };
}
