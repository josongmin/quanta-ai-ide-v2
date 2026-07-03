import { create } from 'zustand';
import {
  freshnessNow,
  SAMPLE_CONFLICTS,
  SAMPLE_SEEDS,
  type CandidateDismissal,
  type ConfidenceScore,
  type CostTelemetry,
  type CritiqueIteration,
  type CycleCost,
  type DeliveryDecision,
  type DismissReason,
  type FixCandidate,
  type FixSeed,
  type Freshness,
  type LoopState,
  type LoopTerminationReason,
  type OpenPrConflict,
  type PartialAcceptance,
  type PermissionLedger,
  type ProofObligation,
  type ReanalysisSnapshot,
  type ReviewerSuggestion,
  type RollbackPackage,
  type SubmissionRecord,
  type ValidationResult,
} from '@entities/fix-pipeline';
import {
  addCost,
  applyPartialAccept,
  blockedRecord,
  buildObligations,
  buildReanalysis,
  buildRollback,
  computeConfidence,
  critiqueAndRepatch,
  currentFailureKey,
  decideSubmissionAction,
  decideTermination,
  decideTier,
  estimateCycleCost,
  INITIAL_LEDGER,
  INITIAL_LOOP,
  markRan,
  recordSuccess,
  simulateGenerate,
  simulateRunValidation,
  submit,
  suggestReviewer,
  summariseObligations,
  toggleHunk,
  unsubmittedRecord,
  ZERO_COST,
} from '../lib/pipelineIntegrations';

// Single store. The whole point of feature 06 is keeping every sub-feature
// in lock-step: candidate / verification / gate / trust-signal / cost /
// loop / permissions / submission / rollback / routing / partial-accept.
// Splitting per-feature would push the coupling into selectors. Features
// own logic; the store wires them.

type GenerationStatus = 'idle' | 'generating' | 'ready' | 'rejected';
type ValidationStatus = 'idle' | 'running' | 'done';

const MOCK_INDEX_AGE_MS = 60 * 60 * 1000;

// Monotonic run tokens guarding the two mocked async flows against stale-
// response races: a delayed await/setTimeout result must not overwrite global
// state after the user changed the seed/candidate. `genRun` guards selectSeed's
// generation; `valRun` guards runValidation. Any selection change bumps the
// relevant token and the async continuation bails when its captured token is no
// longer current. Keyed record-map writes are left unguarded (landing in the
// correct bucket is harmless). Mirrors InvestigationContext's runId guard.
let genRun = 0;
let valRun = 0;

type Store = {
  seeds: FixSeed[];
  selectedSeedId: string | null;
  candidatesBySeed: Record<string, FixCandidate[]>;
  selectedCandidateId: string | null;
  validationByCandidate: Record<string, ValidationResult>;
  confidenceByCandidate: Record<string, ConfidenceScore>;
  decisionByCandidate: Record<string, DeliveryDecision>;
  conflictsByCandidate: Record<string, OpenPrConflict[]>;
  reanalysisByCandidate: Record<string, ReanalysisSnapshot>;
  reviewersByCandidate: Record<string, ReviewerSuggestion>;
  rollbackByCandidate: Record<string, RollbackPackage>;
  submissions: Record<string, SubmissionRecord>;
  critiqueHistory: CritiqueIteration[];
  partialAcceptByCandidate: Record<string, PartialAcceptance>;
  dismissals: CandidateDismissal[];
  generationStatus: GenerationStatus;
  generationError: string | null;
  validationStatus: ValidationStatus;
  cost: CostTelemetry;
  loop: LoopState;
  freshness: Freshness;
  permissions: PermissionLedger;
  prevFailureKey: string | null;

  selectSeed: (seedId: string) => Promise<void>;
  selectCandidate: (candidateId: string) => void;
  runValidation: (candidateId: string) => void;
  dismissCandidate: (candidateId: string, reason: DismissReason, note?: string) => void;
  submitCandidate: (candidateId: string) => void;
  toggleHunkAccept: (candidateId: string, hunkIndex: number) => void;
  reset: () => void;
};

