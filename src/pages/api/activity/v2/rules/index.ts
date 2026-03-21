import type { APIRoute } from 'astro';
import { eq, asc } from 'drizzle-orm';
import { verifyAdminToken } from '@/lib/activity';
import { hasActivityDb, requireActivityDb } from '@/lib/activity-db';
import { jsonError, jsonOk } from '@/lib/activity-auth';
import { activityRules } from '@/db/schema';

export const GET: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) return jsonError('DB not configured', 503);
  if (!verifyAdminToken(request)) return jsonError('Unauthorized', 401);

  const db = await requireActivityDb();
  const url = new URL(request.url);
  const enabledOnly = url.searchParams.get('enabledOnly') === 'true';

  const rules = enabledOnly
    ? await db.select().from(activityRules).where(eq(activityRules.isEnabled, true)).orderBy(asc(activityRules.priority))
    : await db.select().from(activityRules).orderBy(asc(activityRules.priority));

  return jsonOk({ rules });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!(await hasActivityDb())) return jsonError('DB not configured', 503);
  if (!verifyAdminToken(request)) return jsonError('Unauthorized', 401);

  const db = await requireActivityDb();
  const body = await request.json();

  const {
    id,
    priority,
    isEnabled,
    sourceType,
    matchKind,
    matchValue,
    resultProjectSlug,
    resultCategory,
    resultActivityType,
    confidence,
  } = body;

  if (!sourceType || !matchKind || !matchValue) {
    return jsonError('Missing required fields: sourceType, matchKind, matchValue', 400);
  }

  const values = {
    priority: priority ?? 0,
    isEnabled: isEnabled ?? true,
    sourceType,
    matchKind,
    matchValue,
    resultProjectSlug: resultProjectSlug ?? null,
    resultCategory: resultCategory ?? null,
    resultActivityType: resultActivityType ?? null,
    confidence: confidence ?? 80,
  };

  if (id) {
    const [updated] = await db
      .update(activityRules)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(activityRules.id, id))
      .returning();
    if (!updated) return jsonError('Rule not found', 404);
    return jsonOk({ rule: updated });
  }

  const [inserted] = await db
    .insert(activityRules)
    .values(values)
    .returning();

  return jsonOk({ rule: inserted }, 201);
};
