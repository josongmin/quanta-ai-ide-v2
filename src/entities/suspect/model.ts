// Suspect commit + incident traceback model.
//
// Runtime incident model (stack trace, error signature) is intentionally
// kept upstream. This module only describes the *static* side: ranked
// commit candidates, their evidence edges, and the triage/verification
// scaffolding that rides on top.
//
// Naming guard: nothing here should imply blame. The vocabulary is
// "ranking signals", "why ranked", "why not", "confidence" — i.e. the
// surface tells the user *which change has the most explanatory power*,
// not *who screwed up*.

// ─────────────────────────────────────────────────────────────────────────
// Confidence — kept to a 3-tier surface per the plan's UX section.
//   exact            : direct stack frame + symbol overlap (no inference)
//   strong_inferred  : multiple corroborating signals, no stack hit
//   weak_inferred    : one signal only, fallback ranking
// ─────────────────────────────────────────────────────────────────────────

export type SuspectConfidence = 'exact' | 'strong_inferred' | 'weak_inferred';

// ─────────────────────────────────────────────────────────────────────────
// Ranking signals — small enum so the ranking engine and the narrative
// engine can stay decoupled but speak the same language.
// ─────────────────────────────────────────────────────────────────────────

export type SuspectSignalKind =
  | 'symbol_overlap'
  | 'stack_match'
  | 'temporal_proximity'
  | 'incident_history'
  | 'graph_path';

export type SuspectSignal = {
  kind: SuspectSignalKind;
  /** Per-signal weight, 0..1. Aggregated by `aggregateSignalWeight`. */
  weight: number;
  /** Single-line human detail rendered in the "why ranked" bullet list. */
  detail: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Suspect — a single ranked candidate. `whyRanked` and `whyNot` are kept
// pre-rendered so the UI never has to invent prose at render time.
// ─────────────────────────────────────────────────────────────────────────

export type Suspect = {
  id: string;
  commitSha: string;
  prNumber?: number;
  authorId: string;
  /** ISO-8601 timestamp of the commit. */
  createdAt: string;
  confidence: SuspectConfidence;
  /** Suspect symbol (e.g. `validateToken`) when one stands out. */
  suspectSymbol?: string;
  rankingSignals: SuspectSignal[];
  whyRanked: string[];
  whyNot: string[];
};

export type SuspectRanking = {
  incidentId: string;
  /** Top 3, descending by aggregated signal weight. */
  suspects: Suspect[];
  /** ISO-8601 generation time. */
  generatedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────
// EvidenceEdge — graph-shaped evidence used by the issue-to-code overlay.
// Phase 1 only renders these as a sectioned list; Phase 2 will draw graph.
// ─────────────────────────────────────────────────────────────────────────

export type EvidenceEdge = {
  from: { kind: 'incident' | 'symbol' | 'commit'; id: string };
  to: { kind: 'symbol' | 'commit' | 'file'; id: string };
  /** 0..1 — used for visual weighting. */
  weight: number;
  reason: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Triage handoff
// ─────────────────────────────────────────────────────────────────────────

export type TriageAction = 'investigate' | 'patch' | 'rollback' | 'escalate';

type VerificationStep = {
  id: string;
  description: string;
  kind: 'unit_test' | 'integration_test' | 'manual_qa' | 'canary';
  required: boolean;
};

export type VerificationPlan = {
  suspectId: string;
  steps: VerificationStep[];
};
