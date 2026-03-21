import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      app TEXT NOT NULL,
      window_title TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'unknown',
      is_afk INTEGER NOT NULL DEFAULT 0,
      keys INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      scroll INTEGER NOT NULL DEFAULT 0,
      dt_sec REAL NOT NULL DEFAULT 0,
      active_sec REAL NOT NULL DEFAULT 0,
      afk_sec REAL NOT NULL DEFAULT 0,
      idle_ms INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_sync_error TEXT,
      synced_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_synced ON events(synced)`,
    `CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)`,

    `CREATE TABLE IF NOT EXISTS markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      type TEXT NOT NULL,
      note TEXT,
      app_context TEXT,
      category_context TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_sync_error TEXT,
      synced_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_markers_created ON markers(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_markers_synced ON markers(synced)`,

    `CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ],
};

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'activity.db');
  db = new Database(dbPath);

  // WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  return db;
}

function runMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true }) as number;

  if (currentVersion >= SCHEMA_VERSION) return;

  const migrate = database.transaction(() => {
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const stmts = MIGRATIONS[v];
      if (!stmts) throw new Error(`Missing migration for version ${v}`);
      for (const sql of stmts) {
        database.exec(sql);
      }
    }
    database.pragma(`user_version = ${SCHEMA_VERSION}`);
  });

  migrate();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
