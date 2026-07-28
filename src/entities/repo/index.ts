// Public API for the repo entity:
// file/folder/graph types, the synthetic repo builder, and analysis/catalog helpers.
export type {
  StatusKey,
  Layer,
  IngressProtocol,
  EgressProtocol,
  Confidence,
  FileRecord,
  FolderRecord,
  Range,
  RangeKey,
  RepoData,
  SortKey,
  PresetKey,
  SearchMode,
  FilterState,
} from './model';
export { STATUS_CSS, RANGE_KEYS } from './model';
export { buildRepo, CELL_SIZE, GRID_COUNT } from './lib/build';
export { buildRepoData, toRepoDataDTO, type RepoDataDTO } from './lib/repoDto';
export { fetchRepoData } from './lib/loadRepo';
export { computeSCCs, cycleSCCs, type SCC } from './lib/cycles';
export {
  computeBlast,
  timeWindowHeat,
  findSimilar,
  findShortestPath,
  topRiskLens,
  simulateBranchDiff,
  publicApiRing,
  type BlastResult,
  type TimeWindow,
  type SimilarHit,
  type PathWitness,
  type RiskLensKey,
  type RiskLensHit,
  type PRDiff,
  type PRChangeKind,
} from './lib/analysis';
export {
  functionSummary,
  riskChannels,
  plannerTrace,
  projectEdges,
  proofFreshness,
  severityBand,
  aggregateRiskScore,
  type RiskChannelKey,
  type RiskChannelSummary,
  type GraphEdgeMode,
} from './lib/catalog';
