import { nanoid } from 'nanoid';
import type { AstroCookies } from 'astro';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionId(): string {
  return nanoid(32);
}

export function getSessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function setSessionCookie(cookies: AstroCookies, sessionId: string): void {
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export function getSessionCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(SESSION_COOKIE_NAME)?.value;
}

export function deleteSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export async function getGoogleAuthUrl(returnTo: string): Promise<string> {
  const clientId = import.meta.env.GOOGLE_CLIENT_ID;
  const baseUrl = import.meta.env.SITE_URL || 'http://localhost:4321';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: encodeURIComponent(returnTo),
    access_type: 'online',
    prompt: 'select_account',
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{ access_token: string; id_token: string }> {
  const clientId = import.meta.env.GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = import.meta.env.SITE_URL || 'http://localhost:4321';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }
  
  return response.json();
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info from Google');
  }
  
  return response.json();
}

export function isAdmin(email: string): boolean {
  const adminEmails = (import.meta.env.ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}