function emptyCost(): CostTelemetry {
  return { cycles: 0, cumulative: ZERO_COST, byCandidate: {} };
}

function recompute(
  candidate: FixCandidate,
  obligations: ProofObligation[],
  permissions: PermissionLedger,
): {
  validation: ValidationResult;
  decision: DeliveryDecision;
  confidence: ConfidenceScore;
} {
  const validation = summariseObligations(candidate.id, obligations);
  const decision = decideTier(candidate, validation, permissions);
  const confidence = computeConfidence(candidate, validation);
  return { validation, decision, confidence };
}

// Build all derived records (validation, gate, confidence, cost, conflicts,
// reanalysis, reviewers, rollback, submission slot) for a fresh candidate
// list. Pulled out so `selectSeed` and the post-critique re-patch path can
// share the same derivation.
function deriveAll(
  seed: FixSeed,
  candidates: FixCandidate[],
  permissions: PermissionLedger,
  baseCumulative: CycleCost,
): {
  validation: Record<string, ValidationResult>;
  confidence: Record<string, ConfidenceScore>;
  decision: Record<string, DeliveryDecision>;
  conflicts: Record<string, OpenPrConflict[]>;
  reanalysis: Record<string, ReanalysisSnapshot>;
  reviewers: Record<string, ReviewerSuggestion>;
  rollback: Record<string, RollbackPackage>;
  submissions: Record<string, SubmissionRecord>;
  byCandidate: Record<string, CycleCost>;
  cumulative: CycleCost;
} {
  const validation: Record<string, ValidationResult> = {};
  const confidence: Record<string, ConfidenceScore> = {};
  const decision: Record<string, DeliveryDecision> = {};
  const conflicts: Record<string, OpenPrConflict[]> = {};
  const reanalysis: Record<string, ReanalysisSnapshot> = {};
  const reviewers: Record<string, ReviewerSuggestion> = {};
  const rollback: Record<string, RollbackPackage> = {};
  const submissions: Record<string, SubmissionRecord> = {};
  const byCandidate: Record<string, CycleCost> = {};
  let cumulative = baseCumulative;

  for (const cand of candidates) {
    const candConflicts = SAMPLE_CONFLICTS[cand.id] ?? [];
    conflicts[cand.id] = candConflicts;
    const obligations = buildObligations(seed, cand, candConflicts);
    const r = recompute(cand, obligations, permissions);
    validation[cand.id] = r.validation;
    confidence[cand.id] = r.confidence;
    decision[cand.id] = r.decision;
    reanalysis[cand.id] = buildReanalysis(seed, cand);
    reviewers[cand.id] = suggestReviewer(seed, cand);
    rollback[cand.id] = buildRollback(cand);
    submissions[cand.id] = unsubmittedRecord(cand.id);
    const c = estimateCycleCost(cand);
    byCandidate[cand.id] = c;
    cumulative = addCost(cumulative, c);
  }

  return {
    validation,
    confidence,
    decision,
    conflicts,
    reanalysis,
    reviewers,
    rollback,
    submissions,
    byCandidate,
    cumulative,
  };
}

