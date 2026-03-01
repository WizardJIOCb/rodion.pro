# Qoder: Quick Note Helper (Windows hotkey) + Notes API + UI (single implementation doc)

Цель: сделать фичу “Quick Note” — по хоткею `Ctrl+Alt+N` открывается маленькое окно для ввода заметки, заметка привязывается к текущему активному приложению/категории и сохраняется на сервере, отображается в `/ru/activity`.

Принципы:
- Notes приватные (не должны попадать в public endpoints).
- Полный текст хранить **зашифрованным** (AES-256-GCM), в явном виде хранить только `preview`.
- По умолчанию включена `redact` (маскируем токены/цифры в preview).
- Никаких clipboard auto-capture, только по хоткею и вручную.

---

## 1) Backend: DB + Crypto + API

### 1.1 ENV
Добавить в окружение сервера:
- `ACTIVITY_NOTES_KEY` — base64 ключ 32 байта (AES-256-GCM).
  - пример генерации (локально): 32 random bytes → base64.

### 1.2 DB: таблица activity_notes (Drizzle)
Добавить таблицу `activity_notes` (как отдельную от minute_agg сущность).

**Schema (Drizzle)**
```ts
import { pgTable, text, timestamp, uuid, integer, jsonb, bytea, index } from "drizzle-orm/pg-core";

export const activityNotes = pgTable(
  "activity_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: text("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    app: text("app"), // nullable if categoriesOnly
    category: text("category").notNull().default("unknown"),

    tag: text("tag"),
    title: text("title"),

    preview: text("preview").notNull(), // safe preview (trim+redact)
    len: integer("len").notNull().default(0),

    contentEnc: bytea("content_enc").notNull(), // packed: iv(12)+tag(16)+ciphertext

    meta: jsonb("meta").notNull().default({}), // {source:'hotkey'|'ui', redacted:true,...}
  },
  (t) => ({
    byDeviceCreated: index("activity_notes_device_created_idx").on(t.deviceId, t.createdAt),
    byDeviceAppCreated: index("activity_notes_device_app_created_idx").on(t.deviceId, t.app, t.createdAt),
  })
);

Migration
Сгенерировать и применить миграцию Drizzle.

1.3 Crypto helpers (AES-256-GCM)

Создать src/lib/cryptoNotes.ts

import crypto from "crypto";

function getKey(): Buffer {
  const b64 = process.env.ACTIVITY_NOTES_KEY;
  if (!b64) throw new Error("ACTIVITY_NOTES_KEY is missing");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("ACTIVITY_NOTES_KEY must be 32 bytes (base64)");
  return key;
}

export function encryptNote(plain: string): Buffer {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]); // iv(12)+tag(16)+ciphertext
}

export function decryptNote(packed: Buffer): string {
  const key = getKey();
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
1.4 Sanitize helpers (preview + redaction)

Создать src/lib/noteSanitize.ts

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/, // JWT-like
  /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]/i,
];

export function isSuspicious(s: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(s));
}

export function redactText(s: string): string {
  let out = s;
  out = out.replace(/[A-Za-z0-9+/_-]{32,}/g, (m) => m.slice(0, 6) + "…" + m.slice(-4));
  out = out.replace(/\d{6,}/g, (m) => m.slice(0, 2) + "…" + m.slice(-2));
  return out;
}

export function makePreview(s: string, maxLen = 160): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen - 1) + "…" : oneLine;
}

Policy:

preview всегда makePreview(text) → затем если redact || suspicious → redactText(preview).

полный текст шифруем без редактирования (редактирование только для preview).

2) API: Notes
2.1 POST /api/activity/v1/notes/ingest (device auth)

Файл: src/pages/api/activity/v1/notes/ingest.ts

Request:
Headers:

X-Device-Id

X-Device-Key (как в /api/activity/v1/ingest)

Body:

{
  "sentAt": "ISO",
  "context": { "app": "code.exe", "category": "coding" },
  "note": { "text": "....", "tag": "todo", "title": null, "redact": true, "source": "hotkey" }
}

Validation:

text non-empty

max len 8192 (413)

context.app/category optional

tag/title optional

Implementation:

validate device key (reuse same function as activity ingest)

build preview (makePreview + redact if needed)

encryptNote(text)

insert into activityNotes

Response: 200 { ok:true }

2.2 GET /api/activity/v1/notes (admin auth)

Файл: src/pages/api/activity/v1/notes/index.ts
Query:

deviceId required

from, to optional (ISO)

app, tag optional

limit optional (default 200, max 500)

Return:
array of:
{ id, createdAt, app, category, tag, title, preview, len, meta }

2.3 GET /api/activity/v1/notes/:id (admin auth)

Файл: src/pages/api/activity/v1/notes/[id].ts

GET returns decrypted text + metadata

DELETE removes row

Important:

decrypt only for admin

never include in public endpoints

3) UI: /ru/activity notes widget + manual add
3.1 Client helpers

Create src/lib/activityNotes.ts:

fetchNotes(range, filters)

fetchNote(id) (loads decrypted)

createNote(text, tag, redact) (admin)

deleteNote(id) (admin)

3.2 Component: ActivityNotesWidget

Create src/components/ActivityNotesWidget.tsx (shadcn Card/Badge/Button/Dialog/Textarea):

list latest notes today (limit 20)

each row: time, badge app/category, preview

actions:

View → fetch note(id) and show full text in dialog + Copy button

Delete → confirm and delete

3.3 Integrate into ActivityDashboard

In /ru/activity dashboard (ActivityDashboard.tsx):

fetch notes for today on mount

optionally refetch every 60s

3.4 Manual add from UI

Button “Add note”:

opens dialog with textarea + tag + redact toggle

POST to notes ingest using admin auth

after save: refetch list

4) Windows helper: ActivityNoteHelper (hotkey Ctrl+Alt+N)
4.1 Requirements

Global hotkey configurable (default Ctrl+Alt+N)

Small topmost dialog with textarea and Tag input

Save: POST notes/ingest with device auth

Cancel: Esc

Save shortcut: Ctrl+Enter

Blacklist apps (optional): if foreground app in blacklist → do nothing (or show short toast “Blocked”)

Toast “Saved” after successful send (no MessageBox)

No console window

4.2 Config

Place near exe: activity-note-helper.config.json:

{
  "serverBaseUrl": "http://localhost:4321",
  "deviceId": "pc-main",
  "deviceKey": "YOUR_DEVICE_KEY",
  "hotkey": "Ctrl+Alt+N",
  "redact": true,
  "maxLen": 8192,
  "blacklistApps": ["keepass.exe", "1password.exe"]
}

Also read env overrides:

ACTIVITY_SERVER_BASE_URL, ACTIVITY_DEVICE_ID, ACTIVITY_DEVICE_KEY

ACTIVITY_NOTE_HOTKEY, ACTIVITY_NOTE_REDACT, ACTIVITY_NOTE_MAXLEN

4.3 Project files

Create folder tools/activity-note-helper/

ActivityNoteHelper.csproj
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>false</SelfContained>
    <PublishTrimmed>false</PublishTrimmed>
  </PropertyGroup>
</Project>
Program.cs

Use the baseline helper provided previously, but add:

blacklist check

toast balloon notification “Saved” / “Blocked”

Implementations below.

5) Program.cs additions (Blacklist + Toast)
5.1 Extend config model

Add to HelperConfig:

public List<string> BlacklistApps { get; set; } = new();
5.2 Blacklist check in OnHotkeyAsync()

After var ctx = ForegroundContext.Get();:

var app = (ctx.App ?? "").ToLowerInvariant();
if (_cfg.BlacklistApps.Any(x => app == x.ToLowerInvariant()))
{
    Toast.Show("Activity Note", $"Blocked for {ctx.App}", isError: true);
    return;
}
5.3 Toast helper (NotifyIcon)

Add Toast static class:

static class Toast
{
    private static NotifyIcon? _ni;

    public static void Init()
    {
        _ni = new NotifyIcon
        {
            Visible = true,
            Icon = System.Drawing.SystemIcons.Information,
            Text = "Activity Note Helper"
        };
    }

    public static void Show(string title, string text, bool isError = false)
    {
        if (_ni == null) Init();
        if (_ni == null) return;

        _ni.BalloonTipTitle = title;
        _ni.BalloonTipText = text;
        _ni.BalloonTipIcon = isError ? ToolTipIcon.Error : ToolTipIcon.Info;
        _ni.ShowBalloonTip(1500);
    }
}

Call Toast.Init(); once in Main() before Application.Run(app).

5.4 Use toast after successful send

After await NoteApi.SendAsync(...):

Toast.Show("Activity Note", $"Saved for {ctx.App} ({ctx.Category})");
5.5 Optional: do not show MessageBox on errors

Replace MessageBox in catch with toast:

Toast.Show("Activity Note", ex.Message, isError: true);
6) Build / publish helper

Commands (run in tools/activity-note-helper):

dotnet publish -c Release -r win-x64 /p:PublishSingleFile=true

Result exe:
bin\Release\net8.0-windows\win-x64\publish\ActivityNoteHelper.exe

7) Acceptance Criteria

Press Ctrl+Alt+N → dialog appears, enter note, Ctrl+Enter → toast “Saved”.

Note appears in /ru/activity list within 60s (or immediately after refetch).

Notes list returns only preview; full note returned only via GET /notes/:id (admin).

Notes encrypted in DB (content_enc not readable), only preview plain.

Foreground app in blacklist → note dialog does not open, toast “Blocked”.


Если тебе надо, я могу ещё добавить в этот документ **минимальный шаблон кода** для самого `Program.cs` целиком уже с toast+blacklist (одним файлом), но Qoder и так легко скрестит: это две вставки и один класс.
Дай минимальный шаблон сразу
// Program.cs — minimal single-file template (WinForms, .NET 8)
// Features:
// - Global hotkey (default Ctrl+Alt+N)
// - Topmost note dialog (textarea + tag)
// - Foreground app/process detection
// - Blacklist apps (do nothing + toast)
// - POST to /api/activity/v1/notes/ingest with X-Device-Id / X-Device-Key
// - Toast balloon notifications (Saved / Blocked / Error)

using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Forms;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Toast.Init();

        var cfg = HelperConfig.Load();
        var app = new HiddenHotkeyHost(cfg);
        Application.Run(app);
    }
}

// -------------------- Config --------------------
sealed class HelperConfig
{
    public string ServerBaseUrl { get; set; } = "http://localhost:4321";
    public string DeviceId { get; set; } = "pc-main";
    public string DeviceKey { get; set; } = "CHANGE_ME";
    public string Hotkey { get; set; } = "Ctrl+Alt+N";
    public bool Redact { get; set; } = true;
    public int MaxLen { get; set; } = 8192;
    public List<string> BlacklistApps { get; set; } = new() { "keepass.exe", "1password.exe" };

    public static HelperConfig Load()
    {
        var cfg = new HelperConfig();

        // config.json next to exe
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "activity-note-helper.config.json");
            if (File.Exists(path))
            {
                var json = File.ReadAllText(path, Encoding.UTF8);
                var fromFile = JsonSerializer.Deserialize<HelperConfig>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                if (fromFile != null) cfg = fromFile;
            }
        }
        catch { /* ignore */ }

        cfg.ServerBaseUrl = Env("ACTIVITY_SERVER_BASE_URL", cfg.ServerBaseUrl);
        cfg.DeviceId = Env("ACTIVITY_DEVICE_ID", cfg.DeviceId);
        cfg.DeviceKey = Env("ACTIVITY_DEVICE_KEY", cfg.DeviceKey);
        cfg.Hotkey = Env("ACTIVITY_NOTE_HOTKEY", cfg.Hotkey);
        cfg.Redact = EnvBool("ACTIVITY_NOTE_REDACT", cfg.Redact);
        cfg.MaxLen = EnvInt("ACTIVITY_NOTE_MAXLEN", cfg.MaxLen);

        return cfg;
    }

    private static string Env(string key, string fallback)
        => string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)) ? fallback : Environment.GetEnvironmentVariable(key)!;

    private static bool EnvBool(string key, bool fallback)
    {
        var v = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(v)) return fallback;
        return v.Trim().Equals("true", StringComparison.OrdinalIgnoreCase) || v.Trim().Equals("1");
    }

    private static int EnvInt(string key, int fallback)
    {
        var v = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(v)) return fallback;
        return int.TryParse(v.Trim(), out var x) ? x : fallback;
    }
}

// -------------------- Toast --------------------
static class Toast
{
    private static NotifyIcon? _ni;

    public static void Init()
    {
        if (_ni != null) return;
        _ni = new NotifyIcon
        {
            Visible = true,
            Icon = System.Drawing.SystemIcons.Information,
            Text = "Activity Note Helper"
        };
    }

    public static void Show(string title, string text, bool isError = false)
    {
        if (_ni == null) Init();
        if (_ni == null) return;

        _ni.BalloonTipTitle = title;
        _ni.BalloonTipText = text;
        _ni.BalloonTipIcon = isError ? ToolTipIcon.Error : ToolTipIcon.Info;
        _ni.ShowBalloonTip(1500);
    }
}

// -------------------- Hotkey Host --------------------
sealed class HiddenHotkeyHost : Form
{
    private readonly HelperConfig _cfg;
    private HotkeyDefinition _hotkey;
    private const int HOTKEY_ID = 0xBEEF;

    public HiddenHotkeyHost(HelperConfig cfg)
    {
        _cfg = cfg;
        _hotkey = HotkeyDefinition.Parse(_cfg.Hotkey);

        ShowInTaskbar = false;
        WindowState = FormWindowState.Minimized;
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        Opacity = 0;

        Load += (_, __) =>
        {
            Hide();
            RegisterAppHotkey();
        };

        FormClosing += (_, __) =>
        {
            try { UnregisterHotKey(Handle, HOTKEY_ID); } catch { }
        };
    }

    protected override void WndProc(ref Message m)
    {
        const int WM_HOTKEY = 0x0312;
        if (m.Msg == WM_HOTKEY && m.WParam == (IntPtr)HOTKEY_ID)
        {
            _ = OnHotkeyAsync();
        }
        base.WndProc(ref m);
    }

    private void RegisterAppHotkey()
    {
        var ok = RegisterHotKey(Handle, HOTKEY_ID, _hotkey.Modifiers, _hotkey.KeyCode);
        if (!ok)
        {
            Toast.Show("Activity Note", $"Failed to register hotkey {_cfg.Hotkey} (already used?)", isError: true);
        }
        else
        {
            Toast.Show("Activity Note", $"Hotkey: {_cfg.Hotkey}", isError: false);
        }
    }

    private async Task OnHotkeyAsync()
    {
        try
        {
            var ctx = ForegroundContext.Get();

            // blacklist check
            var app = (ctx.App ?? "").ToLowerInvariant();
            if (_cfg.BlacklistApps.Any(x => app == x.ToLowerInvariant()))
            {
                Toast.Show("Activity Note", $"Blocked for {ctx.App}", isError: true);
                return;
            }

            using var dlg = new NoteDialog(ctx);
            var res = dlg.ShowDialog();
            if (res != DialogResult.OK) return;

            var noteText = dlg.NoteText?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(noteText)) return;

            if (noteText.Length > _cfg.MaxLen)
                noteText = noteText.Substring(0, _cfg.MaxLen);

            if (string.IsNullOrWhiteSpace(_cfg.DeviceKey) || _cfg.DeviceKey == "CHANGE_ME")
            {
                Toast.Show("Activity Note", "DeviceKey is not set. Set ACTIVITY_DEVICE_KEY or config json.", isError: true);
                return;
            }

            var payload = new
            {
                sentAt = DateTimeOffset.UtcNow.ToString("o"),
                context = new
                {
                    app = ctx.App,
                    category = ctx.Category
                },
                note = new
                {
                    text = noteText,
                    tag = dlg.TagText,
                    title = (string?)null,
                    redact = _cfg.Redact,
                    source = "hotkey"
                }
            };

            await NoteApi.SendAsync(_cfg, payload);
            Toast.Show("Activity Note", $"Saved for {ctx.App} ({ctx.Category})");
        }
        catch (Exception ex)
        {
            Toast.Show("Activity Note", ex.Message, isError: true);
        }
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);
}

readonly struct HotkeyDefinition
{
    public uint Modifiers { get; }
    public uint KeyCode { get; }

    private HotkeyDefinition(uint modifiers, uint keyCode)
    {
        Modifiers = modifiers;
        KeyCode = keyCode;
    }

    public static HotkeyDefinition Parse(string s)
    {
        // MOD_ALT=0x0001 MOD_CONTROL=0x0002 MOD_SHIFT=0x0004 MOD_WIN=0x0008
        const uint MOD_ALT = 0x0001;
        const uint MOD_CONTROL = 0x0002;
        const uint MOD_SHIFT = 0x0004;
        const uint MOD_WIN = 0x0008;

        uint mods = 0;
        uint key = 0;

        var parts = s.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var p in parts)
        {
            var t = p.Trim().ToLowerInvariant();
            if (t is "ctrl" or "control") mods |= MOD_CONTROL;
            else if (t is "alt") mods |= MOD_ALT;
            else if (t is "shift") mods |= MOD_SHIFT;
            else if (t is "win" or "windows") mods |= MOD_WIN;
            else key = ParseKey(p);
        }

        if (key == 0) key = (uint)Keys.N;
        return new HotkeyDefinition(mods, key);
    }

    private static uint ParseKey(string token)
    {
        if (Enum.TryParse<Keys>(token, true, out var k)) return (uint)k;
        if (token.Length == 1)
        {
            var c = token[0];
            if (char.IsLetterOrDigit(c)) return (uint)char.ToUpperInvariant(c);
        }
        return 0;
    }
}

// -------------------- Foreground Context --------------------
sealed class ForegroundContext
{
    public string? App { get; init; }
    public string Category { get; init; } = "unknown";

    public static ForegroundContext Get()
    {
        try
        {
            var hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return new ForegroundContext();

            _ = GetWindowThreadProcessId(hwnd, out var pid);
            if (pid == 0) return new ForegroundContext();

            var proc = Process.GetProcessById((int)pid);
            var name = proc.ProcessName; // "code"
            var exe = name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? name : name + ".exe";

            return new ForegroundContext { App = exe, Category = GuessCategory(exe) };
        }
        catch
        {
            return new ForegroundContext();
        }
    }

    private static string GuessCategory(string exe)
    {
        var x = exe.ToLowerInvariant();
        if (x.Contains("code") || x.Contains("idea") || x.Contains("webstorm") || x.Contains("devenv"))
            return "coding";
        if (x.Contains("chrome") || x.Contains("firefox") || x.Contains("edge"))
            return "browser";
        if (x.Contains("telegram") || x.Contains("discord"))
            return "comms";
        if (x.Contains("steam") || x.Contains("game"))
            return "entertainment";
        return "unknown";
    }

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}

// -------------------- Note Dialog --------------------
sealed class NoteDialog : Form
{
    private readonly TextBox _text;
    private readonly TextBox _tag;

    public string NoteText => _text.Text;
    public string? TagText => string.IsNullOrWhiteSpace(_tag.Text) ? null : _tag.Text.Trim();

    public NoteDialog(ForegroundContext ctx)
    {
        Text = "Quick Note";
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        Width = 520;
        Height = 320;
        MinimizeBox = false;
        MaximizeBox = false;
        FormBorderStyle = FormBorderStyle.FixedDialog;

        var panel = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(12),
            ColumnCount = 1,
            RowCount = 5,
        };

        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));         // ctx
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));         // tag
        panel.RowStyles.Add(new RowStyle(SizeType.Percent, 100));     // text
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));         // hint
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));         // buttons

        var ctxLabel = new Label
        {
            AutoSize = true,
            Text = $"For: {(ctx.App ?? "unknown")} ({ctx.Category})"
        };

        var tagRow = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false
        };
        tagRow.Controls.Add(new Label { AutoSize = true, Text = "Tag:" });
        _tag = new TextBox { Width = 160, PlaceholderText = "todo/idea/bug" };
        tagRow.Controls.Add(_tag);

        _text = new TextBox
        {
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            Dock = DockStyle.Fill,
            AcceptsReturn = true,
        };

        var hint = new Label
        {
            AutoSize = true,
            Text = "Ctrl+Enter = Save, Esc = Cancel",
            ForeColor = System.Drawing.Color.DimGray
        };

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.RightToLeft,
            AutoSize = true
        };

        var btnSave = new Button { Text = "Save", DialogResult = DialogResult.OK };
        var btnCancel = new Button { Text = "Cancel", DialogResult = DialogResult.Cancel };
        buttons.Controls.Add(btnSave);
        buttons.Controls.Add(btnCancel);

        panel.Controls.Add(ctxLabel);
        panel.Controls.Add(tagRow);
        panel.Controls.Add(_text);
        panel.Controls.Add(hint);
        panel.Controls.Add(buttons);

        Controls.Add(panel);

        AcceptButton = btnSave;
        CancelButton = btnCancel;

        KeyPreview = true;
        KeyDown += (_, e) =>
        {
            if (e.KeyCode == Keys.Escape)
            {
                DialogResult = DialogResult.Cancel;
                Close();
            }
            if (e.Control && e.KeyCode == Keys.Enter)
            {
                DialogResult = DialogResult.OK;
                Close();
            }
        };

        Shown += (_, __) => _text.Focus();
    }
}

// -------------------- API Client --------------------
static class NoteApi
{
    private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

    public static async Task SendAsync(HelperConfig cfg, object payload)
    {
        var url = cfg.ServerBaseUrl.TrimEnd('/') + "/api/activity/v1/notes/ingest";

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = new StringContent(json, Encoding.UTF8, "application/json");
        req.Headers.Add("X-Device-Id", cfg.DeviceId);
        req.Headers.Add("X-Device-Key", cfg.DeviceKey);

        using var resp = await Http.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            throw new Exception($"Server returned {(int)resp.StatusCode}: {body}");
    }
}