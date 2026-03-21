import React from 'react';

interface Props {
  active?: boolean;
  color?: string;
  size?: number;
}

export function LivePulse({ active = true, color, size = 8 }: Props) {
  const c = color || (active ? 'var(--success)' : 'var(--error)');
  return (
    <span
      className={active ? 'animate-pulse-dot' : ''}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: c,
        flexShrink: 0,
      }}
    />
  );
}
