// Public API of the fix-pipeline feature.
//
// This feature consolidates what were 13 sibling micro-features (one pure-fn lib
// each: generate / cost / loop / partial-accept / permissions / reanalysis /
// rollback / routing / self-critique / submit / verification-checklist /
// delivery-gate / trust-signal) plus the orchestrator store. They had zero
// cross-reuse — every one was consumed only by the store or a single
// fix-pipeline-stage panel — so they live here as lib/ submodules instead of
// standalone slices. The pipeline internals stay private to lib/; this barrel
// exposes only the store and the few pure helpers the stage widget renders with.
export { useFixPipelineStore } from './model/store';

// Formatting / labelling helpers consumed directly by fix-pipeline-stage panels.
export { formatUsd, formatTokens } from './lib/cycleCost';
export { describeReason } from './lib/loop';
export { decideSubmissionAction } from './lib/submit';
export { levelLabel } from './lib/computeConfidence';
