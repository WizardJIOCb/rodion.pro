import type { APIRoute } from 'astro';
import { db, events } from '@/db';
import { desc, eq, and, sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  try {
    const lang = url.searchParams.get('lang') || 'ru';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const project = url.searchParams.get('project');
    
    const conditions = [];
    if (project) {
      conditions.push(eq(events.project, project));
    }
    
    const feedEvents = await db
      .select()
      .from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(events.ts))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    return new Response(JSON.stringify({
      events: feedEvents,
      total: count,
      hasMore: offset + feedEvents.length < count,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
