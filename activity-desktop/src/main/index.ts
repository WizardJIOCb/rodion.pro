// Main process entry point for Activity Desktop
import { app, BrowserWindow } from 'electron';
import { createMainWindow, getMainWindow } from './window';
import { registerIpcHandlers, setMainWindow, forwardStateUpdates, forwardSyncUpdates } from './ipc/ipc-handlers';
import { startCollecting, stopCollecting } from './collectors/orchestrator';
import { startSyncWorker, stopSyncWorker } from './sync/sync-worker';
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

  // Set up IPC
  registerIpcHandlers();
  setMainWindow(mainWindow);

  // Start collectors and sync
  startCollecting();
  startSyncWorker();

  // Forward updates to renderer
  forwardStateUpdates();
  forwardSyncUpdates();

  // Create system tray
  createTray(mainWindow);
});

app.on('window-all-closed', () => {
  // On Windows, don't quit when window is closed (tray keeps running)
  // The app quits only via tray "Quit" menu
});

app.on('before-quit', () => {
  // Mark forceQuit on all windows so close handlers don't prevent quit
  const win = getMainWindow();
  if (win) {
    (win as BrowserWindow & { forceQuit?: boolean }).forceQuit = true;
  }
});

app.on('will-quit', () => {
  stopCollecting();
  stopSyncWorker();
  destroyTray();
  closeDb();
});

app.on('activate', () => {
  const win = getMainWindow();
  if (win) {
    win.show();
  }
});
