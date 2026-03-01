import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { hashApiKey } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { encryptNote, hasNotesKey } from '@/lib/cryptoNotes';
import { buildPreview, isSuspicious } from '@/lib/noteSanitize';

const MAX_TEXT_LEN = 8192;

export const POST: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!hasNotesKey()) {
    return new Response(JSON.stringify({ error: 'Notes encryption not configured' }), {
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
    const { sentAt, context, note } = body;

    if (!note || typeof note.text !== 'string' || !note.text.trim()) {
      return new Response(JSON.stringify({ error: 'Missing note text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = note.text.trim();
    if (text.length > MAX_TEXT_LEN) {
      return new Response(JSON.stringify({ error: `Note too long (max ${MAX_TEXT_LEN})` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timestamp = sentAt ? new Date(sentAt) : new Date();
    const app = context?.app || null;
    const category = context?.category || 'unknown';
    const tag = note.tag || null;
    const title = note.title || null;
    const redact = note.redact !== false; // default true
    const source = note.source || 'unknown';

    const preview = buildPreview(text, redact);
    const contentEnc = encryptNote(text);
    const suspicious = isSuspicious(text);

    await db.insert(schemaModule.activityNotes).values({
      deviceId,
      createdAt: timestamp,
      app,
      category,
      tag,
      title,
      preview,
      len: text.length,
      contentEnc,
      meta: {
        source,
        redacted: redact || suspicious,
        suspicious,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[activity/notes/ingest] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
