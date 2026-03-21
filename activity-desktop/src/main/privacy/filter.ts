// Privacy filter: applies blacklist rules, title suppression, and category-only mode
// Runs before events are stored locally in SQLite

import type { RawCollectorEvent, FilteredEvent, DesktopConfig } from '../../shared/types';

const PRIVACY_PLACEHOLDER = '[PRIVACY]';

function isBlacklistedApp(app: string, blacklist: string[]): boolean {
  const lower = app.toLowerCase();
  return blacklist.some(b => lower.includes(b.toLowerCase()));
}

function isBlacklistedTitle(title: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      return new RegExp(pattern, 'i').test(title);
    } catch {
      return false;
    }
  });
}

function shouldRedactDomain(title: string, domains: string[]): boolean {
  return domains.some(domain => title.toLowerCase().includes(domain.toLowerCase()));
}

export function applyPrivacyFilter(event: RawCollectorEvent, config: DesktopConfig): FilteredEvent {
  const result: FilteredEvent = {
    ...event,
    originalApp: event.app,
    originalTitle: event.windowTitle,
    wasFiltered: false,
  };

  // Category-only mode: strip all identifying info, keep only category
  if (config['privacy.categoryOnlyMode']) {
    result.app = PRIVACY_PLACEHOLDER;
    result.windowTitle = PRIVACY_PLACEHOLDER;
    result.wasFiltered = true;
    return result;
  }

  // Blacklisted app
  if (isBlacklistedApp(event.app, config['privacy.blacklistApps'])) {
    result.windowTitle = PRIVACY_PLACEHOLDER;
    result.wasFiltered = true;
    return result;
  }

  // Blacklisted title pattern
  if (isBlacklistedTitle(event.windowTitle, config['privacy.blacklistTitlePatterns'])) {
    result.windowTitle = PRIVACY_PLACEHOLDER;
    result.wasFiltered = true;
    return result;
  }

  // Domain redaction
  if (shouldRedactDomain(event.windowTitle, config['privacy.redactDomains'])) {
    result.windowTitle = PRIVACY_PLACEHOLDER;
    result.wasFiltered = true;
    return result;
  }

  // Window title suppression
  if (!config['privacy.sendWindowTitle']) {
    result.windowTitle = '';
    result.wasFiltered = true;
  }

  return result;
}

/**
 * Returns a preview of what the filter would do to the current event,
 * without actually storing anything.
 */
export function previewFilter(event: RawCollectorEvent, config: DesktopConfig): FilteredEvent {
  return applyPrivacyFilter(event, config);
}
