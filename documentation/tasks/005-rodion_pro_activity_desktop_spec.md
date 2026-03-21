# rodion.pro — Activity Desktop + Devlog System Spec

## Goal
Turn the existing `activity-agent` and `/activity` dashboard into a full local-first Windows desktop app plus a stronger backend pipeline that can:

1. Collect real activity context, not only time/keys/clicks.
2. Keep privacy controls strict and explicit.
3. Generate factual daily/weekly devlogs.
4. Generate Telegram post drafts for **Лось в проде**.
5. Use the website as the backend + visualization layer, while the Windows app is the main local UX.

---

## Core Product Decision
Do **not** rewrite the current activity system from scratch.

Use the current implementation as the base and evolve it into:

- `activity-desktop/` — Electron desktop app for Windows
- existing Astro site — backend + dashboards + summaries + drafts
- shared types/rules — reused between desktop and server

### Why Electron here
- Current local agent is already TypeScript/Node-based.
- Current agent already depends on native Node packages and Win32 bindings.
- Fastest path to a polished native Windows UX without rewriting collectors in Rust/C#.
- Existing collector logic can be reused instead of thrown away.

---

## Existing Assets to Reuse
### Current local collector logic
Reuse and refactor from current `activity-agent`:
- active window detection
- idle/AFK tracking
- input counters
- tray integration
- config loading
- ingest sending

### Current backend pieces to keep
Keep and extend:
- device registration/auth
- activity ingest endpoint
- activity stats endpoint
- activity stream endpoint
- current `/activity` dashboard
- minute-level aggregation

### Important rule
Keep backward compatibility for current ingest as much as practical.
Old agent should continue working until desktop app fully replaces it.

---

## Target Architecture

## 1) Windows Desktop App (`activity-desktop/`)
Electron + React + TypeScript.

### Responsibilities
- Collect active window / AFK / key / click / scroll
- Collect optional contextual artifacts:
  - git context
  - terminal commands
  - browser domain/title
  - manual markers
  - deploy hints
- Persist locally first
- Sync to server in background
- Show live local dashboard
- Allow privacy controls and pause/resume

### Desktop app UX
#### Main window tabs
1. **Now**
   - current app
   - current window title (if allowed)
   - current inferred project
   - active/afk state
   - keys/clicks/scroll today
   - active time today
   - quick buttons: pause 15m / 1h / until resume

2. **Timeline**
   - live session stream
   - grouped by inferred project + activity type
   - filters by project/category/source

3. **Projects**
   - known projects
   - repo mappings
   - rules preview
   - activity split by project

4. **Privacy**
   - send window titles toggle
   - category-only mode toggle
   - blacklist apps
   - blacklist title patterns
   - redact domains
   - whitelist terminal command collection
   - preview of what will be sent

5. **Markers**
   - one-click markers:
     - Начал работу
     - Кодинг
     - Исследование
     - Пишу пост
     - Деплой
     - Стрим
     - Отладка
     - Закончил
   - custom marker input

6. **Sync / Diagnostics**
   - last sync
   - queued events count
   - failed uploads
   - device id
   - backend connectivity test

### Tray behavior
- tray icon always available
- menu:
  - Open dashboard
  - Pause 15 min
  - Pause 1 hour
  - Resume
  - Add marker
  - Privacy mode
  - Quit

### Local persistence
Use local SQLite in app data directory for:
- raw local events queue
- local sessions cache
- pending sync queue
- config snapshot
- diagnostics logs

---

## 2) Shared Logic (`shared/activity/` or `src/shared/activity/`)
Create shared TypeScript contracts usable by desktop and server.

### Shared entities
- `ActivityHeartbeat`
- `ActivityArtifact`
- `ActivitySession`
- `ActivityRule`
- `DailySummaryFacts`
- `DailySummaryDraft`

### Shared enums
- `ActivityCategory`
- `ArtifactType`
- `ActivityType`
- `PrivacyMode`
- `ProjectKind`

### Shared utility modules
- normalization helpers
- project inference helpers
- title redaction helpers
- command redaction helpers
- confidence scoring helpers

---

## 3) Server Extension (existing Astro/Node app)
The website remains the backend and public/private visualization layer.

### Responsibilities
- device auth
- receive heartbeat events
- receive artifact batches
- normalize and persist
- produce sessions
- generate daily/weekly summaries
- generate Telegram post drafts
- expose dashboards and admin pages

---

## Data Model Changes
Keep existing activity tables. Add new tables instead of breaking current ones.

## New tables
### `activity_projects`
Purpose: explicit project catalog + inference targets.

Fields:
- id
- slug
- name
- repo_path_pattern
- repo_remote_pattern
- domain_pattern
- branch_pattern
- is_active
- color
- created_at
- updated_at

