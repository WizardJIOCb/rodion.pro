import type { APIRoute } from 'astro';
import { getCurrentUser, hasDb } from '@/lib/session';

export { getCurrentUser, type CurrentUser } from '@/lib/session';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Return null user if DB is not configured
    if (!hasDb()) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const user = await getCurrentUser(cookies);
    
    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
