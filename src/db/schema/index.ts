import { pgTable, text, bigserial, bigint, boolean, timestamp, index, unique, jsonb, integer, uuid, customType, date } from 'drizzle-orm/pg-core';

// Custom bytea type for binary data (encrypted notes)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return Buffer.isBuffer(value) ? value : Buffer.from(value as unknown as string, 'hex');
  },
});

// Users table
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  isBanned: boolean('is_banned').notNull().default(false),
});

// OAuth accounts table
export const oauthAccounts = pgTable('oauth_accounts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('oauth_provider_unique').on(table.provider, table.providerUserId),
]);

// Sessions table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('sessions_user_idx').on(table.userId),
  index('sessions_exp_idx').on(table.expiresAt),
]);

// Comments table
export const comments = pgTable('comments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  pageType: text('page_type').notNull(),
  pageKey: text('page_key').notNull(),
  lang: text('lang').notNull(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  parentId: bigint('parent_id', { mode: 'number' }).references((): any => comments.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  isHidden: boolean('is_hidden').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
}, (table) => [
  index('comments_page_idx').on(table.pageType, table.pageKey, table.lang, table.createdAt),
  index('comments_parent_idx').on(table.parentId),
]);

// Reactions table (for posts and comments)
export const reactions = pgTable('reactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  targetType: text('target_type').notNull(),
  targetKey: text('target_key').notNull(),
  lang: text('lang'),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('reactions_unique').on(table.targetType, table.targetKey, table.userId, table.emoji),
  index('reactions_target_idx').on(table.targetType, table.targetKey),
  index('reactions_user_idx').on(table.userId),
]);

// Comment flags (moderation)
export const commentFlags = pgTable('comment_flags', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  commentId: bigint('comment_id', { mode: 'number' }).notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('flags_comment_idx').on(table.commentId),
]);

// Events table (changelog)
export const events = pgTable('events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  source: text('source').notNull(),
  kind: text('kind').notNull(),
  project: text('project'),
  title: text('title').notNull(),
  url: text('url'),
  tags: text('tags').array().notNull().default([]),
  payload: jsonb('payload').notNull().default({}),
}, (table) => [
  index('events_ts_idx').on(table.ts),
  index('events_project_idx').on(table.project),
]);

// ── Activity Monitoring ──────────────────────────────────────────────

// Registered devices that send telemetry
export const activityDevices = pgTable('activity_devices', {
  id: text('id').primaryKey(), // e.g. 'pc-main'
  name: text('name'),
  apiKeyHash: text('api_key_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
});

// Minute-level aggregated activity data
export const activityMinuteAgg = pgTable('activity_minute_agg', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deviceId: text('device_id').notNull().references(() => activityDevices.id, { onDelete: 'cascade' }),
  tsMinute: timestamp('ts_minute', { withTimezone: true }).notNull(),
  app: text('app').notNull().default(''),
  windowTitle: text('window_title').notNull().default(''),
  category: text('category').notNull().default('unknown'),
  activeSec: integer('active_sec').notNull().default(0),
  afkSec: integer('afk_sec').notNull().default(0),
  keys: integer('keys').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  scroll: integer('scroll').notNull().default(0),
}, (table) => [
  unique('activity_minute_unique').on(table.deviceId, table.tsMinute, table.app, table.windowTitle, table.category),
  index('activity_minute_ts_idx').on(table.deviceId, table.tsMinute),
  index('activity_minute_category_idx').on(table.category, table.tsMinute),
]);

// Current state per device (upserted on each ingest)
export const activityNow = pgTable('activity_now', {
  deviceId: text('device_id').primaryKey().references(() => activityDevices.id, { onDelete: 'cascade' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  app: text('app'),
  windowTitle: text('window_title'),
  category: text('category').notNull().default('unknown'),
  isAfk: boolean('is_afk').notNull().default(false),
  countsTodayKeys: integer('counts_today_keys').notNull().default(0),
  countsTodayClicks: integer('counts_today_clicks').notNull().default(0),
  countsTodayScroll: integer('counts_today_scroll').notNull().default(0),
  countsTodayActiveSec: integer('counts_today_active_sec').notNull().default(0),
});

// Activity notes (encrypted quick notes with preview)
export const activityNotes = pgTable(
  'activity_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    app: text('app'), // nullable if categoriesOnly
    category: text('category').notNull().default('unknown'),

    tag: text('tag'),
    title: text('title'),

    preview: text('preview').notNull(), // safe preview (trim+redact)
    len: integer('len').notNull().default(0),

    contentEnc: bytea('content_enc').notNull(), // packed: iv(12)+tag(16)+ciphertext

    meta: jsonb('meta').notNull().default({}), // {source:'hotkey'|'ui', redacted:true,...}

    projectSlug: text('project_slug'), // v2: optional project association
    sessionId: uuid('session_id'), // v2: optional session association
  },
  (t) => [
    index('activity_notes_device_created_idx').on(t.deviceId, t.createdAt),
    index('activity_notes_device_app_created_idx').on(t.deviceId, t.app, t.createdAt),
  ]
);

// ── Activity v2 ──────────────────────────────────────────────────────

// Project catalog for inference targets
export const activityProjects = pgTable('activity_projects', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  repoPathPattern: text('repo_path_pattern'),
  repoRemotePattern: text('repo_remote_pattern'),
  domainPattern: text('domain_pattern'),
  branchPattern: text('branch_pattern'),
  isActive: boolean('is_active').notNull().default(true),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

// Project/category/activity inference rules
export const activityRules = pgTable('activity_rules', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  priority: integer('priority').notNull().default(0),
  isEnabled: boolean('is_enabled').notNull().default(true),
  sourceType: text('source_type').notNull(), // app | title | domain | path | command | repo
  matchKind: text('match_kind').notNull(), // contains | regex | equals | prefix
  matchValue: text('match_value').notNull(),
  resultProjectSlug: text('result_project_slug'),
  resultCategory: text('result_category'),
  resultActivityType: text('result_activity_type'),
  confidence: integer('confidence').notNull().default(80),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  index('activity_rules_enabled_priority_idx').on(t.isEnabled, t.priority),
]);

// Factual context artifacts beyond heartbeats
export const activityArtifacts = pgTable('activity_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: text('device_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  projectSlug: text('project_slug'),
  artifactType: text('artifact_type').notNull(), // git_commit | git_status | terminal_command | browser_page | manual_marker | deploy_event | note
  sourceApp: text('source_app'),
  title: text('title'),
  payloadJson: jsonb('payload_json').notNull().default({}),
  privacyLevel: text('privacy_level').notNull().default('private'), // private | redacted | public_safe
  fingerprint: text('fingerprint').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('activity_artifacts_device_occurred_idx').on(t.deviceId, t.occurredAt),
  index('activity_artifacts_type_occurred_idx').on(t.artifactType, t.occurredAt),
  index('activity_artifacts_project_occurred_idx').on(t.projectSlug, t.occurredAt),
]);

