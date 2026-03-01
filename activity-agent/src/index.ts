import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosError } from 'axios';
import { InputCounter } from './inputCounter';
import { createTray, destroyTray } from './tray';
import { getForegroundWindowInfo, getIdleTimeMs as win32GetIdleTimeMs } from './win32';

// Types
interface AppConfig {
  serverBaseUrl: string;
  deviceId: string;
  deviceKey: string;
  pollIntervalSec: number;
  privacy: {
    blacklistApps: string[];
    blacklistTitlePatterns: string[];
    sendWindowTitle?: boolean; // New privacy setting
  };
  categories: Array<{
    match: string;
    category: string;
  }>;
}

interface Durations {
  dtSec: number;     // реальная длительность интервала (сек)
  activeSec: number; // активное время (сек)
  afkSec: number;    // AFK время (сек)
  idleMs: number;    // текущее idle (мс)
}

interface ActivityData {
  sentAt: string;
  intervalSec: number;
  now: {
    app: string;
    windowTitle: string;
    category: string;
    isAfk: boolean;
  };
  counts: {
    keys: number;
    clicks: number;
    scroll: number;
  };
  durations: Durations;
}

interface ActiveWindow {
  app: string;
  title: string;
  pid: number;
}

// Global state
let lastActivity: ActivityData | null = null;
let lastWindow: ActiveWindow | null = null;
let lastIdleMs: number | null = null;

// Configuration
let config: AppConfig;
let serverBaseUrl: string; // resolved from env or config

// Initialize input counter
const inputCounter = new InputCounter();

async function loadConfig(): Promise<AppConfig> {
  try {
    // Support --config <path> CLI argument, default to config.json
    const configArgIdx = process.argv.indexOf('--config');
    const configFile = configArgIdx !== -1 && process.argv[configArgIdx + 1]
      ? process.argv[configArgIdx + 1]
      : 'config.json';
    const configPath = path.resolve(process.cwd(), configFile);
    const configContent = await fs.readFile(configPath, 'utf8');
    console.log(`Loaded config from: ${configPath}`);
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Failed to load config:', error);
    process.exit(1);
  }
}

function categorizeApp(appName: string): string {
  for (const rule of config.categories) {
    const regex = new RegExp(rule.match, 'i');
    if (regex.test(appName)) {
      return rule.category;
    }
  }
  return 'unknown';
}

function isBlacklistedApp(appName: string): boolean {
  return config.privacy.blacklistApps.some(blacklistApp => 
    appName.toLowerCase().includes(blacklistApp.toLowerCase())
  );
}

function isBlacklistedTitle(title: string): boolean {
  return config.privacy.blacklistTitlePatterns.some(pattern => 
    new RegExp(pattern, 'i').test(title)
  );
}

// Native Win32 window detection via koffi (no PowerShell spawning)
async function getActiveWindowWin(): Promise<ActiveWindow | null> {
  try {
    const info = getForegroundWindowInfo();
    if (!info) return null;
    return { app: info.app, title: info.title, pid: info.pid };
  } catch (error) {
    console.warn('Failed to get active window:', error);
    return null;
  }
}

let lastWindowForInput = null;

// For Windows, we'll use a PowerShell script to get idle time
// Since Node.js can't directly hook into input events without native modules,
// we rely on external tools like ActivityWatch or native system hooks for real input tracking
// For now, we only track window/app activity without input counts

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Оценивает сколько секунд внутри интервала было AFK (idle >= threshold).
 * Работает только по idleMs (GetLastInputInfo).
 */
function computeAfkSec(params: {
  idlePrevMs: number;
  idleNowMs: number;
  dtSec: number;
  thresholdMs: number;
}): number {
  const { idlePrevMs, idleNowMs, dtSec, thresholdMs } = params;
  const dtMs = Math.max(1, dtSec) * 1000;

  const prev = Math.max(0, idlePrevMs);
  const now = Math.max(0, idleNowMs);

  // ожидание “без ввода”: idle растёт примерно на dt
  const expected = prev + dtMs;

  // допускаем небольшой джиттер (PowerShell/планировщик)
  const jitterMs = 250;
  const inputHappened = now < (expected - jitterMs);

  let afkMs = 0;

  if (!inputHappened) {
    // ввода не было: idle монотонно рос
    const startIdle = prev;
    const endIdle = prev + dtMs;

    if (endIdle <= thresholdMs) afkMs = 0;
    else if (startIdle >= thresholdMs) afkMs = dtMs;
    else afkMs = endIdle - thresholdMs;
  } else {
    // ввод был внутри интервала. idleNow = сколько прошло с последнего ввода в конце интервала
    const beforeInputMs = clamp(dtMs - now, 0, dtMs); // сколько времени прошло от начала интервала до последнего ввода
    const idleBeforeInput = prev + beforeInputMs;

    if (idleBeforeInput <= thresholdMs) afkMs = 0;
    else if (prev >= thresholdMs) afkMs = beforeInputMs;
    else afkMs = idleBeforeInput - thresholdMs;
  }

  afkMs = clamp(afkMs, 0, dtMs);
  const afkSec = clamp(Math.round(afkMs / 1000), 0, dtSec);
  return afkSec;
}

