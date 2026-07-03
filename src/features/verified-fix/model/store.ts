// Verified-fix pipeline store. Shared across coding-stage and
// review-stage so a candidate seeded by an agent diff turn can be
// picked up by the reviewer surface without prop-drilling.
//
// Lifecycle of a single FixCase:
//
//   seed → drafting → validating(attempt 1)
//        → if pass:    → packaging → ready
//        → if fail:    → critique → validating(attempt 2)
//                        → if pass: → packaging → ready
//                        → if fail: → blocked (human-required)
//
// Validation timing is mocked with setTimeout. We don't care about
// real CI here — the plan says "demo-grade mock that swaps with a real
// rail later", and that's the contract.

import { create } from 'zustand';
import type {
  CandidateFix, DraftPRPackage, FixCase, LoopIteration, LoopStage,
  Seed, ValidationRun,
} from './types';
import { critique, runValidation } from '../lib/validate';
import { FIX_CASES, SEEDS } from './mockData';

const VALIDATE_MS = 1500;

// Demo seed: the MVP screen reads its content from these mock fixtures so
// the surface has something to render before any coding-stage handoff
// happens. Replace with empty objects when wiring real backend.
const initialCases = Object.fromEntries(FIX_CASES.map((c) => [c.id, c]));
const initialSeeds = Object.fromEntries(SEEDS.map((s) => [s.id, s]));

export type PhaseId = 1 | 2 | 3;

// Per-case validation run token + timer handle. Validation is mocked with an
// uncancellable-looking setTimeout, so without a guard a delayed result would
// overwrite state after the user switched candidate/case. bumpValidationRun
// invalidates any in-flight run for a case (and clears its pending timer); the
// timer callback bails if its captured token is no longer current. Mirrors the
// runId/AbortController guard in InvestigationContext.
const validationRun = new Map<string, number>();
const validationTimer = new Map<string, ReturnType<typeof setTimeout>>();

function bumpValidationRun(caseId: string): number {
  const next = (validationRun.get(caseId) ?? 0) + 1;
  validationRun.set(caseId, next);
  const pending = validationTimer.get(caseId);
  if (pending !== undefined) {
    clearTimeout(pending);
    validationTimer.delete(caseId);
  }
  return next;
}

function isCurrentValidationRun(caseId: string, runId: number): boolean {
  return validationRun.get(caseId) === runId;
}

type State = {
  cases: Record<string, FixCase>;
  seeds: Record<string, Seed>;
  // The case the UI is currently focused on. Coding-stage handoff sets
  // this to the most-recently-seeded case so review-stage can show it
  // without a separate notification surface.
  activeCaseId: string | null;
  diffExpanded: boolean;
  phase: PhaseId;

  seed: (seed: Seed, candidates: CandidateFix[]) => string;
  selectCandidate: (caseId: string, candidateId: string) => void;
  dismissCandidate: (caseId: string, candidateId: string) => void;
  startValidation: (caseId: string) => void;
  setActive: (caseId: string | null) => void;
  toggleDiff: () => void;
  setPhase: (phase: PhaseId) => void;
  reset: () => void;
};

