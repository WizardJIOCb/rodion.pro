import type { APIRoute } from 'astro';
import { db, sessions } from '@/db';
import { eq } from 'drizzle-orm';
import { getSessionCookie, deleteSessionCookie } from '@/lib/auth';

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const sessionId = getSessionCookie(cookies);
  
  if (sessionId) {
    // Delete session from database
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    
    // Delete session cookie
    deleteSessionCookie(cookies);
  }
  
  // Get return URL from referer or default to home
  const referer = request.headers.get('referer');
  const returnTo = referer ? new URL(referer).pathname : '/';
  
  return redirect(returnTo, 302);
};
