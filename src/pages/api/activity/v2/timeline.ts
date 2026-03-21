import type { APIRoute } from 'astro';
import { eq, and, gte, lt, asc } from 'drizzle-orm';
import { verifyDeviceAccess, jsonError, jsonOk } from '@/lib/activity-auth';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { activitySessions, activityArtifacts } from '@/db/schema';
import { buildSessionsForDay, persistSessions } from '@/lib/activity-sessions';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  if (!(await hasActivityDb())) return jsonError('DB not configured', 503);

  const deviceId = url.searchParams.get('deviceId');
  const dateParam = url.searchParams.get('date');

  if (!deviceId) return jsonError('Missing deviceId', 400);
  if (!dateParam) return jsonError('Missing date (YYYY-MM-DD)', 400);

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return jsonError('Invalid date format, expected YYYY-MM-DD', 400);
  }

  const hasAccess = await verifyDeviceAccess(request, url, cookies, deviceId);
  if (!hasAccess) return jsonError('Unauthorized', 401);

  const db = await requireActivityDb();
  const dayStart = new Date(dateParam + 'T00:00:00.000Z');
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  // Query existing sessions
  let sessions = await db
    .select()
    .from(activitySessions)
    .where(
      and(
        eq(activitySessions.deviceId, deviceId),
        gte(activitySessions.startedAt, dayStart),
        lt(activitySessions.startedAt, dayEnd),
      ),
    )
    .orderBy(asc(activitySessions.startedAt));

  // MVP fallback: on-the-fly sessionization if no sessions exist
  if (sessions.length === 0) {
    const built = await buildSessionsForDay(deviceId, dateParam);
    if (built.length > 0) {
      await persistSessions(deviceId, dateParam, built);
      sessions = await db
        .select()
        .from(activitySessions)
        .where(
          and(
            eq(activitySessions.deviceId, deviceId),
            gte(activitySessions.startedAt, dayStart),
            lt(activitySessions.startedAt, dayEnd),
          ),
        )
        .orderBy(asc(activitySessions.startedAt));
    }
  }

  // Query artifacts for the same day
  const artifacts = await db
    .select()
    .from(activityArtifacts)
    .where(
      and(
        eq(activityArtifacts.deviceId, deviceId),
        gte(activityArtifacts.occurredAt, dayStart),
        lt(activityArtifacts.occurredAt, dayEnd),
      ),
    )
    .orderBy(asc(activityArtifacts.occurredAt));

  return jsonOk({
    date: dateParam,
    sessions: sessions.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt?.toISOString() ?? null,
    })),
    artifacts: artifacts.map((a) => ({
      ...a,
      occurredAt: a.occurredAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
    })),
  });
};
