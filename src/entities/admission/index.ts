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

export { SAMPLE_RULES, EXTERNAL_RULE_MAP } from './lib/sample';
export {
  estimateCost,
  estimateSignalCost,
  canPreviewInline,
  COST_LABEL,
  COST_HINT,
  COST_COLOR,
  PREVIEW_MATCH_CAP,
} from './lib/cost';
export {
  previewRule,
  evaluateAdmission,
  retroactiveImpact,
  type RetroResult,
} from './lib/evaluate';
