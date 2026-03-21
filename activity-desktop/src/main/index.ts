// Main process entry point for Wizard Tracker
import { app, BrowserWindow } from 'electron';
import { createMainWindow, getMainWindow } from './window';
import { registerIpcHandlers, setMainWindow, forwardStateUpdates, forwardSyncUpdates } from './ipc/ipc-handlers';
import { createTray, destroyTray } from './tray';
import { closeDb } from './store/database';

// Handle Squirrel events for Windows installer
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });
}

app.on('ready', () => {
  const mainWindow = createMainWindow();

  // Set up IPC first so renderer can communicate immediately
  registerIpcHandlers();
  setMainWindow(mainWindow);

  // Create system tray
  createTray(mainWindow);

  // Defer native module initialization to avoid blocking window render
  setTimeout(() => {
    try {
      const { startCollecting } = require('./collectors/orchestrator');
      startCollecting();
      console.log('[main] Collectors started');
    } catch (err) {
      console.error('[main] Failed to start collectors:', err);
    }

    try {
      const { startSyncWorker } = require('./sync/sync-worker');
      startSyncWorker();
      console.log('[main] Sync worker started');
    } catch (err) {
      console.error('[main] Failed to start sync worker:', err);
    }

    // Forward updates to renderer after collectors are initialized
    try {
      forwardStateUpdates();
      forwardSyncUpdates();
    } catch (err) {
      console.error('[main] Failed to forward updates:', err);
    }
  }, 1000);
});

app.on('window-all-closed', () => {
  // On Windows, don't quit when window is closed (tray keeps running)
});

app.on('before-quit', () => {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    (win as BrowserWindow & { forceQuit?: boolean }).forceQuit = true;
  }
});

app.on('will-quit', () => {
  try {
    const { stopCollecting } = require('./collectors/orchestrator');
    stopCollecting();
  } catch { /* ignore */ }
  try {
    const { stopSyncWorker } = require('./sync/sync-worker');
    stopSyncWorker();
  } catch { /* ignore */ }
  destroyTray();
  closeDb();
});

app.on('activate', () => {
  const win = getMainWindow();
  if (win) {
    win.show();
  }
});
