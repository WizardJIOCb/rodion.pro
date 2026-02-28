import koffi from 'koffi';

// ---- Win32 type definitions ----
const HWND = koffi.pointer('HWND', koffi.opaque());
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const DWORD = koffi.types.uint32;
const UINT = koffi.types.uint32;
const BOOL = koffi.types.int32;

const LASTINPUTINFO = koffi.struct('LASTINPUTINFO', {
  cbSize: UINT,
  dwTime: DWORD,
});

// ---- Load DLLs ----
const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll');

// ---- Function bindings ----
const GetForegroundWindow = user32.func('GetForegroundWindow', HWND, []);
const GetWindowTextLengthW = user32.func('GetWindowTextLengthW', 'int', [HWND]);
const GetWindowTextW = user32.func('GetWindowTextW', 'int', [HWND, koffi.out(koffi.pointer('str16')), 'int']);
const GetWindowThreadProcessId = user32.func('GetWindowThreadProcessId', DWORD, [HWND, koffi.out(koffi.pointer(DWORD))]);
const GetLastInputInfo_ = user32.func('GetLastInputInfo', BOOL, [koffi.inout(koffi.pointer(LASTINPUTINFO))]);
const GetTickCount = kernel32.func('GetTickCount', DWORD, []);

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const OpenProcess = kernel32.func('OpenProcess', HANDLE, [DWORD, BOOL, DWORD]);
const CloseHandle = kernel32.func('CloseHandle', BOOL, [HANDLE]);
const QueryFullProcessImageNameW = kernel32.func('QueryFullProcessImageNameW', BOOL, [
  HANDLE, DWORD, koffi.out(koffi.pointer('str16')), koffi.inout(koffi.pointer(DWORD)),
]);

// ---- Public API ----

export interface ActiveWindowInfo {
  app: string;
  title: string;
  pid: number;
}

export function getForegroundWindowInfo(): ActiveWindowInfo | null {
  const hwnd = GetForegroundWindow();
  if (!hwnd) return null;

  // Window title
  const titleLen = GetWindowTextLengthW(hwnd);
  let title = '';
  if (titleLen > 0) {
    const buf = Buffer.alloc((titleLen + 1) * 2); // UTF-16
    GetWindowTextW(hwnd, buf, titleLen + 1);
    title = buf.toString('utf16le').replace(/\0+$/, '');
  }

  // Process ID
  const pidBuf = Buffer.alloc(4);
  GetWindowThreadProcessId(hwnd, pidBuf);
  const pid = pidBuf.readUInt32LE(0);
  if (pid === 0) return null;

  // Process executable name
  let app = '';
  const hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
  if (hProcess) {
    try {
      const nameBuf = Buffer.alloc(520 * 2); // MAX_PATH * 2 for UTF-16
      const sizeBuf = Buffer.alloc(4);
      sizeBuf.writeUInt32LE(520);
      if (QueryFullProcessImageNameW(hProcess, 0, nameBuf, sizeBuf)) {
        const fullPath = nameBuf.toString('utf16le').replace(/\0+$/, '');
        // Extract just the filename
        const lastSlash = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
        app = lastSlash >= 0 ? fullPath.substring(lastSlash + 1) : fullPath;
      }
    } finally {
      CloseHandle(hProcess);
    }
  }

  // Fallback: if we couldn't get the exe name, return null
  if (!app) return null;

  return { app, title, pid };
}

export function getIdleTimeMs(): number {
  const info = { cbSize: 8, dwTime: 0 };
  const ok = GetLastInputInfo_(info);
  if (!ok) return 0;
  const ticks = GetTickCount();
  // Handle tick count wraparound (every ~49.7 days)
  return ticks >= info.dwTime
    ? ticks - info.dwTime
    : ticks + (0xFFFFFFFF - info.dwTime);
}
