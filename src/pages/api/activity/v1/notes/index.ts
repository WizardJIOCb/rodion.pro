import type { APIRoute } from 'astro';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';

export const GET: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Admin auth required
  if (!verifyAdminToken(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const app = url.searchParams.get('app');
  const tag = url.searchParams.get('tag');
  const limitParam = url.searchParams.get('limit');

  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'deviceId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const limit = Math.min(Math.max(parseInt(limitParam || '200', 10) || 200, 1), 500);

  try {
    const schemaModule = await import('@/db/schema');
    const db = await requireActivityDb();

    const conditions = [eq(schemaModule.activityNotes.deviceId, deviceId)];

    if (from) {
      conditions.push(gte(schemaModule.activityNotes.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(schemaModule.activityNotes.createdAt, new Date(to)));
    }
    if (app) {
      conditions.push(eq(schemaModule.activityNotes.app, app));
    }
    if (tag) {
      conditions.push(eq(schemaModule.activityNotes.tag, tag));
    }

    const notes = await db
      .select({
        id: schemaModule.activityNotes.id,
        createdAt: schemaModule.activityNotes.createdAt,
        app: schemaModule.activityNotes.app,
        category: schemaModule.activityNotes.category,
        tag: schemaModule.activityNotes.tag,
        title: schemaModule.activityNotes.title,
        preview: schemaModule.activityNotes.preview,
        len: schemaModule.activityNotes.len,
        meta: schemaModule.activityNotes.meta,
      })
      .from(schemaModule.activityNotes)
      .where(and(...conditions))
      .orderBy(desc(schemaModule.activityNotes.createdAt))
      .limit(limit);

    return new Response(JSON.stringify(notes), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[activity/notes] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
