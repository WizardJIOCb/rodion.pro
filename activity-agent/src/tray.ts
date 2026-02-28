import SysTrayModule from 'systray2';
import { exec } from 'child_process';

// systray2 CJS default export compat
const SysTray = (SysTrayModule as any).default || SysTrayModule;
// Minimal 16x16 green circle .ico as base64 (generated programmatically)
// This is a valid ICO with a single 16x16 32-bit ARGB image
const GREEN_ICON_BASE64 = (() => {
  // Build a minimal 16x16 ICO in memory
  const width = 16;
  const height = 16;
  const bpp = 32;
  const imageSize = width * height * 4; // BGRA pixels
  const maskSize = width * Math.ceil(width / 32) * 4 * height / height; // 1-bit mask padded to dword
  const maskRowBytes = Math.ceil(width / 8);
  const maskRowPadded = Math.ceil(maskRowBytes / 4) * 4;
  const totalMaskSize = maskRowPadded * height;
  const bmpHeaderSize = 40;
  const dataSize = bmpHeaderSize + imageSize + totalMaskSize;

  const buf = Buffer.alloc(6 + 16 + dataSize);
  let off = 0;

  // ICO header
  buf.writeUInt16LE(0, off); off += 2; // reserved
  buf.writeUInt16LE(1, off); off += 2; // type: ico
  buf.writeUInt16LE(1, off); off += 2; // count: 1

  // ICO directory entry
  buf.writeUInt8(width, off); off += 1;
  buf.writeUInt8(height, off); off += 1;
  buf.writeUInt8(0, off); off += 1; // palette
  buf.writeUInt8(0, off); off += 1; // reserved
  buf.writeUInt16LE(1, off); off += 2; // color planes
  buf.writeUInt16LE(bpp, off); off += 2;
  buf.writeUInt32LE(dataSize, off); off += 4; // size of data
  buf.writeUInt32LE(6 + 16, off); off += 4; // offset to data

  // BMP info header (BITMAPINFOHEADER)
  const bmpOff = off;
  buf.writeUInt32LE(bmpHeaderSize, off); off += 4;
  buf.writeInt32LE(width, off); off += 4;
  buf.writeInt32LE(height * 2, off); off += 4; // doubled for ICO
  buf.writeUInt16LE(1, off); off += 2; // planes
  buf.writeUInt16LE(bpp, off); off += 2;
  buf.writeUInt32LE(0, off); off += 4; // compression
  buf.writeUInt32LE(imageSize + totalMaskSize, off); off += 4;
  buf.writeInt32LE(0, off); off += 4; // x ppi
  buf.writeInt32LE(0, off); off += 4; // y ppi
  buf.writeUInt32LE(0, off); off += 4; // colors used
  buf.writeUInt32LE(0, off); off += 4; // important colors

  // Pixel data (BGRA, bottom-up)
  const cx = 7.5, cy = 7.5, r = 6.5;
  for (let row = height - 1; row >= 0; row--) {
    for (let col = 0; col < width; col++) {
      const dx = col - cx, dy = row - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        // Green circle: BGRA
        buf.writeUInt8(0x40, off); off += 1; // B
        buf.writeUInt8(0xD0, off); off += 1; // G
        buf.writeUInt8(0x30, off); off += 1; // R
        buf.writeUInt8(0xFF, off); off += 1; // A
      } else {
        // Transparent
        buf.writeUInt8(0, off); off += 1;
        buf.writeUInt8(0, off); off += 1;
        buf.writeUInt8(0, off); off += 1;
        buf.writeUInt8(0, off); off += 1;
      }
    }
  }

  // AND mask (all zeros = opaque, handled by alpha)
  for (let row = 0; row < height; row++) {
    for (let b = 0; b < maskRowPadded; b++) {
      buf.writeUInt8(0, off); off += 1;
    }
  }

  return buf.toString('base64');
})();

let trayInstance: SysTray | null = null;

export function createTray(opts: {
  onStop: () => void;
  serverUrl: string;
}): SysTray {
  const systray = new SysTray({
    menu: {
      icon: GREEN_ICON_BASE64,
      title: '',
      tooltip: 'Rodion.Pro Activity Tracking',
      items: [
        { title: `Tracking: ${opts.serverUrl}`, enabled: false },
        { title: 'Open Dashboard', enabled: true },
        { title: 'Stop Tracking', enabled: true },
      ],
    },
    copyDir: false,
  });

  systray.onClick(action => {
    switch (action.seq_id) {
      case 1: // Open Dashboard
        exec(`start ${opts.serverUrl}/activity`);
        break;
      case 2: // Stop Tracking
        opts.onStop();
        destroyTray();
        break;
    }
  });

  trayInstance = systray;
  return systray;
}

export function destroyTray() {
  if (trayInstance) {
    try {
      trayInstance.kill(false);
    } catch {
      // ignore errors during shutdown
    }
    trayInstance = null;
  }
}
