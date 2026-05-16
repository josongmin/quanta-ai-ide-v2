// Provenance timeline (Gate page §C). Synthesises a "what changed when"
// log for the *current* PR — when it was opened, which rules were deployed
// after the PR opened, when each commit was pushed, and how the verdict
// flipped each step. Deterministic per (prSeed, rules) so a refresh shows
// the same history.
//
// In production this would join `git log` × `rule deployment events` ×
// `evaluator runs`. For the demo we fake it from the PR seed so the user
// sees the *shape* of the feature.

import type { AdmissionRule, AdmissionDecision } from '@entities/admission';

export type TimelineEvent = {
  /** ms epoch — most recent at the bottom. */
  at: number;
  kind: 'pr-opened' | 'commit' | 'rule-deployed' | 'rule-fired' | 'override';
  /** Headline that renders large. */
  title: string;
  /** Optional sub-line, fg-muted. */
  detail?: string;
  /** Verdict at this point in time, if known. Lets the row paint a chip. */
  verdict?: 'allow' | 'warn' | 'block';
  /** Which rule, when applicable. */
  ruleId?: string;
};

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function buildTimeline(args: {
  prSeed: number;
  rules: AdmissionRule[];
  decision: AdmissionDecision;
}): TimelineEvent[] {
  const seed = hash(`tl:${String(args.prSeed)}`);
  const now = Date.now();

  // PR opened ~45-180 minutes ago.
  const ageMin = 45 + (seed % 135);
  const opened = now - ageMin * 60_000;

  const events: TimelineEvent[] = [];
  events.push({
    at: opened,
    kind: 'pr-opened',
    title: 'PR opened',
    detail: `seed ${String(args.prSeed)}`,
    verdict: 'allow',
  });

  // 2-4 commits between opened and now, evenly-ish spread.
  const commitCount = 2 + (seed % 3);
  for (let i = 0; i < commitCount; i++) {
    const t = opened + ((i + 1) * (now - opened)) / (commitCount + 1);
    events.push({
      at: t,
      kind: 'commit',
      title: `+${String(2 + ((seed + i) % 8))} commits pushed`,
      detail: `${String(((seed + i * 7) % 50) + 12)} files touched`,
    });
  }

  // Pick up to 2 firing rules to "deploy" mid-PR — surfaces the
  // "rule deployed AFTER my PR opened" anti-pattern that frustrates
  // authors. Choose deterministically from the actually-firing set.
  const firing = args.decision.ruleResults.filter(
    (r) => r.status === 'block' || r.status === 'warn',
  );
  const deployedMid = firing.slice(0, Math.min(2, (seed >> 8) % (firing.length + 1)));
  for (let i = 0; i < deployedMid.length; i++) {
    const r = deployedMid[i];
    if (!r) continue;
    const t = opened + (((i + 1) * (now - opened)) / (deployedMid.length + 1));
    events.push({
      at: t - 300_000,
      kind: 'rule-deployed',
      title: `Rule deployed: ${r.ruleName}`,
      detail: `${r.source} · ${r.severity}`,
      ruleId: r.ruleId,
    });
    events.push({
      at: t,
      kind: 'rule-fired',
      title: `${r.ruleName} fired`,
      detail: r.reason,
      verdict: r.status === 'block' ? 'block' : 'warn',
      ruleId: r.ruleId,
    });
  }

  // Current state.
  events.push({
    at: now,
    kind: 'commit',
    title: 'You are here',
    detail: `${String(args.decision.passingCount)} pass · ${String(args.decision.warningCount)} warn · ${String(args.decision.blockingCount)} block`,
    verdict: args.decision.outcome,
  });

  events.sort((a, b) => a.at - b.at);
  return events;
}

/** "How long has the PR been held?" — minutes of block-state. Used for the
 *  Provenance card's banner ("Held for 12m"). Approximate — counts time
 *  since the FIRST block-or-warn event in the timeline. */
export function heldDurationMs(events: TimelineEvent[], current: 'allow' | 'warn' | 'block'): number {
  if (current === 'allow') return 0;
  const first = events.find((e) => e.verdict === 'block' || e.verdict === 'warn');
  if (!first) return 0;
  return Date.now() - first.at;
}
