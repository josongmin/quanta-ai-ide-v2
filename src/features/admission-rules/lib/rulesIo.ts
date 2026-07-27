import { z } from 'zod';
import type { AdmissionRule } from '@entities/admission';

// ── Import-boundary schema ────────────────────────────────────────────────
// Untrusted import JSON is validated against the FULL AdmissionRule shape
// (incl. the `signal` discriminated union) rather than a spot-check on
// id/name/signal. Mirrors `entities/admission/model.ts`; kept local because the
// entity layer exposes only compile-time types today (no runtime schema). If a
// canonical zod schema is later added there, replace this with an import.
const signalSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('metric'),
    field: z.enum([
      'blastRadius', 'editSafety', 'sastFindings', 'cognitive', 'cyclomatic',
      'loc', 'fanIn', 'fanOut', 'churn', 'lineCoverage', 'maintainability',
      'eslintErrors', 'todoCount',
    ]),
    op: z.enum(['>', '>=', '<', '<=', '=', '!=']),
    value: z.number().refine(Number.isFinite, 'value must be finite'),
  }),
  z.object({
    kind: z.literal('graph'),
    pattern: z.enum([
      'import-cycle', 'public-api-touched', 'public-api-without-test',
      'orphan-edit', 'blast-radius-spike', 'unknown-region-creep',
      'layer-violation',
    ]),
    value: z.number().refine(Number.isFinite, 'value must be finite').optional(),
  }),
  z.object({
    kind: z.literal('taint'),
    source: z.enum(['env', 'http', 'user-input', 'config', 'secret']),
    sink: z.enum(['fs.write', 'exec', 'sql', 'network', 'log']),
    requireSanitizer: z.boolean(),
  }),
  z.object({
    kind: z.literal('dsl'),
    expr: z.string(),
  }),
  z.object({
    kind: z.literal('external'),
    tool: z.enum(['eslint', 'semgrep', 'codeql', 'bandit', 'ruff']),
    ruleId: z.string(),
  }),
]);

const scopeSchema = z.object({
  pathIncludes: z.array(z.string()),
  pathExcludes: z.array(z.string()),
  labels: z.array(z.string()),
});

const overrideSchema = z.object({
  allowAuthor: z.boolean(),
  requiresApproverRole: z.string().nullable(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  source: z.enum(['native', 'eslint', 'semgrep', 'codeql', 'custom']),
  severity: z.enum(['block', 'warn', 'info']),
  enabled: z.boolean(),
  signal: signalSchema,
  scope: scopeSchema,
  appliesTo: z.enum(['workspace', 'repo']).optional(),
  override: overrideSchema,
  evidence: z.enum(['exact', 'overapprox', 'unknown']),
});

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
    // JSON import boundary: each element is untrusted until fully shape-checked
    // against `ruleSchema` (all required fields + signal discriminated union).
    const raw: unknown[] = parsed.rules;
    const incoming: AdmissionRule[] = [];
    for (const r of raw) {
      const result = ruleSchema.safeParse(r);
      if (!result.success) {
        const issue = result.error.issues[0];
        const where = issue?.path.join('.') || '(root)';
        return {
          ok: false,
          error: `Invalid rule ${where}: ${issue?.message ?? 'malformed'} — ${JSON.stringify(r).slice(0, 80)}`,
        };
      }
      incoming.push(result.data);
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