export const useFixPipelineStore = create<Store>()((set, get) => ({
  seeds: SAMPLE_SEEDS,
  selectedSeedId: null,
  candidatesBySeed: {},
  selectedCandidateId: null,
  validationByCandidate: {},
  confidenceByCandidate: {},
  decisionByCandidate: {},
  conflictsByCandidate: {},
  reanalysisByCandidate: {},
  reviewersByCandidate: {},
  rollbackByCandidate: {},
  submissions: {},
  critiqueHistory: [],
  partialAcceptByCandidate: {},
  dismissals: [],
  generationStatus: 'idle',
  generationError: null,
  validationStatus: 'idle',
  cost: emptyCost(),
  loop: { ...INITIAL_LOOP },
  freshness: freshnessNow(new Date(Date.now() - MOCK_INDEX_AGE_MS).toISOString()),
  permissions: { ...INITIAL_LEDGER },
  prevFailureKey: null,

  async selectSeed(seedId) {
    const seed = get().seeds.find((s) => s.id === seedId);
    if (!seed) return;
    genRun += 1;
    valRun += 1;
    const myGen = genRun;
    set({
      selectedSeedId: seedId,
      selectedCandidateId: null,
      generationStatus: 'generating',
      generationError: null,
      validationStatus: 'idle',
      loop: { ...INITIAL_LOOP },
      prevFailureKey: null,
    });

    const cached = get().candidatesBySeed[seedId];
    if (cached && cached.length > 0) {
      const recommended = cached.find((c) => c.isRecommended) ?? cached[0];
      set({ selectedCandidateId: recommended.id, generationStatus: 'ready' });
      return;
    }

    const knownIds = new Set<string>();
    for (const c of get().candidatesBySeed[seedId] ?? []) knownIds.add(c.id);
    const seedDismissals = get().dismissals.filter((d) => knownIds.has(d.candidateId));

    let result: Awaited<ReturnType<typeof simulateGenerate>>;
    try {
      result = await simulateGenerate(seed, seedDismissals);
    } catch {
      if (myGen === genRun) {
        set({ generationStatus: 'rejected', generationError: 'candidate generation failed' });
      }
      return;
    }
    // Superseded by a newer seed selection (or reset) while generating — drop.
    if (myGen !== genRun) return;
    if ('kind' in result) {
      set({ generationStatus: 'rejected', generationError: result.reason });
      return;
    }

    const permissions = get().permissions;
    const derived = deriveAll(seed, result, permissions, get().cost.cumulative);
    const recommended = result.find((c) => c.isRecommended) ?? result[0];
    const cycles = get().cost.cycles + result.length;

    set((cur) => ({
      candidatesBySeed: { ...cur.candidatesBySeed, [seedId]: result },
      selectedCandidateId: recommended.id,
      validationByCandidate: { ...cur.validationByCandidate, ...derived.validation },
      confidenceByCandidate: { ...cur.confidenceByCandidate, ...derived.confidence },
      decisionByCandidate: { ...cur.decisionByCandidate, ...derived.decision },
      conflictsByCandidate: { ...cur.conflictsByCandidate, ...derived.conflicts },
      reanalysisByCandidate: { ...cur.reanalysisByCandidate, ...derived.reanalysis },
      reviewersByCandidate: { ...cur.reviewersByCandidate, ...derived.reviewers },
      rollbackByCandidate: { ...cur.rollbackByCandidate, ...derived.rollback },
      submissions: { ...cur.submissions, ...derived.submissions },
      cost: {
        cycles,
        cumulative: derived.cumulative,
        byCandidate: { ...cur.cost.byCandidate, ...derived.byCandidate },
      },
      generationStatus: 'ready',
    }));
  },

  selectCandidate(candidateId) {
    // Switching candidate invalidates any in-flight validation.
    valRun += 1;
    set({ selectedCandidateId: candidateId });
  },

  runValidation(candidateId) {
    const validation = get().validationByCandidate[candidateId];
    if (!validation) return;
    const seedId = get().selectedSeedId;
    if (!seedId) return;
    const seed = get().seeds.find((s) => s.id === seedId);
    if (!seed) return;
    const candidate = get().candidatesBySeed[seedId]?.find((c) => c.id === candidateId);
    if (!candidate) return;

    valRun += 1;
    const myVal = valRun;
    set({ validationStatus: 'running' });
    window.setTimeout(() => {
      // Superseded (seed/candidate switched, or reset) during the mock delay.
      if (myVal !== valRun) return;
      try {
      const next = simulateRunValidation(validation.obligations, candidate);
      const permissions = get().permissions;
      const r = recompute(candidate, next, permissions);

      const ranCost = estimateCycleCost(candidate);
      const newCumulative = addCost(get().cost.cumulative, ranCost);

      const prevKey = get().prevFailureKey;
      const iter = get().loop.iteration + 1;
      const reason: LoopTerminationReason | null = decideTermination({
        iteration: iter,
        cumulative: newCumulative,
        validation: r.validation,
        prevFailureKey: prevKey,
      });

      const prevRea = get().reanalysisByCandidate[candidateId];
      const reanalysisByCandidate = prevRea
        ? { ...get().reanalysisByCandidate, [candidateId]: markRan(prevRea) }
        : get().reanalysisByCandidate;

      const nextPermissions = reason === 'success' ? recordSuccess(permissions) : permissions;
      const finalDecision = nextPermissions === permissions
        ? r.decision
        : decideTier(candidate, r.validation, nextPermissions);

      set((cur) => ({
        validationByCandidate: { ...cur.validationByCandidate, [candidateId]: r.validation },
        confidenceByCandidate: { ...cur.confidenceByCandidate, [candidateId]: r.confidence },
        decisionByCandidate: { ...cur.decisionByCandidate, [candidateId]: finalDecision },
        reanalysisByCandidate,
        validationStatus: 'done',
        cost: {
          cycles: cur.cost.cycles + 1,
          cumulative: newCumulative,
          byCandidate: {
            ...cur.cost.byCandidate,
            [candidateId]: addCost(cur.cost.byCandidate[candidateId] ?? ZERO_COST, ranCost),
          },
        },
        loop: { ...cur.loop, iteration: iter, terminated: reason !== null, reason },
        prevFailureKey: currentFailureKey(r.validation),
        permissions: nextPermissions,
      }));

      // Self-healing loop. If the loop hasn't terminated and obligations
      // are still failing, synthesise a re-patched candidate and append
      // it. The loop bounds (`fix-pipeline-loop`) decided we're allowed
      // to keep going; otherwise we'd be in `terminated`.
      if (reason === null) {
        const result = critiqueAndRepatch({
          prev: candidate,
          validation: r.validation,
          iteration: iter,
        });
        if (result) {
          const list = get().candidatesBySeed[seedId] ?? [];
          const nextList = [...list, result.nextCandidate];
          const derived = deriveAll(
            seed,
            [result.nextCandidate],
            nextPermissions,
            get().cost.cumulative,
          );
          set((cur) => ({
            candidatesBySeed: { ...cur.candidatesBySeed, [seedId]: nextList },
            selectedCandidateId: result.nextCandidate.id,
            validationByCandidate: { ...cur.validationByCandidate, ...derived.validation },
            confidenceByCandidate: { ...cur.confidenceByCandidate, ...derived.confidence },
            decisionByCandidate: { ...cur.decisionByCandidate, ...derived.decision },
            conflictsByCandidate: { ...cur.conflictsByCandidate, ...derived.conflicts },
            reanalysisByCandidate: { ...cur.reanalysisByCandidate, ...derived.reanalysis },
            reviewersByCandidate: { ...cur.reviewersByCandidate, ...derived.reviewers },
            rollbackByCandidate: { ...cur.rollbackByCandidate, ...derived.rollback },
            submissions: { ...cur.submissions, ...derived.submissions },
            cost: {
              cycles: cur.cost.cycles + 1,
              cumulative: derived.cumulative,
              byCandidate: { ...cur.cost.byCandidate, ...derived.byCandidate },
            },
            critiqueHistory: [...cur.critiqueHistory, result.history],
          }));
        }
      }
      } catch {
        // Defensive: never strand validationStatus at 'running' if the mock
        // derivation throws — return to idle so the user can retry.
        if (myVal === valRun) set({ validationStatus: 'idle' });
      }
    }, 700);
  },

  dismissCandidate(candidateId, reason, note) {
    // Dismiss can move the selection; invalidate any in-flight validation.
    valRun += 1;
    const at = new Date().toISOString();
    const seedId = get().selectedSeedId;
    set((cur) => {
      const dismissals: CandidateDismissal[] = [
        ...cur.dismissals,
        { candidateId, reason, note, at },
      ];
      let nextSelected = cur.selectedCandidateId;
      if (cur.selectedCandidateId === candidateId && seedId !== null) {
        const list = cur.candidatesBySeed[seedId] ?? [];
        const dismissedIds = new Set(dismissals.map((d) => d.candidateId));
        nextSelected = list.find((c) => !dismissedIds.has(c.id))?.id ?? null;
      }
      return { dismissals, selectedCandidateId: nextSelected };
    });

    if (seedId !== null) {
      const seed = get().seeds.find((s) => s.id === seedId);
      if (seed) {
        const seedDismissals = get().dismissals.filter((d) => {
          const list = get().candidatesBySeed[seedId] ?? [];
          return list.some((c) => c.id === d.candidateId);
        });
        void simulateGenerate(seed, seedDismissals, 0)
          .then((next) => {
            if ('kind' in next) return;
            set((cur) => ({
              candidatesBySeed: { ...cur.candidatesBySeed, [seedId]: next },
            }));
          })
          .catch(() => { /* mock regeneration failed; keep the existing list */ });
      }
    }
  },

  submitCandidate(candidateId) {
    const decision = get().decisionByCandidate[candidateId];
    const permissions = get().permissions;
    if (!decision) return;
    const action = decideSubmissionAction(decision, permissions);
    if (action.kind === 'blocked') {
      set((cur) => ({
        submissions: {
          ...cur.submissions,
          [candidateId]: blockedRecord(candidateId, action.reason),
        },
      }));
      return;
    }
    set((cur) => ({
      submissions: {
        ...cur.submissions,
        [candidateId]: { ...(cur.submissions[candidateId] ?? unsubmittedRecord(candidateId)), status: 'submitting' },
      },
    }));
    window.setTimeout(() => {
      try {
        const by = action.kind === 'auto-submit' ? 'system' : 'user';
        set((cur) => ({
          submissions: { ...cur.submissions, [candidateId]: submit(candidateId, by) },
        }));
      } catch {
        // Defensive: never strand a submission at 'submitting' — revert so the
        // user can retry.
        set((cur) => ({
          submissions: { ...cur.submissions, [candidateId]: unsubmittedRecord(candidateId) },
        }));
      }
    }, 500);
  },

  toggleHunkAccept(candidateId, hunkIndex) {
    const seedId = get().selectedSeedId;
    if (!seedId) return;
    const candidate = get().candidatesBySeed[seedId]?.find((c) => c.id === candidateId);
    if (!candidate) return;
    const reanalysis = get().reanalysisByCandidate[candidateId];
    if (!reanalysis) return;
    const cur = get().partialAcceptByCandidate[candidateId];
    const nextAccepted = toggleHunk(cur?.acceptedHunkIndices ?? [], hunkIndex);
    const acceptance = applyPartialAccept(candidate, reanalysis, nextAccepted);
    set((s) => ({
      partialAcceptByCandidate: { ...s.partialAcceptByCandidate, [candidateId]: acceptance },
    }));
  },

  reset() {
    genRun += 1;
    valRun += 1;
    set({
      selectedSeedId: null,
      candidatesBySeed: {},
      selectedCandidateId: null,
      validationByCandidate: {},
      confidenceByCandidate: {},
      decisionByCandidate: {},
      conflictsByCandidate: {},
      reanalysisByCandidate: {},
      reviewersByCandidate: {},
      rollbackByCandidate: {},
      submissions: {},
      critiqueHistory: [],
      partialAcceptByCandidate: {},
      dismissals: [],
      generationStatus: 'idle',
      generationError: null,
      validationStatus: 'idle',
      cost: emptyCost(),
      loop: { ...INITIAL_LOOP },
      permissions: { ...INITIAL_LEDGER },
      prevFailureKey: null,
    });
  },
}));
