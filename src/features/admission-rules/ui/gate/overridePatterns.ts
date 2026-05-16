// Override-pattern detection (Gate page §F). Surfaces "this rule is being
// bypassed a lot" — repeated overrides on the same rule (especially by the
// same author) is a signal the rule is noisy or wrong, not that the
// authors are misbehaving. The pattern badge links the user back to
// Calibration where rule precision lives.

import type { OverrideEntry, SuppressionEntry } from '../../model/store';

export type OverridePattern = {
  ruleId: string;
  ruleName: string;
  overrideCount: number;
  suppressionCount: number;
  distinctActors: number;
  /** Most recent ledger entry timestamp. */
  lastAt: number;
  /** Window in ms used for detection (informational). */
  windowMs: number;
};

const WINDOW_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function detectPatterns(
  overrides: OverrideEntry[],
  suppressions: SuppressionEntry[],
): OverridePattern[] {
  const cutoff = Date.now() - WINDOW_MS;
  const byRule = new Map<string, OverridePattern>();

  for (const o of overrides) {
    if (o.at < cutoff) continue;
    const e = byRule.get(o.ruleId) ?? {
      ruleId: o.ruleId,
      ruleName: o.ruleName,
      overrideCount: 0,
      suppressionCount: 0,
      distinctActors: 0,
      lastAt: 0,
      windowMs: WINDOW_MS,
    };
    e.overrideCount += 1;
    e.lastAt = Math.max(e.lastAt, o.at);
    byRule.set(o.ruleId, e);
  }
  for (const s of suppressions) {
    if (s.at < cutoff) continue;
    const e = byRule.get(s.ruleId) ?? {
      ruleId: s.ruleId,
      ruleName: s.ruleName,
      overrideCount: 0,
      suppressionCount: 0,
      distinctActors: 0,
      lastAt: 0,
      windowMs: WINDOW_MS,
    };
    e.suppressionCount += 1;
    e.lastAt = Math.max(e.lastAt, s.at);
    byRule.set(s.ruleId, e);
  }

  // Distinct actor counts
  const actorsByRule = new Map<string, Set<string>>();
  for (const o of overrides) {
    if (o.at < cutoff) continue;
    const set = actorsByRule.get(o.ruleId) ?? new Set<string>();
    set.add(o.actor);
    actorsByRule.set(o.ruleId, set);
  }
  for (const s of suppressions) {
    if (s.at < cutoff) continue;
    const set = actorsByRule.get(s.ruleId) ?? new Set<string>();
    set.add(s.actor);
    actorsByRule.set(s.ruleId, set);
  }
  for (const [ruleId, set] of actorsByRule) {
    const e = byRule.get(ruleId);
    if (e) e.distinctActors = set.size;
  }

  // "Pattern" only worth surfacing when there are 3+ ack events on the
  // same rule in the window — anything less is noise itself.
  return [...byRule.values()]
    .filter((p) => p.overrideCount + p.suppressionCount >= 3)
    .sort((a, b) => (b.overrideCount + b.suppressionCount) - (a.overrideCount + a.suppressionCount));
}
