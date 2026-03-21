import type { APIRoute } from 'astro';
import { eq, asc } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { jsonError, jsonOk } from '@/lib/activity-auth';
import { activityProjects } from '@/db/schema';

export const GET: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) return jsonError('DB not configured', 503);
  if (!verifyAdminToken(request)) return jsonError('Unauthorized', 401);

  const db = await requireActivityDb();
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('activeOnly') === 'true';

  const projects = activeOnly
    ? await db.select().from(activityProjects).where(eq(activityProjects.isActive, true)).orderBy(asc(activityProjects.name))
    : await db.select().from(activityProjects).orderBy(asc(activityProjects.name));

  return jsonOk({ projects });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) return jsonError('DB not configured', 503);
  if (!verifyAdminToken(request)) return jsonError('Unauthorized', 401);

  const db = await requireActivityDb();
  const body = await request.json();

  const { id, slug, name, repoPathPattern, repoRemotePattern, domainPattern, branchPattern, isActive, color } = body;

  if (!slug || !name) {
    return jsonError('Missing required fields: slug, name', 400);
  }

  if (id) {
    // Update existing
    const [updated] = await db
      .update(activityProjects)
      .set({
        slug,
        name,
        repoPathPattern: repoPathPattern ?? null,
        repoRemotePattern: repoRemotePattern ?? null,
        domainPattern: domainPattern ?? null,
        branchPattern: branchPattern ?? null,
        isActive: isActive ?? true,
        color: color ?? null,
        updatedAt: new Date(),
      })
      .where(eq(activityProjects.id, id))
      .returning();
    if (!updated) return jsonError('Project not found', 404);
    return jsonOk({ project: updated });
  }

  // Insert new
  const [inserted] = await db
    .insert(activityProjects)
    .values({
      slug,
      name,
      repoPathPattern: repoPathPattern ?? null,
      repoRemotePattern: repoRemotePattern ?? null,
      domainPattern: domainPattern ?? null,
      branchPattern: branchPattern ?? null,
      isActive: isActive ?? true,
      color: color ?? null,
    })
    .returning();

  return jsonOk({ project: inserted }, 201);
};
