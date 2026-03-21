# Activity Desktop System -- Phase 1 + Phase 2 Implementation Plan

## Context

The rodion.pro project has an existing activity tracking system: a Node.js `activity-agent` that collects window/idle/input data and sends heartbeats to the Astro backend, which stores minute-level aggregates in PostgreSQL. The current system works but lacks:

- Contextual data beyond time/keys/clicks (no git, terminal, browser, markers)
- A proper desktop UX (current agent is headless with a basic tray)
- Session-level views (only raw minute aggregates)
- Project inference and rule-based categorization
- Foundation for future devlog/summary generation

This plan implements **Phase 1** (backend foundation: new DB tables, shared contracts, v2 API endpoints, sessionization) and **Phase 2** (Electron desktop app MVP with local-first storage, reused collectors, sync worker, tray, and tabbed UI). The existing v1 agent and `/activity` dashboard remain fully functional throughout.

---

## Decisions Made

- **Shared types**: `shared/activity/` (top-level directory, imported via `@shared/*` path alias)
- **Electron tooling**: Electron Forge with Webpack plugin
- **Local SQLite**: better-sqlite3
- **Summary tables**: Add schemas now (empty, no generation logic)

---

## Phase 1 -- Backend Foundation

### Step 1: Shared Contracts (`shared/activity/`)

New top-level directory with pure TypeScript modules (no Node/DB dependencies).

#### `shared/activity/enums.ts` -- NEW
- `ActivityCategory` -- `'coding' | 'browser' | 'comms' | 'meetings' | 'productivity' | 'office' | 'design' | 'media' | 'games' | 'devops' | 'system' | 'utilities' | 'unknown'`
- `ArtifactType` -- `'git_commit' | 'git_status' | 'terminal_command' | 'browser_page' | 'manual_marker' | 'deploy_event' | 'note'`
- `ActivityType` -- `'active' | 'idle' | 'afk' | 'paused'`
- `PrivacyLevel` -- `'private' | 'redacted' | 'public_safe'`
- `RuleSourceType` -- `'app' | 'title' | 'domain' | 'path' | 'command' | 'repo'`
- `RuleMatchKind` -- `'contains' | 'regex' | 'equals' | 'prefix'`
- `PostDraftTarget` -- `'telegram' | 'blog' | 'x' | 'internal'`
- `PostDraftStyle` -- `'short' | 'medium' | 'long' | 'technical' | 'casual'`
- `PostDraftStatus` -- `'draft' | 'approved' | 'published' | 'discarded'`
- Use `as const` objects with derived union types (not TS `enum`)

#### `shared/activity/contracts.ts` -- NEW
API wire format types (not Drizzle types):
- `ActivityHeartbeat` -- matches existing v1 ingest payload shape
- `ActivityArtifact` -- single artifact event
- `ActivityArtifactBatch` -- `{ deviceId, artifacts[] }`
- `ActivitySession` -- session block wire shape
- `ActivityProject` -- project definition
- `ActivityRule` -- inference rule
- `DailySummaryFacts` -- typed structure for `facts_json`
- `TimelineResponse` -- `{ sessions[], artifacts[], notes[] }`

#### `shared/activity/rules.ts` -- NEW
- `matchRule(rule, input)` -- evaluate single rule against input context
- `applyRules(rules[], input)` -- return first matching result (project/category/activity type)

#### `shared/activity/privacy.ts` -- NEW
- `redactTitle(title)` -- truncate long tokens, redact numeric sequences
- `redactCommand(command)` -- remove tokens/passwords from CLI strings
- `isSensitiveContent(text)` -- detect secrets patterns
- `classifyPrivacyLevel(text, mode)` -- determine privacy level

#### `shared/activity/normalization.ts` -- NEW
- `inferProjectFromPath(path, projects[])` -- match filesystem path
- `inferProjectFromRemote(remote, projects[])` -- match git remote URL
- `inferProjectFromDomain(domain, projects[])` -- match browser domain

