import type { APIRoute } from 'astro';
import { activityDevices, activityNow } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { getCurrentUser } from '@/lib/session';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';

// Import the schema types for the database connection
import * as schema from '@/db/schema';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  if (!(await hasActivityDb())) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deviceId = url.searchParams.get('deviceId');
  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Missing deviceId' }), {
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
    // Import the hash function
    const { hashApiKey } = await import('@/lib/activity');
    
    const db = await requireActivityDb();
    const device = await db.query.activityDevices.findFirst({
      where: eq(activityDevices.id, deviceId),
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

  const db = await requireActivityDb();
  const row = await db.query.activityNow.findFirst({
    where: eq(activityNow.deviceId, deviceId),
  });

  if (!row) {
    return new Response(JSON.stringify({ error: 'Device not found or no data' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    deviceId: row.deviceId,
    updatedAt: row.updatedAt.toISOString(),
    now: {
      app: row.app,
      windowTitle: row.windowTitle,
      category: row.category,
      isAfk: row.isAfk,
    },
    countsToday: {
      keys: row.countsTodayKeys,
      clicks: row.countsTodayClicks,
      scroll: row.countsTodayScroll,
      activeSec: row.countsTodayActiveSec,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
