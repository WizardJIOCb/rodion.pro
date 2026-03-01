const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/, // JWT-like
  /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]/i,
];

export function isSuspicious(s: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(s));
}

export function redactText(s: string): string {
  let out = s;
  out = out.replace(/[A-Za-z0-9+/_-]{32,}/g, (m) => m.slice(0, 6) + '...' + m.slice(-4));
  out = out.replace(/\d{6,}/g, (m) => m.slice(0, 2) + '...' + m.slice(-2));
  return out;
}

export function makePreview(s: string, maxLen = 160): string {
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen - 1) + '...' : oneLine;
}

export function buildPreview(text: string, redact: boolean): string {
  const raw = makePreview(text);
  if (redact || isSuspicious(text)) {
    return redactText(raw);
  }
  return raw;
}
