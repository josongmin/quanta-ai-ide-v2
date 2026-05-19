// Public surface of the investigation planner segment.
// Pure planning/answer-composition logic — no UI.

export { runPlanner } from './runPlanner';
export type { PlannerStep, PlannerTrace, RunPlannerOptions } from './runPlanner';
export { gatherContext, rankEvidence } from './gatherContext';
export { composeAnswer, enrichBundle } from './answerComposer';
