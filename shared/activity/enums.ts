// ── Activity Category ─────────────────────────────────────────────
export const ActivityCategory = {
  CODING: 'coding',
  BROWSER: 'browser',
  COMMS: 'comms',
  MEETINGS: 'meetings',
  PRODUCTIVITY: 'productivity',
  OFFICE: 'office',
  DESIGN: 'design',
  MEDIA: 'media',
  GAMES: 'games',
  DEVOPS: 'devops',
  SYSTEM: 'system',
  UTILITIES: 'utilities',
  UNKNOWN: 'unknown',
} as const;
export type ActivityCategory = (typeof ActivityCategory)[keyof typeof ActivityCategory];

// ── Artifact Type ────────────────────────────────────────────────
export const ArtifactType = {
  GIT_COMMIT: 'git_commit',
  GIT_STATUS: 'git_status',
  TERMINAL_COMMAND: 'terminal_command',
  BROWSER_PAGE: 'browser_page',
  MANUAL_MARKER: 'manual_marker',
  DEPLOY_EVENT: 'deploy_event',
  NOTE: 'note',
} as const;
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

// ── Activity Type ────────────────────────────────────────────────
export const ActivityType = {
  ACTIVE: 'active',
  IDLE: 'idle',
  AFK: 'afk',
  PAUSED: 'paused',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// ── Privacy Level ────────────────────────────────────────────────
export const PrivacyLevel = {
  PRIVATE: 'private',
  REDACTED: 'redacted',
  PUBLIC_SAFE: 'public_safe',
} as const;
export type PrivacyLevel = (typeof PrivacyLevel)[keyof typeof PrivacyLevel];

// ── Rule Source Type ─────────────────────────────────────────────
export const RuleSourceType = {
  APP: 'app',
  TITLE: 'title',
  DOMAIN: 'domain',
  PATH: 'path',
  COMMAND: 'command',
  REPO: 'repo',
} as const;
export type RuleSourceType = (typeof RuleSourceType)[keyof typeof RuleSourceType];

// ── Rule Match Kind ──────────────────────────────────────────────
export const RuleMatchKind = {
  CONTAINS: 'contains',
  REGEX: 'regex',
  EQUALS: 'equals',
  PREFIX: 'prefix',
} as const;
export type RuleMatchKind = (typeof RuleMatchKind)[keyof typeof RuleMatchKind];

// ── Post Draft Target ────────────────────────────────────────────
export const PostDraftTarget = {
  TELEGRAM: 'telegram',
  BLOG: 'blog',
  X: 'x',
  INTERNAL: 'internal',
} as const;
export type PostDraftTarget = (typeof PostDraftTarget)[keyof typeof PostDraftTarget];

// ── Post Draft Style ─────────────────────────────────────────────
export const PostDraftStyle = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
  TECHNICAL: 'technical',
  CASUAL: 'casual',
} as const;
export type PostDraftStyle = (typeof PostDraftStyle)[keyof typeof PostDraftStyle];

// ── Post Draft Status ────────────────────────────────────────────
export const PostDraftStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  DISCARDED: 'discarded',
} as const;
export type PostDraftStatus = (typeof PostDraftStatus)[keyof typeof PostDraftStatus];