// Normalized session blocks derived from heartbeats + artifacts
export const activitySessions = pgTable('activity_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: text('device_id').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  durationSec: integer('duration_sec').notNull(),
  projectSlug: text('project_slug'),
  category: text('category').notNull().default('unknown'),
  activityType: text('activity_type').notNull().default('active'),
  primaryApp: text('primary_app').notNull().default(''),
  primaryTitle: text('primary_title'),
  isAfk: boolean('is_afk').notNull().default(false),
  keys: integer('keys').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  scroll: integer('scroll').notNull().default(0),
  confidence: integer('confidence').notNull().default(100),
  sourceVersion: text('source_version').notNull().default('v1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  index('activity_sessions_device_started_idx').on(t.deviceId, t.startedAt),
  index('activity_sessions_project_started_idx').on(t.projectSlug, t.startedAt),
]);

// Persistent daily summary facts + generated drafts
export const activityDailySummaries = pgTable('activity_daily_summaries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deviceId: text('device_id').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  factsJson: jsonb('facts_json').notNull().default({}),
  shortSummary: text('short_summary'),
  longSummary: text('long_summary'),
  publicPostDraft: text('public_post_draft'),
  internalLogDraft: text('internal_log_draft'),
  confidenceScore: integer('confidence_score').notNull().default(0),
  modelName: text('model_name'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  unique('activity_daily_summaries_device_date_unique').on(t.deviceId, t.date),
  index('activity_daily_summaries_date_idx').on(t.date),
]);

// Generated post variants for Telegram or other surfaces
export const activityPostDrafts = pgTable('activity_post_drafts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  date: date('date', { mode: 'string' }).notNull(),
  deviceId: text('device_id').notNull(),
  target: text('target').notNull(), // telegram | blog | x | internal
  style: text('style').notNull(), // short | medium | long | technical | casual
  title: text('title'),
  content: text('content').notNull(),
  factsJson: jsonb('facts_json').notNull().default({}),
  status: text('status').notNull().default('draft'), // draft | approved | published | discarded
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  index('activity_post_drafts_date_device_idx').on(t.date, t.deviceId),
  index('activity_post_drafts_status_idx').on(t.status),
]);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type ActivityDevice = typeof activityDevices.$inferSelect;
export type NewActivityDevice = typeof activityDevices.$inferInsert;
export type ActivityMinuteAgg = typeof activityMinuteAgg.$inferSelect;
export type ActivityNow = typeof activityNow.$inferSelect;
export type ActivityNote = typeof activityNotes.$inferSelect;
export type NewActivityNote = typeof activityNotes.$inferInsert;
export type ActivityProjectRow = typeof activityProjects.$inferSelect;
export type NewActivityProjectRow = typeof activityProjects.$inferInsert;
export type ActivityRuleRow = typeof activityRules.$inferSelect;
export type NewActivityRuleRow = typeof activityRules.$inferInsert;
export type ActivityArtifactRow = typeof activityArtifacts.$inferSelect;
export type NewActivityArtifactRow = typeof activityArtifacts.$inferInsert;
export type ActivitySessionRow = typeof activitySessions.$inferSelect;
export type NewActivitySessionRow = typeof activitySessions.$inferInsert;
export type ActivityDailySummaryRow = typeof activityDailySummaries.$inferSelect;
export type NewActivityDailySummaryRow = typeof activityDailySummaries.$inferInsert;
export type ActivityPostDraftRow = typeof activityPostDrafts.$inferSelect;
export type NewActivityPostDraftRow = typeof activityPostDrafts.$inferInsert;