export const useVerifiedFixStore = create<State>()((set, get) => ({
  cases: initialCases,
  seeds: initialSeeds,
  activeCaseId: FIX_CASES[0]?.id ?? null,
  diffExpanded: false,
  phase: 1,

  seed: (seed, candidates) => {
    const caseId = `case-${seed.id}`;
    const fixCase: FixCase = {
      id: caseId,
      seedId: seed.id,
      rootCause: seed.suspectedRootCause ?? deriveRootCause(seed),
      loop: {
        iterations: pushIter([], 'investigate', `seeded from ${seed.kind}`),
        currentStage: 'patch',
        maxIterations: 2,
        aborted: false,
      },
      candidates,
      selectedCandidateId: candidates[0]?.id ?? null,
      dismissedCandidateIds: [],
      validations: [],
      draft: null,
    };
    set((s) => ({
      seeds: { ...s.seeds, [seed.id]: seed },
      cases: { ...s.cases, [caseId]: fixCase },
      activeCaseId: caseId,
    }));
    return caseId;
  },

  selectCandidate: (caseId, candidateId) => {
    // Invalidate any in-flight validation for this case — its stale result must
    // not land on the newly-selected candidate.
    bumpValidationRun(caseId);
    set((s) => {
      const c = s.cases[caseId];
      if (!c) return s;
      return {
        ...s,
        cases: {
          ...s.cases,
          [caseId]: {
            ...c,
            selectedCandidateId: candidateId,
            validations: [],
            draft: null,
            // Back to pre-validate so a bailed in-flight validation doesn't
            // leave the loop stuck displaying the 'validate' stage.
            loop: { ...c.loop, currentStage: 'patch' },
          },
        },
      };
    });
  },

  setActive: (id) => { set({ activeCaseId: id, diffExpanded: false }); },

  toggleDiff: () => { set((s) => ({ diffExpanded: !s.diffExpanded })); },

  setPhase: (phase) => { set({ phase }); },

  dismissCandidate: (caseId, candidateId) => {
    // Dismiss can move the selection; invalidate any in-flight validation.
    bumpValidationRun(caseId);
    set((s) => {
      const cur = s.cases[caseId];
      if (!cur) return s;
      const remaining = cur.candidates.filter(
        (c) => c.id !== candidateId && !cur.dismissedCandidateIds.includes(c.id),
      );
      return {
        ...s,
        cases: {
          ...s.cases,
          [caseId]: {
            ...cur,
            dismissedCandidateIds: [...cur.dismissedCandidateIds, candidateId],
            selectedCandidateId: remaining[0]?.id ?? null,
          },
        },
      };
    });
  },

  // Kicks off attempt 1. The store schedules attempt 2 on its own when
  // attempt 1 fails — callers don't manage retries.
  startValidation: (caseId) => {
    const c = get().cases[caseId];
    if (!c) return;
    const candidate = c.candidates.find((x) => x.id === c.selectedCandidateId);
    if (!candidate) return;

    // Fresh run token (also clears any prior pending timer for this case).
    const runId = bumpValidationRun(caseId);

    set((s) => mergeCase(s, caseId, (cur) => ({
      ...cur,
      loop: { ...cur.loop, currentStage: 'validate',
        iterations: pushIter(cur.loop.iterations, 'validate', 'attempt 1: running proofs') },
    })));

    const startedAt = Date.now();
    const timer = setTimeout(() => {
      validationTimer.delete(caseId);
      if (!isCurrentValidationRun(caseId, runId)) return; // superseded → drop
      const finishedAt = Date.now();
      const run = runValidation(candidate, 1, startedAt, finishedAt);
      handleAttempt(get, set, caseId, run, candidate, runId);
    }, VALIDATE_MS);
    validationTimer.set(caseId, timer);
  },

  reset: () => {
    for (const t of validationTimer.values()) clearTimeout(t);
    validationTimer.clear();
    validationRun.clear();
    set({ cases: {}, seeds: {}, activeCaseId: null });
  },
}));

// ─── helpers ────────────────────────────────────────────────────────────

