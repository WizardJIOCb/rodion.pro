import React, { useState, useEffect } from 'react';
import { StatusTab } from './tabs/StatusTab';
import { TimelineTab } from './tabs/TimelineTab';
import { MarkersTab } from './tabs/MarkersTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { SettingsTab } from './tabs/SettingsTab';
import { SetupScreen } from './components/SetupScreen';

const api = window.activityAPI;

export const FONT_SCALE_MAP = [75, 83, 91, 100, 108, 116, 125, 133, 141, 150];

type Tab = 'status' | 'timeline' | 'markers' | 'privacy' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'markers', label: 'Markers' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'settings', label: 'Settings' },
];

export function applyFontScale(scale: number) {
  const pct = FONT_SCALE_MAP[Math.max(0, Math.min(9, scale - 1))] ?? 100;
  document.documentElement.style.setProperty('--font-scale', `${pct}%`);
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    api.isConfigured().then(setConfigured);
    // Apply saved font scale on startup
    api.getConfig().then(cfg => applyFontScale(cfg['ui.fontScale']));
  }, []);

  if (configured === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[var(--text-dim)]">Loading...</div>
      </div>
    );
  }

  if (!configured) {
    return <SetupScreen onComplete={() => setConfigured(true)} />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Tab bar */}
      <nav className="flex border-b border-[var(--border)] bg-[var(--bg-card)]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'markers' && <MarkersTab />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
