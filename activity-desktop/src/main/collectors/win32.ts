// Win32 native bindings via koffi FFI
// Ported from activity-agent/src/win32.ts for Electron context
import koffi from 'koffi';
import type { ActiveWindowInfo } from '../../shared/types';

// Type aliases
const HWND = koffi.pointer('HWND', koffi.opaque());
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const DWORD = koffi.types.uint32;
const UINT = koffi.types.uint32;
const BOOL = koffi.types.int32;

const LASTINPUTINFO = koffi.struct('LASTINPUTINFO', {
  cbSize: UINT,
  dwTime: DWORD,
});

// DLL bindings
const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');

const GetForegroundWindow = user32.func('GetForegroundWindow', HWND, []);
const GetWindowTextLengthW = user32.func('GetWindowTextLengthW', 'int', [HWND]);
const GetWindowTextW = user32.func('GetWindowTextW', 'int', [HWND, koffi.out(koffi.pointer(koffi.types.uint16)), 'int']);
const GetWindowThreadProcessId = user32.func('GetWindowThreadProcessId', DWORD, [HWND, koffi.out(koffi.pointer(DWORD))]);
const GetLastInputInfo = user32.func('GetLastInputInfo', BOOL, [koffi.inout(koffi.pointer(LASTINPUTINFO))]);
const GetTickCount = kernel32.func('GetTickCount', DWORD, []);
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const OpenProcess = kernel32.func('OpenProcess', HANDLE, [DWORD, BOOL, DWORD]);
const CloseHandle = kernel32.func('CloseHandle', BOOL, [HANDLE]);
const QueryFullProcessImageNameW = kernel32.func('QueryFullProcessImageNameW', BOOL, [HANDLE, DWORD, koffi.out(koffi.pointer(koffi.types.uint16)), koffi.inout(koffi.pointer(DWORD))]);

export function getForegroundWindowInfo(): ActiveWindowInfo | null {
  try {
    const hwnd = GetForegroundWindow();
    if (!hwnd) return null;

    // Get window title
    const titleLen = GetWindowTextLengthW(hwnd);
    let title = '';
    if (titleLen > 0) {
      const buf = Buffer.alloc((titleLen + 1) * 2);
      GetWindowTextW(hwnd, buf, titleLen + 1);
      title = buf.toString('utf16le').replace(/\0+$/, '');
    }

    // Get process ID
    const pidBuf = Buffer.alloc(4);
    GetWindowThreadProcessId(hwnd, pidBuf);
    const pid = pidBuf.readUInt32LE(0);
    if (pid === 0) return null;

    // Get process executable name
    let app = '';
    const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
    if (hProcess) {
      try {
        const nameBuf = Buffer.alloc(520 * 2);
        const sizeBuf = Buffer.alloc(4);
        sizeBuf.writeUInt32LE(520, 0);
        const ok = QueryFullProcessImageNameW(hProcess, 0, nameBuf, sizeBuf);
        if (ok) {
          const fullPath = nameBuf.toString('utf16le').replace(/\0+$/, '');
          const sep = fullPath.lastIndexOf('\\');
          app = sep >= 0 ? fullPath.substring(sep + 1) : fullPath;
        }
      } finally {
        CloseHandle(hProcess);
      }
    }

    if (!app) return null;
    return { app, title, pid };
  } catch {
    return null;
  }
}

export function getIdleTimeMs(): number {
  try {
    const info = { cbSize: 8, dwTime: 0 };
    GetLastInputInfo(info);
    let ticks = GetTickCount();
    if (ticks < info.dwTime) {
      ticks += 0xFFFFFFFF;
    }
    return ticks - info.dwTime;
  } catch {
    return 0;
  }
}
