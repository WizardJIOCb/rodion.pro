// Program.cs — ActivityNoteHelper (WinForms, .NET 8)
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
using System.Text.Json.Serialization;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();

        var cfg = HelperConfig.Load();
        var app = new HiddenHotkeyHost(cfg);
        Toast.Init(cfg, () => app.ReregisterHotkey());
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
                if (fromFile != null)
                {
                    cfg = fromFile;
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Config load error: {ex.Message}");
        }

        // Environment overrides
        cfg.ServerBaseUrl = Environment.GetEnvironmentVariable("ACTIVITY_SERVER_BASE_URL") ?? cfg.ServerBaseUrl;
        cfg.DeviceId = Environment.GetEnvironmentVariable("ACTIVITY_DEVICE_ID") ?? cfg.DeviceId;
        cfg.DeviceKey = Environment.GetEnvironmentVariable("ACTIVITY_DEVICE_KEY") ?? cfg.DeviceKey;
        cfg.Hotkey = Environment.GetEnvironmentVariable("ACTIVITY_NOTE_HOTKEY") ?? cfg.Hotkey;

        if (bool.TryParse(Environment.GetEnvironmentVariable("ACTIVITY_NOTE_REDACT"), out var redact))
            cfg.Redact = redact;

        if (int.TryParse(Environment.GetEnvironmentVariable("ACTIVITY_NOTE_MAXLEN"), out var maxLen))
            cfg.MaxLen = maxLen;

        return cfg;
    }

    public static string GetConfigPath() => Path.Combine(AppContext.BaseDirectory, "activity-note-helper.config.json");

    public void Save()
    {
        try
        {
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            File.WriteAllText(GetConfigPath(), json, Encoding.UTF8);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Config save error: {ex.Message}");
        }
    }
}

// -------------------- Foreground Context --------------------
sealed class ForegroundContext
{
    public string? App { get; init; }
    public string? WindowTitle { get; init; }
    public string Category { get; init; } = "unknown";

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    public static ForegroundContext Get()
    {
        var hwnd = GetForegroundWindow();
        GetWindowThreadProcessId(hwnd, out uint pid);

        string? app = null;
        string? windowTitle = null;
        string category = "unknown";

        try
        {
            var proc = Process.GetProcessById((int)pid);
            app = proc.ProcessName + ".exe";

            var sb = new StringBuilder(512);
            if (GetWindowText(hwnd, sb, sb.Capacity) > 0)
                windowTitle = sb.ToString();

            category = CategorizeApp(app.ToLowerInvariant());
        }
        catch { }

        return new ForegroundContext { App = app, WindowTitle = windowTitle, Category = category };
    }

    static string CategorizeApp(string app)
    {
        if (app.Contains("code") || app.Contains("rider") || app.Contains("idea") ||
            app.Contains("studio") || app.Contains("vim") || app.Contains("sublime"))
            return "coding";

        if (app.Contains("chrome") || app.Contains("firefox") || app.Contains("edge") ||
            app.Contains("brave") || app.Contains("opera"))
            return "browser";

        if (app.Contains("slack") || app.Contains("teams") || app.Contains("discord") ||
            app.Contains("telegram") || app.Contains("whatsapp"))
            return "comms";

        if (app.Contains("explorer") || app.Contains("cmd") || app.Contains("powershell") ||
            app.Contains("terminal"))
            return "system";

        return "other";
    }
}

// -------------------- Note API --------------------
static class NoteApi
{
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public static async Task SendAsync(HelperConfig cfg, ForegroundContext ctx, string text, string? tag)
    {
        var payload = new
        {
            sentAt = DateTime.UtcNow.ToString("o"),
            context = new { app = ctx.App, category = ctx.Category },
            note = new
            {
                text,
                tag,
                title = (string?)null,
                redact = cfg.Redact,
                source = "hotkey"
            }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var request = new HttpRequestMessage(HttpMethod.Post, $"{cfg.ServerBaseUrl}/api/activity/v1/notes/ingest")
        {
            Content = content
        };
        request.Headers.Add("X-Device-Id", cfg.DeviceId);
        request.Headers.Add("X-Device-Key", cfg.DeviceKey);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }
}

// -------------------- Toast --------------------
static class Toast
{
    private static NotifyIcon? _ni;
    private static HelperConfig? _cfg;
    private static Action? _onConfigChanged;

