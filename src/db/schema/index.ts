import { pgTable, text, bigserial, bigint, boolean, timestamp, index, unique, jsonb, integer, uuid, customType } from 'drizzle-orm/pg-core';

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
  },
  (t) => [
    index('activity_notes_device_created_idx').on(t.deviceId, t.createdAt),
    index('activity_notes_device_app_created_idx').on(t.deviceId, t.app, t.createdAt),
  ]
);

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
