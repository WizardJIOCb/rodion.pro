import type { ActivityProject } from './contracts';

function testPattern(value: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(value);
  } catch {
    return false;
  }
}

export function inferProjectFromPath(
  path: string,
  projects: ActivityProject[],
): string | null {
  for (const p of projects) {
    if (p.isActive && p.repoPathPattern && testPattern(path, p.repoPathPattern)) {
      return p.slug;
    }
  }
  return null;
}

export function inferProjectFromRemote(
  remote: string,
  projects: ActivityProject[],
): string | null {
  for (const p of projects) {
    if (p.isActive && p.repoRemotePattern && testPattern(remote, p.repoRemotePattern)) {
      return p.slug;
    }
  }
  return null;
}

export function inferProjectFromDomain(
  domain: string,
  projects: ActivityProject[],
): string | null {
  for (const p of projects) {
    if (p.isActive && p.domainPattern && testPattern(domain, p.domainPattern)) {
      return p.slug;
    }
  }
  return null;
}