#### `shared/activity/index.ts` -- NEW
Barrel re-export of all modules.

### Step 2: TypeScript Config

#### `tsconfig.json` -- MODIFIED
- Add path alias: `"@shared/*": ["shared/*"]`
- Add to include: `"shared/**/*"`

#### `astro.config.ts` -- MODIFIED (if needed)
- Add Vite resolve alias for `@shared` if Astro doesn't pick up tsconfig paths automatically

### Step 3: Database Schema

#### `src/db/schema/index.ts` -- MODIFIED
Add 6 new table definitions after existing `activityNotes`. Add 2 nullable columns to `activityNotes`.

**New tables:**

1. `activityProjects` (`activity_projects`)
   - `id` bigserial PK, `slug` text unique, `name` text, `repoPathPattern` text?, `repoRemotePattern` text?, `domainPattern` text?, `branchPattern` text?, `isActive` boolean default true, `color` text?, `createdAt`, `updatedAt`

2. `activityRules` (`activity_rules`)
   - `id` bigserial PK, `priority` integer default 0, `isEnabled` boolean default true, `sourceType` text, `matchKind` text, `matchValue` text, `resultProjectSlug` text?, `resultCategory` text?, `resultActivityType` text?, `confidence` integer default 80, `createdAt`, `updatedAt`
   - Index on `(is_enabled, priority)`

3. `activityArtifacts` (`activity_artifacts`)
   - `id` uuid PK defaultRandom, `deviceId` text, `occurredAt` timestamp with tz, `projectSlug` text?, `artifactType` text, `sourceApp` text?, `title` text?, `payloadJson` jsonb default {}, `privacyLevel` text default 'private', `fingerprint` text? unique, `createdAt`
   - Indexes: `(device_id, occurred_at)`, `(artifact_type, occurred_at)`, `(project_slug, occurred_at)`

4. `activitySessions` (`activity_sessions`)
   - `id` uuid PK defaultRandom, `deviceId` text, `startedAt` timestamp, `endedAt` timestamp, `durationSec` integer, `projectSlug` text?, `category` text default 'unknown', `activityType` text default 'active', `primaryApp` text, `primaryTitle` text?, `isAfk` boolean default false, `keys`/`clicks`/`scroll` integers, `confidence` integer default 100, `sourceVersion` text default 'v1', `createdAt`, `updatedAt`
   - Indexes: `(device_id, started_at)`, `(project_slug, started_at)`

5. `activityDailySummaries` (`activity_daily_summaries`)
   - `id` bigserial PK, `deviceId` text, `date` **date** (PostgreSQL native DATE type), `factsJson` jsonb, `shortSummary` text?, `longSummary` text?, `publicPostDraft` text?, `internalLogDraft` text?, `confidenceScore` integer, `modelName` text?, `generatedAt` timestamp?, `updatedAt`
   - Unique on `(device_id, date)`

6. `activityPostDrafts` (`activity_post_drafts`)
   - `id` bigserial PK, `date` **date** (PostgreSQL native DATE type), `deviceId` text, `target` text, `style` text, `title` text?, `content` text, `factsJson` jsonb, `status` text default 'draft', `createdAt`, `updatedAt`
   - Index on `(date, device_id)`, index on `status`

**Modified table:**
- `activityNotes` -- add `projectSlug` text? and `sessionId` uuid? (both nullable, no default)

**New type exports:**
- `ActivityProject`, `ActivityRuleRow`, `ActivityArtifactRow`, `ActivitySessionRow`, `ActivityDailySummary`, `ActivityPostDraft` (+ New* insert variants)

#### `drizzle/0004_activity_v2.sql` -- NEW
Hand-written migration derived strictly from the Drizzle schema definitions above. Schema and migration must be 1:1 consistent -- no `IF NOT EXISTS` to mask divergences. Column names, types, defaults, constraints, and indexes must match exactly between `src/db/schema/index.ts` and this migration file. The migration is the executable form of the schema, not an independent document.

