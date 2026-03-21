import React, { useState, useEffect } from 'react';

interface Props {
  lastTick: string | null;
}

function format(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${remSec}s ago`;
}

export function TimeSinceUpdate({ lastTick }: Props) {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (!lastTick) {
      setElapsed(null);
      return;
    }

    const update = () => setElapsed(Date.now() - new Date(lastTick).getTime());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastTick]);

  if (elapsed === null) {
    return <span className="text-[10px] text-[var(--text-dim)]">waiting...</span>;
  }

  const stale = elapsed > 30000;
  return (
    <span className={`text-[10px] ${stale ? 'text-[var(--warning)]' : 'text-[var(--text-dim)]'}`}>
      {format(elapsed)}
    </span>
  );
}
