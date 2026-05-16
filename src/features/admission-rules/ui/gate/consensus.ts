// Rule consensus / dedupe (Gate page §D). Multiple analyzers (semgrep,
// codeql, native, …) frequently fire on the *same* finding. Showing them
// as separate rows multiplies noise and hides the most useful signal:
// "this finding has 3 sources agreeing, that one has 1".
//
// We cluster by (fileId), then surface the cluster's source-count and a
// composite confidence. In a richer impl we'd cluster by (fileId, line,
// fingerprint) — line/fingerprint info isn't on RuleMatch in the demo, so
// fileId is the natural unit.

import type { RuleEvaluation, RuleSource , EvidenceLevel } from '@entities/admission';

export type ConsensusFinding = {
  fileId: number;
  /** Hits that all landed on this fileId, across rules. */
  hits: { evaluation: RuleEvaluation; evidenceText: string; confidence: EvidenceLevel }[];
  /** Distinct rule sources that agreed. */
  sources: RuleSource[];
  /** Worst severity across hits ('block' wins). */
  severity: 'block' | 'warn' | 'info';
  /** Composite confidence — exact if any source is exact, else worst. */
  confidence: EvidenceLevel;
  /** True when 2+ distinct sources agree (high signal). */
  consensus: boolean;
};

export function clusterByFile(fired: RuleEvaluation[]): ConsensusFinding[] {
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
  for (const f of by.values()) {
    f.consensus = f.sources.length >= 2;
  }
  // Sort: consensus findings first, then severity, then by hit count.
  return [...by.values()].sort((a, b) => {
    if (a.consensus !== b.consensus) return a.consensus ? -1 : 1;
    if (a.severity !== b.severity) {
      const sev = (s: 'block' | 'warn' | 'info') => s === 'block' ? 3 : s === 'warn' ? 2 : 1;
      return sev(b.severity) - sev(a.severity);
    }
    return b.hits.length - a.hits.length;
  });
}

/** Single-source overapprox findings — candidates for AI verifier autotriage. */
export function lowSignalCount(findings: ConsensusFinding[]): number {
  return findings.filter((f) => !f.consensus && f.confidence !== 'exact').length;
}
