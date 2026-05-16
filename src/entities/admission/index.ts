// Public API for the admission-rules entity:
// rule/signal types, sample fixtures, and cost/eval helpers.
export type {
  AdmissionRule,
  RuleSource,
  RuleSeverity,
  CostClass,
  MetricField,
  CompareOp,
  GraphPattern,
  TaintSource,
  TaintSink,
  RuleSignal,
} from './model';

export { SAMPLE_RULES } from './lib/sample';
export { estimateCost } from './lib/cost';
export {
  previewRule,
  evaluateAdmission,
} from './lib/evaluate';
