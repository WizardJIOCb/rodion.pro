import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { hashApiKey, broadcastSSE, splitByMinutes } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';

export const POST: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deviceId = request.headers.get('x-device-id');
  const deviceKey = request.headers.get('x-device-key');

  if (!deviceId || !deviceKey) {
    return new Response(JSON.stringify({ error: 'Missing device credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const schemaModule = await import('@/db/schema');
    const db = await requireActivityDb();

    // Verify device
    const deviceResult = await db.select().from(schemaModule.activityDevices).where(eq(schemaModule.activityDevices.id, deviceId)).limit(1);
    const device = deviceResult.length > 0 ? deviceResult[0] : null;

    if (!device || device.apiKeyHash !== hashApiKey(deviceKey)) {
      return new Response(JSON.stringify({ error: 'Invalid device credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { sentAt, intervalSec, now, counts, durations } = body;

    if (!now || !sentAt) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timestamp = new Date(sentAt);
    const app = now.app || '';
    const windowTitle = now.windowTitle || '';
    const category = now.category || 'unknown';
    const isAfk = !!now.isAfk;
    const interval = intervalSec || 10;
    const keys = counts?.keys || 0;
    const clicks = counts?.clicks || 0;
    const scroll = counts?.scroll || 0;

    // Use agent-computed durations if available, otherwise fall back to binary
    let totalActiveSec: number;
    let totalAfkSec: number;
    if (durations && typeof durations.activeSec === 'number' && typeof durations.afkSec === 'number') {
      totalActiveSec = durations.activeSec;
      totalAfkSec = durations.afkSec;
    } else {
      totalActiveSec = isAfk ? 0 : interval;
      totalAfkSec = isAfk ? interval : 0;
    }

    // Compute interval boundaries and split across minutes
    const end = timestamp;
    const start = new Date(end.getTime() - interval * 1000);
    const slices = splitByMinutes(start, end, totalActiveSec, totalAfkSec, keys, clicks, scroll);

    // Upsert each minute slice
    for (const slice of slices) {
      await db.insert(schemaModule.activityMinuteAgg).values({
        deviceId,
        tsMinute: slice.tsMinute,
        app,
        windowTitle,
        category,
        activeSec: slice.activeSec,
        afkSec: slice.afkSec,
        keys: slice.keys,
        clicks: slice.clicks,
        scroll: slice.scroll,
      }).onConflictDoUpdate({
        target: [
          schemaModule.activityMinuteAgg.deviceId,
          schemaModule.activityMinuteAgg.tsMinute,
          schemaModule.activityMinuteAgg.app,
          schemaModule.activityMinuteAgg.windowTitle,
          schemaModule.activityMinuteAgg.category,
        ],
        set: {
          activeSec: sql`${schemaModule.activityMinuteAgg.activeSec} + excluded.active_sec`,
          afkSec: sql`${schemaModule.activityMinuteAgg.afkSec} + excluded.afk_sec`,
          keys: sql`${schemaModule.activityMinuteAgg.keys} + excluded.keys`,
          clicks: sql`${schemaModule.activityMinuteAgg.clicks} + excluded.clicks`,
          scroll: sql`${schemaModule.activityMinuteAgg.scroll} + excluded.scroll`,
        },
      });
    }

    // Upsert current state with day-reset logic for counters
    const existingNowResult = await db.select().from(schemaModule.activityNow).where(eq(schemaModule.activityNow.deviceId, deviceId)).limit(1);
    const existingNow = existingNowResult.length > 0 ? existingNowResult[0] : null;

    const todayStart = new Date(timestamp);
    todayStart.setHours(0, 0, 0, 0);

    const existingDay = existingNow?.updatedAt
      ? new Date(existingNow.updatedAt).setHours(0, 0, 0, 0)
      : null;

    const sameDay = existingDay !== null && existingDay === todayStart.getTime();

    if (!existingNow) {
      await db.insert(schemaModule.activityNow).values({
        deviceId,
        updatedAt: timestamp,
        app: now.app || null,
        windowTitle: now.windowTitle || null,
        category,
        isAfk,
        countsTodayKeys: keys,
        countsTodayClicks: clicks,
        countsTodayScroll: scroll,
        countsTodayActiveSec: totalActiveSec,
      });
    } else if (sameDay) {
      await db.update(schemaModule.activityNow).set({
        updatedAt: timestamp,
        app: now.app || null,
        windowTitle: now.windowTitle || null,
        category,
        isAfk,
        countsTodayKeys: sql`${schemaModule.activityNow.countsTodayKeys} + ${keys}`,
        countsTodayClicks: sql`${schemaModule.activityNow.countsTodayClicks} + ${clicks}`,
        countsTodayScroll: sql`${schemaModule.activityNow.countsTodayScroll} + ${scroll}`,
        countsTodayActiveSec: sql`${schemaModule.activityNow.countsTodayActiveSec} + ${totalActiveSec}`,
      }).where(eq(schemaModule.activityNow.deviceId, deviceId));
    } else {
      // New day — reset counters
      await db.update(schemaModule.activityNow).set({
        updatedAt: timestamp,
        app: now.app || null,
        windowTitle: now.windowTitle || null,
        category,
        isAfk,
        countsTodayKeys: keys,
        countsTodayClicks: clicks,
        countsTodayScroll: scroll,
        countsTodayActiveSec: totalActiveSec,
      }).where(eq(schemaModule.activityNow.deviceId, deviceId));
    }

    // Update device last_seen_at
    await db.update(schemaModule.activityDevices)
      .set({ lastSeenAt: timestamp })
      .where(eq(schemaModule.activityDevices.id, deviceId));

    // Broadcast to SSE subscribers
    broadcastSSE(deviceId, {
      deviceId,
      updatedAt: timestamp.toISOString(),
      now: { app: now.app, windowTitle: now.windowTitle, category, isAfk },
      countsToday: {
        keys: sameDay ? (existingNow!.countsTodayKeys + keys) : keys,
        clicks: sameDay ? (existingNow!.countsTodayClicks + clicks) : clicks,
        scroll: sameDay ? (existingNow!.countsTodayScroll + scroll) : scroll,
        activeSec: sameDay ? (existingNow!.countsTodayActiveSec + totalActiveSec) : totalActiveSec,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[activity/ingest] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};