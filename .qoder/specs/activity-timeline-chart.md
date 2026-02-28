# Activity Dashboard Upgrade - Full Plan

## Scope
1. **Dashboard UI**: Recharts timeline (toggleable metrics + category filter), pie/donut for top apps, expandable rows with window title drill-down
2. **Stats API**: Category filter param, extended topTitles with keys/clicks/scroll
3. **Agent config**: Enable window titles, point to rodion.pro by default (env override for dev)
4. **Agent tray icon**: System tray via `systray2` (green=tracking, right-click menu to stop/open dashboard)
5. **Bat files**: `start-tracking.bat` / `stop-tracking.bat` for one-click production tracking

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `package.json` | Add `recharts` |
| `activity-agent/package.json` | Add `systray2` |
| `activity-agent/config.json` | `serverBaseUrl` -> `https://rodion.pro`, `sendWindowTitle` -> `true` |
| `activity-agent/src/index.ts` | Add env override for serverBaseUrl, integrate tray icon, hide console |
| `activity-agent/src/tray.ts` | **NEW** - Tray icon module (systray2 wrapper) |
| `activity-agent/assets/icon.ico` | **NEW** - Small .ico file for tray (green circle or similar) |
| `src/pages/api/activity/v1/stats.ts` | Add `category` filter, add metrics to topTitles |
| `src/components/ActivityTimelineChart.tsx` | **NEW** - Recharts timeline with metric toggles + category chips |
| `src/components/ActivityTopApps.tsx` | **NEW** - Pie/donut chart + expandable rows with window titles |
| `src/components/ActivityDashboard.tsx` | Import new components, add category state, wire refetching |
| `start-tracking.bat` | **NEW** - One-click start agent -> rodion.pro |
| `stop-tracking.bat` | **NEW** - One-click stop agent |
| `start-dev.bat` | Add env override so agent points to localhost in dev mode |

---

## Step 1: Install dependencies

- Root `package.json`: add `"recharts": "^2.15.0"`
- `activity-agent/package.json`: add `"systray2": "^2.1.0"`
- Run `npm install` in both directories

---

## Step 2: Agent config & env override

**File:** `activity-agent/config.json`
- Change `"serverBaseUrl"` from `"http://localhost:4321"` to `"https://rodion.pro"`
- Change `"sendWindowTitle"` from `false` to `true`

**File:** `activity-agent/src/index.ts`
- After loading config, check env var override:
  ```ts
  const serverBaseUrl = process.env.ACTIVITY_SERVER_URL || config.serverBaseUrl;
  ```
- Use `serverBaseUrl` in all HTTP calls instead of `config.serverBaseUrl`

**File:** `start-dev.bat` (existing)
- When launching the agent window, set the env var:
  ```batch
  start "rodion-dev-agent" cmd /c "title rodion-dev-agent & cd /d "%~dp0activity-agent" & set ACTIVITY_SERVER_URL=http://localhost:4321 & npm run dev"
  ```

This way: config.json = production (rodion.pro), dev bat overrides to localhost.

---

## Step 3: Agent tray icon

**New file:** `activity-agent/src/tray.ts`

Module that wraps systray2:
```ts
import SysTray from 'systray2';

export function createTray(opts: {
  onStop: () => void;
  onOpenDashboard: () => void;
  serverUrl: string;
}) {
  const systray = new SysTray({
    menu: {
      icon: /* base64 .ico string */,
      title: '',
      tooltip: 'Rodion.Pro Activity Tracking',
      items: [
        { title: `Tracking -> ${opts.serverUrl}`, enabled: false },
        { title: 'Open Dashboard', enabled: true },
        { title: 'Stop Tracking', enabled: true },
      ],
    },
    copyDir: false,
  });

  systray.onClick(action => {
    switch (action.seq_id) {
      case 1: // Open Dashboard
        import('child_process').then(cp => cp.exec(`start ${opts.serverUrl}/activity`));
        break;
      case 2: // Stop Tracking
        opts.onStop();
        systray.kill(false);
        break;
    }
  });

  return systray;
}
```

**File:** `activity-agent/src/index.ts` - integrate tray:
- Import `createTray` from `./tray`
- In `main()`, after starting the polling loop, create the tray:
  ```ts
  const tray = createTray({
    serverUrl: serverBaseUrl,
    onStop: () => { process.exit(0); },
    onOpenDashboard: () => { /* handled in tray.ts */ },
  });
  ```
- On `SIGINT`/`SIGTERM`, also kill the tray

**Icon:** Create a simple 16x16 / 32x32 .ico file (green circle on transparent). Store as base64 in `tray.ts` or load from `assets/icon.ico`.

---

## Step 4: Production bat files

**New file:** `start-tracking.bat`
```batch
@echo off
cd /d "%~dp0activity-agent"
where node >nul 2>&1 || (echo ERROR: node not found & pause & exit /b 1)
if not exist "node_modules\" call npm install

echo Starting activity tracking...
start /MIN "rodion-tracking" cmd /c "npx tsx src/index.ts"
echo Tracking started. Look for the tray icon.
```

**New file:** `stop-tracking.bat`
```batch
@echo off
echo Stopping activity tracking...
powershell -NoProfile -Command ^
  "Get-CimInstance Win32_Process -Filter \"commandline like '%%activity-agent%%'\" -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }"
echo Tracking stopped.
```

