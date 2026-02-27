import { db, users, sessions, hasDb, requireDb } from '@/db';
import { eq, and, gt } from 'drizzle-orm';
import { getSessionCookie, isAdmin } from './auth';

export interface CurrentUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export async function getCurrentUser(cookies: import('astro').AstroCookies): Promise<CurrentUser | null> {
  if (!hasDb()) {
    return null;
  }

  const sessionId = getSessionCookie(cookies);
  
  if (!sessionId) {
    return null;
  }
  
  const db = requireDb();
  
  // Find valid session
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, new Date()),
    ),
  });
  
  if (!session) {
    return null;
  }
  
  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  
  if (!user || user.isBanned) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isAdmin: isAdmin(user.email),
  };
}

// Re-export hasDb for convenience
export { hasDb } from '@/db';