### `activity_rules`
Purpose: project/category/activity inference rules.

Fields:
- id
- priority
- is_enabled
- source_type (`app`, `title`, `domain`, `path`, `command`, `repo`)
- match_kind (`contains`, `regex`, `equals`, `prefix`)
- match_value
- result_project_slug
- result_category
- result_activity_type
- confidence
- created_at
- updated_at

### `activity_artifacts`
Purpose: factual context beyond heartbeats.

Fields:
- id
- device_id
- occurred_at
- project_slug nullable
- artifact_type (`git_commit`, `git_status`, `terminal_command`, `browser_page`, `manual_marker`, `deploy_event`, `note`)
- source_app nullable
- title nullable
- payload_json
- privacy_level (`private`, `redacted`, `public_safe`)
- fingerprint nullable
- created_at

Indexes:
- device_id + occurred_at
- artifact_type + occurred_at
- project_slug + occurred_at

### `activity_sessions`
Purpose: normalized session blocks derived from heartbeats + artifacts.

Fields:
- id
- device_id
- started_at
- ended_at
- duration_sec
- project_slug nullable
- category
- activity_type
- primary_app
- primary_title nullable
- is_afk
- keys
- clicks
- scroll
- confidence
- source_version
- created_at
- updated_at

### `activity_daily_summaries`
Purpose: persistent daily summary facts + generated drafts.

Fields:
- id
- device_id
- date
- facts_json
- short_summary
- long_summary
- public_post_draft
- internal_log_draft
- confidence_score
- model_name nullable
- generated_at
- updated_at

### `activity_post_drafts`
Purpose: multiple generated post variants for Telegram or other surfaces.

Fields:
- id
- date
- device_id
- target (`telegram`, `blog`, `x`, `internal`)
- style (`short`, `medium`, `long`, `technical`, `casual`)
- title nullable
- content
- facts_json
- status (`draft`, `approved`, `published`, `discarded`)
- created_at
- updated_at

### `activity_notes`
Purpose: user-authored notes tied to day/session.

Fields:
- id
- device_id
- occurred_at
- project_slug nullable
- session_id nullable
- text
- created_at

---

## Ingestion Model
Split data into two streams.

## Stream A — heartbeat
High-frequency operational data.

Payload includes:
- app
- title (if allowed)
- category
- isAfk
- keys/clicks/scroll delta
- activeSec / afkSec / dtSec
- optional inferred local project

Use for:
- live dashboard
- minute aggregation
- session generation

## Stream B — artifacts
Low-frequency meaningful events.

Payload includes batched events like:
- git commit
- terminal command
- browser page domain/title
- manual marker
- deploy event
- note

Use for:
- factual daily reconstruction
- summary generation
- post drafts

---

## Desktop Collectors
Only implement what is useful and supportable.

## 1. Window collector
Reuse current Win32 collector.

Collect:
- exe name
- window title
- pid
- timestamp

## 2. Input collector
Reuse current global input counter.

Collect:
- keys delta
- clicks delta
- scroll delta

## 3. Idle / AFK collector
Reuse current GetLastInputInfo logic.

Collect:
- idle ms
- active sec
- afk sec

## 4. Git collector
Poll git repositories every N seconds/minutes.

Collect:
- repo root
- repo name
- current branch
- head commit hash
- dirty state
- changed files count
- last commit message
- optionally staged/unstaged counts

Generate artifacts:
- `git_status`
- `git_commit` when HEAD changes

### Git discovery
Support:
- user-defined repo folders
- auto-discovery from current active window path if available later
- manual add/remove repo mappings

## 5. Terminal collector
Do **not** try to read all shell text blindly.

Use a whitelist-based strategy.

Collect only commands matching allowed prefixes, such as:
- git
- npm
- pnpm
- bun
- yarn
- node
- docker
- docker-compose
- pm2
- ssh
- scp
- rsync
- drizzle-kit
- psql
- powershell scripts you explicitly allow

Store:
- cwd if available
- sanitized command string
- exit code if available
- timestamp
- inferred project if possible

### Redaction rules
Before sending:
- remove tokens
- remove passwords
- redact `--password`, `token=`, `key=` patterns
- truncate long commands

## 6. Browser collector
Optional and privacy-aware.

Collect only:
- domain
- tab title
- browser app
- timestamp

No full URL by default.
Optional path prefix only for explicit allowlisted domains.

## 7. Manual marker collector
From app UI and tray.

Collect markers:
- type
- optional project
- optional note
- timestamp

## 8. Deploy detector
Infer deploy events from either:
- whitelisted terminal commands
- PM2 restart commands
- Docker compose commands
- ssh commands to known servers
- explicit manual marker

---

## Privacy Model
This part is non-negotiable.

## Modes
### Mode 1 — Full private
- app name
- title
- domain/title
- commands
- git context

