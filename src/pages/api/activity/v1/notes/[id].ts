import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { decryptNote, hasNotesKey } from '@/lib/cryptoNotes';

export const GET: APIRoute = async ({ params, request }) => {
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

  // Admin auth required
  if (!verifyAdminToken(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const schemaModule = await import('@/db/schema');
    const db = await requireActivityDb();

    const notes = await db
      .select()
      .from(schemaModule.activityNotes)
      .where(eq(schemaModule.activityNotes.id, id))
      .limit(1);

    const note = notes[0];
    if (!note) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = decryptNote(note.contentEnc);

    return new Response(
      JSON.stringify({
        id: note.id,
        createdAt: note.createdAt,
        app: note.app,
        category: note.category,
        tag: note.tag,
        title: note.title,
        text,
        len: note.len,
        meta: note.meta,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[activity/notes/:id] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
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

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const schemaModule = await import('@/db/schema');
    const db = await requireActivityDb();

    await db.delete(schemaModule.activityNotes).where(eq(schemaModule.activityNotes.id, id));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[activity/notes/:id] Delete error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
