// IPC handlers: main process side of the IPC bridge
// Registers all ipcMain.handle() calls

import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { DesktopConfig } from '../../shared/types';

import { getState, setPaused, restartCollecting } from '../collectors/orchestrator';
import { getAllConfig, updateConfig, isConfigured } from '../store/config-repo';
import { getEventsInRange } from '../store/events-repo';
import { getMarkersInRange, insertMarker } from '../store/markers-repo';
import { getSyncStatus, syncNow, testConnectivity, restartSyncWorker } from '../sync/sync-worker';
import { previewFilter } from '../privacy/filter';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

export function registerIpcHandlers(): void {
  // State queries
  ipcMain.handle(IPC.STATE_GET, () => {
    return getState();
  });

  ipcMain.handle(IPC.CONFIG_GET, () => {
    const config = getAllConfig();
    // SECURITY: mask deviceKey before sending to renderer
    return { ...config, 'server.deviceKey': config['server.deviceKey'] ? '***' : '' };
  });

  ipcMain.handle(IPC.SYNC_STATUS, () => {
    return getSyncStatus();
  });

  ipcMain.handle(IPC.TIMELINE_GET, (_event: IpcMainInvokeEvent, from: string, to: string) => {
    return getEventsInRange(from, to);
  });

  ipcMain.handle(IPC.MARKERS_GET, (_event: IpcMainInvokeEvent, from: string, to: string) => {
    return getMarkersInRange(from, to);
  });

  ipcMain.handle(IPC.PRIVACY_PREVIEW, () => {
    const state = getState();
    if (!state.now) return null;
    const config = getAllConfig();
    return previewFilter({
      app: state.now.app,
      windowTitle: state.now.title,
      category: state.category,
      isAfk: state.isAfk,
      keys: state.counts.keys,
      clicks: state.counts.clicks,
      scroll: state.counts.scroll,
      dtSec: state.durations.dtSec,
      activeSec: state.durations.activeSec,
      afkSec: state.durations.afkSec,
      idleMs: state.durations.idleMs,
    }, config);
  });

  // Config mutations
  ipcMain.handle(IPC.CONFIG_UPDATE, (_event: IpcMainInvokeEvent, partial: Partial<DesktopConfig>) => {
    // SECURITY: prevent renderer from setting deviceKey directly
    const safe = { ...partial };
    delete (safe as Record<string, unknown>)['server.deviceKey'];
    updateConfig(safe);

    // Hot-reload intervals if relevant settings changed
    if ('collect.pollIntervalSec' in safe || 'collect.afkThresholdMs' in safe) {
      restartCollecting();
    }
    if ('sync.intervalSec' in safe || 'sync.batchSize' in safe) {
      restartSyncWorker();
    }
  });

  // Pause/Resume
  ipcMain.handle(IPC.PAUSE, (_event: IpcMainInvokeEvent, minutes: number | null) => {
    let pauseUntil: string | null = null;
    if (minutes !== null && minutes > 0) {
      pauseUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    }
    setPaused(true, pauseUntil);
    sendToRenderer(IPC.PAUSE_CHANGED, { isPaused: true, pauseUntil });
  });

  ipcMain.handle(IPC.RESUME, () => {
    setPaused(false, null);
    sendToRenderer(IPC.PAUSE_CHANGED, { isPaused: false, pauseUntil: null });
  });

  // Markers
  ipcMain.handle(IPC.MARKER_ADD, (_event: IpcMainInvokeEvent, marker: { type: string; note?: string }) => {
    const state = getState();
    insertMarker(
      marker.type,
      marker.note,
      state.now?.app,
      state.category,
    );
  });

  // Blacklist management
  ipcMain.handle(IPC.BLACKLIST_ADD_APP, (_event: IpcMainInvokeEvent, app: string) => {
    const config = getAllConfig();
    const list = [...config['privacy.blacklistApps']];
    if (!list.includes(app)) {
      list.push(app);
      updateConfig({ 'privacy.blacklistApps': list });
    }
  });

  ipcMain.handle(IPC.BLACKLIST_REMOVE_APP, (_event: IpcMainInvokeEvent, app: string) => {
    const config = getAllConfig();
    const list = config['privacy.blacklistApps'].filter(a => a !== app);
    updateConfig({ 'privacy.blacklistApps': list });
  });

  ipcMain.handle(IPC.BLACKLIST_ADD_PATTERN, (_event: IpcMainInvokeEvent, pattern: string) => {
    const config = getAllConfig();
    const list = [...config['privacy.blacklistTitlePatterns']];
    if (!list.includes(pattern)) {
      list.push(pattern);
      updateConfig({ 'privacy.blacklistTitlePatterns': list });
    }
  });

  ipcMain.handle(IPC.BLACKLIST_REMOVE_PATTERN, (_event: IpcMainInvokeEvent, pattern: string) => {
    const config = getAllConfig();
    const list = config['privacy.blacklistTitlePatterns'].filter(p => p !== pattern);
    updateConfig({ 'privacy.blacklistTitlePatterns': list });
  });

  // Sync
  ipcMain.handle(IPC.SYNC_NOW, async () => {
    await syncNow();
  });

  ipcMain.handle(IPC.SYNC_TEST, async () => {
    return await testConnectivity();
  });

  // Device setup
  ipcMain.handle(IPC.SETUP_DEVICE, (_event: IpcMainInvokeEvent, config: { baseUrl: string; deviceId: string; deviceKey: string }) => {
    updateConfig({
      'server.baseUrl': config.baseUrl,
      'server.deviceId': config.deviceId,
      'server.deviceKey': config.deviceKey,
    });
  });

  ipcMain.handle(IPC.IS_CONFIGURED, () => {
    return isConfigured();
  });
}

// Forward collector state updates to renderer
export function forwardStateUpdates(): void {
  const { onStateUpdate } = require('../collectors/orchestrator');
  onStateUpdate((state: unknown) => {
    sendToRenderer(IPC.STATE_UPDATED, state);
  });
}

// Forward sync status updates to renderer
export function forwardSyncUpdates(): void {
  const { onSyncUpdate } = require('../sync/sync-worker');
  onSyncUpdate((status: unknown) => {
    sendToRenderer(IPC.SYNC_UPDATED, status);
  });
}
