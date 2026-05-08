// Public API for the metric entity:
// the Verdict type, the heat-metric catalogue, and repo/folder aggregators.
export type {
  Verdict,
  HeatMetricKey,
} from './model';
export {
  HEAT_METRICS,
  findMetric,
} from './lib/heat';
export {
  computeRepoStats,
  computeFolderStats,
} from './lib/aggregate';
