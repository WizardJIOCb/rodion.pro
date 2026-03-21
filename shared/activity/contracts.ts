import type {
  ActivityCategory,
  ArtifactType,
  ActivityType,
  PrivacyLevel,
  RuleSourceType,
  RuleMatchKind,
  PostDraftTarget,
  PostDraftStyle,
  PostDraftStatus,
} from './enums';

// ── Heartbeat (matches existing v1 ingest payload) ───────────────

export interface ActivityHeartbeat {
  sentAt: string;
  intervalSec: number;
  now: {
    app: string;
    windowTitle: string;
    category: string;
    isAfk: boolean;
  };
  counts: {
    keys: number;
    clicks: number;
    scroll: number;
  };
  durations: {
    dtSec: number;
    activeSec: number;
    afkSec: number;
    idleMs: number;
  };
}

// ── Artifact ─────────────────────────────────────────────────────

export interface ActivityArtifact {
  id?: string;
  occurredAt: string;
  artifactType: ArtifactType;
  projectSlug?: string | null;
  sourceApp?: string | null;
  title?: string | null;
  payload: Record<string, unknown>;
  privacyLevel: PrivacyLevel;
  fingerprint?: string | null;
}

export interface ActivityArtifactBatch {
  deviceId: string;
  artifacts: ActivityArtifact[];
}

// ── Session ──────────────────────────────────────────────────────

export interface ActivitySession {
  id: string;
  deviceId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  projectSlug?: string | null;
  category: ActivityCategory;
  activityType: ActivityType;
  primaryApp: string;
  primaryTitle?: string | null;
  isAfk: boolean;
  keys: number;
  clicks: number;
  scroll: number;
  confidence: number;
}

// ── Project ──────────────────────────────────────────────────────

export interface ActivityProject {
  id?: number;
  slug: string;
  name: string;
  repoPathPattern?: string | null;
  repoRemotePattern?: string | null;
  domainPattern?: string | null;
  branchPattern?: string | null;
  isActive: boolean;
  color?: string | null;
}

// ── Rule ─────────────────────────────────────────────────────────

export interface ActivityRule {
  id?: number;
  priority: number;
  isEnabled: boolean;
  sourceType: RuleSourceType;
  matchKind: RuleMatchKind;
  matchValue: string;
  resultProjectSlug?: string | null;
  resultCategory?: ActivityCategory | null;
  resultActivityType?: ActivityType | null;
  confidence: number;
}

// ── Daily Summary ────────────────────────────────────────────────

export interface DailySummaryFacts {
  date: string;
  totalActiveSec: number;
  projects: Array<{
    slug: string;
    activeSec: number;
    sessions: number;
  }>;
  topApps: Array<{
    app: string;
    activeSec: number;
  }>;
  artifacts: {
    commits: number;
    commands: number;
    deploys: number;
    markers: number;
  };
  notes: string[];
}

// ── Timeline Response ────────────────────────────────────────────

export interface TimelineResponse {
  date: string;
  sessions: ActivitySession[];
  artifacts: ActivityArtifact[];
}

// ── Marker ───────────────────────────────────────────────────────

export interface MarkerInput {
  markerType: string;
  projectSlug?: string | null;
  note?: string | null;
  occurredAt?: string | null;
}
