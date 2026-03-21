import React, { useState } from 'react';

const api = window.activityAPI;

interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [baseUrl, setBaseUrl] = useState('https://rodion.pro');
  const [deviceId, setDeviceId] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const handleSetup = async () => {
    if (!deviceId.trim() || !deviceKey.trim()) {
      setError('Device ID and Key are required');
      return;
    }

    setTesting(true);
    setError('');

    try {
      await api.setupDevice({
        baseUrl: baseUrl.trim(),
        deviceId: deviceId.trim(),
        deviceKey: deviceKey.trim(),
      });

      const result = await api.testConnectivity();
      if (result.ok) {
        onComplete();
      } else {
        setError(`Connection failed: ${result.error}. Settings saved anyway.`);
        // Still allow proceeding since config is saved
        setTimeout(onComplete, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-96 bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--border)]">
        <h1 className="text-lg font-bold mb-1">Wizard Tracker</h1>
        <p className="text-sm text-[var(--text-dim)] mb-6">Configure your device to start tracking</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-dim)]">Server URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">Device ID</label>
            <input
              type="text"
              value={deviceId}
              onChange={e => setDeviceId(e.target.value)}
              placeholder="e.g. pc-main"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-dim)] mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">Device Key</label>
            <input
              type="password"
              value={deviceKey}
              onChange={e => setDeviceKey(e.target.value)}
              placeholder="Your device authentication key"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-dim)] mt-1"
            />
            <div className="text-xs text-[var(--text-dim)] mt-1">
              Stored locally only. Never sent to renderer process.
            </div>
          </div>
        </div>

        {error && <div className="text-xs text-[var(--error)] mt-3">{error}</div>}

        <button
          onClick={handleSetup}
          disabled={testing}
          className="w-full mt-4 px-4 py-2.5 text-sm font-medium rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {testing ? 'Testing connection...' : 'Connect'}
        </button>
      </div>
    </div>
  );
}