// Function to get system idle time on Windows using PowerShell
// Native Win32 idle time via koffi
async function getIdleTimeMs(): Promise<number> {
  try {
    return win32GetIdleTimeMs();
  } catch (error) {
    console.warn('Could not get idle time:', error);
    return 0;
  }
}

// getIsAFK is already implemented in the collectActivityData function
// using the actual idle time from getIdleTimeMs()

async function collectActivityData(): Promise<ActivityData> {
  const now = new Date();
  const windowData = await getActiveWindowWin();
  const idleTimeMs = await getIdleTimeMs();
  const isAfk = idleTimeMs > 300000; // 5 minutes threshold for AFK

  // Get real input counts from the input counter and reset them
  const { keys: keyDelta, clicks: clickDelta, scroll: scrollDelta } = inputCounter.consumeDelta();

  // Calculate intervals and differences
  let intervalSec = config.pollIntervalSec;

  if (lastActivity) {
    intervalSec = Math.floor((now.getTime() - new Date(lastActivity.sentAt).getTime()) / 1000);
  }

  // Privacy checks - respect privacy settings for window title
  let app = '';
  let windowTitle = '';
  let category = 'unknown';

  if (windowData) {
    app = windowData.app;
    
    // Respect privacy setting for window title
    if (config.privacy.sendWindowTitle) {
      windowTitle = windowData.title;
      // Apply privacy filters if title is being sent
      if (isBlacklistedApp(app) || isBlacklistedTitle(windowTitle)) {
        category = categorizeApp(app);
        app = '[PRIVACY]';
        windowTitle = '[PRIVACY]';
      } else {
        category = categorizeApp(app);
      }
    } else {
      // Don't send window title, only use it for categorization
      if (isBlacklistedApp(app) || isBlacklistedTitle(windowData.title)) {
        category = categorizeApp(app);
        app = '[PRIVACY]';
      } else {
        category = categorizeApp(app);
      }
    }
  }

  // If no window data, use last known window or set to system
  if (!windowData && lastWindow) {
    app = lastWindow.app;
    if (config.privacy.sendWindowTitle) {
      windowTitle = lastWindow.title;
    }
    category = categorizeApp(app);
  }

  // --- durations (active/afk внутри интервала) ---
  const dtSec = Math.max(1, intervalSec);
  const thresholdMs = 300_000; // 5 минут

  let afkSec = isAfk ? dtSec : 0;
  if (lastIdleMs !== null) {
    afkSec = computeAfkSec({
      idlePrevMs: lastIdleMs,
      idleNowMs: idleTimeMs,
      dtSec,
      thresholdMs,
    });
  }
  const activeSec = Math.max(0, dtSec - afkSec);

  lastIdleMs = idleTimeMs;

  const activityData: ActivityData = {
    sentAt: now.toISOString(),
    intervalSec,
    now: {
      app,
      windowTitle, // This will be empty string if sendWindowTitle is false
      category,
      isAfk
    },
    counts: {
      keys: keyDelta,
      clicks: clickDelta,
      scroll: scrollDelta
    },
    durations: {
      dtSec,
      activeSec,
      afkSec,
      idleMs: idleTimeMs,
    },
  };

  // Update global state
  lastActivity = activityData;
  if (windowData) {
    lastWindow = windowData;
  }

  return activityData;
}

async function sendActivityData(data: ActivityData): Promise<void> {
  try {
    await axios.post(`${serverBaseUrl}/api/activity/v1/ingest`, data, {
      headers: {
        'x-device-id': config.deviceId,
        'x-device-key': config.deviceKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log(`[${new Date().toISOString()}] Activity data sent successfully`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error(`[${new Date().toISOString()}] Failed to send activity data:`, axiosError.response?.data || axiosError.message);
    } else {
      console.error(`[${new Date().toISOString()}] Failed to send activity data:`, error);
    }
  }
}

async function main() {
  console.log('Activity Agent starting...');
  config = await loadConfig();

  if (config.deviceKey === 'CHANGE_ME') {
    console.error('Please update the deviceKey in config.json before running the agent!');
    process.exit(1);
  }

  // Resolve server URL: env var overrides config
  serverBaseUrl = process.env.ACTIVITY_SERVER_URL || config.serverBaseUrl;

  console.log(`Connected to server: ${serverBaseUrl}`);
  console.log(`Device ID: ${config.deviceId}`);

  // Start input counter
  inputCounter.start();
  console.log('Input counter started');

  // Initial data collection
  try {
    const initialData = await collectActivityData();
    await sendActivityData(initialData);
  } catch (error) {
    console.error('Failed to collect initial data:', error);
  }

  // Main loop
  setInterval(async () => {
    try {
      const data = await collectActivityData();
      await sendActivityData(data);
    } catch (error) {
      console.error('Error in main loop:', error);
    }
  }, config.pollIntervalSec * 1000);

  console.log(`Polling interval: ${config.pollIntervalSec}s`);
  console.log('Activity Agent running...');

  // Create system tray icon
  try {
    createTray({
      serverUrl: serverBaseUrl,
      onStop: () => {
        console.log('Stop requested from tray icon.');
        process.exit(0);
      },
    });
    console.log('Tray icon created.');
  } catch (err) {
    console.warn('Failed to create tray icon (running without it):', err);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Activity Agent...');
  destroyTray();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down Activity Agent...');
  destroyTray();
  process.exit(0);
});

// Start the agent
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});