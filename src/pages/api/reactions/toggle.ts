import type { APIRoute } from 'astro';
import { db, reactions } from '@/db';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';

const ALLOWED_EMOJIS = ['👍', '🔥', '🤖', '💡', '😂', '🎯', '❤️'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const currentUser = await getCurrentUser(cookies);
    
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const body = await request.json();
    const { targetType, targetKey, lang, emoji } = body;
    
    if (!targetType || !targetKey || !emoji) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return new Response(JSON.stringify({ error: 'Invalid emoji' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check if reaction already exists
    const existing = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetKey, targetKey),
        eq(reactions.userId, currentUser.id),
        eq(reactions.emoji, emoji),
      ),
    });
    
    let added = false;
    
    if (existing) {
      // Remove reaction
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      added = false;
    } else {
      // Add reaction
      await db.insert(reactions).values({
        targetType,
        targetKey,
        lang: lang || null,
        userId: currentUser.id,
        emoji,
      });
      added = true;
    }
    
    return new Response(JSON.stringify({ added, emoji }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to toggle reaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