### Step 4: Server Library Code

#### `src/lib/activity-auth.ts` -- NEW
Extracted reusable auth functions (used by v2 endpoints only, v1 untouched):
- `requireDeviceAuth(request)` -- extract + verify x-device-id/x-device-key headers
- `verifyDeviceAccess(request, url, cookies, deviceId)` -- 3-tier auth (device key / same-origin / admin token)

#### `src/lib/activity-sessions.ts` -- NEW
MVP sessionization service (gap-based splitting):
- `buildSessionsForDay(deviceId, date)` -- query `activity_minute_agg`, group contiguous minutes into sessions
- Session split conditions: gap > 3 minutes, app changes, category changes
- `persistSessions(deviceId, date, sessions)` -- delete + insert (idempotent)

### Step 5: v2 API Endpoints

All under `src/pages/api/activity/v2/`. Follow existing v1 patterns for auth and error handling.

#### `src/pages/api/activity/v2/artifacts/batch.ts` -- NEW
- `POST` -- device auth, accept `{ artifacts[] }`, insert with fingerprint dedup
- Response: `{ ok: true, inserted: N, skipped: N }`

#### `src/pages/api/activity/v2/timeline.ts` -- NEW
- `GET` -- 3-tier auth, params: `deviceId`, `date`
- Returns sessions + artifacts + notes for the day
- **MVP fallback**: On-the-fly sessionization if no sessions exist for the requested day. This is explicitly a temporary strategy for MVP -- it adds latency to the first request for a given day.
- **TODO for post-MVP**: Replace with a watermark-based rebuild strategy: track last-sessionized minute per device, run sessionization incrementally on ingest or via a scheduled job. Add `POST /api/activity/v2/sessions/rebuild?deviceId=X&date=Y` endpoint for manual re-sessionization when rules change.

#### `src/pages/api/activity/v2/projects/index.ts` -- NEW
- `GET` -- list projects (admin auth)
- `PUT` -- create/update project (admin auth)

#### `src/pages/api/activity/v2/rules/index.ts` -- NEW
- `GET` -- list rules (admin auth)
- `PUT` -- create/update rule (admin auth)

#### `src/pages/api/activity/v2/markers.ts` -- NEW
- `POST` -- device auth, create manual marker as artifact with `artifactType = 'manual_marker'`
- Body: `{ markerType, projectSlug?, note?, occurredAt? }`

---

## Phase 2 -- Desktop App MVP

### Step 6: Scaffold Electron App

#### `activity-desktop/` -- NEW directory

Scaffold using Electron Forge with Webpack + TypeScript template, then customize.

```
activity-desktop/
  package.json
  tsconfig.json
  forge.config.ts
  assets/
    icon.ico                    # App icon
    tray-active.png             # Green dot 16x16
    tray-paused.png             # Yellow dot 16x16
    tray-afk.png                # Grey dot 16x16
  src/
    main/
      index.ts                  # Electron main entry
      window.ts                 # BrowserWindow lifecycle
      tray.ts                   # Electron Tray + context menu
      ipc-handlers.ts           # All ipcMain.handle() registrations
      collectors/
        win32.ts                # Adapted from activity-agent/src/win32.ts
        inputCounter.ts         # Adapted from activity-agent/src/inputCounter.ts
        orchestrator.ts         # Poll loop + AFK + privacy + state
      store/
        database.ts             # better-sqlite3 init + migrations
        events-repo.ts          # Local events queue CRUD
        markers-repo.ts         # Markers CRUD
        config-repo.ts          # Key-value config CRUD
        sync-state-repo.ts      # Sync watermarks
      sync/
        sync-worker.ts          # Background sync to backend
      privacy/
        filter.ts               # Blacklists, redaction, category-only
    preload/
      index.ts                  # contextBridge IPC bridge
    renderer/
      index.html                # Root HTML shell
      index.tsx                 # React entry
      App.tsx                   # Tab navigation shell
      styles/
        globals.css             # Tailwind + theme
      hooks/
        useActivityState.ts     # Poll main process for state
        useConfig.ts            # Config read/write via IPC
        useSyncStatus.ts        # Sync diagnostics
      components/
        TabBar.tsx
        StatusIndicator.tsx
        CounterCard.tsx
        MarkerButton.tsx
        PayloadPreview.tsx
      tabs/
        NowTab.tsx
        TimelineTab.tsx
        PrivacyTab.tsx
        MarkersTab.tsx
        DiagnosticsTab.tsx
    shared/
      types.ts                  # IPC-facing TypeScript interfaces
      ipc-channels.ts           # Channel name constants
      categories.ts             # Category regex rules
```

