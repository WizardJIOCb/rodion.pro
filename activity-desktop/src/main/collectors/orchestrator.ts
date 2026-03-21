// Activity collection orchestrator
// Combines window detection + input counting + idle detection + categorization
// Then stores events locally via SQLite

import { getForegroundWindowInfo, getIdleTimeMs } from './win32';
import { InputCounter } from './input-counter';
import { DEFAULT_CATEGORIES, type CategoryRule } from '../../shared/categories';
import { applyPrivacyFilter } from '../privacy/filter';
import { insertEvent, getTodayTotals } from '../store/events-repo';
import { getAllConfig } from '../store/config-repo';
import type { CollectorState, RawCollectorEvent, ActiveWindowInfo, TodayTotals } from '../../shared/types';

const inputCounter = new InputCounter();

let lastIdleMs: number | null = null;
let lastTickTime: number | null = null;
let currentState: CollectorState = {
  now: null,
  category: 'unknown',
  isAfk: false,
  isPaused: false,
  pauseUntil: null,
  counts: { keys: 0, clicks: 0, scroll: 0 },
  durations: { dtSec: 0, activeSec: 0, afkSec: 0, idleMs: 0 },
  todayTotals: { keys: 0, clicks: 0, scroll: 0, activeSec: 0 },
  lastTick: null,
};

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let stateCallback: ((state: CollectorState) => void) | null = null;

function categorizeApp(appName: string, rules: CategoryRule[]): string {
  for (const rule of rules) {
    try {
      if (new RegExp(rule.match, 'i').test(appName)) {
        return rule.category;
      }
    } catch {
      // skip invalid regex
    }
  }
  return 'unknown';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Core AFK calculation ported from activity-agent.
 * Compares idle time growth to interval duration to detect input events.
 */
function computeAfkSec(
  idlePrevMs: number,
  idleNowMs: number,
  dtSec: number,
  thresholdMs: number,
): number {
  const dtMs = dtSec * 1000;
  const expectedGrowth = dtMs;
  const actualGrowth = idleNowMs - idlePrevMs;
  const jitter = 250;

  const inputOccurred = actualGrowth < expectedGrowth - jitter;

  if (!inputOccurred) {
    // Idle was monotonically increasing
    if (idleNowMs >= thresholdMs) {
      return clamp(dtSec, 0, dtSec);
    }
    const afkFraction = idleNowMs >= thresholdMs ? 1 : 0;
    return clamp(dtSec * afkFraction, 0, dtSec);
  }

  // Input occurred during interval: idle reset at some point
  // Time before the last input: idleNowMs (time since last input)
  const afkMs = Math.max(0, idleNowMs - thresholdMs);
  return clamp(afkMs / 1000, 0, dtSec);
}

export function getState(): CollectorState {
  return { ...currentState };
}

export function setPaused(isPaused: boolean, pauseUntil: string | null): void {
  currentState.isPaused = isPaused;
  currentState.pauseUntil = pauseUntil;
}

export function onStateUpdate(callback: (state: CollectorState) => void): void {
  stateCallback = callback;
}

function collectTick(): void {
  const config = getAllConfig();

  // Check pause
  if (currentState.isPaused) {
    if (currentState.pauseUntil) {
      const until = new Date(currentState.pauseUntil).getTime();
      if (Date.now() >= until) {
        currentState.isPaused = false;
        currentState.pauseUntil = null;
      } else {
        return;
      }
    } else {
      return;
    }
  }

  const now = Date.now();
  const dtSec = lastTickTime ? (now - lastTickTime) / 1000 : config['collect.pollIntervalSec'];
  lastTickTime = now;

  // Get window info
  const windowInfo: ActiveWindowInfo | null = getForegroundWindowInfo();
  const app = windowInfo?.app ?? '';
  const title = windowInfo?.title ?? '';

  // Categorize
  const category = categorizeApp(app, DEFAULT_CATEGORIES);

  // Get idle time
  const idleMs = getIdleTimeMs();
  const thresholdMs = config['collect.afkThresholdMs'];

  // Calculate AFK
  let afkSec: number;
  if (lastIdleMs !== null) {
    afkSec = computeAfkSec(lastIdleMs, idleMs, dtSec, thresholdMs);
  } else {
    afkSec = idleMs >= thresholdMs ? dtSec : 0;
  }
  lastIdleMs = idleMs;

  const activeSec = dtSec - afkSec;
  const isAfk = idleMs >= thresholdMs;

  // Get input counts
  const counts = inputCounter.consumeDelta();

  // Build raw event
  const rawEvent: RawCollectorEvent = {
    app,
    windowTitle: title,
    category,
    isAfk,
    keys: counts.keys,
    clicks: counts.clicks,
    scroll: counts.scroll,
    dtSec,
    activeSec,
    afkSec,
    idleMs,
  };

  // Apply privacy filter
  const filtered = applyPrivacyFilter(rawEvent, config);

  // Store in SQLite
  insertEvent(filtered);

  // Update today totals
  const totals = getTodayTotals();
  const todayTotals: TodayTotals = {
    keys: totals.keys,
    clicks: totals.clicks,
    scroll: totals.scroll,
    activeSec: totals.activeSec,
  };

  // Update state
  currentState = {
    now: windowInfo,
    category,
    isAfk,
    isPaused: currentState.isPaused,
    pauseUntil: currentState.pauseUntil,
    counts,
    durations: { dtSec, activeSec, afkSec, idleMs },
    todayTotals,
    lastTick: new Date().toISOString(),
  };

  stateCallback?.(currentState);
}

export function startCollecting(): void {
  inputCounter.start();
  collectTick(); // initial collection
  const config = getAllConfig();
  intervalHandle = setInterval(collectTick, config['collect.pollIntervalSec'] * 1000);
}

export function stopCollecting(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  inputCounter.stop();
}
