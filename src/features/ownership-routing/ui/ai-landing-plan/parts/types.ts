import type { MergeStrategy, StackStepKind } from '@entities/ownership';

// Shared module-private constants for the AI landing-plan modal. Cadence
// delays drive the staged reveal; the label/copy maps are deterministic
// lookups keyed off the entity enums.

export const STEP_DELAY_MS = 850;
export const RATIONALE_DELAY_MS = 1100;

export const MERGE_STRATEGY_LABEL: Record<MergeStrategy, string> = {
  'split-now': 'SPLIT NOW',
  'keep-as-one': 'KEEP AS ONE',
  'land-bottom-up': 'LAND BOTTOM-UP',
  parallelizable: 'PARALLELIZABLE',
  'risky-serial': 'RISKY SERIAL',
};

export const KIND_LABEL: Record<StackStepKind, string> = {
  prep: 'PREP',
  adapter: 'ADAPTER',
  migration: 'MIGRATION',
  cleanup: 'CLEANUP',
  gate: 'GATE',
};

// Deterministic but hand-feeling reviewer-fit copy per step kind. The plan
// reference asks for "Why this reviewer for this step?" — short, signal-y.
export const WHY_REVIEWER_BY_KIND: Record<StackStepKind, string> = {
  prep: 'lowest blast radius — backup engineer can prep without page-time risk',
  adapter: 'shape change touches both sides — interface owner spots the seam',
  migration: 'primary owner sees every callsite already; fastest to verify',
  cleanup: 'historical author recognises legacy traps the linter cannot',
  gate: 'platform reviewer holds canary keys and rollout dashboards',
};

// Ambient keyframes injected once. Only opacity + height/margin animations
// — no transforms, so backdrop-blur on inner GlassCards stays alive.
export const ANIM_STYLE = `
@keyframes ailp-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@keyframes ailp-fade-in { from { opacity: 0; margin-top: 4px; } to { opacity: 1; margin-top: 0; } }
`;
