import { useState, useEffect } from 'react';
import type { SyncStatus } from '../../shared/types';

const api = window.activityAPI;

export function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    api.getSyncStatus().then(setStatus);
    const unsub = api.onSyncUpdate(setStatus);
    return unsub;
  }, []);

  return status;
}
