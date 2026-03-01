import type { APIRoute } from 'astro';
import { eq, and, gte, lt, sql, desc, inArray } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { getCurrentUser } from '@/lib/session';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  if (!(await hasActivityDb())) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deviceId = url.searchParams.get('deviceId');
  const fromStr = url.searchParams.get('from');
  const toStr = url.searchParams.get('to');
  const group = url.searchParams.get('group') || 'hour'; // '15min' | 'hour' | 'day'

  if (!deviceId || !fromStr || !toStr) {
    return new Response(JSON.stringify({ error: 'Missing deviceId, from, or to' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return new Response(JSON.stringify({ error: 'Invalid date format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if this is a device authentication request (by device key header or query param)
  const deviceKeyFromHeader = request.headers.get('x-device-key');
  const deviceKeyFromQuery = url.searchParams.get('deviceKey');
  const deviceKey = deviceKeyFromHeader || deviceKeyFromQuery;
  
  let hasAccess = false;
  
  // If device key is provided, authenticate as device
  if (deviceKey) {
    // Import the hash function and db
    const { hashApiKey } = await import('@/lib/activity');
    const schemaModule = await import('@/db/schema');
    
    const db = await requireActivityDb();
    const device = await db.query[schemaModule.activityDevices].findFirst({
      where: eq(schemaModule.activityDevices.id, deviceId),
    });

    if (device && device.apiKeyHash === hashApiKey(deviceKey)) {
      hasAccess = true;
    }
  } 
  // Allow access from activity dashboard pages (same origin)
  else if (request.headers.get('sec-fetch-site') === 'same-origin' || 
           request.headers.get('origin')?.includes('localhost')) {
    hasAccess = true;
  }
  // Otherwise check for admin access
  else {
    // Auth: admin token OR logged-in admin
    const isTokenAuth = verifyAdminToken(request);
    if (isTokenAuth) {
      hasAccess = true;
    } else {
      const user = await getCurrentUser(cookies);
      if (user?.isAdmin) {
        hasAccess = true;
      }
    }
  }

  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const schemaModule = await import('@/db/schema');
  const db = await requireActivityDb();

  // Parse optional category filter
  const categoryParam = url.searchParams.get('category');
  const categories = categoryParam ? categoryParam.split(',').map(c => c.trim()).filter(Boolean) : null;

  const baseWhere = and(
    eq(schemaModule.activityMinuteAgg.deviceId, deviceId),
    gte(schemaModule.activityMinuteAgg.tsMinute, from),
    lt(schemaModule.activityMinuteAgg.tsMinute, to),
    categories && categories.length > 0
      ? inArray(schemaModule.activityMinuteAgg.category, categories)
      : undefined,
  );

  // Time series grouped by 15min, hour, or day
  const truncExpr = group === 'day'
    ? sql`date_trunc('day', ${schemaModule.activityMinuteAgg.tsMinute})`
    : group === '15min'
    ? sql`date_trunc('hour', ${schemaModule.activityMinuteAgg.tsMinute}) + floor(extract(minute from ${schemaModule.activityMinuteAgg.tsMinute}) / 15) * interval '15 minutes'`
    : sql`date_trunc('hour', ${schemaModule.activityMinuteAgg.tsMinute})`;

  const series = await db
    .select({
      t: truncExpr.as('t'),
      activeSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('active_sec'),
      afkSec: sql<number>`sum(${schemaModule.activityMinuteAgg.afkSec})`.as('afk_sec'),
      keys: sql<number>`sum(${schemaModule.activityMinuteAgg.keys})`.as('keys'),
      clicks: sql<number>`sum(${schemaModule.activityMinuteAgg.clicks})`.as('clicks'),
      scroll: sql<number>`sum(${schemaModule.activityMinuteAgg.scroll})`.as('scroll'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(truncExpr)
    .orderBy(truncExpr);

  // Top apps
  const topApps = await db
    .select({
      app: schemaModule.activityMinuteAgg.app,
      category: schemaModule.activityMinuteAgg.category,
      activeSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('active_sec'),
      keys: sql<number>`sum(${schemaModule.activityMinuteAgg.keys})`.as('keys'),
      clicks: sql<number>`sum(${schemaModule.activityMinuteAgg.clicks})`.as('clicks'),
      scroll: sql<number>`sum(${schemaModule.activityMinuteAgg.scroll})`.as('scroll'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(schemaModule.activityMinuteAgg.app, schemaModule.activityMinuteAgg.category)
    .orderBy(desc(sql`sum(${schemaModule.activityMinuteAgg.activeSec})`))
    .limit(20);

  // Top categories
  const topCategories = await db
    .select({
      category: schemaModule.activityMinuteAgg.category,
      activeSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('active_sec'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(schemaModule.activityMinuteAgg.category)
    .orderBy(desc(sql`sum(${schemaModule.activityMinuteAgg.activeSec})`));

  // Top window titles (for detailed view)
  const topTitles = await db
    .select({
      app: schemaModule.activityMinuteAgg.app,
      windowTitle: schemaModule.activityMinuteAgg.windowTitle,
      category: schemaModule.activityMinuteAgg.category,
      activeSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('active_sec'),
      keys: sql<number>`sum(${schemaModule.activityMinuteAgg.keys})`.as('keys'),
      clicks: sql<number>`sum(${schemaModule.activityMinuteAgg.clicks})`.as('clicks'),
      scroll: sql<number>`sum(${schemaModule.activityMinuteAgg.scroll})`.as('scroll'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(schemaModule.activityMinuteAgg.app, schemaModule.activityMinuteAgg.windowTitle, schemaModule.activityMinuteAgg.category)
    .orderBy(desc(sql`sum(${schemaModule.activityMinuteAgg.activeSec})`))
    .limit(50);

  // --- Per-window time-series breakdown for stacked area chart ---

  // Query A: find top 8 windows by total activeSec
  const topWindows = await db
    .select({
      app: schemaModule.activityMinuteAgg.app,
      windowTitle: schemaModule.activityMinuteAgg.windowTitle,
      totalActiveSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('total_active_sec'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(schemaModule.activityMinuteAgg.app, schemaModule.activityMinuteAgg.windowTitle)
    .orderBy(desc(sql`sum(${schemaModule.activityMinuteAgg.activeSec})`))
    .limit(8);

  // Query B: time-series grouped by (time bucket, app, windowTitle)
  const rawWindowSeries = await db
    .select({
      t: truncExpr.as('t'),
      app: schemaModule.activityMinuteAgg.app,
      windowTitle: schemaModule.activityMinuteAgg.windowTitle,
      activeSec: sql<number>`sum(${schemaModule.activityMinuteAgg.activeSec})`.as('active_sec'),
    })
    .from(schemaModule.activityMinuteAgg)
    .where(baseWhere)
    .groupBy(truncExpr, schemaModule.activityMinuteAgg.app, schemaModule.activityMinuteAgg.windowTitle)
    .orderBy(truncExpr);

  // Build set of top-8 keys for fast lookup
  const top8Set = new Set(
    topWindows.map(w => `${w.app}\0${w.windowTitle}`),
  );

  function formatWindowLabel(app: string, title: string): string {
    const t = title || '(no title)';
    const label = `${app}: ${t}`;
    return label.length > 40 ? label.substring(0, 37) + '...' : label;
  }

  // Build Recharts-ready data: Map<isoTimestamp, { [label]: activeSec }>
  const windowTimeMap = new Map<string, Record<string, number>>();
  // Collect ordered labels for stable color assignment
  const labelSet = new Set<string>();

  for (const row of rawWindowSeries) {
    const tKey = new Date(row.t as string | Date).toISOString();
    if (!windowTimeMap.has(tKey)) windowTimeMap.set(tKey, {});
    const bucket = windowTimeMap.get(tKey)!;
    const key = `${row.app}\0${row.windowTitle}`;
    const sec = Number(row.activeSec);

    if (top8Set.has(key)) {
      const label = formatWindowLabel(row.app, row.windowTitle);
      bucket[label] = (bucket[label] || 0) + sec;
      labelSet.add(label);
    } else {
      bucket['Other'] = (bucket['Other'] || 0) + sec;
    }
  }

  const seriesByWindow = Array.from(windowTimeMap.entries())
    .map(([t, data]) => ({ t, ...data }));

  // Ordered list of labels (top-8 by their global total, then Other)
  const windowLabels = topWindows.map(w => formatWindowLabel(w.app, w.windowTitle));
  if (rawWindowSeries.length > 0 && topWindows.length < rawWindowSeries.length) {
    windowLabels.push('Other');
  }

  return new Response(JSON.stringify({
    from: from.toISOString(),
    to: to.toISOString(),
    group,
    series: series.map(r => ({
      t: r.t,
      activeSec: Number(r.activeSec),
      afkSec: Number(r.afkSec),
      keys: Number(r.keys),
      clicks: Number(r.clicks),
      scroll: Number(r.scroll),
    })),
    topApps: topApps.map(r => ({
      app: r.app,
      category: r.category,
      activeSec: Number(r.activeSec),
      keys: Number(r.keys),
      clicks: Number(r.clicks),
      scroll: Number(r.scroll),
    })),
    topCategories: topCategories.map(r => ({
      category: r.category,
      activeSec: Number(r.activeSec),
    })),
    topTitles: topTitles.map(r => ({
      app: r.app,
      windowTitle: r.windowTitle,
      category: r.category,
      activeSec: Number(r.activeSec),
      keys: Number(r.keys),
      clicks: Number(r.clicks),
      scroll: Number(r.scroll),
    })),
    seriesByWindow,
    windowLabels,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
