import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { requireDeviceAuth, jsonError, jsonOk } from '@/lib/activity-auth';
import { requireActivityDb } from '@/lib/activity-db';
import { activityArtifacts, activityNow, activityDevices, activityMinuteAgg } from '@/db/schema';
import { broadcastSSE, splitByMinutes } from '@/lib/activity';

const MAX_BATCH_SIZE = 100;
const DEFAULT_INTERVAL_SEC = 10;

function toSafeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireDeviceAuth(request);
  if (authResult instanceof Response) return authResult;
  const { deviceId } = authResult;

  const body = await request.json();
  const { artifacts } = body;

  if (!Array.isArray(artifacts)) {
    return jsonError('Missing or invalid field: artifacts (must be array)', 400);
  }

  if (artifacts.length > MAX_BATCH_SIZE) {
    return jsonError(`Batch too large: max ${MAX_BATCH_SIZE} artifacts`, 400);
  }

  if (artifacts.length === 0) {
    return jsonOk({ ok: true, inserted: 0, skipped: 0 });
  }

  const db = await requireActivityDb();
  let inserted = 0;
  let skipped = 0;

  // Track the latest heartbeat for activityNow update
  let latestHeartbeat: { occurredAt: string; sourceApp: string; title: string; payload: Record<string, unknown> } | null = null;

  for (const artifact of artifacts) {
    const {
      occurredAt,
      artifactType,
      projectSlug,
      sourceApp,
      title,
      privacyLevel,
      fingerprint: providedFingerprint,
    } = artifact;

    // Accept both 'payload' and 'payloadJson' field names
    const rawPayload = artifact.payload ?? artifact.payloadJson;
    const payload: Record<string, unknown> =
      typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload || {});

    if (!occurredAt || !artifactType) {
      skipped++;
      continue;
    }

    // Compute fingerprint if not provided
    const fingerprint =
      providedFingerprint ||
      createHash('sha256')
        .update(`${artifactType}:${deviceId}:${occurredAt}:${title || ''}:${JSON.stringify(payload)}`)
        .digest('hex');

    const [result] = await db
      .insert(activityArtifacts)
      .values({
        deviceId,
        occurredAt: new Date(occurredAt),
        projectSlug: projectSlug || null,
        artifactType,
        sourceApp: sourceApp || null,
        title: title || null,
        payloadJson: payload,
        privacyLevel: privacyLevel || 'private',
        fingerprint,
      })
      .onConflictDoNothing({ target: activityArtifacts.fingerprint })
      .returning();

    if (result) {
      inserted++;

      // Keep v1-compatible minute aggregates for dashboard stats/charts.
      if (artifactType === 'heartbeat') {
        const timestamp = new Date(occurredAt);
        const category = (payload.category as string) || 'unknown';
        const keys = toSafeInt(payload.keys);
        const clicks = toSafeInt(payload.clicks);
        const scroll = toSafeInt(payload.scroll);
        const activeSec = toSafeInt(payload.activeSec);
        const afkSec = toSafeInt(payload.afkSec);
        const intervalSec = Math.max(
          1,
          toSafeInt(payload.dtSec, activeSec + afkSec || DEFAULT_INTERVAL_SEC),
        );

        const end = timestamp;
        const start = new Date(end.getTime() - intervalSec * 1000);
        const slices = splitByMinutes(start, end, activeSec, afkSec, keys, clicks, scroll);

        for (const slice of slices) {
          await db.insert(activityMinuteAgg).values({
            deviceId,
            tsMinute: slice.tsMinute,
            app: sourceApp || '',
            windowTitle: title || '',
            category,
            activeSec: slice.activeSec,
            afkSec: slice.afkSec,
            keys: slice.keys,
            clicks: slice.clicks,
            scroll: slice.scroll,
          }).onConflictDoUpdate({
            target: [
              activityMinuteAgg.deviceId,
              activityMinuteAgg.tsMinute,
              activityMinuteAgg.app,
              activityMinuteAgg.windowTitle,
              activityMinuteAgg.category,
            ],
            set: {
              activeSec: sql`${activityMinuteAgg.activeSec} + excluded.active_sec`,
              afkSec: sql`${activityMinuteAgg.afkSec} + excluded.afk_sec`,
              keys: sql`${activityMinuteAgg.keys} + excluded.keys`,
              clicks: sql`${activityMinuteAgg.clicks} + excluded.clicks`,
              scroll: sql`${activityMinuteAgg.scroll} + excluded.scroll`,
            },
          });
        }
      }

      // Track latest heartbeat for live state update
      if (artifactType === 'heartbeat') {
        if (!latestHeartbeat || occurredAt > latestHeartbeat.occurredAt) {
          latestHeartbeat = { occurredAt, sourceApp: sourceApp || '', title: title || '', payload };
        }
      }
    } else {
      skipped++;
    }
  }

  // Update activityNow with latest heartbeat data so the web dashboard stays live
  if (latestHeartbeat) {
    const timestamp = new Date(latestHeartbeat.occurredAt);
    const p = latestHeartbeat.payload;
    const category = (p.category as string) || 'unknown';
    const isAfk = !!p.isAfk;
    const keys = Math.round((p.keys as number) || 0);
    const clicks = Math.round((p.clicks as number) || 0);
    const scroll = Math.round((p.scroll as number) || 0);
    const activeSec = Math.round((p.activeSec as number) || 0);

    const existingResult = await db.select().from(activityNow)
      .where(eq(activityNow.deviceId, deviceId)).limit(1);
    const existing = existingResult[0];

    const todayStart = new Date(timestamp);
    todayStart.setHours(0, 0, 0, 0);
    const existingDay = existing?.updatedAt
      ? new Date(existing.updatedAt).setHours(0, 0, 0, 0)
      : null;
    const sameDay = existingDay !== null && existingDay === todayStart.getTime();

    if (!existing) {
      await db.insert(activityNow).values({
        deviceId,
        updatedAt: timestamp,
        app: latestHeartbeat.sourceApp || null,
        windowTitle: latestHeartbeat.title || null,
        category,
        isAfk,
        countsTodayKeys: keys,
        countsTodayClicks: clicks,
        countsTodayScroll: scroll,
        countsTodayActiveSec: activeSec,
      });
    } else if (sameDay) {
      await db.update(activityNow).set({
        updatedAt: timestamp,
        app: latestHeartbeat.sourceApp || null,
        windowTitle: latestHeartbeat.title || null,
        category,
        isAfk,
        countsTodayKeys: sql`${activityNow.countsTodayKeys} + ${keys}`,
        countsTodayClicks: sql`${activityNow.countsTodayClicks} + ${clicks}`,
        countsTodayScroll: sql`${activityNow.countsTodayScroll} + ${scroll}`,
        countsTodayActiveSec: sql`${activityNow.countsTodayActiveSec} + ${activeSec}`,
      }).where(eq(activityNow.deviceId, deviceId));
    } else {
      await db.update(activityNow).set({
        updatedAt: timestamp,
        app: latestHeartbeat.sourceApp || null,
        windowTitle: latestHeartbeat.title || null,
        category,
        isAfk,
        countsTodayKeys: keys,
        countsTodayClicks: clicks,
        countsTodayScroll: scroll,
        countsTodayActiveSec: activeSec,
      }).where(eq(activityNow.deviceId, deviceId));
    }

    // Update device last_seen_at
    await db.update(activityDevices)
      .set({ lastSeenAt: timestamp })
      .where(eq(activityDevices.id, deviceId));

    // Broadcast to SSE subscribers so web dashboard updates live
    const updatedResult = await db.select().from(activityNow)
      .where(eq(activityNow.deviceId, deviceId)).limit(1);
    const updatedNow = updatedResult[0];

    if (updatedNow) {
      broadcastSSE(deviceId, {
        deviceId,
        updatedAt: updatedNow.updatedAt.toISOString(),
        now: {
          app: updatedNow.app,
          windowTitle: updatedNow.windowTitle,
          category: updatedNow.category,
          isAfk: updatedNow.isAfk,
        },
        countsToday: {
          keys: updatedNow.countsTodayKeys,
          clicks: updatedNow.countsTodayClicks,
          scroll: updatedNow.countsTodayScroll,
          activeSec: updatedNow.countsTodayActiveSec,
        },
      });
    }
  }

  return jsonOk({ ok: true, inserted, skipped });
};
