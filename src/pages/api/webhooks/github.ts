import type { APIRoute } from 'astro';
import { db, events } from '@/db';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Commit types to show
const ALLOWED_PREFIXES = ['feat:', 'fix:', 'perf:', 'refactor:', 'docs:'];
const MAX_COMMITS_PER_PUSH = 5;

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  
  const parts = signature.split('=');
  if (parts.length !== 2) return false;
  
  const [algorithm, hash] = parts;
  if (algorithm !== 'sha256') return false;
  
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
  } catch {
    return false;
  }
}

function shouldIncludeCommit(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Skip merge commits
  if (lowerMessage.startsWith('merge ')) return false;
  
  // Check for allowed prefixes
  return ALLOWED_PREFIXES.some(prefix => lowerMessage.startsWith(prefix));
}

function getCommitKind(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.startsWith('feat:')) return 'feature';
  if (lowerMessage.startsWith('fix:')) return 'fix';
  if (lowerMessage.startsWith('perf:')) return 'performance';
  if (lowerMessage.startsWith('refactor:')) return 'refactor';
  if (lowerMessage.startsWith('docs:')) return 'docs';
  return 'commit';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const secret = import.meta.env.GITHUB_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return new Response('Webhook not configured', { status: 500 });
    }
    
    const payload = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    if (!verifySignature(payload, signature, secret)) {
      return new Response('Invalid signature', { status: 401 });
    }
    
    const event = request.headers.get('x-github-event');
    const data = JSON.parse(payload);
    
    if (event === 'push') {
      // Handle push event
      const repo = data.repository?.name || 'unknown';
      const branch = data.ref?.replace('refs/heads/', '') || 'unknown';
      
      // Only process main/master branch
      if (branch !== 'main' && branch !== 'master') {
        return new Response('Ignored non-main branch', { status: 200 });
      }
      
      const commits = (data.commits || [])
        .filter((c: any) => shouldIncludeCommit(c.message))
        .slice(0, MAX_COMMITS_PER_PUSH);
      
      for (const commit of commits) {
        const kind = getCommitKind(commit.message);
        const title = commit.message.split('\n')[0];
        
        await db.insert(events).values({
          source: 'github',
          kind,
          project: repo,
          title,
          url: commit.url,
          tags: [kind, branch],
          payload: {
            sha: commit.id?.substring(0, 7),
            author: commit.author?.name,
            branch,
          },
        });
      }
      
      return new Response(`Processed ${commits.length} commits`, { status: 200 });
    }
    
    if (event === 'release') {
      // Handle release event
      if (data.action !== 'published') {
        return new Response('Ignored non-publish release action', { status: 200 });
      }
      
      const repo = data.repository?.name || 'unknown';
      const release = data.release;
      
      await db.insert(events).values({
        source: 'github',
        kind: 'release',
        project: repo,
        title: `Release ${release.tag_name}: ${release.name || 'New release'}`,
        url: release.html_url,
        tags: ['release', release.tag_name],
        payload: {
          tag: release.tag_name,
          prerelease: release.prerelease,
          draft: release.draft,
        },
      });
      
      return new Response('Release event processed', { status: 200 });
    }
    
    return new Response(`Ignored event: ${event}`, { status: 200 });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
};
