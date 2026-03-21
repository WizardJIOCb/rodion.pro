// System tray manager for the Electron app
// Uses Electron's native Tray API instead of systray2

import { Tray, Menu, nativeImage, app, type BrowserWindow, type NativeImage } from 'electron';

let tray: Tray | null = null;

/**
 * Generate a minimal 16x16 green circle icon as a nativeImage.
 * This avoids needing an external icon file.
 */
function createTrayIcon(): NativeImage {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);

  const cx = 7.5, cy = 7.5, r = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * size + x) * 4;

      if (dist <= r - 0.5) {
        // Green fill (RGBA)
        buf[offset] = 76;     // R
        buf[offset + 1] = 175; // G
        buf[offset + 2] = 80;  // B
        buf[offset + 3] = 255; // A
      } else if (dist <= r + 0.5) {
        // Anti-aliased edge
        const alpha = Math.max(0, Math.min(255, Math.round((r + 0.5 - dist) * 255)));
        buf[offset] = 76;
        buf[offset + 1] = 175;
        buf[offset + 2] = 80;
        buf[offset + 3] = alpha;
      } else {
        // Transparent
        buf[offset] = 0;
        buf[offset + 1] = 0;
        buf[offset + 2] = 0;
        buf[offset + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);

  tray.setToolTip('Wizard Tracker');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Wizard Tracker',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Pause (15 min)',
      click: () => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('activity:pause:tray', 15);
        }
      },
    },
    {
      label: 'Pause (1 hour)',
      click: () => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('activity:pause:tray', 60);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function updateTrayTooltip(text: string): void {
  if (tray) {
    tray.setToolTip(text);
  }
}