    public static void Init(HelperConfig cfg, Action onConfigChanged)
    {
        _cfg = cfg;
        _onConfigChanged = onConfigChanged;

        var contextMenu = new ContextMenuStrip();
        var settingsItem = new ToolStripMenuItem("Settings", null, (_, _) => ShowSettings());
        var exitItem = new ToolStripMenuItem("Exit", null, (_, _) => Application.Exit());
        contextMenu.Items.Add(settingsItem);
        contextMenu.Items.Add(new ToolStripSeparator());
        contextMenu.Items.Add(exitItem);

        _ni = new NotifyIcon
        {
            Visible = true,
            Icon = SystemIcons.Information,
            Text = "Activity Note Helper",
            ContextMenuStrip = contextMenu
        };
    }

    private static void ShowSettings()
    {
        if (_cfg == null) return;
        using var dlg = new SettingsDialog(_cfg);
        if (dlg.ShowDialog() == DialogResult.OK)
        {
            _onConfigChanged?.Invoke();
        }
    }

    public static void Show(string title, string text, bool isError = false)
    {
        if (_ni == null) return;

        _ni.BalloonTipTitle = title;
        _ni.BalloonTipText = text;
        _ni.BalloonTipIcon = isError ? ToolTipIcon.Error : ToolTipIcon.Info;
        _ni.ShowBalloonTip(1500);
    }

    public static void Dispose()
    {
        if (_ni != null)
        {
            _ni.Visible = false;
            _ni.Dispose();
            _ni = null;
        }
    }
}

// -------------------- Hotkey Host --------------------
sealed class HiddenHotkeyHost : Form
{
    private readonly HelperConfig _cfg;
    private const int WM_HOTKEY = 0x0312;
    private const int HOTKEY_ID = 1;

    [DllImport("user32.dll")]
    static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    public HiddenHotkeyHost(HelperConfig cfg)
    {
        _cfg = cfg;
        ShowInTaskbar = false;
        WindowState = FormWindowState.Minimized;
        FormBorderStyle = FormBorderStyle.None;
        Opacity = 0;

        Load += (_, _) => RegisterCurrentHotkey();

        FormClosing += (_, _) =>
        {
            UnregisterHotKey(Handle, HOTKEY_ID);
            Toast.Dispose();
        };
    }

    private void RegisterCurrentHotkey()
    {
        var (mod, key) = ParseHotkey(_cfg.Hotkey);
        if (!RegisterHotKey(Handle, HOTKEY_ID, mod, key))
        {
            Toast.Show("Activity Note", $"Failed to register hotkey: {_cfg.Hotkey}", isError: true);
        }
    }

    public void ReregisterHotkey()
    {
        UnregisterHotKey(Handle, HOTKEY_ID);
        RegisterCurrentHotkey();
        Toast.Show("Activity Note", $"Hotkey changed to: {_cfg.Hotkey}");
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WM_HOTKEY && m.WParam.ToInt32() == HOTKEY_ID)
        {
            _ = OnHotkeyAsync();
        }
        base.WndProc(ref m);
    }

    private async Task OnHotkeyAsync()
    {
        var ctx = ForegroundContext.Get();

        // Blacklist check
        var app = (ctx.App ?? "").ToLowerInvariant();
        if (_cfg.BlacklistApps.Any(x => app == x.ToLowerInvariant()))
        {
            Toast.Show("Activity Note", $"Blocked for {ctx.App}", isError: true);
            return;
        }

        using var dlg = new NoteDialog(_cfg, ctx);
        if (dlg.ShowDialog() == DialogResult.OK && !string.IsNullOrWhiteSpace(dlg.NoteText))
        {
            try
            {
                await NoteApi.SendAsync(_cfg, ctx, dlg.NoteText, dlg.NoteTag);
                Toast.Show("Activity Note", $"Saved for {ctx.App} ({ctx.Category})");
            }
            catch (Exception ex)
            {
                Toast.Show("Activity Note", ex.Message, isError: true);
            }
        }
    }

    private static (uint mod, uint key) ParseHotkey(string hotkey)
    {
        uint mod = 0;
        uint key = 0;

        var parts = hotkey.Split('+').Select(p => p.Trim().ToLowerInvariant()).ToArray();
        foreach (var p in parts)
        {
            switch (p)
            {
                case "ctrl": case "control": mod |= 0x0002; break;
                case "alt": mod |= 0x0001; break;
                case "shift": mod |= 0x0004; break;
                case "win": mod |= 0x0008; break;
                default:
                    if (p.Length == 1 && char.IsLetter(p[0]))
                        key = (uint)char.ToUpper(p[0]);
                    else if (Enum.TryParse<Keys>(p, true, out var k))
                        key = (uint)k;
                    break;
            }
        }

        return (mod, key);
    }
}

