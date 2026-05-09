export type {
  CouplingLevel,
  CouplingEdge,
  TemporalCouplingCluster,
  CouplingNarrative,
} from './model';
export { computeCouplingClusters, groupClusters } from './lib/compute';
export { buildCouplingNarrative } from './lib/evidenceBuilder';
