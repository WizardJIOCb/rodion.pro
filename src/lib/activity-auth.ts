import type { AstroCookies } from 'astro';
import { eq } from 'drizzle-orm';
import { hashApiKey, verifyAdminToken } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { getCurrentUser } from '@/lib/session';
import { activityDevices } from '@/db/schema';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS });
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/**
 * Authenticate a device by x-device-id + x-device-key headers.
 * Returns the deviceId on success or a Response on failure.
 */
export async function requireDeviceAuth(
  request: Request,
): Promise<{ deviceId: string } | Response> {
  if (!(await hasActivityDb())) {
    return jsonError('DB not configured', 503);
  }

  const deviceId = request.headers.get('x-device-id');
  const deviceKey = request.headers.get('x-device-key');

  if (!deviceId || !deviceKey) {
    return jsonError('Missing device credentials', 401);
  }

  const db = await requireActivityDb();
  const deviceResult = await db
    .select()
    .from(activityDevices)
    .where(eq(activityDevices.id, deviceId))
    .limit(1);
  const device = deviceResult[0];

  if (!device || device.apiKeyHash !== hashApiKey(deviceKey)) {
    return jsonError('Invalid device credentials', 401);
  }

  return { deviceId };
}

/**
 * 3-tier auth check for read endpoints:
 * 1. Device key from header
 * 2. Same-origin dashboard access
 * 3. Admin token or logged-in admin session
 */
export async function verifyDeviceAccess(
  request: Request,
  url: URL,
  cookies: AstroCookies,
  deviceId: string,
): Promise<boolean> {
  // 1. Device key authentication
  const deviceKeyFromHeader = request.headers.get('x-device-key');
  const deviceKeyFromQuery = url.searchParams.get('deviceKey');
  const deviceKey = deviceKeyFromHeader || deviceKeyFromQuery;

  if (deviceKey) {
    const db = await requireActivityDb();
    const deviceResult = await db
      .select()
      .from(activityDevices)
      .where(eq(activityDevices.id, deviceId))
      .limit(1);
    const device = deviceResult[0];
    if (device && device.apiKeyHash === hashApiKey(deviceKey)) {
      return true;
    }
  }

  // 2. Same-origin access
  if (
    request.headers.get('sec-fetch-site') === 'same-origin' ||
    request.headers.get('origin')?.includes('localhost')
  ) {
    return true;
  }

  // 3. Admin token or session
  if (verifyAdminToken(request)) {
    return true;
  }

  const user = await getCurrentUser(cookies);
  if (user?.isAdmin) {
    return true;
  }

  return false;
}
