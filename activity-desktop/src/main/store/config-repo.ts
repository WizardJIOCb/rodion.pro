import { getDb } from './database';
import type { DesktopConfig } from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/types';

export function getConfigValue<K extends keyof DesktopConfig>(key: K): DesktopConfig[K] {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return DEFAULT_CONFIG[key];

  const defaultVal = DEFAULT_CONFIG[key];
  if (typeof defaultVal === 'number') return Number(row.value) as DesktopConfig[K];
  if (typeof defaultVal === 'boolean') return (row.value === 'true') as DesktopConfig[K];
  if (Array.isArray(defaultVal)) return JSON.parse(row.value) as DesktopConfig[K];
  return row.value as DesktopConfig[K];
}

export function setConfigValue<K extends keyof DesktopConfig>(key: K, value: DesktopConfig[K]): void {
  const db = getDb();
  const serialized = Array.isArray(value) ? JSON.stringify(value) : String(value);
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, serialized);
}

export function getAllConfig(): DesktopConfig {
  const result = { ...DEFAULT_CONFIG };
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all() as Array<{ key: string; value: string }>;
  for (const row of rows) {
    const key = row.key as keyof DesktopConfig;
    if (!(key in DEFAULT_CONFIG)) continue;
    const defaultVal = DEFAULT_CONFIG[key];
    if (typeof defaultVal === 'number') {
      (result as Record<string, unknown>)[key] = Number(row.value);
    } else if (typeof defaultVal === 'boolean') {
      (result as Record<string, unknown>)[key] = row.value === 'true';
    } else if (Array.isArray(defaultVal)) {
      (result as Record<string, unknown>)[key] = JSON.parse(row.value);
    } else {
      (result as Record<string, unknown>)[key] = row.value;
    }
  }
  return result;
}

export function updateConfig(partial: Partial<DesktopConfig>): void {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(partial)) {
      const serialized = Array.isArray(value) ? JSON.stringify(value) : String(value);
      upsert.run(key, serialized);
    }
  });
  tx();
}

export function isConfigured(): boolean {
  const deviceId = getConfigValue('server.deviceId');
  const deviceKey = getConfigValue('server.deviceKey');
  return deviceId !== '' && deviceKey !== '';
}
