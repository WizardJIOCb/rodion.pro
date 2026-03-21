// Sync worker: queues local events/markers and pushes them to the server
// Configuration: BATCH_SIZE=20, FLUSH_INTERVAL_SEC=30, MAX_RETRIES=5
// Exponential backoff on consecutive failures, 30-day local retention

import axios from 'axios';
import {
  getUnsyncedEvents, markEventsSynced, markEventsFailed,
  resetFailedEvents, getQueuedCount, getFailedCount, purgeOldEvents,
} from '../store/events-repo';
import {
  getUnsyncedMarkers, markMarkersSynced, markMarkersFailed,
} from '../store/markers-repo';
import { getAllConfig } from '../store/config-repo';
import {
  getLastSyncAt, setLastSyncAt, getLastSyncResult, setLastSyncResult,
  getConsecutiveFailures, setConsecutiveFailures, resetConsecutiveFailures,
} from '../store/sync-state-repo';
import type { SyncStatus } from '../../shared/types';

const RETENTION_DAYS = 30;

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let isOnline = true;
let statusCallback: ((status: SyncStatus) => void) | null = null;

export function onSyncUpdate(callback: (status: SyncStatus) => void): void {
  statusCallback = callback;
}

export function getSyncStatus(): SyncStatus {
  const config = getAllConfig();
  return {
    lastSyncAt: getLastSyncAt(),
    lastSyncResult: getLastSyncResult(),
    queuedCount: getQueuedCount(),
    failedCount: getFailedCount(),
    isOnline,
    deviceId: config['server.deviceId'],
    consecutiveFailures: getConsecutiveFailures(),
  };
}

function notifyStatus(): void {
  statusCallback?.(getSyncStatus());
}

async function syncBatch(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const config = getAllConfig();
    const baseUrl = config['server.baseUrl'];
    const deviceId = config['server.deviceId'];
    const deviceKey = config['server.deviceKey'];

    if (!deviceId || !deviceKey) {
      isSyncing = false;
      return;
    }

    const batchSize = config['sync.batchSize']; // 20

    // Sync events
    const events = getUnsyncedEvents(batchSize);
    if (events.length > 0) {
      const artifacts = events.map(e => ({
        artifactType: 'heartbeat',
        occurredAt: e.createdAt,
        sourceApp: e.app,
        title: e.windowTitle,
        payloadJson: JSON.stringify({
          category: e.category,
          isAfk: e.isAfk,
          keys: e.keys,
          clicks: e.clicks,
          scroll: e.scroll,
          dtSec: e.dtSec,
          activeSec: e.activeSec,
          afkSec: e.afkSec,
        }),
        privacyLevel: 'normal',
      }));

      try {
        await axios.post(`${baseUrl}/api/activity/v2/artifacts/batch`, {
          artifacts,
        }, {
          headers: {
            'x-device-id': deviceId,
            'x-device-key': deviceKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });

        const ids = events.map(e => e.id);
        markEventsSynced(ids);
        isOnline = true;
        resetConsecutiveFailures();
      } catch (err) {
        const ids = events.map(e => e.id);
        const errorMsg = err instanceof Error ? err.message : String(err);
        markEventsFailed(ids, errorMsg);
        isOnline = false;
        setConsecutiveFailures(getConsecutiveFailures() + 1);
      }
    }

    // Sync markers
    const markers = getUnsyncedMarkers(batchSize);
    if (markers.length > 0) {
      for (const marker of markers) {
        try {
          await axios.post(`${baseUrl}/api/activity/v2/markers`, {
            markerType: marker.type,
            note: marker.note ?? undefined,
            appContext: marker.appContext ?? undefined,
            categoryContext: marker.categoryContext ?? undefined,
          }, {
            headers: {
              'x-device-id': deviceId,
              'x-device-key': deviceKey,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          });

          markMarkersSynced([marker.id]);
          isOnline = true;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          markMarkersFailed([marker.id], errorMsg);
          isOnline = false;
        }
      }
    }

    // Record sync result
    const syncedAny = events.length > 0 || markers.length > 0;
    if (syncedAny) {
      setLastSyncAt(new Date().toISOString());
      setLastSyncResult(isOnline ? 'ok' : 'partial_failure');
    }

    // Periodically reset failed events for retry
    resetFailedEvents();

    // Purge old synced events (30-day retention)
    purgeOldEvents(RETENTION_DAYS);

    notifyStatus();
  } finally {
    isSyncing = false;
  }
}

function getBackoffMs(): number {
  const failures = getConsecutiveFailures();
  if (failures <= 0) return 0;
  // Exponential backoff: 2^failures * 1000, capped at 5 minutes
  const ms = Math.min(Math.pow(2, failures) * 1000, 300_000);
  return ms;
}

let lastSyncAttempt = 0;

async function scheduledSync(): Promise<void> {
  const backoff = getBackoffMs();
  if (backoff > 0 && Date.now() - lastSyncAttempt < backoff) {
    return; // still in backoff period
  }
  lastSyncAttempt = Date.now();
  await syncBatch();
}

export function startSyncWorker(): void {
  const config = getAllConfig();
  const intervalSec = config['sync.intervalSec']; // 30
  syncInterval = setInterval(() => {
    scheduledSync().catch(err => {
      console.error('[sync-worker] Error:', err);
    });
  }, intervalSec * 1000);

  // Initial sync after short delay
  setTimeout(() => scheduledSync().catch(() => {}), 5000);
}

export function stopSyncWorker(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function syncNow(): Promise<void> {
  lastSyncAttempt = 0; // bypass backoff
  await syncBatch();
}

export async function testConnectivity(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const config = getAllConfig();
  const baseUrl = config['server.baseUrl'];
  const deviceId = config['server.deviceId'];
  const deviceKey = config['server.deviceKey'];

  const start = Date.now();
  try {
    await axios.get(`${baseUrl}/api/activity/v2/timeline`, {
      params: { date: new Date().toISOString().split('T')[0] },
      headers: {
        'x-device-id': deviceId,
        'x-device-key': deviceKey,
      },
      timeout: 10000,
    });
    isOnline = true;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    isOnline = false;
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
