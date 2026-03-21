// Preload script: exposes a secure API via contextBridge
// SECURITY: deviceKey is NEVER exposed to the renderer process
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { ActivityAPI, CollectorState, SyncStatus, DesktopConfig } from '../shared/types';

const api: ActivityAPI = {
  getState: () => ipcRenderer.invoke(IPC.STATE_GET),
  getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  getSyncStatus: () => ipcRenderer.invoke(IPC.SYNC_STATUS),
  getTimeline: (from: string, to: string) => ipcRenderer.invoke(IPC.TIMELINE_GET, from, to),
  getMarkers: (from: string, to: string) => ipcRenderer.invoke(IPC.MARKERS_GET, from, to),
  getOutboundPreview: () => ipcRenderer.invoke(IPC.PRIVACY_PREVIEW),

  updateConfig: (partial: Partial<DesktopConfig>) => ipcRenderer.invoke(IPC.CONFIG_UPDATE, partial),
  pause: (minutes: number | null) => ipcRenderer.invoke(IPC.PAUSE, minutes),
  resume: () => ipcRenderer.invoke(IPC.RESUME),
  addMarker: (marker: { type: string; note?: string }) => ipcRenderer.invoke(IPC.MARKER_ADD, marker),
  addBlacklistApp: (app: string) => ipcRenderer.invoke(IPC.BLACKLIST_ADD_APP, app),
  removeBlacklistApp: (app: string) => ipcRenderer.invoke(IPC.BLACKLIST_REMOVE_APP, app),
  addBlacklistPattern: (pattern: string) => ipcRenderer.invoke(IPC.BLACKLIST_ADD_PATTERN, pattern),
  removeBlacklistPattern: (pattern: string) => ipcRenderer.invoke(IPC.BLACKLIST_REMOVE_PATTERN, pattern),
  testConnectivity: () => ipcRenderer.invoke(IPC.SYNC_TEST),
  syncNow: () => ipcRenderer.invoke(IPC.SYNC_NOW),
  setupDevice: (config: { baseUrl: string; deviceId: string; deviceKey: string }) => ipcRenderer.invoke(IPC.SETUP_DEVICE, config),
  isConfigured: () => ipcRenderer.invoke(IPC.IS_CONFIGURED),

  onStateUpdate: (callback: (state: CollectorState) => void) => {
    const listener = (_event: IpcRendererEvent, state: CollectorState) => callback(state);
    ipcRenderer.on(IPC.STATE_UPDATED, listener);
    return () => ipcRenderer.removeListener(IPC.STATE_UPDATED, listener);
  },

  onSyncUpdate: (callback: (status: SyncStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: SyncStatus) => callback(status);
    ipcRenderer.on(IPC.SYNC_UPDATED, listener);
    return () => ipcRenderer.removeListener(IPC.SYNC_UPDATED, listener);
  },

  onPauseChange: (callback: (data: { isPaused: boolean; pauseUntil: string | null }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { isPaused: boolean; pauseUntil: string | null }) => callback(data);
    ipcRenderer.on(IPC.PAUSE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC.PAUSE_CHANGED, listener);
  },
};

contextBridge.exposeInMainWorld('activityAPI', api);
