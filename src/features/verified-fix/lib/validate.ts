// Mock validation engine. Deterministic per (rule, attempt) so demos
// produce the same shape every time — never random.
//
// Pipeline contract (see plan doc, "Validation 실패 시 fallback"):
//
//   1. attempt 1 runs against the candidate as-seeded
//   2. if it fails → self-critique pass adjusts obligations
//   3. attempt 2 runs against the post-critique candidate
//   4. if attempt 2 still fails → human checkpoint (no third attempt)
//
// We model the attempt explicitly because the UI must be able to show
// "what was wrong, what got fixed" rather than overwriting state.

import type { CandidateFix, ProofObligation, ValidationRun } from '../model/types';

// Outcome buckets, picked deterministically by patchKind. Roughly
// matching the plan's decision rule ratios (80/20/5) but resolved here
// per-rule so screenshots are stable.
type Outcome = 'pass-first' | 'pass-after-critique' | 'human-required';

const OUTCOME_BY_KIND: Record<string, Outcome> = {
  // safe deterministic templates → first-attempt pass
  'console-usage': 'pass-first',
  'todo-density':  'pass-first',
  'any-density':   'pass-first',
  // structural concerns → fail then pass after critique
  'edit-safety':   'pass-after-critique',
  'blast-radius':  'pass-after-critique',
  // surface that touches external contract → human checkpoint
  'public-surface': 'human-required',
  'sast':          'human-required',
  'secrets':       'pass-after-critique',
};

// Fallback for kinds not in the table — first-attempt pass.
function outcomeFor(kind: string): Outcome {
  return OUTCOME_BY_KIND[kind] ?? 'pass-first';
}

// Run validation. Returns a finished ValidationRun (synchronous from
// the caller's POV — the store wraps the timing). The store is the
// thing that decides whether to schedule attempt 2.
export function runValidation(
  candidate: CandidateFix,
  attempt: 1 | 2,
  startedAt: number,
  finishedAt: number,
): ValidationRun {
  const outcome = outcomeFor(candidate.patchKind);
  const passing =
    outcome === 'pass-first'
      ? true
      : outcome === 'pass-after-critique'
      ? attempt === 2
      : false;

  const obligations = candidate.obligations.map((o) => resolve(o, outcome, attempt));
  const failingObligationIds = obligations
    .filter((o) => o.status === 'fail' || o.status === 'partial')
    .map((o) => o.id);
  const unknownCount = obligations.filter((o) => o.status === 'unknown').length;

  return {
    candidateId: candidate.id,
    attempt,
    startedAt,
    finishedAt,
    passing,
    obligations,
    unknownCount,
    failingObligationIds,
  };
}

// Resolve a pending obligation to a concrete status. The shape of
// "what becomes pass/fail/unknown" depends on outcome + attempt, but
// the resolution per obligation is fixed for deterministic rendering.
function resolve(
  o: ProofObligation, outcome: Outcome, attempt: 1 | 2,
): ProofObligation {
  if (o.status !== 'pending' && o.status !== 'unknown') return o;

  // public-api: always the toughest. Pass only if outcome allows it.
  if (o.id === 'public-api') {
    return outcome === 'human-required'
      ? { ...o, status: 'fail', detail: 'External consumers depend on the prior signature.' }
      : { ...o, status: 'pass', detail: 'No exported symbol shape changed.' };
  }
  // unknown-bounded: only resolves *after* critique. First attempt
  // surfaces it as the reason validation stalled.
  if (o.id === 'unknown-bounded') {
    if (attempt === 1) return { ...o, status: 'partial', detail: 'Two transitive callers lack tests; critique inserted probes.' };
    return { ...o, status: 'pass', detail: 'Probes added; coverage now spans both untested callers.' };
  }
  // taint baseline: pass for everyone except hard human-required.
  if (o.id === 'taint-no-worse') {
    return outcome === 'human-required'
      ? { ...o, status: 'fail', detail: 'Sanitiser does not cover non-ASCII payloads.' }
      : { ...o, status: 'pass', detail: 'Source→sink path eliminated.' };
  }
  // affected-tests: pass-after-critique fails first attempt
  if (o.id === 'affected-tests') {
    if (outcome === 'pass-after-critique' && attempt === 1) {
      return { ...o, status: 'fail', detail: '2 tests broke; critique adjusted the patch shape.' };
    }
    return { ...o, status: 'pass', detail: 'All affected tests green.' };
  }
  // typecheck: always pass; a failure here would mean the patch is malformed.
  if (o.id === 'static-typecheck') {
    return { ...o, status: 'pass', detail: 'tsc clean.' };
  }
  return { ...o, status: 'pass' };
}

// Apply the self-critique mutation between attempts. We tweak the
// obligation list of the candidate so the second attempt has something
// concrete to show for it. Pure — the store decides when to call this.
export function critique(candidate: CandidateFix): CandidateFix {
  const obligations = candidate.obligations.map((o) =>
    o.status === 'unknown' || o.id === 'unknown-bounded'
      ? { ...o, detail: o.detail + ' (critique inserted coverage probes)' }
      : o,
  );
  return { ...candidate, obligations };
}
