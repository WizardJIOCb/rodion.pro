import { getDb } from './database';
import type { LocalTimelineEntry, RawCollectorEvent } from '../../shared/types';

export function insertEvent(event: RawCollectorEvent): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (app, window_title, category, is_afk, keys, clicks, scroll, dt_sec, active_sec, afk_sec, idle_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    event.app,
    event.windowTitle,
    event.category,
    event.isAfk ? 1 : 0,
    event.keys,
    event.clicks,
    event.scroll,
    event.dtSec,
    event.activeSec,
    event.afkSec,
    event.idleMs,
  );
  return result.lastInsertRowid as number;
}

export function getEventsInRange(from: string, to: string): LocalTimelineEntry[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, created_at as createdAt, app, window_title as windowTitle,
           category, is_afk as isAfk, keys, clicks, scroll,
           dt_sec as dtSec, active_sec as activeSec, afk_sec as afkSec, synced
    FROM events
    WHERE created_at >= ? AND created_at <= ?
    ORDER BY created_at ASC
  `);
  return stmt.all(from, to) as LocalTimelineEntry[];
}

export function getUnsyncedEvents(limit: number): Array<LocalTimelineEntry & { id: number }> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, created_at as createdAt, app, window_title as windowTitle,
           category, is_afk as isAfk, keys, clicks, scroll,
           dt_sec as dtSec, active_sec as activeSec, afk_sec as afkSec,
           idle_ms as idleMs, synced, sync_attempts as syncAttempts
    FROM events
    WHERE synced = 0 AND sync_attempts < ?
    ORDER BY created_at ASC
    LIMIT ?
  `);
  // MAX_RETRIES = 5 per user spec
  return stmt.all(5, limit) as Array<LocalTimelineEntry & { id: number }>;
}

export function markEventsSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE events SET synced = 1, synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id IN (${placeholders})
  `).run(...ids);
}

export function markEventsFailed(ids: number[], error: string): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE events SET synced = 2, sync_attempts = sync_attempts + 1, last_sync_error = ?
    WHERE id IN (${placeholders})
  `).run(error, ...ids);
}

export function resetFailedEvents(): void {
  const db = getDb();
  db.prepare(`UPDATE events SET synced = 0 WHERE synced = 2 AND sync_attempts < 5`).run();
}

export function getQueuedCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE synced = 0`).get() as { cnt: number };
  return row.cnt;
}

export function getFailedCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE synced = 2`).get() as { cnt: number };
  return row.cnt;
}

export function getTodayTotals(): { keys: number; clicks: number; scroll: number; activeSec: number } {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const row = db.prepare(`
    SELECT COALESCE(SUM(keys),0) as keys,
           COALESCE(SUM(clicks),0) as clicks,
           COALESCE(SUM(scroll),0) as scroll,
           COALESCE(SUM(active_sec),0) as activeSec
    FROM events
    WHERE created_at >= ?
  `).get(todayStart.toISOString()) as { keys: number; clicks: number; scroll: number; activeSec: number };
  return row;
}

export function purgeOldEvents(retentionDays: number): number {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const result = db.prepare(`
    DELETE FROM events WHERE synced = 1 AND created_at < ?
  `).run(cutoff.toISOString());
  return result.changes;
}
