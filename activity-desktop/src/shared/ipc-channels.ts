// IPC channel name constants
export const IPC = {
  // State queries
  STATE_GET: 'activity:state:get',
  CONFIG_GET: 'activity:config:get',
  CONFIG_UPDATE: 'activity:config:update',
  SYNC_STATUS: 'activity:sync:status',
  SYNC_NOW: 'activity:sync:now',
  SYNC_TEST: 'activity:sync:test',
  TIMELINE_GET: 'activity:timeline:get',
  MARKERS_GET: 'activity:markers:get',
  PRIVACY_PREVIEW: 'activity:privacy:preview',

  // Mutations
  PAUSE: 'activity:pause',
  RESUME: 'activity:resume',
  MARKER_ADD: 'activity:marker:add',
  BLACKLIST_ADD_APP: 'activity:blacklist:add-app',
  BLACKLIST_REMOVE_APP: 'activity:blacklist:remove-app',
  BLACKLIST_ADD_PATTERN: 'activity:blacklist:add-pattern',
  BLACKLIST_REMOVE_PATTERN: 'activity:blacklist:remove-pattern',
  SETUP_DEVICE: 'activity:setup-device',
  IS_CONFIGURED: 'activity:is-configured',

  // Push events (main -> renderer)
  STATE_UPDATED: 'activity:state:updated',
  SYNC_UPDATED: 'activity:sync:updated',
  PAUSE_CHANGED: 'activity:pause:changed',
} as const;