### Mode 2 — Redacted private
- app name
- title redacted
- commands sanitized
- only safe browser domain/title

### Mode 3 — Category only
- no titles
- no commands
- no domains
- only category/project/time metrics

## Quick controls in app
- pause tracking 15m / 1h / custom
- do not send titles
- category-only mode
- blacklist current app
- blacklist current title pattern
- preview current outbound payload

## Must-have rule
No screenshots.
No clipboard capture.
No raw keystroke text.
No full browsing history dump.
No automatic collection of message bodies.

---

## Sessionization
Create a backend job/service that turns heartbeats into meaningful sessions.

## Session split conditions
Start a new session if one of these changes materially:
- app changes
- inferred project changes
- category changes
- long idle gap
- privacy mode changes
- explicit marker says a new activity started

## Session merge conditions
Merge adjacent intervals when:
- same project
- same category/activity_type
- gap below threshold
- same main app or equivalent app group

## Session output
Each session should contain:
- time range
- project
n- category
- activity type
- primary app
- totals: active time, keys, clicks, scroll
- related artifacts count
- confidence

---

## Summary Generation Pipeline
The system must be fact-first.

## Input to summarizer
Never send raw events only.
Send a structured fact bundle:
- top projects today
- top apps today
- top sessions
- git artifacts
- terminal artifacts
- browser research artifacts
- deploy artifacts
- manual markers
- notes
- unknown/low-confidence segments

## Output variants
### 1. Internal daily log
Detailed, factual, technical.

### 2. Public daily post draft
Shorter, readable, no sensitive data.

### 3. Weekly summary
Main outcomes, time split, key artifacts, lessons.

## Hard constraints for summarizer
The model must not claim actions that are unsupported by artifacts.

Examples:
- Allowed: “Spent 1h20m in Streamlabs OBS”
- Allowed: “Three commits were made in rodion.pro”
- Allowed: “Deploy-like commands were executed”
- Not allowed: “Implemented dashboard refactor” unless commits/notes/commands support it

## Confidence handling
If facts are weak, the summary must say so.
Example:
- “Day appears more focused on research/setup than confirmed coding output.”

---

## Telegram Draft Style
Target: **Лось в проде**

### Tone
- direct
- practical
- not corporate
- not fake productivity porn
- not vague

### Draft structure
1. one-line day summary
2. 2–5 concrete facts
3. one conclusion or lesson
4. one next step

### Example skeleton
> Сегодня Xч Ym активной работы.
> Основной фокус — A и B.
> Из конкретного:
> — ...
> — ...
> — ...
>
> Вывод дня: ...
> Дальше: ...

---

## API Changes
Keep current endpoints. Add new ones.

### Existing endpoints to preserve
- ingest heartbeat
- now
- stats
- stream
- public view

### New endpoints
#### `POST /api/activity/v2/artifacts/batch`
Accept batched artifact events.

#### `GET /api/activity/v2/timeline`
Return normalized sessions + related artifacts for a day/range.

#### `GET /api/activity/v2/projects`
List known projects and current inference mappings.

#### `PUT /api/activity/v2/projects`
Create/update project mapping.

#### `GET /api/activity/v2/rules`
List inference/privacy rules.

#### `PUT /api/activity/v2/rules`
Update rules.

#### `POST /api/activity/v2/markers`
Create manual marker.

#### `POST /api/activity/v2/summaries/generate`
Generate or regenerate summary for a date.

#### `GET /api/activity/v2/summaries/:date`
Fetch stored summary.

#### `POST /api/activity/v2/post-drafts/generate`
Generate Telegram/blog/internal draft variants.

#### `GET /api/activity/v2/post-drafts`
List drafts by date/status.

#### `PATCH /api/activity/v2/post-drafts/:id`
Approve/edit/discard.

---

## UI Changes on Website
Website remains the rich backend UI.

## `/activity`
Upgrade private dashboard with:
- Today overview
- Session timeline
- Project breakdown
- Artifacts panel
- Summary panel
- Post drafts panel
- Confidence/unknown time panel

## New admin pages
### `/activity/projects`
Manage project definitions.

### `/activity/rules`
Manage inference/privacy rules.

### `/activity/drafts`
Review generated content drafts.

### `/activity/summaries`
Review daily/weekly summaries.

---

## Repo Layout Proposal

```text
/rodion.pro
  /activity-agent            # keep temporarily as legacy collector
  /activity-desktop          # new Electron app
    /src
      /main                  # Electron main, collectors, sync
      /renderer              # React UI
      /preload
      /shared
    package.json
  /src
    /lib
      /activity
        collectors/
        normalization/
        summary/
        privacy/
        api/
    /pages
      /api/activity/v2/
      /ru/activity/
      /en/activity/
  /shared
    /activity
      contracts.ts
      rules.ts
      privacy.ts
      summary.ts
  /drizzle
    0003_activity_artifacts.sql
    0004_activity_sessions.sql
    0005_activity_summaries.sql
```