// -------------------- Note Dialog --------------------
sealed class NoteDialog : Form
{
    public string NoteText => _textBox.Text.Trim();
    public string? NoteTag => string.IsNullOrWhiteSpace(_tagBox.Text) ? null : _tagBox.Text.Trim();

    private readonly TextBox _textBox;
    private readonly TextBox _tagBox;
    private readonly HelperConfig _cfg;

    public NoteDialog(HelperConfig cfg, ForegroundContext ctx)
    {
        _cfg = cfg;

        Text = $"Quick Note - {ctx.App ?? "Unknown"}";
        Size = new Size(450, 280);
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = Color.FromArgb(26, 35, 50);
        ForeColor = Color.FromArgb(231, 238, 247);

        var lblContext = new Label
        {
            Text = $"{ctx.Category} | {ctx.WindowTitle?[..Math.Min(ctx.WindowTitle?.Length ?? 0, 50)]}",
            Location = new Point(12, 10),
            Size = new Size(410, 20),
            ForeColor = Color.FromArgb(167, 179, 194),
            Font = new Font("Segoe UI", 9)
        };
        Controls.Add(lblContext);

        _textBox = new TextBox
        {
            Multiline = true,
            Location = new Point(12, 35),
            Size = new Size(410, 130),
            MaxLength = cfg.MaxLen,
            BackColor = Color.FromArgb(10, 15, 22),
            ForeColor = Color.FromArgb(231, 238, 247),
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Consolas", 10),
            ScrollBars = ScrollBars.Vertical
        };
        Controls.Add(_textBox);

        var lblTag = new Label
        {
            Text = "Tag:",
            Location = new Point(12, 175),
            Size = new Size(35, 20),
            ForeColor = Color.FromArgb(167, 179, 194)
        };
        Controls.Add(lblTag);

        _tagBox = new TextBox
        {
            Location = new Point(50, 172),
            Size = new Size(120, 24),
            BackColor = Color.FromArgb(10, 15, 22),
            ForeColor = Color.FromArgb(231, 238, 247),
            BorderStyle = BorderStyle.FixedSingle
        };
        Controls.Add(_tagBox);

        var btnCancel = new Button
        {
            Text = "Cancel",
            Location = new Point(255, 200),
            Size = new Size(80, 30),
            DialogResult = DialogResult.Cancel,
            BackColor = Color.FromArgb(36, 50, 68),
            ForeColor = Color.FromArgb(231, 238, 247),
            FlatStyle = FlatStyle.Flat
        };
        btnCancel.FlatAppearance.BorderColor = Color.FromArgb(36, 50, 68);
        Controls.Add(btnCancel);

        var btnSave = new Button
        {
            Text = "Save (Ctrl+Enter)",
            Location = new Point(342, 200),
            Size = new Size(80, 30),
            DialogResult = DialogResult.OK,
            BackColor = Color.FromArgb(59, 130, 246),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        btnSave.FlatAppearance.BorderColor = Color.FromArgb(59, 130, 246);
        Controls.Add(btnSave);

        AcceptButton = btnSave;
        CancelButton = btnCancel;

        KeyPreview = true;
        KeyDown += (_, e) =>
        {
            if (e.Control && e.KeyCode == Keys.Enter)
            {
                DialogResult = DialogResult.OK;
                Close();
            }
        };

        Shown += (_, _) => _textBox.Focus();
    }
}

// -------------------- Settings Dialog --------------------
sealed class SettingsDialog : Form
{
    private readonly HelperConfig _cfg;
    private readonly TextBox _hotkeyBox;
    private readonly TextBox _serverBox;
    private readonly TextBox _deviceIdBox;
    private readonly TextBox _deviceKeyBox;
    private readonly CheckBox _redactCheck;
    private readonly TextBox _blacklistBox;

