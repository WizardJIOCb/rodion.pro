import type { APIRoute } from 'astro';
import { db, comments, commentFlags } from '@/db';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';

// Flag a comment
export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const currentUser = await getCurrentUser(cookies);
    
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
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
    
    const body = await request.json();
    const { reason } = body;
    
    // Check comment exists
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId),
    });
    
    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Create flag
    await db.insert(commentFlags).values({
      commentId,
      userId: currentUser.id,
      reason: reason || null,
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error flagging comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to flag comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
