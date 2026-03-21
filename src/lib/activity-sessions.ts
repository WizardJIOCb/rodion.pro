import { eq, and, gte, lt, asc } from 'drizzle-orm';
import { requireActivityDb } from '@/lib/activity-db';
import {
  activityMinuteAgg,
  activitySessions,
  type ActivitySessionRow,
  type NewActivitySessionRow,
} from '@/db/schema';

const GAP_THRESHOLD_MINUTES = 3;

interface MinuteRow {
  tsMinute: Date;
  app: string;
  windowTitle: string;
  category: string;
  activeSec: number;
  afkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

interface SessionAccumulator {
  startedAt: Date;
  endedAt: Date;
  category: string;
  appCounts: Map<string, number>;
  primaryTitle: string;
  totalActiveSec: number;
  totalAfkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

function createAccumulator(row: MinuteRow): SessionAccumulator {
  const appCounts = new Map<string, number>();
  appCounts.set(row.app, row.activeSec || 1);
  return {
    startedAt: row.tsMinute,
    endedAt: new Date(row.tsMinute.getTime() + 60_000),
    category: row.category,
    appCounts,
    primaryTitle: row.windowTitle,
    totalActiveSec: row.activeSec,
    totalAfkSec: row.afkSec,
    keys: row.keys,
    clicks: row.clicks,
    scroll: row.scroll,
  };
}

function accumulatorToSession(
  acc: SessionAccumulator,
  deviceId: string,
): NewActivitySessionRow {
  let primaryApp = '';
  let maxCount = 0;
  for (const [app, count] of acc.appCounts) {
    if (count > maxCount) {
      primaryApp = app;
      maxCount = count;
    }
  }

  const durationSec = Math.round(
    (acc.endedAt.getTime() - acc.startedAt.getTime()) / 1000,
  );
  const isAfk = acc.totalAfkSec > acc.totalActiveSec;

  return {
    deviceId,
    startedAt: acc.startedAt,
    endedAt: acc.endedAt,
    durationSec,
    category: acc.category,
    activityType: isAfk ? 'afk' : 'active',
    primaryApp,
    primaryTitle: acc.primaryTitle || null,
    isAfk,
    keys: acc.keys,
    clicks: acc.clicks,
    scroll: acc.scroll,
    confidence: 100,
    sourceVersion: 'v1',
  };
}

/**
 * Build sessions from minute-level data for a given day.
 * MVP: gap-based splitting with app/category change detection.
 *
 * TODO (post-MVP): Replace with watermark-based incremental sessionization.
 * Track last-sessionized minute per device, run on ingest or scheduled job.
 * Add POST /api/activity/v2/sessions/rebuild for manual re-sessionization.
 */
export async function buildSessionsForDay(
  deviceId: string,
  dateStr: string,
): Promise<NewActivitySessionRow[]> {
  const db = await requireActivityDb();

  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const rows = await db
    .select()
    .from(activityMinuteAgg)
    .where(
      and(
        eq(activityMinuteAgg.deviceId, deviceId),
        gte(activityMinuteAgg.tsMinute, dayStart),
        lt(activityMinuteAgg.tsMinute, dayEnd),
      ),
    )
    .orderBy(asc(activityMinuteAgg.tsMinute));

  if (rows.length === 0) return [];

  const sessions: NewActivitySessionRow[] = [];
  let current = createAccumulator(rows[0]!);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const gapMinutes =
      (row.tsMinute.getTime() - current.endedAt.getTime()) / 60_000;
    const appChanged =
      row.app !== '' &&
      current.appCounts.size > 0 &&
      !current.appCounts.has(row.app) &&
      row.app !== [...current.appCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const categoryChanged = row.category !== current.category;

    if (
      gapMinutes > GAP_THRESHOLD_MINUTES ||
      categoryChanged ||
      (appChanged && gapMinutes > 1)
    ) {
      sessions.push(accumulatorToSession(current, deviceId));
      current = createAccumulator(row);
    } else {
      current.endedAt = new Date(row.tsMinute.getTime() + 60_000);
      current.totalActiveSec += row.activeSec;
      current.totalAfkSec += row.afkSec;
      current.keys += row.keys;
      current.clicks += row.clicks;
      current.scroll += row.scroll;
      current.appCounts.set(
        row.app,
        (current.appCounts.get(row.app) || 0) + (row.activeSec || 1),
      );
      if (row.windowTitle) current.primaryTitle = row.windowTitle;
    }
  }

  sessions.push(accumulatorToSession(current, deviceId));
  return sessions;
}

/**
 * Persist sessions for a day, replacing any existing ones (idempotent).
 */
export async function persistSessions(
  deviceId: string,
  dateStr: string,
  sessionsToInsert: NewActivitySessionRow[],
): Promise<void> {
  if (sessionsToInsert.length === 0) return;

  const db = await requireActivityDb();
  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // Delete existing sessions for this device+day, then insert new ones
  await db
    .delete(activitySessions)
    .where(
      and(
        eq(activitySessions.deviceId, deviceId),
        gte(activitySessions.startedAt, dayStart),
        lt(activitySessions.startedAt, dayEnd),
      ),
    );

  await db.insert(activitySessions).values(sessionsToInsert);
}
