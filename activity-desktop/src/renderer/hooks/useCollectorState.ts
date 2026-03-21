import { useState, useEffect, useCallback } from 'react';
import type { CollectorState } from '../../shared/types';

const api = window.activityAPI;

export function useCollectorState(): { state: CollectorState | null; refresh: () => void } {
  const [state, setState] = useState<CollectorState | null>(null);

  const refresh = useCallback(() => {
    api.getState().then(setState);
  }, []);

  useEffect(() => {
    refresh();
    const unsubState = api.onStateUpdate(setState);
    // Also listen for pause changes to update UI immediately
    const unsubPause = api.onPauseChange(() => {
      refresh();
    });
    return () => {
      unsubState();
      unsubPause();
    };
  }, [refresh]);

  return { state, refresh };
}
