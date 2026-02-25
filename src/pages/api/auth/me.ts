import type { APIRoute } from 'astro';
import { getCurrentUser } from '@/lib/session';

export { getCurrentUser, type CurrentUser } from '@/lib/session';

export const GET: APIRoute = async ({ cookies }) => {
  try {
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