    public SettingsDialog(HelperConfig cfg)
    {
        _cfg = cfg;

        Text = "Activity Note Helper - Settings";
        Size = new Size(450, 380);
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = Color.FromArgb(26, 35, 50);
        ForeColor = Color.FromArgb(231, 238, 247);

        int y = 15;
        int labelWidth = 100;
        int inputWidth = 310;

        // Hotkey
        Controls.Add(CreateLabel("Hotkey:", 12, y, labelWidth));
        _hotkeyBox = CreateTextBox(12 + labelWidth, y, inputWidth, cfg.Hotkey);
        Controls.Add(_hotkeyBox);
        y += 35;

        // Server URL
        Controls.Add(CreateLabel("Server URL:", 12, y, labelWidth));
        _serverBox = CreateTextBox(12 + labelWidth, y, inputWidth, cfg.ServerBaseUrl);
        Controls.Add(_serverBox);
        y += 35;

        // Device ID
        Controls.Add(CreateLabel("Device ID:", 12, y, labelWidth));
        _deviceIdBox = CreateTextBox(12 + labelWidth, y, inputWidth, cfg.DeviceId);
        Controls.Add(_deviceIdBox);
        y += 35;

        // Device Key
        Controls.Add(CreateLabel("Device Key:", 12, y, labelWidth));
        _deviceKeyBox = CreateTextBox(12 + labelWidth, y, inputWidth, cfg.DeviceKey);
        _deviceKeyBox.PasswordChar = '*';
        Controls.Add(_deviceKeyBox);
        y += 35;

        // Redact
        _redactCheck = new CheckBox
        {
            Text = "Redact secrets in preview",
            Location = new Point(12 + labelWidth, y),
            Size = new Size(inputWidth, 24),
            Checked = cfg.Redact,
            ForeColor = Color.FromArgb(231, 238, 247)
        };
        Controls.Add(_redactCheck);
        y += 35;

        // Blacklist
        Controls.Add(CreateLabel("Blacklist:", 12, y, labelWidth));
        _blacklistBox = CreateTextBox(12 + labelWidth, y, inputWidth, string.Join(", ", cfg.BlacklistApps));
        Controls.Add(_blacklistBox);
        y += 35;

        // Config path info
        var lblPath = new Label
        {
            Text = $"Config: {HelperConfig.GetConfigPath()}",
            Location = new Point(12, y),
            Size = new Size(410, 20),
            ForeColor = Color.FromArgb(120, 140, 160),
            Font = new Font("Segoe UI", 8)
        };
        Controls.Add(lblPath);
        y += 30;

        // Buttons
        var btnCancel = new Button
        {
            Text = "Cancel",
            Location = new Point(255, y),
            Size = new Size(80, 30),
            DialogResult = DialogResult.Cancel,
            BackColor = Color.FromArgb(36, 50, 68),
            ForeColor = Color.FromArgb(231, 238, 247),
            FlatStyle = FlatStyle.Flat
        };
        btnCancel.FlatAppearance.BorderColor = Color.FromArgb(36, 50, 68);
        Controls.Add(btnCancel);

        var btnSave = new Button
        {
            Text = "Save",
            Location = new Point(342, y),
            Size = new Size(80, 30),
            BackColor = Color.FromArgb(59, 130, 246),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        btnSave.FlatAppearance.BorderColor = Color.FromArgb(59, 130, 246);
        btnSave.Click += (_, _) => SaveAndClose();
        Controls.Add(btnSave);

        CancelButton = btnCancel;
    }

    private Label CreateLabel(string text, int x, int y, int width) => new Label
    {
        Text = text,
        Location = new Point(x, y + 3),
        Size = new Size(width, 20),
        ForeColor = Color.FromArgb(167, 179, 194)
    };

    private TextBox CreateTextBox(int x, int y, int width, string value) => new TextBox
    {
        Location = new Point(x, y),
        Size = new Size(width, 24),
        Text = value,
        BackColor = Color.FromArgb(10, 15, 22),
        ForeColor = Color.FromArgb(231, 238, 247),
        BorderStyle = BorderStyle.FixedSingle
    };

    private void SaveAndClose()
    {
        _cfg.Hotkey = _hotkeyBox.Text.Trim();
        _cfg.ServerBaseUrl = _serverBox.Text.Trim();
        _cfg.DeviceId = _deviceIdBox.Text.Trim();
        _cfg.DeviceKey = _deviceKeyBox.Text.Trim();
        _cfg.Redact = _redactCheck.Checked;
        _cfg.BlacklistApps = _blacklistBox.Text
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        _cfg.Save();
        DialogResult = DialogResult.OK;
        Close();
    }
}