### Step 7: Native Module Setup

#### `activity-desktop/forge.config.ts` -- NEW
- Webpack plugin with main/renderer/preload entries
- `auto-unpack-natives` plugin for koffi/uiohook-napi/better-sqlite3
- Externals: koffi, uiohook-napi, better-sqlite3
- Windows-only target

#### `activity-desktop/package.json` -- NEW
Key dependencies:
- Runtime: `koffi`, `uiohook-napi`, `better-sqlite3`, `axios`, `react`, `react-dom`
- Dev: `electron`, `@electron-forge/*`, `typescript`, `tailwindcss`, `postcss`, webpack loaders

### Step 8: Local SQLite Store

#### `activity-desktop/src/main/store/database.ts`
SQLite at `app.getPath('userData')/activity.db`. Schema via `PRAGMA user_version`:

**Table `events`**: id, created_at, app, window_title, category, is_afk, keys, clicks, scroll, dt_sec, active_sec, afk_sec, idle_ms, synced (0/1/2), sync_attempts, last_sync_error, synced_at

**Table `markers`**: id, created_at, type, note, app_context, category_context, synced, synced_at

**Table `config`**: key (PK), value (JSON text), updated_at

**Table `sync_state`**: key (PK), value (JSON text), updated_at

#### Config & Credential Storage Model

All config is stored in the `config` SQLite table. Keys are organized by domain:

**Connection credentials (sensitive, main-process only):**
- `server.baseUrl` -- default: `"https://rodion.pro"`
- `server.deviceId` -- set during onboarding, empty initially
- `server.deviceKey` -- set during onboarding, empty initially

**Collection settings:**
- `collect.pollIntervalSec` -- default: `10`
- `collect.afkThresholdMs` -- default: `300000` (5 min)

**Privacy defaults (privacy-first):**
- `privacy.sendWindowTitle` -- default: `true`
- `privacy.categoryOnlyMode` -- default: `false`
- `privacy.blacklistApps` -- default: `["keepass.exe", "1password.exe"]` (JSON array)
- `privacy.blacklistTitlePatterns` -- default: `[]` (JSON array)
- `privacy.redactDomains` -- default: `[]` (JSON array)

**Sync settings:**
- `sync.batchSize` -- default: `20`
- `sync.intervalSec` -- default: `30`
- `sync.maxRetries` -- default: `5`

**Renderer security boundary:**
The renderer process (React UI) must NEVER have access to `server.deviceKey`. The IPC bridge enforces this:
- `getConfig()` returns a sanitized config object: `server.deviceKey` is replaced with `"***"` (masked)
- `updateConfig(partial)` allows setting `server.deviceKey` only during onboarding (when current value is empty)
- `getState()`, `getSyncStatus()`, `getOutboundPreview()` never include credentials
- All HTTP calls (ingest, sync, connectivity test) happen in main process only
- The preload bridge exposes `isConfigured(): boolean` -- returns true if deviceId + deviceKey + baseUrl are all non-empty
- Onboarding screen: renderer sends `{ baseUrl, deviceId, deviceKey }` via `setupDevice()` IPC call which is a one-time write; after setup, deviceKey is no longer writable from renderer