// Apply the result of an attempt and decide what's next: package & ship,
// run a critique loop, or block on human review.
function handleAttempt(
  get: () => State,
  set: (fn: (s: State) => State) => void,
  caseId: string,
  run: ValidationRun,
  candidate: CandidateFix,
  runId: number,
) {
  if (run.passing) {
    const draft = buildDraftPackage(get(), caseId, candidate, run);
    set((s) => mergeCase(s, caseId, (cur) => ({
      ...cur,
      validations: [...cur.validations, run],
      draft,
      loop: {
        ...cur.loop,
        currentStage: 'done',
        iterations: pushIter(cur.loop.iterations, 'package',
          `attempt ${String(run.attempt)} passed → ${draft.gateDecision}`),
      },
    })));
    return;
  }

  // First attempt failed — try a critique pass exactly once.
  if (run.attempt === 1) {
    set((s) => mergeCase(s, caseId, (cur) => ({
      ...cur,
      validations: [...cur.validations, run],
      loop: {
        ...cur.loop,
        currentStage: 'critique',
        iterations: pushIter(cur.loop.iterations, 'critique',
          `attempt 1 failed (${run.failingObligationIds.join(', ')}); patching probes`),
      },
    })));
    // The critique mutates the candidate slightly; we re-run validation
    // against the updated obligations. We don't replace the candidate
    // wholesale because the diff stays the same — the change is in the
    // proof obligations the patch now carries.
    const revised = critique(candidate);
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      validationTimer.delete(caseId);
      if (!isCurrentValidationRun(caseId, runId)) return; // superseded → drop
      const finishedAt = Date.now();
      const run2 = runValidation(revised, 2, startedAt, finishedAt);
      handleAttempt(get, set, caseId, run2, revised, runId);
    }, VALIDATE_MS);
    validationTimer.set(caseId, timer);
    return;
  }

  // Second attempt failed → human checkpoint. The plan is explicit:
  // no third attempt. We surface why it stopped, and we still build a
  // package, but flagged as blocked so the UI routes to manual review.
  const draft = buildDraftPackage(get(), caseId, candidate, run);
  set((s) => mergeCase(s, caseId, (cur) => ({
    ...cur,
    validations: [...cur.validations, run],
    draft,
    loop: {
      ...cur.loop,
      currentStage: 'aborted',
      aborted: true,
      abortReason: 'second attempt still failed; routed to human checkpoint',
      iterations: pushIter(cur.loop.iterations, 'aborted',
        `attempt 2 failed (${run.failingObligationIds.join(', ')})`),
    },
  })));
}

function buildDraftPackage(
  state: State,
  caseId: string,
  candidate: CandidateFix,
  run: ValidationRun,
): DraftPRPackage {
  const c = state.cases[caseId];
  const seed = c ? state.seeds[c.seedId] : undefined;
  const failing = run.failingObligationIds.length;
  const blocked = !run.passing;
  const blockedByApi = candidate.publicApiChange && candidate.tier === 'human-required';

  const gate: DraftPRPackage['gateDecision'] =
    blocked || blockedByApi ? 'blocked'
      : candidate.tier === 'safe-mechanical' && run.unknownCount === 0 ? 'auto-submit'
      : 'needs-review';

  const gateReason =
    gate === 'auto-submit' ? 'Safe-mechanical with no unknowns; eligible for one-click draft.'
      : gate === 'blocked'  ? 'Public-API change or post-critique failure; manual review required.'
      : 'Guarded change with bounded unknowns; reviewer sign-off recommended.';

  return {
    candidateId: candidate.id,
    title: candidate.title,
    summary: seed ? `${seed.title} — ${candidate.diffSummary}` : candidate.diffSummary,
    whyThisFix: candidate.rationale,
    validationSummary: blocked
      ? `${String(failing)} obligation(s) failing after attempt ${String(run.attempt)}.`
      : `Attempt ${String(run.attempt)}: all proofs satisfied; ${String(run.unknownCount)} unknown.`,
    remainingUnknowns: run.obligations
      .filter((o) => o.status === 'unknown' || o.status === 'partial')
      .map((o) => o.label),
    reviewerSuggestion: candidate.publicApiChange ? 'API owner + reviewer-of-record' : 'reviewer-of-record',
    gateDecision: gate,
    gateReason,
  };
}

function pushIter(prev: LoopIteration[], stage: LoopStage, note: string): LoopIteration[] {
  return [...prev, {
    index: prev.length,
    stage,
    note,
    costTokens: stage === 'validate' ? 4200 : stage === 'critique' ? 1800 : 600,
    validationSeconds: stage === 'validate' ? VALIDATE_MS / 1000 : 0,
  }];
}

function mergeCase(
  s: State,
  caseId: string,
  patch: (cur: FixCase) => FixCase,
): State {
  const cur = s.cases[caseId];
  if (!cur) return s;
  return { ...s, cases: { ...s.cases, [caseId]: patch(cur) } };
}

function deriveRootCause(seed: Seed): string {
  return `Inferred from ${seed.kind}: ${seed.symptom}`;
}
