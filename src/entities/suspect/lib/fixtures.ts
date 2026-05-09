// Deterministic mock rankings for the two incidents already used in
// the rest of the demo (see `INCIDENT_BANK` in `entities/pr`):
//
//   INC-842 — ledger double-write on refund retry
//   INC-655 — guard leak in auth rotation
//
// Each ranking is produced by feeding hand-crafted candidates through
// `rankSuspects` + `buildCounterEvidence`, so the surface always matches
// what the runtime engine would emit. That keeps the demo honest:
// changing the ranking heuristics changes what users see, no separately
// curated narrative to drift.

import type {
  Suspect,
  SuspectRanking,
  SuspectSignal,
} from '../model';
import { buildCounterEvidence } from './counterEvidence';
import { rankSuspects } from './ranking';

function whyFromSignals(signals: SuspectSignal[]): string[] {
  return signals
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => s.detail);
}

type Seed = Omit<Suspect, 'whyRanked' | 'whyNot' | 'confidence'> & {
  // confidence is overwritten by `rankSuspects` so callers don't have to
  // hand-stamp it; we still include the field for typing convenience.
  confidence?: Suspect['confidence'];
};

function buildRanking(incidentId: string, seeds: Seed[], generatedAt: string): SuspectRanking {
  // First pass: stamp whyRanked (signals-derived) and an empty whyNot so
  // the shape is a real `Suspect`.
  const draft: Suspect[] = seeds.map((s) => ({
    id: s.id,
    commitSha: s.commitSha,
    prNumber: s.prNumber,
    authorId: s.authorId,
    createdAt: s.createdAt,
    confidence: 'weak_inferred',
    suspectSymbol: s.suspectSymbol,
    rankingSignals: s.rankingSignals,
    whyRanked: whyFromSignals(s.rankingSignals),
    whyNot: [],
  }));

  // Rank — re-stamps confidence from underlying signals.
  const ranked = rankSuspects(draft);

  // Now we know the relative ordering, fill in counter-evidence with the
  // full ranked set as context.
  const withWhyNot: Suspect[] = ranked.map((s) => ({
    ...s,
    whyNot: buildCounterEvidence(s, ranked),
  }));

  return {
    incidentId,
    suspects: withWhyNot.slice(0, 3),
    generatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// INC-842 — ledger double-write on refund retry. Top candidate is the
// refund-retry change with both stack-frame hit and changed-symbol
// overlap; runner-up is a related queue-consumer change; tail is an
// unrelated config bump that is *almost* in the right window.
// ─────────────────────────────────────────────────────────────────────────

const SUSPECTS_842: Seed[] = [
  {
    id: 'sus-842-1',
    commitSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304',
    prNumber: 4821,
    authorId: 'yuna',
    createdAt: '2026-05-08T14:22:00Z',
    suspectSymbol: 'retryRefund',
    rankingSignals: [
      { kind: 'stack_match', weight: 0.45, detail: 'Frame ledger/retry.ts:88 matches changed line.' },
      { kind: 'symbol_overlap', weight: 0.35, detail: 'retryRefund() in changed set; same symbol fails.' },
      { kind: 'temporal_proximity', weight: 0.15, detail: 'Merged 2h before first-seen.' },
    ],
  },
  {
    id: 'sus-842-2',
    commitSha: '5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8',
    prNumber: 4815,
    authorId: 'minjun',
    createdAt: '2026-05-08T09:10:00Z',
    suspectSymbol: 'consumeRefundEvent',
    rankingSignals: [
      { kind: 'symbol_overlap', weight: 0.25, detail: 'Touches consumeRefundEvent() on the same module.' },
      { kind: 'incident_history', weight: 0.2, detail: 'INC-512 also originated in this file.' },
      { kind: 'graph_path', weight: 0.18, detail: 'Two-hop call path to the failing site.' },
    ],
  },
  {
    id: 'sus-842-3',
    commitSha: '0f1e2d3c4b5a69788796a5b4c3d2e1f001234567',
    prNumber: 4809,
    authorId: 'sora',
    createdAt: '2026-05-07T18:42:00Z',
    rankingSignals: [
      { kind: 'temporal_proximity', weight: 0.18, detail: 'Released into prod 20h before first-seen.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// INC-655 — guard leak in auth rotation. Top candidate has stack hit but
// no symbol overlap (auth/session.ts moved a guard); runner-up is the
// session-cache cleanup; tail is a doc-only PR that brushed the file.
// ─────────────────────────────────────────────────────────────────────────

const SUSPECTS_655: Seed[] = [
  {
    id: 'sus-655-1',
    commitSha: 'deadbeef0011223344556677889900aabbccddee',
    prNumber: 4702,
    authorId: 'haeun',
    createdAt: '2026-05-07T11:05:00Z',
    suspectSymbol: 'rotateRefreshToken',
    rankingSignals: [
      { kind: 'stack_match', weight: 0.4, detail: 'Frame auth/session.ts:142 inside changed hunk.' },
      { kind: 'temporal_proximity', weight: 0.2, detail: 'Merged 90m before first-seen.' },
      { kind: 'incident_history', weight: 0.15, detail: 'Same seam as INC-655 historical match.' },
    ],
  },
  {
    id: 'sus-655-2',
    commitSha: 'cafef00dba110011223344556677889900112233',
    prNumber: 4698,
    authorId: 'jiho',
    createdAt: '2026-05-06T22:30:00Z',
    suspectSymbol: 'sessionGuard',
    rankingSignals: [
      { kind: 'symbol_overlap', weight: 0.3, detail: 'sessionGuard() in changed symbols; appears in failure log.' },
      { kind: 'graph_path', weight: 0.2, detail: 'One-hop from rotateRefreshToken().' },
    ],
  },
  {
    id: 'sus-655-3',
    commitSha: '1122334455667788990011223344556677889900',
    prNumber: 4691,
    authorId: 'leo',
    createdAt: '2026-05-05T16:18:00Z',
    rankingSignals: [
      { kind: 'temporal_proximity', weight: 0.1, detail: 'Within the first-seen window.' },
    ],
  },
];

export const MOCK_SUSPECTS: Record<string, SuspectRanking> = {
  'INC-842': buildRanking('INC-842', SUSPECTS_842, '2026-05-08T16:00:00Z'),
  'INC-655': buildRanking('INC-655', SUSPECTS_655, '2026-05-07T13:00:00Z'),
};
