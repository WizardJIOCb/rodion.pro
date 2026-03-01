-- Activity notes table for quick notes with encrypted content
CREATE TABLE IF NOT EXISTS activity_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  app TEXT,
  category TEXT NOT NULL DEFAULT 'unknown',
  
  tag TEXT,
  title TEXT,
  
  preview TEXT NOT NULL,
  len INTEGER NOT NULL DEFAULT 0,
  
  content_enc BYTEA NOT NULL,
  
  meta JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS activity_notes_device_created_idx ON activity_notes (device_id, created_at);
CREATE INDEX IF NOT EXISTS activity_notes_device_app_created_idx ON activity_notes (device_id, app, created_at);
