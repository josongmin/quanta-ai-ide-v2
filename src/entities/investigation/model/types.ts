export type EvidenceKind =
  | 'symbol'
  | 'caller'
  | 'callee'
  | 'recent_change'
  | 'owner'
  | 'taint_path'
  | 'test_coverage'
  | 'incident'
  | 'similar_incident'
  | 'similar_code'
  | 'docs_mismatch';

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

export type Staleness = 'fresh' | 'stale' | 'unknown';

export type WhyPartial =
  | 'dispatch_overapprox'
  | 'runtime_missing'
  | 'index_stale'
  | 'analysis_truncated'
  | null;

export type SourceTool =
  | 'lexical_search'
  | 'semantic_search'
  | 'hybrid_search'
  | 'go_to_definition'
  | 'find_references'
  | 'function_summary'
  | 'graph_path'
  | 'taint_flow'
  | 'change_impact'
  | 'proof_analysis'
  | 'index_status'
  | 'incremental'
  | 'explain';

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  sourceTool: SourceTool;
  confidence: Confidence;
  staleness: Staleness;
  whyPartial: WhyPartial;
  summary: string;
  detail?: string;
  payload?: Record<string, unknown>;
};

export type UnknownTag = {
  id: string;
  kind:
    | 'runtime_missing'
    | 'analysis_stale'
    | 'dispatch_overapprox'
    | 'index_stale'
    | 'partial_coverage'
    | 'no_recent_data';
  label: string;
  reason: string;
};

export type InvestigationTarget = {
  kind: 'file' | 'symbol' | 'incident';
  id: string;
  label: string;
  subtitle?: string;
};

export type QuestionType = 'why_risky' | 'blast_of_change' | 'incident_suspect';

export type BundleStatus = 'idle' | 'gathering' | 'partial' | 'complete' | 'error';

export type ContextBundle = {
  id: string;
  target: InvestigationTarget;
  questionType: QuestionType;
  evidence: EvidenceItem[];
  gatheredAt: number;
  status: BundleStatus;
};

export type ActionKind = 'open_focus' | 'run_deep_scan' | 'create_fix_task' | 'assign_owner';

export type ActionRecommendation = {
  id: string;
  kind: ActionKind;
  label: string;
  description?: string;
  enabled: boolean;
  payload?: Record<string, unknown>;
};

export type Hypothesis = {
  id: string;
  statement: string;
  supporting: string[];
  refuting: string[];
};

export type InvestigationAnswer = {
  conclusion: string;
  evidenceIds: string[];
  unknowns: UnknownTag[];
  actions: ActionRecommendation[];
  hypothesis?: Hypothesis;
};

export function assertAnswerSlots(answer: InvestigationAnswer): void {
  if (!answer.conclusion.trim()) throw new Error('investigation: conclusion missing');
  if (answer.evidenceIds.length === 0) throw new Error('investigation: no evidence');
  if (answer.unknowns.length === 0) throw new Error('investigation: unknowns slot must not be empty (use no_recent_data tag if truly nothing)');
  if (answer.actions.length === 0) throw new Error('investigation: at least one action required');
}

// Phase 2: Notebook + Jobs ----------------------------------------

export type NotebookQuestionStatus = 'pending' | 'answered' | 'partial' | 'archived';

export type NotebookQuestion = {
  id: string;
  text: string;
  questionType: QuestionType;
  status: NotebookQuestionStatus;
  askedAt: number;
  // When answered, points to a snapshot of the answer + bundle id
  answer?: InvestigationAnswer;
  bundleId?: string;
};

export type NotebookEntry = {
  id: string;
  target: InvestigationTarget;
  questions: NotebookQuestion[];
  pinned: boolean;
  createdAt: number;
};

export type JobKind = 'deep_scan' | 'whole_repo_blast' | 'runtime_correlate' | 'refactor_plan';
export type JobStatus = 'queued' | 'running' | 'partial' | 'stale' | 'completed' | 'cancelled' | 'failed';

export type Job = {
  id: string;
  kind: JobKind;
  label: string;
  target: InvestigationTarget;
  status: JobStatus;
  progress: number; // 0..1
  startedAt: number;
  finishedAt?: number;
  result?: { summary: string; evidenceIds?: string[] };
};
