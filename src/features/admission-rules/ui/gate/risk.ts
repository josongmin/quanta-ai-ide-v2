// Composite risk score (Gate page §G3). Modern admission control treats
// "block / warn / allow" as a *threshold over a continuous score*, not a
// hard binary. The score combines:
//
//   severity (block=1.0, warn=0.5, info=0.15)
//   × confidence (exact=1.0, overapprox=0.6, unknown=0.4)
//   × blast (file blast radius normalised to 0..1, default 0.3)
//   × consensus boost (1.4× when 2+ analyzers agree)
//
// The Gate page surfaces the score next to each finding so authors can
// triage by *real* risk, not by which analyzer screams loudest. The same
// score powers G4's counterfactual preview ("if you disabled this rule,
// total risk drops by X").

import type { RuleEvaluation , EvidenceLevel } from '@entities/admission';
import type { FileRecord } from '@entities/repo';
import type { ConsensusFinding } from './consensus';

const SEVERITY_W: Record<'block' | 'warn' | 'info', number> = {
  block: 1.0, warn: 0.5, info: 0.15,
};
const CONFIDENCE_W: Record<EvidenceLevel, number> = {
  exact: 1.0, overapprox: 0.6, unknown: 0.4,
};

export type FindingRisk = {
  /** 0..100 — higher is worse. */
  score: number;
  band: 'low' | 'med' | 'high' | 'critical';
};

export function scoreFinding(args: {
  severity: 'block' | 'warn' | 'info';
  confidence: EvidenceLevel;
  blast: number; // 0..1
  consensus: boolean;
}): FindingRisk {
  const sev  = SEVERITY_W[args.severity];
  const conf = CONFIDENCE_W[args.confidence];
  const blast = Math.max(0, Math.min(1, args.blast));
  const boost = args.consensus ? 1.4 : 1.0;
  const raw = sev * conf * blast * boost;
  const score = Math.min(100, Math.round(raw * 100));
  return { score, band: bandFor(score) };
}

export function bandFor(score: number): FindingRisk['band'] {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'med';
  return 'low';
}

export function bandColor(band: FindingRisk['band']): string {
  switch (band) {
    case 'critical': return 'var(--intent-danger-fg)';
    case 'high':     return 'var(--intent-warn-fg)';
    case 'med':      return 'var(--fg-strong)';
    case 'low':      return 'var(--fg-subtle)';
  }
}

/** Normalise FileRecord blast radius (0..unbounded) to 0..1. We use the
 *  fanIn × pagerank product as a proxy when blast isn't directly on the
 *  metrics; fanIn alone is good enough as a coarse normaliser. */
export function blastFor(file: FileRecord): number {
  const fan = file.metrics.fanIn ?? 0;
  // Empirical: a fanIn of 80 ≈ "very wide", 5 ≈ "leaf".
  return Math.min(1, fan / 80);
}

/** Score every cluster from D, joining FileRecord blast info. */
export function scoreFindings(
  findings: ConsensusFinding[],
  fileById: (id: number) => FileRecord | undefined,
): { finding: ConsensusFinding; risk: FindingRisk }[] {
  return findings.map((f) => {
    const file = fileById(f.fileId);
    const blast = file ? blastFor(file) : 0.3;
    return {
      finding: f,
      risk: scoreFinding({
        severity: f.severity,
        confidence: f.confidence,
        blast,
        consensus: f.consensus,
      }),
    };
  });
}

/** Aggregate risk across the PR — used for the verdict header chip and
 *  the counterfactual preview's baseline. */
export function aggregateRisk(scored: { risk: FindingRisk }[]): number {
  if (scored.length === 0) return 0;
  // Quadratic-mean so a single critical finding dominates a sea of lows.
  const sumSq = scored.reduce((acc, s) => acc + s.risk.score * s.risk.score, 0);
  return Math.round(Math.sqrt(sumSq / scored.length));
}

/** Counterfactual: "if rule X were disabled, what's the new aggregate?". */
export function aggregateRiskWithoutRule(
  fired: RuleEvaluation[],
  ruleId: string,
  fileById: (id: number) => FileRecord | undefined,
): number {
  const remaining = fired.filter((r) => r.ruleId !== ruleId);
  // Reuse cluster + score pipeline.
  const clusters = quickCluster(remaining);
  const scored = scoreFindings(clusters, fileById);
  return aggregateRisk(scored);
}

// Lightweight inline cluster (avoids importing consensus.ts for a single
// inverted call). Same shape, no consensus boost since we only need
// score-aggregate output.
function quickCluster(fired: RuleEvaluation[]): ConsensusFinding[] {
  const by = new Map<number, ConsensusFinding>();
  for (const ev of fired) {
    for (const h of ev.hits) {
      const existing = by.get(h.fileId);
      if (!existing) {
        by.set(h.fileId, {
          fileId: h.fileId,
          hits: [{ evaluation: ev, evidenceText: h.evidenceText, confidence: h.confidence }],
          sources: [ev.source],
          severity: ev.status === 'block' ? 'block' : 'warn',
          confidence: h.confidence,
          consensus: false,
        });
      } else {
        existing.hits.push({ evaluation: ev, evidenceText: h.evidenceText, confidence: h.confidence });
        if (!existing.sources.includes(ev.source)) existing.sources.push(ev.source);
        if (ev.status === 'block') existing.severity = 'block';
        if (h.confidence === 'exact') existing.confidence = 'exact';
        else if (h.confidence === 'overapprox' && existing.confidence !== 'exact') existing.confidence = 'overapprox';
      }
    }
  }
  for (const f of by.values()) f.consensus = f.sources.length >= 2;
  return [...by.values()];
}