### Step 9: Collectors (reuse from activity-agent)

#### `collectors/win32.ts` -- copy from `activity-agent/src/win32.ts`
No logic changes needed. koffi bindings to user32.dll + kernel32.dll.
- `getForegroundWindowInfo()` -> `{ app, title, pid }`
- `getIdleTimeMs()` -> idle milliseconds

#### `collectors/inputCounter.ts` -- copy from `activity-agent/src/inputCounter.ts`
No logic changes. uiohook-napi InputCounter class.
- `start()`, `consumeDelta()` -> `{ keys, clicks, scroll }`, `stop()`

#### `collectors/orchestrator.ts` -- refactored from `activity-agent/src/index.ts`
`CollectorOrchestrator` class:
- `start()` / `stop()` -- manage poll interval + InputCounter
- `pause(durationMs | null)` / `resume()` -- pause tracking
- `getState()` -- return current collector state for IPC
- Internal `tick()` every pollIntervalSec:
  1. Skip if paused
  2. `getForegroundWindowInfo()` -> window
  3. `getIdleTimeMs()` -> idle
  4. `inputCounter.consumeDelta()` -> counts
  5. Privacy filter (blacklist, redact, categorize)
  6. `computeAfkSec()` (ported verbatim from agent)
  7. Insert event into local SQLite
  8. Emit state update for renderer
  9. Update in-memory today totals

### Step 10: Privacy Filter

#### `privacy/filter.ts`
`PrivacyFilter` class:
- `filterEvent(raw)` -- blacklist check, title redaction, category-only mode
- `categorizeApp(appName)` -- regex rules (127+ patterns from agent config)
- `getOutboundPreview(event)` -- show what would be sent

### Step 11: Sync Worker

#### `sync/sync-worker.ts`
`SyncWorker` class with fixed operational parameters:

**Configuration constants:**
- `BATCH_SIZE = 20` -- events per sync cycle
- `FLUSH_INTERVAL_SEC = 30` -- sync loop interval
- `MAX_RETRIES = 5` -- per event, after which event is marked permanently failed
- `BACKOFF_BASE_SEC = 30` -- exponential backoff: `min(2^attempts * 30s, 900s)` (max 15min)
- `QUEUE_RETENTION_DAYS = 30` -- synced events (synced=1) deleted after 30 days; failed events (synced=2) kept indefinitely for manual review

**Sync cycle:**
1. Read up to `BATCH_SIZE` unsynced events (`synced=0`) ordered by `created_at ASC`
2. Transform each to v1 ingest payload format
3. POST to `/api/activity/v1/ingest` with x-device-id/x-device-key headers
4. **Per-event result handling** (partial failure safe):
   - Success: mark `synced=1, synced_at=NOW()`
   - Failure: mark `synced=2, sync_attempts++, last_sync_error=message`
   - If any event in batch fails, remaining events still attempt sync (no batch abort)
5. After events, process pending markers similarly -> POST to `/api/activity/v1/notes/ingest`
6. Run retention cleanup: `DELETE FROM events WHERE synced=1 AND synced_at < NOW() - 30 days`
7. Emit sync status update to renderer

**Retry policy:**
- Events with `synced=2 AND sync_attempts < MAX_RETRIES` are retried
- Skip if last attempt was less than `backoff_base * 2^sync_attempts` seconds ago
- After `MAX_RETRIES` exceeded: event stays `synced=2` permanently, visible in Diagnostics tab

**Connectivity test:** GET `/api/activity/v1/now?deviceId=X` with 5s timeout.

### Step 12: IPC Bridge

#### `preload/index.ts`
`contextBridge.exposeInMainWorld('activityAPI', { ... })` with:

