import type { APIRoute } from 'astro';
import { db, reactions } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '../auth/me';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const targetType = url.searchParams.get('targetType');
    const targetKey = url.searchParams.get('targetKey');
    const lang = url.searchParams.get('lang');
    
    if (!targetType || !targetKey) {
      return new Response(JSON.stringify({ error: 'Missing targetType or targetKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const currentUser = await getCurrentUser(cookies);
    
    // Get reaction counts
    const conditions = [
      eq(reactions.targetType, targetType),
      eq(reactions.targetKey, targetKey),
    ];
    
    if (lang && targetType === 'post') {
      conditions.push(eq(reactions.lang, lang));
    }
    
    const reactionCounts = await db
      .select({
        emoji: reactions.emoji,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(and(...conditions))
      .groupBy(reactions.emoji);
    
    const counts: Record<string, number> = {};
    for (const row of reactionCounts) {
      counts[row.emoji] = row.count;
    }
    
    // Get current user's reactions
    let userReactions: string[] = [];
    if (currentUser) {
      const userReactionData = await db
        .select({ emoji: reactions.emoji })
        .from(reactions)
        .where(
          and(
            eq(reactions.targetType, targetType),
            eq(reactions.targetKey, targetKey),
            eq(reactions.userId, currentUser.id),
          )
        );
      
      userReactions = userReactionData.map(r => r.emoji);
    }
    
    return new Response(JSON.stringify({ reactions: counts, userReactions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch reactions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
