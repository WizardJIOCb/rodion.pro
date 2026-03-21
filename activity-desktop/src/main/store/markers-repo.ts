import { getDb } from './database';
import type { LocalMarker } from '../../shared/types';

export function insertMarker(type: string, note?: string, appContext?: string, categoryContext?: string): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO markers (type, note, app_context, category_context)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(type, note ?? null, appContext ?? null, categoryContext ?? null);
  return result.lastInsertRowid as number;
}

export function getMarkersInRange(from: string, to: string): LocalMarker[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, created_at as createdAt, type, note,
           app_context as appContext, category_context as categoryContext, synced
    FROM markers
    WHERE created_at >= ? AND created_at <= ?
    ORDER BY created_at ASC
  `);
  return stmt.all(from, to) as LocalMarker[];
}

export function getUnsyncedMarkers(limit: number): Array<LocalMarker & { id: number }> {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, created_at as createdAt, type, note,
           app_context as appContext, category_context as categoryContext,
           synced, sync_attempts as syncAttempts
    FROM markers
    WHERE synced = 0 AND sync_attempts < 5
    ORDER BY created_at ASC
    LIMIT ?
  `);
  return stmt.all(limit) as Array<LocalMarker & { id: number }>;
}

export function markMarkersSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE markers SET synced = 1, synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id IN (${placeholders})
  `).run(...ids);
}

export function markMarkersFailed(ids: number[], error: string): void {
  if (ids.length === 0) return;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE markers SET synced = 2, sync_attempts = sync_attempts + 1, last_sync_error = ?
    WHERE id IN (${placeholders})
  `).run(error, ...ids);
}
