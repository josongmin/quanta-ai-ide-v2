// Public API for the admission-rules entity:
// rule/signal types, sample fixtures, and cost/eval helpers.
export type {
  AdmissionRule,
  RuleSource,
  RuleSeverity,
  CostClass,
  EvidenceLevel,
  MetricField,
  CompareOp,
  MetricSignal,
  GraphPattern,
  GraphSignal,
  TaintSource,
  TaintSink,
  TaintSignal,
  DslSignal,
  ExternalSignal,
  RuleSignal,
  RuleScope,
  RuleOverride,
  RuleMatch,
  RulePreview,
  AdmissionDecision,
  RuleEvaluation,
} from './model';

export { SAMPLE_RULES } from './lib/sample';
export {
  estimateCost,
  canPreviewInline,
  COST_HINT,
} from './lib/cost';
export {
  previewRule,
  evaluateAdmission,
  retroactiveImpact,
  type RetroResult,
} from './lib/evaluate';
