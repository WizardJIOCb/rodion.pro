import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { requireDeviceAuth, jsonError, jsonOk } from '@/lib/activity-auth';
import { requireActivityDb } from '@/lib/activity-db';
import { activityArtifacts, activityNow, activityDevices } from '@/db/schema';
import { broadcastSSE } from '@/lib/activity';

const MAX_BATCH_SIZE = 100;

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