---

## Implementation Phases

## Phase 0 — Keep current system alive
- do not break current `activity-agent`
- keep current `/activity` working
- add migration path only

## Phase 1 — Backend foundation
1. add new Drizzle schema tables
2. add shared contracts
3. add `artifacts/batch` API
4. add project/rules CRUD
5. add sessionization service
6. add summary generation scaffolding

### Acceptance
- old agent still works
- new tables exist
- artifacts can be stored
- sessions can be generated for a day

## Phase 2 — Desktop app MVP
1. scaffold Electron app
2. reuse current collector code
3. add local SQLite queue
4. add sync worker
5. add tray menu
6. add main window with Now / Timeline / Privacy / Markers tabs
7. onboarding screen for device registration/config

### Acceptance
- app starts on Windows
- shows local live stats
- syncs heartbeat + markers to backend
- pause/resume works

## Phase 3 — Context collectors
1. git collector
2. terminal collector with whitelist + redaction
3. browser collector with domain/title only
4. deploy hints

### Acceptance
- artifacts appear in backend
- projects can be inferred more accurately
- no secrets visible in payload preview

## Phase 4 — Summaries and drafts
1. fact bundle builder
2. internal daily summary generator
3. Telegram draft generator
4. weekly summary generator
5. draft review UI on website

### Acceptance
- generated text references real artifacts
- drafts are reviewable and editable
- unsupported claims are not made

## Phase 5 — Polish and migration
1. replace legacy scripts with desktop installer/run flow
2. add auto-start option
3. diagnostics logs
4. export/import config
5. migration docs

---

## Risks
### 1. Native Node modules in Electron
Potential issues with:
- `uiohook-napi`
- `koffi`

Mitigation:
- use Electron-compatible rebuild flow
- lock working versions
- keep legacy collector as fallback until stable

### 2. Privacy leaks from titles/commands
Mitigation:
- redaction layer before persistence
- preview outgoing payload locally
- privacy-first defaults
- allowlist-based command capture

### 3. False summary claims
Mitigation:
- fact bundle only
- explicit confidence scoring
- no auto-publish
- drafts only

### 4. Too much complexity too fast
Mitigation:
- phase rollout
- heartbeats first
- artifacts second
- summaries last

---

## Explicit Non-Goals for MVP
- no screenshot capture
- no OCR
- no clipboard history
- no full browser history mirror
- no raw keystroke text logging
- no automatic publishing to Telegram
- no cross-platform support before Windows version is solid

---

## First Deliverable for Qoder/Codex
Build **Phase 1 + Phase 2 MVP** first.

That means:
1. backend schema/extensions
2. artifacts ingest
3. project/rules CRUD
4. sessionization MVP
5. Electron desktop app shell
6. reused current collectors
7. local queue + sync
8. basic desktop UI
9. manual markers
10. pause/privacy controls

Do **not** start with LLM summaries.
Do **not** start with Telegram integration.
Do **not** start with a rewrite of everything.

Ship the foundation first.

---

## Concrete Acceptance Checklist
- [ ] existing `/activity` still loads
- [ ] existing agent still ingests successfully
- [ ] new Electron desktop app starts on Windows 10/11
- [ ] desktop app shows current active app + timer + today counters
- [ ] tray menu works
- [ ] local queue survives restarts/offline mode
- [ ] artifacts batch endpoint stores manual markers
- [ ] project rules infer at least basic project mapping
- [ ] backend can build session timeline for a day
- [ ] website shows sessions + artifacts for today
- [ ] no secrets appear in outgoing payload preview by default

---

## Pasteable Instruction for Qoder/Codex

Implement this inside the existing `WizardJIOCb/rodion.pro` repository.

Important constraints:
- Keep the current `activity-agent` and existing `/activity` functionality working during migration.
- Build a new Windows desktop app in `activity-desktop/` using Electron + React + TypeScript.
- Reuse as much collector logic as possible from the existing `activity-agent`.
- The website remains the backend and visualization layer.
- Add new DB schema and APIs for artifacts, sessions, summaries, and post drafts, but only implement summaries later.
- MVP scope is Phase 1 + Phase 2 only.
- Privacy-first defaults are mandatory.
- No screenshot/clipboard/raw text capture.
- No auto-posting.

Delivery format:
1. implementation plan
2. file-by-file change list
3. schema changes
4. API contract
5. desktop app architecture
6. stepwise commits
7. code implementation
8. local run instructions
9. migration notes

Start with backend schema + shared contracts + Electron app shell. Then integrate reused collector logic. Then add local queue and sync. Then add the basic UI and tray actions.

