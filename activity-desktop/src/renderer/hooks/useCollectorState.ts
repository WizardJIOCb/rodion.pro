import { useState, useEffect } from 'react';
import type { CollectorState } from '../../shared/types';

const api = window.activityAPI;

export function useCollectorState(): CollectorState | null {
  const [state, setState] = useState<CollectorState | null>(null);

  useEffect(() => {
    api.getState().then(setState);
    const unsub = api.onStateUpdate(setState);
    return unsub;
  }, []);

  return state;
}
