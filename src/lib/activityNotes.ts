export interface ActivityNotePreview {
  id: string;
  createdAt: string;
  app: string | null;
  category: string;
  tag: string | null;
  title: string | null;
  preview: string;
  len: number;
  meta: Record<string, unknown>;
}

export interface ActivityNoteDetail extends ActivityNotePreview {
  text: string;
}

export interface FetchNotesOptions {
  adminToken: string;
  deviceId: string;
  from?: string;
  to?: string;
  app?: string;
  tag?: string;
  limit?: number;
}

export async function fetchNotes(opts: FetchNotesOptions): Promise<ActivityNotePreview[]> {
  const params = new URLSearchParams({ deviceId: opts.deviceId });
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  if (opts.app) params.set('app', opts.app);
  if (opts.tag) params.set('tag', opts.tag);
  if (opts.limit) params.set('limit', String(opts.limit));

  const res = await fetch(`/api/activity/v1/notes?${params}`, {
    headers: { Authorization: `Bearer ${opts.adminToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch notes: ${res.status}`);
  }

  return res.json();
}

export async function fetchNote(id: string, adminToken: string): Promise<ActivityNoteDetail> {
  const res = await fetch(`/api/activity/v1/notes/${id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch note: ${res.status}`);
  }

  return res.json();
}

export async function deleteNote(id: string, adminToken: string): Promise<void> {
  const res = await fetch(`/api/activity/v1/notes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete note: ${res.status}`);
  }
}

export interface CreateNoteOptions {
  adminToken: string;
  deviceId: string;
  text: string;
  app?: string;
  category?: string;
  tag?: string;
  title?: string;
  redact?: boolean;
}

export async function createNote(opts: CreateNoteOptions): Promise<void> {
  const res = await fetch('/api/activity/v1/notes/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': opts.deviceId,
      'X-Device-Key': opts.adminToken, // Admin can use token as device key
    },
    body: JSON.stringify({
      sentAt: new Date().toISOString(),
      context: {
        app: opts.app || null,
        category: opts.category || 'unknown',
      },
      note: {
        text: opts.text,
        tag: opts.tag || null,
        title: opts.title || null,
        redact: opts.redact ?? true,
        source: 'ui',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create note: ${res.status}`);
  }
}
