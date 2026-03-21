import { useState, useEffect, useCallback } from 'react';
import type { DesktopConfig } from '../../shared/types';

const api = window.activityAPI;

export function useConfig() {
  const [config, setConfig] = useState<DesktopConfig | null>(null);

  const refresh = useCallback(async () => {
    const c = await api.getConfig();
    setConfig(c);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (partial: Partial<DesktopConfig>) => {
    await api.updateConfig(partial);
    await refresh();
  }, [refresh]);

  return { config, update, refresh };
}
