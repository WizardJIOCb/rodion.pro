import React from 'react';
import type { ActivityBarSegment } from '../../utils/aggregateTimeline';
import { getCategoryColor } from '../../utils/categoryColors';

interface Props {
  segments: ActivityBarSegment[];
}

const HOURS = [0, 4, 8, 12, 16, 20, 24];
const TOTAL_MINUTES = 1440;

export function ActivityBar24h({ segments }: Props) {
  // Collect unique categories for legend
  const categories = [...new Set(segments.map(s => s.category))];

  return (
    <div>
      {/* Bar */}
      <div
        className="relative w-full rounded overflow-hidden"
        style={{ height: 20, background: 'var(--bg)' }}
      >
        {segments.map((seg, i) => {
          const left = (seg.startMinute / TOTAL_MINUTES) * 100;
          const width = ((seg.endMinute - seg.startMinute) / TOTAL_MINUTES) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 activity-bar-segment"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: getCategoryColor(seg.category),
                opacity: Math.min(0.4 + (seg.activeSec / 60) * 0.1, 1),
              }}
              title={`${seg.category} ${Math.floor(seg.startMinute / 60)}:${String(seg.startMinute % 60).padStart(2, '0')} - ${Math.floor(seg.endMinute / 60)}:${String(seg.endMinute % 60).padStart(2, '0')}`}
            />
          );
        })}
      </div>

      {/* Hour labels */}
      <div className="relative w-full" style={{ height: 16 }}>
        {HOURS.map(h => (
          <span
            key={h}
            className="absolute text-[10px] text-[var(--text-dim)]"
            style={{
              left: `${(h / 24) * 100}%`,
              transform: h === 24 ? 'translateX(-100%)' : h === 0 ? 'none' : 'translateX(-50%)',
            }}
          >
            {h === 24 ? '' : `${h}:00`}
          </span>
        ))}
      </div>

      {/* Mini legend */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1 text-[10px] text-[var(--text-dim)]">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: getCategoryColor(cat) }}
              />
              {cat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
