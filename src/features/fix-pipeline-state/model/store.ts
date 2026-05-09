import { create } from 'zustand';
import {
  SAMPLE_SEEDS,
  type CandidateDismissal,
  type ConfidenceScore,
  type DeliveryDecision,
  type DismissReason,
  type FixCandidate,
  type FixSeed,
  type ProofObligation,
  type ValidationResult,
} from '@entities/fix-pipeline';
import { simulateGenerate } from '@features/fix-candidate-generator';
import {
  buildObligations,
  simulateRunValidation,
  summariseObligations,
} from '@features/verification-checklist';
import { decideTier } from '@features/delivery-gate';
import { computeConfidence } from '@features/trust-signal';

// Single store is intentional — the whole point of feature 06 is that
// candidate / verification / gate / trust-signal stay in lock-step. A
// candidate's confidence depends on its validation, which depends on its
// obligations, which depend on the candidate. Splitting into per-feature
// stores would just push the coupling into selectors. The features still
// own the *logic*; the store only wires them together.

type GenerationStatus = 'idle' | 'generating' | 'ready' | 'rejected';
type ValidationStatus = 'idle' | 'running' | 'done';

type Store = {
  seeds: FixSeed[];
  selectedSeedId: string | null;
  candidatesBySeed: Record<string, FixCandidate[]>;
  selectedCandidateId: string | null;
  validationByCandidate: Record<string, ValidationResult>;
  confidenceByCandidate: Record<string, ConfidenceScore>;
  decisionByCandidate: Record<string, DeliveryDecision>;
  dismissals: CandidateDismissal[];
  generationStatus: GenerationStatus;
  generationError: string | null;
  validationStatus: ValidationStatus;

  selectSeed: (seedId: string) => Promise<void>;
  selectCandidate: (candidateId: string) => void;
  runValidation: (candidateId: string) => void;
  dismissCandidate: (candidateId: string, reason: DismissReason, note?: string) => void;
  reset: () => void;
};

function recompute(
  candidate: FixCandidate,
  obligations: ProofObligation[],
): {
  validation: ValidationResult;
  decision: DeliveryDecision;
  confidence: ConfidenceScore;
} {
  const validation = summariseObligations(candidate.id, obligations);
  const decision = decideTier(candidate, validation);
  const confidence = computeConfidence(candidate, validation);
  return { validation, decision, confidence };
}

export const useFixPipelineStore = create<Store>()((set, get) => ({
  seeds: SAMPLE_SEEDS,
  selectedSeedId: null,
  candidatesBySeed: {},
  selectedCandidateId: null,
  validationByCandidate: {},
  confidenceByCandidate: {},
  decisionByCandidate: {},
  dismissals: [],
  generationStatus: 'idle',
  generationError: null,
  validationStatus: 'idle',

  async selectSeed(seedId) {
    const seed = get().seeds.find((s) => s.id === seedId);
    if (!seed) return;
    set({
      selectedSeedId: seedId,
      selectedCandidateId: null,
      generationStatus: 'generating',
      generationError: null,
      validationStatus: 'idle',
    });

    // Cache hit — no need to regenerate, but still flip to ready so UI
    // pulls from the existing slot.
    const cached = get().candidatesBySeed[seedId];
    if (cached && cached.length > 0) {
      const recommended = cached.find((c) => c.isRecommended) ?? cached[0];
      set({
        selectedCandidateId: recommended.id,
        generationStatus: 'ready',
      });
      return;
    }

    const result = await simulateGenerate(seed);
    if ('kind' in result) {
      set({
        generationStatus: 'rejected',
        generationError: result.reason,
      });
      return;
    }

    // Build derived state for every candidate up front. Cheaper than
    // lazy-derivation inside selectors and keeps the snapshot consistent.
    const validation: Record<string, ValidationResult> = {};
    const confidence: Record<string, ConfidenceScore> = {};
    const decision: Record<string, DeliveryDecision> = {};
    for (const cand of result) {
      const obligations = buildObligations(seed, cand);
      const r = recompute(cand, obligations);
      validation[cand.id] = r.validation;
      confidence[cand.id] = r.confidence;
      decision[cand.id] = r.decision;
    }

    const recommended = result.find((c) => c.isRecommended) ?? result[0];
    set((cur) => ({
      candidatesBySeed: { ...cur.candidatesBySeed, [seedId]: result },
      selectedCandidateId: recommended.id,
      validationByCandidate: { ...cur.validationByCandidate, ...validation },
      confidenceByCandidate: { ...cur.confidenceByCandidate, ...confidence },
      decisionByCandidate: { ...cur.decisionByCandidate, ...decision },
      generationStatus: 'ready',
    }));
  },

  selectCandidate(candidateId) {
    set({ selectedCandidateId: candidateId });
  },

  runValidation(candidateId) {
    const validation = get().validationByCandidate[candidateId];
    if (!validation) return;
    const seedId = get().selectedSeedId;
    if (!seedId) return;
    const candidate = get().candidatesBySeed[seedId]?.find((c) => c.id === candidateId);
    if (!candidate) return;

    set({ validationStatus: 'running' });
    // Async-ish UX delay — feels like a CI run without actually being one.
    window.setTimeout(() => {
      const next = simulateRunValidation(validation.obligations, candidate);
      const r = recompute(candidate, next);
      set((cur) => ({
        validationByCandidate: { ...cur.validationByCandidate, [candidateId]: r.validation },
        confidenceByCandidate: { ...cur.confidenceByCandidate, [candidateId]: r.confidence },
        decisionByCandidate: { ...cur.decisionByCandidate, [candidateId]: r.decision },
        validationStatus: 'done',
      }));
    }, 700);
  },

  dismissCandidate(candidateId, reason, note) {
    const at = new Date().toISOString();
    set((cur) => ({
      dismissals: [...cur.dismissals, { candidateId, reason, note, at }],
      // If the dismissed candidate was selected, fall back to the next
      // un-dismissed sibling. Trust signal: dismissal removes it from
      // active selection, the audit trail stays.
      selectedCandidateId:
        cur.selectedCandidateId === candidateId
          ? (() => {
              const seedId = cur.selectedSeedId;
              if (!seedId) return null;
              const list = cur.candidatesBySeed[seedId] ?? [];
              const dismissedIds = new Set([
                candidateId,
                ...cur.dismissals.map((d) => d.candidateId),
              ]);
              const next = list.find((c) => !dismissedIds.has(c.id));
              return next?.id ?? null;
            })()
          : cur.selectedCandidateId,
    }));
  },

  reset() {
    set({
      selectedSeedId: null,
      candidatesBySeed: {},
      selectedCandidateId: null,
      validationByCandidate: {},
      confidenceByCandidate: {},
      decisionByCandidate: {},
      dismissals: [],
      generationStatus: 'idle',
      generationError: null,
      validationStatus: 'idle',
    });
  },
}));
