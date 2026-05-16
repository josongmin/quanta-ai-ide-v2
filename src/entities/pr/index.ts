// Public API for the PR entity:
// PR/diff/comment types, the SAMPLE_PRS fixture, risk + insight helpers.
export type {
  PullRequest, PrStatus, CheckRun, CheckStatus, ReviewerState, ChangeKind,
  ReviewVerdict, Comment, LineThread, ConversationItem,
  DiffLine, DiffHunk, FileDiff,
} from './model';
export { findPerson } from './lib/people';
export { SAMPLE_PRS } from './lib/sample';
export {
  computePrRisk, summariseChecks,
  type RiskTier,
} from './lib/risk';
export {
  suggestReviewers,
  coverageDeltas,
  prodCorrelations,
  failedTestsRow,
  summariseConversation,
  engineFindings,
  engineSummary,
  incidentMatches,
  callGraphChanges,
  displayName,
  type EngineFinding,
  type EngineSeverity,
  type IncidentMatch,
  type CallGraphChange,
} from './lib/insights';