State queries (invoke):
- `getState()`, `getConfig()`, `getSyncStatus()`, `getTimeline(from, to)`, `getMarkers(from, to)`, `getOutboundPreview()`

Mutations (invoke):
- `updateConfig(partial)`, `pause(minutes)`, `resume()`, `addMarker(marker)`, `addBlacklistApp(app)`, `removeBlacklistApp(app)`, `addBlacklistPattern(p)`, `removeBlacklistPattern(p)`, `testConnectivity()`, `syncNow()`

Push events (on/off subscriptions):
- `onStateUpdate(cb)`, `onSyncUpdate(cb)`, `onPauseChange(cb)` -- each returns unsubscribe fn

Security: `contextIsolation: true`, `nodeIntegration: false`.

### Step 13: Tray

#### `tray.ts`
Electron `Tray` API (not systray2):
- Three icon states: active (green), paused (yellow), afk (grey)
- Context menu: status display, Open, Pause 15m/1h, Resume, Add Marker submenu (8 presets), Privacy Mode toggle, Quit
- Click on icon -> show/focus window
- Menu rebuilds on state change

### Step 14: Main Process Entry

#### `main/index.ts`
Startup sequence:
1. `app.requestSingleInstanceLock()` -- prevent duplicates
2. `app.whenReady()` -> init SQLite, load config, create PrivacyFilter
3. Create CollectorOrchestrator, SyncWorker
4. Register IPC handlers
5. Create Tray
6. Start collectors + sync worker
7. Create BrowserWindow (hidden, show on tray click)
8. If no deviceId configured -> show onboarding

#### `main/window.ts`
- 800x600 window, min 640x480
- Close -> hide to tray (not quit)
- Preload script path, contextIsolation on

### Step 15: React UI

#### `App.tsx`
Tab bar: Now | Timeline | Privacy | Markers | Diagnostics. Renders active tab.

#### `NowTab.tsx`
- Status card (Active/AFK/Paused with colored dot)
- Current app + window title + category badge
- Today counters: keys, clicks, scroll, active time
- Pause 15m / 1h / Resume buttons

#### `TimelineTab.tsx`
- Date filter (default today)
- Scrollable event list grouped by time
- Category filter chips

#### `PrivacyTab.tsx`
- Toggle: send window titles
- Toggle: category-only mode
- Blacklist apps list with add/remove
- Blacklist title patterns with add/remove
- Live outbound payload JSON preview

#### `MarkersTab.tsx`
- 8 preset marker buttons in grid
- Custom marker text input + note
- Today's markers list with sync status

#### `DiagnosticsTab.tsx`
- Device ID, server URL
- Last sync time, result, failures
- Queue: pending/failed event counts
- Connectivity test button
- Force sync button

---

## File Change Summary

### New Files (Phase 1 -- Backend)
| File | Purpose |
|------|---------|
| `shared/activity/enums.ts` | Enum-like const objects |
| `shared/activity/contracts.ts` | API wire format types |
| `shared/activity/rules.ts` | Rule matching logic |
| `shared/activity/privacy.ts` | Redaction helpers |
| `shared/activity/normalization.ts` | Project inference |
| `shared/activity/index.ts` | Barrel export |
| `drizzle/0004_activity_v2.sql` | Migration for 6 new tables + 2 altered columns |
| `src/lib/activity-auth.ts` | Extracted auth helpers for v2 |
| `src/lib/activity-sessions.ts` | Gap-based sessionization |
| `src/pages/api/activity/v2/artifacts/batch.ts` | Artifact batch ingest |
| `src/pages/api/activity/v2/timeline.ts` | Session + artifact timeline |
| `src/pages/api/activity/v2/projects/index.ts` | Project CRUD |
| `src/pages/api/activity/v2/rules/index.ts` | Rule CRUD |
| `src/pages/api/activity/v2/markers.ts` | Manual marker creation |

