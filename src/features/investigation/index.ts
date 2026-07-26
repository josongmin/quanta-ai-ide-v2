export {
  InvestigationProvider,
  InvestigationNotebookProvider,
  InvestigationRunnerProvider,
  useInvestigation,
} from './model/InvestigationContext';
export type {
  ActionKind,
  ActionRecommendation,
  BundleStatus,
  Confidence,
  ContextBundle,
  EvidenceItem,
  EvidenceKind,
  Hypothesis,
  InvestigationAnswer,
  InvestigationTarget,
  QuestionType,
  SourceTool,
  Staleness,
  UnknownTag,
  WhyPartial,
  NotebookQuestion,
  NotebookEntry,
  NotebookQuestionStatus,
  Job,
  JobKind,
  JobStatus,
} from '@entities/investigation';

export { InvestigatePanel, InvestigateCTA, InvestigateLauncher } from './ui';

export { Notebook } from './notebook';
export { JobsProvider, useJobs, JobsTray } from './jobs';

export { PlannerTrace, PlannerLauncher } from './planner-ui';
export { SimilarIncidentCard, SimilarCodeCard, SimilarStrip } from './similarity';
export { FollowUpStrip, buildFollowUps, type FollowUp } from './followup';
export {
  useFixHandoff,
  HandoffNotice,
  FixPipelineHandoffBanner,
  type FixHandoffPayload,
} from './handoff';
