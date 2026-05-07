import type { RepoData } from '@entities/repo';
import {
  computePrRisk, type PrRiskProfile, type PullRequest, type RiskTier,
} from '@entities/pr';

// Tiny helpers shared between the rail and the tab cards. Centralised so the
// "what does tier x mean visually" answer lives in one place.

export function riskTierForPr(pr: PullRequest, repo: RepoData): RiskTier {
  // Cheap to call repeatedly — `computePrRisk` walks `pr.files` once and is
  // O(files). The rail does it per row, the tab does it once. If profiling
  // ever shows this as hot we can memoise on (pr.updatedAt, repo identity).
  return computePrRisk(pr, repo).tier;
}

export function profileForPr(pr: PullRequest, repo: RepoData): PrRiskProfile {
  return computePrRisk(pr, repo);
}

export function tierAccent(tier: RiskTier): string {
  switch (tier) {
    case 'critical':  return '#c25a55';
    case 'attention': return '#a8893a';
    case 'safe':      return '#5fa86c';
  }
}

export function tierLabel(tier: RiskTier): string {
  switch (tier) {
    case 'critical':  return 'Critical';
    case 'attention': return 'Attention';
    case 'safe':      return 'Safe';
  }
}
