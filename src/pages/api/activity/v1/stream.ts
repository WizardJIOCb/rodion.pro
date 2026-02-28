import type { APIRoute } from 'astro';
import { activityDevices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { addSSEConnection, removeSSEConnection } from '@/lib/activity';
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
    // Import the hash function and db
    const { hashApiKey } = await import('@/lib/activity');
    const { requireActivityDb } = await import('@/lib/activity-db');
    
    const db = await requireActivityDb();
    const device = await db.query.activityDevices.findFirst({
      where: eq(activityDevices.id, deviceId),
    });

    if (device && device.apiKeyHash === hashApiKey(deviceKey)) {
      hasAccess = true;
    }
  } 
  // Allow access from activity dashboard pages (same origin)
  else {
    const origin = request.headers.get('origin');
    const sameOrigin = origin && origin === url.origin;
    
    const referer = request.headers.get('referer') || '';
    const sameOriginByReferer = referer.startsWith(url.origin);
    
    // Check if same origin by origin header or referer header
    if (sameOrigin || sameOriginByReferer) {
      hasAccess = true;
    }
    // Additionally allow localhost/127.0.0.1 in development
    else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
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
  }

  if (!hasAccess) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addSSEConnection(deviceId, controller);

      // Send initial keepalive
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Keepalive every 30 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(interval);
        }
      }, 30_000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        removeSSEConnection(deviceId, controller);
        try {
          controller.close();
        } catch { /* already closed */ }
      });
    },
    cancel() {
      // Will be cleaned up by abort listener
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx: disable buffering
    },
  });
};
