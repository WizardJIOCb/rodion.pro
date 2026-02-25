-- Migration: 0001_initial
-- Created: 2026-02-25

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE
);

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_exp_idx ON sessions(expires_at);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  page_type TEXT NOT NULL,
  page_key TEXT NOT NULL,
  lang TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS comments_page_idx ON comments(page_type, page_key, lang, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id BIGSERIAL PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_key TEXT NOT NULL,
  lang TEXT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_key, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS reactions_target_idx ON reactions(target_type, target_key);
CREATE INDEX IF NOT EXISTS reactions_user_idx ON reactions(user_id);

-- Comment flags table
CREATE TABLE IF NOT EXISTS comment_flags (
  id BIGSERIAL PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flags_comment_idx ON comment_flags(comment_id);

-- Events table (changelog)
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  project TEXT,
  title TEXT NOT NULL,
  url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS events_ts_idx ON events(ts DESC);
CREATE INDEX IF NOT EXISTS events_project_idx ON events(project);
