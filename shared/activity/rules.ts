import type { ActivityRule } from './contracts';
import { RuleMatchKind } from './enums';

export interface RuleInput {
  app?: string | null;
  title?: string | null;
  domain?: string | null;
  path?: string | null;
  command?: string | null;
  repo?: string | null;
}

export interface RuleResult {
  projectSlug?: string | null;
  category?: string | null;
  activityType?: string | null;
  confidence: number;
}

function getFieldForSource(input: RuleInput, sourceType: string): string | null {
  switch (sourceType) {
    case 'app': return input.app ?? null;
    case 'title': return input.title ?? null;
    case 'domain': return input.domain ?? null;
    case 'path': return input.path ?? null;
    case 'command': return input.command ?? null;
    case 'repo': return input.repo ?? null;
    default: return null;
  }
}

export function matchRule(rule: ActivityRule, input: RuleInput): boolean {
  const value = getFieldForSource(input, rule.sourceType);
  if (value == null) return false;

  const matchValue = rule.matchValue;
  switch (rule.matchKind) {
    case RuleMatchKind.EQUALS:
      return value.toLowerCase() === matchValue.toLowerCase();
    case RuleMatchKind.CONTAINS:
      return value.toLowerCase().includes(matchValue.toLowerCase());
    case RuleMatchKind.PREFIX:
      return value.toLowerCase().startsWith(matchValue.toLowerCase());
    case RuleMatchKind.REGEX:
      try {
        return new RegExp(matchValue, 'i').test(value);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function applyRules(rules: ActivityRule[], input: RuleInput): RuleResult | null {
  const sorted = [...rules]
    .filter((r) => r.isEnabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (matchRule(rule, input)) {
      return {
        projectSlug: rule.resultProjectSlug,
        category: rule.resultCategory,
        activityType: rule.resultActivityType,
        confidence: rule.confidence,
      };
    }
  }
  return null;
}
