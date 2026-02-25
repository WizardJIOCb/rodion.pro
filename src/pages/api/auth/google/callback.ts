import type { APIRoute } from 'astro';
import { db, users, oauthAccounts, sessions } from '@/db';
import { eq, and } from 'drizzle-orm';
import {
  exchangeGoogleCode,
  getGoogleUserInfo,
  generateSessionId,
  getSessionExpiresAt,
  setSessionCookie,
} from '@/lib/auth';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  const returnTo = state ? decodeURIComponent(state) : '/';
  
  if (error) {
    console.error('Google OAuth error:', error);
    return redirect(`${returnTo}?error=oauth_denied`, 302);
  }
  
  if (!code) {
    return redirect(`${returnTo}?error=no_code`, 302);
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);
    
    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    
    if (!googleUser.email) {
      throw new Error('No email returned from Google');
    }
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    });
    
    if (!user) {
      // Create new user
      const [newUser] = await db.insert(users).values({
        email: googleUser.email,
        name: googleUser.name || null,
        avatarUrl: googleUser.picture || null,
      }).returning();
      
      user = newUser;
      
      // Link OAuth account
      await db.insert(oauthAccounts).values({
        userId: user!.id,
        provider: 'google',
        providerUserId: googleUser.sub,
      });
    } else {
      // Check if OAuth account is linked
      const existingOAuth = await db.query.oauthAccounts.findFirst({
        where: and(
          eq(oauthAccounts.userId, user.id),
          eq(oauthAccounts.provider, 'google'),
        ),
      });
      
      if (!existingOAuth) {
        // Link OAuth account to existing user
        await db.insert(oauthAccounts).values({
          userId: user.id,
          provider: 'google',
          providerUserId: googleUser.sub,
        });
      }
      
      // Update user info if changed
      if (googleUser.name !== user.name || googleUser.picture !== user.avatarUrl) {
        await db.update(users)
          .set({
            name: googleUser.name || user.name,
            avatarUrl: googleUser.picture || user.avatarUrl,
          })
          .where(eq(users.id, user.id));
      }
    }
    
    // Check if user is banned
    if (user!.isBanned) {
      return redirect(`${returnTo}?error=banned`, 302);
    }
    
    // Create session
    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiresAt();
    
    await db.insert(sessions).values({
      id: sessionId,
      userId: user!.id,
      expiresAt,
    });
    
    // Set session cookie
    setSessionCookie(cookies, sessionId);
    
    // Redirect back
    return redirect(returnTo, 302);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return redirect(`${returnTo}?error=auth_failed`, 302);
  }
};
