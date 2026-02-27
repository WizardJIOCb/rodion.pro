import type { APIRoute } from 'astro';
import { hasDb, requireDb, events } from '@/db';

export const POST: APIRoute = async ({ request }) => {
  if (!hasDb()) {
    return new Response(JSON.stringify({ error: 'DB not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = import.meta.env.DEPLOY_TOKEN;
    
    if (!expectedToken) {
      return new Response('Deploy token not configured', { status: 500 });
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Missing authorization', { status: 401 });
    }
    
    const token = authHeader.substring(7);
    if (token !== expectedToken) {
      return new Response('Invalid token', { status: 401 });
    }
    
    const body = await request.json();
    const { project, version, environment, url, message } = body;
    
    if (!project) {
      return new Response('Missing project field', { status: 400 });
    }
    
    const title = message || `Deployed ${project}${version ? ` v${version}` : ''} to ${environment || 'production'}`;
    
    const db = requireDb();
    await db.insert(events).values({
      source: 'deploy',
      kind: 'deploy',
      project,
      title,
      url: url || null,
      tags: ['deploy', environment || 'production'],
      payload: {
        version,
        environment: environment || 'production',
      },
    });
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deploy event error:', error);
    return new Response('Internal error', { status: 500 });
  }
};
