import type { PrivacyLevel } from './enums';

const SENSITIVE_PATTERNS = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,           // JWT
  /(?:api[_-]?key|token|secret|password|passwd)\s*[:=]\s*\S+/i,
  /ghp_[A-Za-z0-9]{36}/,                                    // GitHub PAT
  /sk-[A-Za-z0-9]{32,}/,                                    // OpenAI key
  /AKIA[0-9A-Z]{16}/,                                       // AWS access key
];

const REDACT_PARAM_PATTERNS = [
  /--password\s+\S+/gi,
  /--token\s+\S+/gi,
  /token=[^\s&]+/gi,
  /key=[^\s&]+/gi,
  /secret=[^\s&]+/gi,
  /password=[^\s&]+/gi,
  /apikey=[^\s&]+/gi,
  /api_key=[^\s&]+/gi,
  /Bearer\s+\S+/gi,
];

export function isSensitiveContent(text: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

export function redactTitle(title: string): string {
  let result = title;
  // Redact long hex/base64-like strings (32+ chars)
  result = result.replace(/[A-Za-z0-9+/=_-]{32,}/g, '[REDACTED]');
  // Redact long numeric sequences (6+ digits)
  result = result.replace(/\d{6,}/g, '[NUM]');
  return result;
}

export function redactCommand(command: string): string {
  let result = command;
  for (const pattern of REDACT_PARAM_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const eqIdx = match.indexOf('=');
      const spIdx = match.indexOf(' ');
      if (eqIdx !== -1) {
        return match.substring(0, eqIdx + 1) + '[REDACTED]';
      }
      if (spIdx !== -1) {
        return match.substring(0, spIdx + 1) + '[REDACTED]';
      }
      return '[REDACTED]';
    });
  }
  // Truncate very long commands
  if (result.length > 500) {
    result = result.substring(0, 500) + '...[TRUNCATED]';
  }
  return result;
}

export function classifyPrivacyLevel(
  text: string,
  mode: 'full' | 'redacted' | 'category_only',
): PrivacyLevel {
  if (mode === 'category_only') return 'public_safe';
  if (mode === 'redacted' || isSensitiveContent(text)) return 'redacted';
  return 'private';
}
