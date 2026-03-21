export interface ActiveWindowInfo {
  app: string;
  title: string;
  pid: number;
}

export interface InputCounts {
  keys: number;
  clicks: number;
  scroll: number;
}

export interface DurationState {
  dtSec: number;
  activeSec: number;
  afkSec: number;
  idleMs: number;
}

export interface TodayTotals {
  keys: number;
  clicks: number;
  scroll: number;
  activeSec: number;
}

export interface CollectorState {
  now: ActiveWindowInfo | null;
  category: string;
  isAfk: boolean;
  isPaused: boolean;
  pauseUntil: string | null;
  counts: InputCounts;
  durations: DurationState;
  todayTotals: TodayTotals;
  lastTick: string | null;
}

export interface DesktopConfig {
  'server.baseUrl': string;
  'server.deviceId': string;
  'server.deviceKey': string; // masked as "***" when sent to renderer
  'collect.pollIntervalSec': number;
  'collect.afkThresholdMs': number;
  'privacy.sendWindowTitle': boolean;
  'privacy.categoryOnlyMode': boolean;
  'privacy.blacklistApps': string[];
  'privacy.blacklistTitlePatterns': string[];
  'privacy.redactDomains': string[];
  'sync.batchSize': number;
  'sync.intervalSec': number;
  'sync.maxRetries': number;
}

export const DEFAULT_CONFIG: DesktopConfig = {
  'server.baseUrl': 'https://rodion.pro',
  'server.deviceId': '',
  'server.deviceKey': '',
  'collect.pollIntervalSec': 10,
  'collect.afkThresholdMs': 300000,
  'privacy.sendWindowTitle': true,
  'privacy.categoryOnlyMode': false,
  'privacy.blacklistApps': ['keepass.exe', '1password.exe'],
  'privacy.blacklistTitlePatterns': [],
  'privacy.redactDomains': [],
  'sync.batchSize': 20,
  'sync.intervalSec': 30,
  'sync.maxRetries': 5,
};

export interface SyncStatus {
  lastSyncAt: string | null;
  lastSyncResult: string | null;
  queuedCount: number;
  failedCount: number;
  isOnline: boolean;
  deviceId: string;
  consecutiveFailures: number;
}

export interface LocalTimelineEntry {
  id: number;
  createdAt: string;
  app: string;
  windowTitle: string;
  category: string;
  isAfk: boolean;
  keys: number;
  clicks: number;
  scroll: number;
  dtSec: number;
  activeSec: number;
  afkSec: number;
  synced: number;
}

export interface LocalMarker {
  id: number;
  createdAt: string;
  type: string;
  note: string | null;
  appContext: string | null;
  categoryContext: string | null;
  synced: number;
}

export type MarkerType =
  | 'started_work'
  | 'coding'
  | 'research'
  | 'writing'
  | 'deploy'
  | 'streaming'
  | 'debugging'
  | 'finished'
  | 'custom';

export const MARKER_PRESETS: Array<{ type: MarkerType; label: string }> = [
  { type: 'started_work', label: 'Начал работу' },
  { type: 'coding', label: 'Кодинг' },
  { type: 'research', label: 'Исследование' },
  { type: 'writing', label: 'Пишу пост' },
  { type: 'deploy', label: 'Деплой' },
  { type: 'streaming', label: 'Стрим' },
  { type: 'debugging', label: 'Отладка' },
  { type: 'finished', label: 'Закончил' },
];

export interface RawCollectorEvent {
  app: string;
  windowTitle: string;
  category: string;
  isAfk: boolean;
  keys: number;
  clicks: number;
  scroll: number;
  dtSec: number;
  activeSec: number;
  afkSec: number;
  idleMs: number;
}

export interface FilteredEvent extends RawCollectorEvent {
  originalApp: string;
  originalTitle: string;
  wasFiltered: boolean;
}

// IPC-exposed API shape for the renderer
export interface ActivityAPI {
  getState(): Promise<CollectorState>;
  getConfig(): Promise<DesktopConfig>;
  getSyncStatus(): Promise<SyncStatus>;
  getTimeline(from: string, to: string): Promise<LocalTimelineEntry[]>;
  getMarkers(from: string, to: string): Promise<LocalMarker[]>;
  getOutboundPreview(): Promise<FilteredEvent | null>;

  updateConfig(partial: Partial<DesktopConfig>): Promise<void>;
  pause(minutes: number | null): Promise<void>;
  resume(): Promise<void>;
  addMarker(marker: { type: string; note?: string }): Promise<void>;
  addBlacklistApp(app: string): Promise<void>;
  removeBlacklistApp(app: string): Promise<void>;
  addBlacklistPattern(pattern: string): Promise<void>;
  removeBlacklistPattern(pattern: string): Promise<void>;
  testConnectivity(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  syncNow(): Promise<void>;
  setupDevice(config: { baseUrl: string; deviceId: string; deviceKey: string }): Promise<void>;
  isConfigured(): Promise<boolean>;

  onStateUpdate(callback: (state: CollectorState) => void): () => void;
  onSyncUpdate(callback: (status: SyncStatus) => void): () => void;
  onPauseChange(callback: (data: { isPaused: boolean; pauseUntil: string | null }) => void): () => void;
}

declare global {
  interface Window {
    activityAPI: ActivityAPI;
  }
}
