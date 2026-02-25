import type { APIRoute } from 'astro';
import { getGoogleAuthUrl } from '@/lib/auth';

export const GET: APIRoute = async ({ url, redirect }) => {
  const returnTo = url.searchParams.get('returnTo') || '/';
  
  try {
    const authUrl = await getGoogleAuthUrl(returnTo);
    return redirect(authUrl, 302);
  } catch (error) {
    console.error('Failed to generate Google auth URL:', error);
    return redirect(`${returnTo}?error=auth_failed`, 302);
  }
};