### Modified Files (Phase 1)
| File | Changes |
|------|---------|
| `src/db/schema/index.ts` | 6 new tables, 2 columns on activityNotes, type exports |
| `tsconfig.json` | Add `@shared/*` path + include `shared/**/*` |
| `astro.config.ts` | Add Vite resolve alias for `@shared` (if needed) |

### New Files (Phase 2 -- Desktop App)
Entire `activity-desktop/` directory (~35 new files). Key files:
- `forge.config.ts`, `package.json`, `tsconfig.json`
- `src/main/index.ts`, `window.ts`, `tray.ts`, `ipc-handlers.ts`
- `src/main/collectors/win32.ts`, `inputCounter.ts`, `orchestrator.ts`
- `src/main/store/database.ts`, `events-repo.ts`, `markers-repo.ts`, `config-repo.ts`
- `src/main/sync/sync-worker.ts`
- `src/main/privacy/filter.ts`
- `src/preload/index.ts`
- `src/renderer/` (App.tsx, 5 tabs, 3 hooks, 5 components, styles)
- `src/shared/types.ts`, `ipc-channels.ts`, `categories.ts`

---

## Implementation Order

1. **Shared contracts** -- `shared/activity/` (enums, contracts, rules, privacy, normalization)
2. **tsconfig.json** -- add path alias + include
3. **DB schema** -- add tables to `src/db/schema/index.ts`
4. **Migration** -- write `drizzle/0004_activity_v2.sql`
5. **Auth lib** -- `src/lib/activity-auth.ts`
6. **Sessions lib** -- `src/lib/activity-sessions.ts`
7. **v2 API endpoints** -- projects -> rules -> markers -> artifacts/batch -> timeline
8. **Scaffold Electron app** -- Forge init + native module setup + verify it starts
9. **SQLite store** -- database.ts + repos
10. **Collectors** -- copy win32.ts + inputCounter.ts, build orchestrator.ts
11. **Privacy filter** -- filter.ts
12. **Sync worker** -- sync-worker.ts
13. **IPC bridge** -- preload + handlers
14. **Tray** -- tray.ts with menu
15. **React UI** -- App shell + NowTab -> MarkersTab -> PrivacyTab -> TimelineTab -> DiagnosticsTab
16. **Window management** -- close-to-tray, single instance, onboarding

---

## Verification

### Phase 1 Verification
1. Run `npm run db:push` or apply `drizzle/0004_activity_v2.sql` manually -- verify tables created
2. Existing `/activity` dashboard still loads and works
3. Existing agent still ingests to `/api/activity/v1/ingest` successfully
4. `POST /api/activity/v2/markers` with valid device credentials creates an artifact
5. `POST /api/activity/v2/artifacts/batch` stores artifacts, deduplicates on fingerprint
6. `GET /api/activity/v2/projects` and `PUT` create/list projects
7. `GET /api/activity/v2/rules` and `PUT` create/list rules
8. `GET /api/activity/v2/timeline?deviceId=X&date=YYYY-MM-DD` returns sessions built from minute data
9. Run `npm run typecheck` -- no errors

### Phase 2 Verification
1. `cd activity-desktop && npm start` -- Electron app opens on Windows
2. App shows current active window, category, active/afk status in Now tab
3. Keys/clicks/scroll counters increment in real-time
4. Tray icon appears, context menu works (pause/resume/markers/quit)
5. Close window -> hides to tray (not quit)
6. Markers tab: click preset marker -> appears in list
7. Privacy tab: toggle sendWindowTitle -> payload preview updates
8. Privacy tab: add app to blacklist -> events show [PRIVACY]
9. Diagnostics tab: connectivity test returns ok + latency
10. Diagnostics tab: force sync sends queued events to backend
11. Kill app -> restart -> local events/config preserved (SQLite survives)
12. Disconnect network -> events queue locally -> reconnect -> sync resumes
13. Backend `/api/activity/v1/now` shows data from desktop app
14. Backend `/api/activity/v2/timeline` shows sessions for today
