import { getDb } from './database';

export function getSyncState(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM sync_state WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSyncState(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run(key, value);
}

export function getLastSyncAt(): string | null {
  return getSyncState('last_sync_at');
}

export function setLastSyncAt(iso: string): void {
  setSyncState('last_sync_at', iso);
}

export function getLastSyncResult(): string | null {
  return getSyncState('last_sync_result');
}

export function setLastSyncResult(result: string): void {
  setSyncState('last_sync_result', result);
}

export function getConsecutiveFailures(): number {
  const val = getSyncState('consecutive_failures');
  return val ? parseInt(val, 10) : 0;
}

export function setConsecutiveFailures(n: number): void {
  setSyncState('consecutive_failures', String(n));
}

export function resetConsecutiveFailures(): void {
  setSyncState('consecutive_failures', '0');
}
