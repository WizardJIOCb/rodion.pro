import React, { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import type { FilteredEvent } from '../../shared/types';

const api = window.activityAPI;

export function PrivacyTab() {
  const { config, update } = useConfig();
  const [preview, setPreview] = useState<FilteredEvent | null>(null);
  const [newBlacklistApp, setNewBlacklistApp] = useState('');
  const [newBlacklistPattern, setNewBlacklistPattern] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      api.getOutboundPreview().then(setPreview);
    }, 2000);
    api.getOutboundPreview().then(setPreview);
    return () => clearInterval(interval);
  }, []);

  if (!config) return null;

  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Outbound Preview</h2>
        {preview ? (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">App</span>
              <span className={preview.wasFiltered && preview.app === '[PRIVACY]' ? 'text-[var(--warning)]' : ''}>{preview.app}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Title</span>
              <span className={`truncate ml-4 ${preview.wasFiltered ? 'text-[var(--warning)]' : ''}`}>
                {preview.windowTitle || '(empty)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Category</span>
              <span>{preview.category}</span>
            </div>
            {preview.wasFiltered && (
              <div className="text-xs text-[var(--warning)] mt-1">Filtered by privacy rules</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-[var(--text-dim)]">No current activity</div>
        )}
      </div>

      {/* Toggle switches */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)] space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Privacy Settings</h2>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Send window titles</span>
          <input
            type="checkbox"
            checked={config['privacy.sendWindowTitle']}
            onChange={e => update({ 'privacy.sendWindowTitle': e.target.checked })}
            className="w-4 h-4 accent-[var(--accent)]"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Category-only mode</span>
          <input
            type="checkbox"
            checked={config['privacy.categoryOnlyMode']}
            onChange={e => update({ 'privacy.categoryOnlyMode': e.target.checked })}
            className="w-4 h-4 accent-[var(--accent)]"
          />
        </label>
        {config['privacy.categoryOnlyMode'] && (
          <div className="text-xs text-[var(--warning)]">Only category names are recorded; app names and titles are stripped</div>
        )}
      </div>

      {/* Blacklisted apps */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Blacklisted Apps</h2>
        <div className="space-y-1 mb-3">
          {config['privacy.blacklistApps'].map(app => (
            <div key={app} className="flex items-center justify-between text-sm py-1">
              <span>{app}</span>
              <button
                onClick={() => api.removeBlacklistApp(app)}
                className="text-xs text-[var(--error)] hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          {config['privacy.blacklistApps'].length === 0 && (
            <div className="text-xs text-[var(--text-dim)]">No apps blacklisted</div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newBlacklistApp}
            onChange={e => setNewBlacklistApp(e.target.value)}
            placeholder="app.exe"
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)]"
            onKeyDown={e => {
              if (e.key === 'Enter' && newBlacklistApp.trim()) {
                api.addBlacklistApp(newBlacklistApp.trim());
                setNewBlacklistApp('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newBlacklistApp.trim()) {
                api.addBlacklistApp(newBlacklistApp.trim());
                setNewBlacklistApp('');
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-hover)]"
          >
            Add
          </button>
        </div>
      </div>

      {/* Blacklisted title patterns */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Blacklisted Title Patterns</h2>
        <div className="space-y-1 mb-3">
          {config['privacy.blacklistTitlePatterns'].map(pat => (
            <div key={pat} className="flex items-center justify-between text-sm py-1">
              <span className="font-mono text-xs">{pat}</span>
              <button
                onClick={() => api.removeBlacklistPattern(pat)}
                className="text-xs text-[var(--error)] hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          {config['privacy.blacklistTitlePatterns'].length === 0 && (
            <div className="text-xs text-[var(--text-dim)]">No patterns configured</div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newBlacklistPattern}
            onChange={e => setNewBlacklistPattern(e.target.value)}
            placeholder="regex pattern"
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] font-mono placeholder-[var(--text-dim)]"
            onKeyDown={e => {
              if (e.key === 'Enter' && newBlacklistPattern.trim()) {
                api.addBlacklistPattern(newBlacklistPattern.trim());
                setNewBlacklistPattern('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newBlacklistPattern.trim()) {
                api.addBlacklistPattern(newBlacklistPattern.trim());
                setNewBlacklistPattern('');
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-hover)]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
