import type { AdmissionRule } from '@entities/admission';

// Pure import/export/diff helpers extracted from the admission store so the
// store keeps only state orchestration (SRP). All four functions are
// side-effect-free and independently testable; the store's actions are thin
// wrappers that thread `get().rules` in and apply the result via `set`.

/** Serialize the rule set to the export payload. */
export function serializeRules(rules: AdmissionRule[]): string {
  return JSON.stringify({ version: 1, rules }, null, 2);
}

export type ParseRulesResult =
  | { ok: true; rules: AdmissionRule[] }
  | { ok: false; error: string };

/** Validate + parse an untrusted import JSON string into rules. */
export function parseRulesImport(json: string): ParseRulesResult {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('rules' in parsed) ||
      !Array.isArray(parsed.rules)
    ) {
      return { ok: false, error: 'Expected {"rules": [...]}' };
    }
    // JSON import boundary: each element is untrusted until shape-checked.
    const raw: unknown[] = parsed.rules;
    const incoming: AdmissionRule[] = [];
    for (const r of raw) {
      if (
        !r || typeof r !== 'object' ||
        !('id' in r) || !r.id ||
        !('name' in r) || !r.name ||
        !('signal' in r) || !r.signal
      ) {
        return { ok: false, error: `Invalid rule: ${JSON.stringify(r).slice(0, 80)}` };
      }
      // Shape validated above; the parsed object carries the AdmissionRule fields.
      incoming.push(r as AdmissionRule);
    }
    return { ok: true, rules: incoming };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Merge incoming rules into existing by id (replace-or-append). */
export function mergeRules(existing: AdmissionRule[], incoming: AdmissionRule[]): AdmissionRule[] {
  const merged = [...existing];
  for (const r of incoming) {
    const idx = merged.findIndex((x) => x.id === r.id);
    if (idx >= 0) merged[idx] = r;
    else merged.push(r);
  }
  return merged;
}

/** Human-readable summary of what changed between two revisions of a rule. */
export function diffRuleSummary(prev: AdmissionRule, next: AdmissionRule): string {
  const parts: string[] = [];
  if (prev.severity !== next.severity) parts.push(`severity ${prev.severity}→${next.severity}`);
  if (prev.enabled !== next.enabled) parts.push(next.enabled ? 'enabled' : 'disabled');
  if (prev.name !== next.name) parts.push('renamed');
  // Signal changes
  const ps = JSON.stringify(prev.signal);
  const ns = JSON.stringify(next.signal);
  if (ps !== ns) {
    if (prev.signal.kind === 'metric' && next.signal.kind === 'metric'
        && prev.signal.field === next.signal.field
        && prev.signal.op === next.signal.op) {
      parts.push(`threshold ${prev.signal.value}→${next.signal.value}`);
    } else {
      parts.push('signal updated');
    }
  }
  if (JSON.stringify(prev.scope) !== JSON.stringify(next.scope)) {
    parts.push('scope updated');
  }
  return parts.length === 0 ? 'no-op' : parts.join(' · ');
}
