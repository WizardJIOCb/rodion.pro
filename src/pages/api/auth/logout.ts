import type { APIRoute } from 'astro';
import { hasDb, requireDb, sessions } from '@/db';
import { eq } from 'drizzle-orm';
import { getSessionCookie, deleteSessionCookie } from '@/lib/auth';

export const POST: APIRoute = async ({ cookies, redirect, request }) => {
  const sessionId = getSessionCookie(cookies);
  
  if (sessionId && hasDb()) {
    try {
      const db = requireDb();
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    } catch (error) {
      console.error('Error deleting session from DB:', error);
    }
  }
  
  // Always delete cookie regardless of DB state
  deleteSessionCookie(cookies);
  
  // Get return URL from referer or default to home
  const referer = request.headers.get('referer');
  const returnTo = referer ? new URL(referer).pathname : '/';
  
  return redirect(returnTo, 302);
};
