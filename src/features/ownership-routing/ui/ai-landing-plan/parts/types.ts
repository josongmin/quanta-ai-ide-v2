import type { MergeStrategy, StackStepKind } from '@entities/ownership';

// Shared module-private constants for the AI landing-plan modal. Cadence
// delays drive the staged reveal; the label/copy maps are deterministic
// lookups keyed off the entity enums.

export const STEP_DELAY_MS = 850;
export const RATIONALE_DELAY_MS = 1100;

// Enum → i18n key maps (ownership namespace). Labels are resolved via t() by
// the rendering component, keeping these modules hook-free.
export const MERGE_STRATEGY_KEY: Record<MergeStrategy, `mergeStrategy.${MergeStrategy}`> = {
  'split-now': 'mergeStrategy.split-now',
  'keep-as-one': 'mergeStrategy.keep-as-one',
  'land-bottom-up': 'mergeStrategy.land-bottom-up',
  parallelizable: 'mergeStrategy.parallelizable',
  'risky-serial': 'mergeStrategy.risky-serial',
};

export const KIND_KEY: Record<StackStepKind, `kind.${StackStepKind}`> = {
  prep: 'kind.prep',
  adapter: 'kind.adapter',
  migration: 'kind.migration',
  cleanup: 'kind.cleanup',
  gate: 'kind.gate',
};

// Deterministic reviewer-fit copy per step kind, keyed for i18n. The plan
// reference asks for "Why this reviewer for this step?" — short, signal-y.
export const WHY_REVIEWER_KEY_BY_KIND: Record<StackStepKind, `plan.whyReviewer.${StackStepKind}`> = {
  prep: 'plan.whyReviewer.prep',
  adapter: 'plan.whyReviewer.adapter',
  migration: 'plan.whyReviewer.migration',
  cleanup: 'plan.whyReviewer.cleanup',
  gate: 'plan.whyReviewer.gate',
};

// Ambient keyframes injected once. Only opacity + height/margin animations
// — no transforms, so backdrop-blur on inner GlassCards stays alive.
export const ANIM_STYLE = `
@keyframes ailp-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@keyframes ailp-fade-in { from { opacity: 0; margin-top: 4px; } to { opacity: 1; margin-top: 0; } }
`;