Note: The tray icon's "Stop Tracking" menu item is the primary way to stop. The bat is a fallback.

---

## Step 5: Enhance stats API

**File:** `src/pages/api/activity/v1/stats.ts`

### 5a. Category filter
- Import `inArray` from `drizzle-orm`
- Parse `category` query param:
  ```ts
  const categoryParam = url.searchParams.get('category');
  const categories = categoryParam ? categoryParam.split(',').filter(Boolean) : null;
  ```
- Add to `baseWhere`:
  ```ts
  categories?.length ? inArray(schemaModule.activityMinuteAgg.category, categories) : undefined
  ```

### 5b. Extend topTitles query
Add `keys`, `clicks`, `scroll` to the select:
```ts
keys: sql<number>`sum(${schemaModule.activityMinuteAgg.keys})`.as('keys'),
clicks: sql<number>`sum(${schemaModule.activityMinuteAgg.clicks})`.as('clicks'),
scroll: sql<number>`sum(${schemaModule.activityMinuteAgg.scroll})`.as('scroll'),
```
Update the response mapping for topTitles to include these fields.

---

## Step 6: Create `ActivityTimelineChart.tsx`

**New file:** `src/components/ActivityTimelineChart.tsx`

### Props
```ts
interface Props {
  series: Array<{ t: string; activeSec: number; afkSec: number; keys: number; clicks: number; scroll: number }>;
  lang: 'ru' | 'en';
  onCategoryChange: (categories: string[]) => void;
  selectedCategories: string[];
}
```

### Metric toggle pills (above chart)
`[Active Time] [AFK] [Keys] [Clicks] [Scroll]`
- Each pill has a color dot matching the curve
- Default ON: activeSec, keys, clicks
- Default OFF: afkSec, scroll
- At least one must stay on

### Category filter chips (below pills)
`[All] [Coding] [Browser] [Entertainment] [Comms] [System] [Unknown]`
- Multi-select, "All" = no filter
- Calls `onCategoryChange` -> parent refetches stats

### Chart: Recharts `ComposedChart`
- Dual Y-axes: left = seconds, right = counts
- activeSec/afkSec as `<Area>`, keys/clicks/scroll as `<Line>`
- Colors from CSS vars: accent, muted, accent2, warn, success
- Custom dark Tooltip (bg-surface, border-border)
- `<ResponsiveContainer>` height 350px
- Theme read via `getComputedStyle(document.documentElement)` on mount

---

## Step 7: Create `ActivityTopApps.tsx`

**New file:** `src/components/ActivityTopApps.tsx`

### Props
```ts
interface Props {
  topApps: Array<{ app: string; category: string; activeSec: number; keys: number; clicks: number; scroll: number }>;
  topTitles: Array<{ app: string; windowTitle: string; category: string; activeSec: number; keys: number; clicks: number; scroll: number }>;
  lang: 'ru' | 'en';
}
```

### Part A: Pie/donut chart
- Recharts `<PieChart>` with `<Pie innerRadius={60} outerRadius={100}>`
- Data: topApps mapped to `{ name: app, value: activeSec }`
- Colors: cycle through `[accent, accent2, warn, success, danger, muted]`
- Center: total active time label
- Custom dark tooltip showing app, time, keys, clicks, category

### Part B: Expandable app list (below pie)
Each row:
```
[v] chrome.exe       3h 10m   browser    keys: 1,234  clicks: 456
    |- GitHub - PR #123            1h 20m   keys: 500
    |- YouTube - Video             0h 45m   keys: 50
```
- Click row -> toggle expand (chevron rotates)
- Expanded: filter `topTitles` by `app` name client-side
- Each title row: windowTitle (truncated), activeSec, keys, clicks
- Small progress bar per title showing proportion of parent app's total

---

## Step 8: Integrate into ActivityDashboard

**File:** `src/components/ActivityDashboard.tsx`

1. Import `ActivityTimelineChart` and `ActivityTopApps`
2. Add `selectedCategories` state
3. Update stats fetch URLs to append `&category=...` when categories selected
4. Add `handleCategoryChange` -> setState + immediate refetch
5. **Replace** CSS bar chart (lines 345-377) with `<ActivityTimelineChart>`
6. **Replace** Top Apps table (lines 380-405) with `<ActivityTopApps>` (pass topApps + topTitles)
7. Keep Top Categories and Detailed Analysis sections as-is
8. Add new translation keys to the inline translations object

---

## Verification

1. **Build**: `npx astro check` passes with no errors
2. **Agent config**: Verify config.json points to rodion.pro, sendWindowTitle is true
3. **Dev mode**: Run `start-dev.bat` -> agent sends to localhost:4321 (check agent console)
4. **Tray icon**: Run `start-tracking.bat` -> tray icon appears, right-click shows menu, "Stop" works, "Open Dashboard" opens browser
5. **stop-tracking.bat**: Kills agent process cleanly
6. **API**: `curl ".../stats?...&category=coding"` returns filtered results; topTitles now has keys/clicks/scroll
7. **Timeline chart**: Renders at `/ru/activity`, toggle pills show/hide curves, category chips filter data
8. **Top Apps**: Pie chart renders proportionally, click app row -> expands to show window titles
9. **Window titles**: After agent runs a while with sendWindowTitle=true, title data appears in expandable rows
10. **Responsive**: Charts and controls work on mobile viewport
11. **Empty state**: No data -> chart shows message, pie handles gracefully
