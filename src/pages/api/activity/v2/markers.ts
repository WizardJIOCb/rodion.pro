import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { requireDeviceAuth, jsonError, jsonOk } from '@/lib/activity-auth';
import { requireActivityDb } from '@/lib/activity-db';
import { activityArtifacts } from '@/db/schema';

export const POST: APIRoute = async ({ request }) => {
  const authResult = await requireDeviceAuth(request);
  if (authResult instanceof Response) return authResult;
  const { deviceId } = authResult;

  const body = await request.json();
  const { markerType, projectSlug, note, occurredAt } = body;

  if (!markerType) {
    return jsonError('Missing required field: markerType', 400);
  }

  const timestamp = occurredAt ? new Date(occurredAt) : new Date();
  const payload = { markerType, note: note || null };

  // Generate fingerprint for dedup
  const fingerprintInput = `manual_marker:${deviceId}:${timestamp.toISOString()}:${markerType}`;
  const fingerprint = createHash('sha256').update(fingerprintInput).digest('hex');

  const db = await requireActivityDb();

  const [inserted] = await db
    .insert(activityArtifacts)
    .values({
      deviceId,
      occurredAt: timestamp,
      projectSlug: projectSlug || null,
      artifactType: 'manual_marker',
      title: markerType,
      payloadJson: payload,
      privacyLevel: 'private',
      fingerprint,
    })
    .onConflictDoNothing({ target: activityArtifacts.fingerprint })
    .returning();

  if (!inserted) {
    return jsonOk({ ok: true, id: null, duplicate: true });
  }

  return jsonOk({ ok: true, id: inserted.id });
};
