import React, { useState, useEffect, useCallback } from 'react';
import type { LocalMarker } from '../../shared/types';
import { MARKER_PRESETS } from '../../shared/types';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { LivePulse } from '../components/LivePulse';
import { TimeSinceUpdate } from '../components/TimeSinceUpdate';

const api = window.activityAPI;

function todayStr(): string {
  const iso = new Date().toISOString();
  return iso.slice(0, 10);
}

export function MarkersTab() {
  const [markers, setMarkers] = useState<LocalMarker[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [date] = useState(todayStr);
  const sync = useSyncStatus();

  const loadMarkers = useCallback(() => {
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    api.getMarkers(from, to).then(setMarkers);
  }, [date]);

  // Initial load
  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  // Auto-refresh every 10s to pick up sync status changes
  useEffect(() => {
    const id = setInterval(loadMarkers, 10000);
    return () => clearInterval(id);
  }, [loadMarkers]);

  // Also refresh on sync updates (pending -> synced transitions)
  useEffect(() => {
    const unsub = api.onSyncUpdate(() => {
      loadMarkers();
    });
    return unsub;
  }, [loadMarkers]);

  const handleAddMarker = async (type: string, note?: string) => {
    await api.addMarker({ type, note });
    loadMarkers();
  };

  const pendingCount = markers.filter(m => !m.synced).length;
  const syncedCount = markers.filter(m => m.synced).length;

  return (
    <div className="space-y-3">
      {/* Quick markers */}
      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Quick Markers</h2>
        <div className="grid grid-cols-4 gap-2">
          {MARKER_PRESETS.map(preset => (
            <button
              key={preset.type}
              onClick={() => handleAddMarker(preset.type)}
              className="px-2 py-2 text-xs rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom marker */}
      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2">Custom Marker</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder="Note..."
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)]"
            onKeyDown={e => {
              if (e.key === 'Enter' && customNote.trim()) {
                handleAddMarker('custom', customNote.trim());
                setCustomNote('');
              }
            }}
          />
          <button
            onClick={() => {
              if (customNote.trim()) {
                handleAddMarker('custom', customNote.trim());
                setCustomNote('');
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          >
            Add
          </button>
        </div>
      </div>

      {/* Marker history with sync status */}
      <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">Today's Markers</h2>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[var(--success)]">{syncedCount} synced</span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-[var(--warning)]">
                <LivePulse active color="var(--warning)" size={5} />
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
        {markers.length === 0 ? (
          <div className="text-sm text-[var(--text-dim)] text-center py-4">No markers yet</div>
        ) : (
          <div className="space-y-1">
            {markers.map(m => (
              <div key={m.id} className="flex items-center gap-3 text-sm py-1">
                <span className="text-xs text-[var(--text-dim)] w-12 flex-shrink-0">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-medium flex-1 truncate">{m.type}</span>
                {m.note && <span className="text-[var(--text-dim)] truncate max-w-[120px]">{m.note}</span>}
                <span className="flex items-center gap-1 flex-shrink-0">
                  {m.synced ? (
                    <span className="text-[10px] text-[var(--success)]">synced</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--warning)]">
                      <LivePulse active color="var(--warning)" size={4} />
                      syncing...
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync info */}
      {sync && (
        <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <LivePulse active={sync.isOnline} size={6} />
              <span className={sync.isOnline ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                {sync.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-[var(--text-dim)]">
              {sync.queuedCount > 0 && <span>{sync.queuedCount} in queue</span>}
              {sync.lastSyncAt && (
                <span className="ml-2">
                  Last sync: {new Date(sync.lastSyncAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
