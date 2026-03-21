import React, { useState, useEffect } from 'react';
import type { LocalMarker } from '../../shared/types';
import { MARKER_PRESETS } from '../../shared/types';

const api = window.activityAPI;

export function MarkersTab() {
  const [markers, setMarkers] = useState<LocalMarker[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [date] = useState(() => new Date().toISOString().split('T')[0]);

  const loadMarkers = () => {
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    api.getMarkers(from, to).then(setMarkers);
  };

  useEffect(() => {
    loadMarkers();
  }, [date]);

  const handleAddMarker = async (type: string, note?: string) => {
    await api.addMarker({ type, note });
    loadMarkers();
  };

  return (
    <div className="space-y-4">
      {/* Quick markers */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Quick Markers</h2>
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
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Custom Marker</h2>
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

      {/* Marker history */}
      <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)] mb-3">Today's Markers</h2>
        {markers.length === 0 ? (
          <div className="text-sm text-[var(--text-dim)] text-center py-4">No markers yet</div>
        ) : (
          <div className="space-y-2">
            {markers.map(m => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-[var(--text-dim)] w-16 flex-shrink-0">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-medium">{m.type}</span>
                {m.note && <span className="text-[var(--text-dim)] truncate">{m.note}</span>}
                <span className={`ml-auto text-xs ${m.synced ? 'text-[var(--success)]' : 'text-[var(--text-dim)]'}`}>
                  {m.synced ? 'synced' : 'pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
