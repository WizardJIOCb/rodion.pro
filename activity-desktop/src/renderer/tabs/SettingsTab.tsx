import React, { useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { applyFontScale, FONT_SCALE_MAP } from '../App';

const api = window.activityAPI;

const SCALE_LABELS = ['Compact', 'Small', '', 'Default', '', '', 'Large', '', '', 'Max'];

export function SettingsTab() {
  const { config, update } = useConfig();
  const sync = useSyncStatus();
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  if (!config) return null;

  const fontScale = config['ui.fontScale'] ?? 5;
  const scalePct = FONT_SCALE_MAP[Math.max(0, Math.min(9, fontScale - 1))] ?? 100;

  const handleFontScaleChange = (value: number) => {
    applyFontScale(value);
    update({ 'ui.fontScale': value });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await api.testConnectivity();
    setTestResult(result);
    setTesting(false);
  };

  const handleSyncNow = async () => {
    await api.syncNow();
  };

  return (
    <div className="space-y-4">
      {/* Interface */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Interface</h2>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--text-dim)]">Font size</label>
            <span className="text-sm font-medium text-[var(--accent)]">
              {fontScale} / 10
              <span className="text-xs text-[var(--text-dim)] ml-1.5">({scalePct}%)</span>
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={fontScale}
            onChange={e => handleFontScaleChange(parseInt(e.target.value))}
            className="w-full accent-[var(--accent)] cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[var(--text-dim)] mt-1">
            <span>A</span>
            <span className="text-base">A</span>
          </div>
        </div>
      </div>

      {/* Server connection */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Server</h2>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-[var(--text-dim)]">Base URL</label>
            <input
              type="text"
              value={config['server.baseUrl']}
              onChange={e => update({ 'server.baseUrl': e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">Device ID</label>
            <input
              type="text"
              value={config['server.deviceId']}
              onChange={e => update({ 'server.deviceId': e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">Device Key</label>
            <input
              type="password"
              value={config['server.deviceKey']}
              disabled
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-dim)] mt-1"
            />
            <div className="text-xs text-[var(--text-dim)] mt-1">Device key cannot be changed from UI for security</div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-xs rounded bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSyncNow}
            className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          >
            Sync Now
          </button>
        </div>

        {testResult && (
          <div className={`mt-2 text-xs ${testResult.ok ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {testResult.ok ? `Connected (${testResult.latencyMs}ms)` : `Failed: ${testResult.error}`}
          </div>
        )}
      </div>

      {/* Collection settings */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Collection</h2>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-[var(--text-dim)]">Poll interval (seconds)</label>
            <input
              type="number"
              value={config['collect.pollIntervalSec']}
              onChange={e => update({ 'collect.pollIntervalSec': parseInt(e.target.value) || 10 })}
              min={5}
              max={60}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">AFK threshold (minutes)</label>
            <input
              type="number"
              value={Math.round(config['collect.afkThresholdMs'] / 60000)}
              onChange={e => update({ 'collect.afkThresholdMs': (parseInt(e.target.value) || 5) * 60000 })}
              min={1}
              max={30}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
        </div>
      </div>

      {/* Sync settings */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Sync</h2>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-[var(--text-dim)]">Batch size</label>
            <input
              type="number"
              value={config['sync.batchSize']}
              onChange={e => update({ 'sync.batchSize': parseInt(e.target.value) || 20 })}
              min={5}
              max={100}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">Sync interval (seconds)</label>
            <input
              type="number"
              value={config['sync.intervalSec']}
              onChange={e => update({ 'sync.intervalSec': parseInt(e.target.value) || 30 })}
              min={10}
              max={300}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] mt-1"
            />
          </div>
        </div>
      </div>

      {/* Sync diagnostics */}
      {sync && (
        <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Diagnostics</h2>
          <div className="space-y-1 text-sm font-mono">
            <div>Device: {sync.deviceId || '(not set)'}</div>
            <div>Queue: {sync.queuedCount} events</div>
            <div>Failed: {sync.failedCount} events</div>
            <div>Consecutive failures: {sync.consecutiveFailures}</div>
            <div>Last sync: {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString() : 'never'}</div>
            <div>Last result: {sync.lastSyncResult ?? 'n/a'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
