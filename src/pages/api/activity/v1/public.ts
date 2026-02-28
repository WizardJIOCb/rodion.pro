import type { APIRoute } from 'astro';
import { hasDb, requireDb, activityNow, activityMinuteAgg } from '@/db';
import { sql, gte, desc } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  if (!hasDb()) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = requireDb();

  // Get latest activity across all devices
  const rows = await db.query.activityNow.findMany({
    orderBy: [desc(activityNow.updatedAt)],
    limit: 1,
  });

  const latest = rows[0];

  if (!latest) {
    return new Response(JSON.stringify({
      status: 'offline',
      lastSeenAt: null,
      today: { categories: [] },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Determine status from category (safe — no app names, no titles)
  const status = latest.isAfk ? 'idle' : (latest.category || 'unknown');

  // Today's totals by category (safe — no app names)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const categories = await db
    .select({
      category: activityMinuteAgg.category,
      activeSec: sql<number>`sum(${activityMinuteAgg.activeSec})`.as('active_sec'),
    })
    .from(activityMinuteAgg)
    .where(gte(activityMinuteAgg.tsMinute, todayStart))
    .groupBy(activityMinuteAgg.category)
    .orderBy(desc(sql`sum(${activityMinuteAgg.activeSec})`));

  return new Response(JSON.stringify({
    status,
    lastSeenAt: latest.updatedAt.toISOString(),
    today: {
      categories: categories.map(c => ({
        category: c.category,
        activeSec: Number(c.activeSec),
      })),
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
