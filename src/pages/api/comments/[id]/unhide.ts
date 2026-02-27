import type { APIRoute } from 'astro';
import { hasDb, requireDb, comments } from '@/db';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';

// Unhide comment (admin only)
export const POST: APIRoute = async ({ params, cookies }) => {
  if (!hasDb()) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const currentUser = await getCurrentUser(cookies);
    
    if (!currentUser || !currentUser.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const commentId = parseInt(params.id!);
    if (isNaN(commentId)) {
      return new Response(JSON.stringify({ error: 'Invalid comment ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const db = requireDb();
    await db.update(comments)
      .set({ isHidden: false })
      .where(eq(comments.id, commentId));
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error unhiding comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to unhide comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
