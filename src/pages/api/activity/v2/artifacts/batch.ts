import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { requireDeviceAuth, jsonError, jsonOk } from '@/lib/activity-auth';
import { requireActivityDb } from '@/lib/activity-db';
import { activityArtifacts } from '@/db/schema';

const MAX_BATCH_SIZE = 100;

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireDeviceAuth(request);
  if (authResult instanceof Response) return authResult;
  const { deviceId } = authResult;

  const body = await request.json();
  const { artifacts } = body;

  if (!Array.isArray(artifacts)) {
    return jsonError('Missing or invalid field: artifacts (must be array)', 400);
  }

  if (artifacts.length > MAX_BATCH_SIZE) {
    return jsonError(`Batch too large: max ${MAX_BATCH_SIZE} artifacts`, 400);
  }

  if (artifacts.length === 0) {
    return jsonOk({ ok: true, inserted: 0, skipped: 0 });
  }

  const db = await requireActivityDb();
  let inserted = 0;
  let skipped = 0;

  for (const artifact of artifacts) {
    const {
      occurredAt,
      artifactType,
      projectSlug,
      sourceApp,
      title,
      payload,
      privacyLevel,
      fingerprint: providedFingerprint,
    } = artifact;

    if (!occurredAt || !artifactType) {
      skipped++;
      continue;
    }

    // Compute fingerprint if not provided
    const fingerprint =
      providedFingerprint ||
      createHash('sha256')
        .update(`${artifactType}:${deviceId}:${occurredAt}:${title || ''}:${JSON.stringify(payload || {})}`)
        .digest('hex');

    const [result] = await db
      .insert(activityArtifacts)
      .values({
        deviceId,
        occurredAt: new Date(occurredAt),
        projectSlug: projectSlug || null,
        artifactType,
        sourceApp: sourceApp || null,
        title: title || null,
        payloadJson: payload || {},
        privacyLevel: privacyLevel || 'private',
        fingerprint,
      })
      .onConflictDoNothing({ target: activityArtifacts.fingerprint })
      .returning();

    if (result) {
      inserted++;
    } else {
      skipped++;
    }
  }

  return jsonOk({ ok: true, inserted, skipped });
};
