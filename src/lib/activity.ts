import { createHash } from 'node:crypto';

// Hash an API key for storage/comparison
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Round date down to start of current minute
export function floorToMinute(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

// SSE connections manager (in-memory)
type SSEController = ReadableStreamDefaultController<Uint8Array>;
const sseConnections = new Map<string, Set<SSEController>>();

export function addSSEConnection(deviceId: string, controller: SSEController) {
  if (!sseConnections.has(deviceId)) {
    sseConnections.set(deviceId, new Set());
  }
  sseConnections.get(deviceId)!.add(controller);
  console.log(`[activity] Added SSE connection for ${deviceId}, total: ${sseConnections.get(deviceId)!.size}`);
}

export function removeSSEConnection(deviceId: string, controller: SSEController) {
  const set = sseConnections.get(deviceId);
  if (set) {
    set.delete(controller);
    if (set.size === 0) sseConnections.delete(deviceId);
  }
}

const encoder = new TextEncoder();

export function broadcastSSE(deviceId: string, data: unknown) {
  const set = sseConnections.get(deviceId);
  if (!set || set.size === 0) return;
  console.log(`[activity] Broadcast now to ${set.size} connections for ${deviceId}`);
  const message = `event: now\ndata: ${JSON.stringify(data)}\n\n`;
  const bytes = encoder.encode(message);
  for (const controller of set) {
    try {
      controller.enqueue(bytes);
    } catch {
      set.delete(controller);
    }
  }
}

// Split an interval (start..end) into per-minute slices with proportional distribution
export interface MinuteSlice {
  tsMinute: Date;
  activeSec: number;
  afkSec: number;
  keys: number;
  clicks: number;
  scroll: number;
}

export function splitByMinutes(
  start: Date,
  end: Date,
  activeSec: number,
  afkSec: number,
  keys: number,
  clicks: number,
  scroll: number,
): MinuteSlice[] {
  const totalMs = end.getTime() - start.getTime();

  // Degenerate case: zero or negative interval → single slice at end's minute
  if (totalMs <= 0) {
    return [{
      tsMinute: floorToMinute(end),
      activeSec,
      afkSec,
      keys,
      clicks,
      scroll,
    }];
  }

  const slices: MinuteSlice[] = [];
  let cursor = start.getTime();
  const endMs = end.getTime();

  // Track remainders so rounding errors don't lose counts
  let activeRemain = activeSec;
  let afkRemain = afkSec;
  let keysRemain = keys;
  let clicksRemain = clicks;
  let scrollRemain = scroll;

  while (cursor < endMs) {
    const minuteStart = floorToMinute(new Date(cursor));
    const nextMinute = new Date(minuteStart.getTime() + 60_000);
    const sliceEnd = Math.min(nextMinute.getTime(), endMs);
    const sliceMs = sliceEnd - cursor;
    const fraction = sliceMs / totalMs;
    const isLast = sliceEnd >= endMs;

    let sliceActive: number;
    let sliceAfk: number;
    let sliceKeys: number;
    let sliceClicks: number;
    let sliceScroll: number;

    if (isLast) {
      // Last slice gets all remaining to avoid rounding loss
      sliceActive = activeRemain;
      sliceAfk = afkRemain;
      sliceKeys = keysRemain;
      sliceClicks = clicksRemain;
      sliceScroll = scrollRemain;
    } else {
      sliceActive = Math.round(activeSec * fraction);
      sliceAfk = Math.round(afkSec * fraction);
      sliceKeys = Math.round(keys * fraction);
      sliceClicks = Math.round(clicks * fraction);
      sliceScroll = Math.round(scroll * fraction);

      activeRemain -= sliceActive;
      afkRemain -= sliceAfk;
      keysRemain -= sliceKeys;
      clicksRemain -= sliceClicks;
      scrollRemain -= sliceScroll;
    }

    slices.push({
      tsMinute: minuteStart,
      activeSec: sliceActive,
      afkSec: sliceAfk,
      keys: sliceKeys,
      clicks: sliceClicks,
      scroll: sliceScroll,
    });

    cursor = sliceEnd;
  }

  return slices;
}

// Check admin auth: either ACTIVITY_ADMIN_TOKEN header or logged-in admin session
export function verifyAdminToken(request: Request): boolean {
  const token = import.meta.env.ACTIVITY_ADMIN_TOKEN;
  if (!token) return false;
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === token;
}
