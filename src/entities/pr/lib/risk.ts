import type { RepoData } from '@entities/repo';
import type { CheckRun, CheckStatus, PullRequest } from '../model';

// PR-level risk derived from the static-analysis side. The numbers come
// from the in-memory `RepoData` (the same store the dot field reads), so
// this file is the integration point between the review surface and the
// rest of the app's intelligence.

export type RiskTier = 'safe' | 'attention' | 'critical';

export type PrRiskProfile = {
  tier: RiskTier;
  /** Aggregate blast radius of changed files, capped at 999 for display. */
  blastSum: number;
  /** Public-API files inside the change set. */
  publicApiCount: number;
  /** Files with edit-safety < 40 inside the change set. */
  lowSafetyCount: number;
  /** Files inside an import cycle inside the change set. */
  cyclicCount: number;
  /** Sum of SAST findings across changed files. */
  sastFindings: number;
  /** True when any changed file has a `secretsLikely` flag. */
  secretsRisk: boolean;
  /** Average line-coverage of changed files (0..1), null when no data. */
  avgCoverage: number | null;
  /** Count of files whose `confidence` is not exact. */
  unknownConfidenceCount: number;
  /** Human-readable bullet list — ready for the Overview panel. */
  reasons: string[];
};

export function computePrRisk(pr: PullRequest, repo: RepoData): PrRiskProfile {
  let blastSum = 0;
  let publicApiCount = 0;
  let lowSafetyCount = 0;
  let cyclicCount = 0;
  let sastFindings = 0;
  let secretsRisk = false;
  let coverageSum = 0;
  let coverageN = 0;
  let unknownConfidenceCount = 0;

  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    const m = file.metrics;
    blastSum += m.blastRadius;
    if (m.publicApi) publicApiCount++;
    if (m.editSafety < 40) lowSafetyCount++;
    if (m.cyclic) cyclicCount++;
    sastFindings += m.sastFindings;
    if (m.secretsLikely) secretsRisk = true;
    if (m.lineCoverage > 0) {
      coverageSum += m.lineCoverage;
      coverageN++;
    }
    if (m.confidence !== 'exact') unknownConfidenceCount++;
  }

  const reasons: string[] = [];
  if (publicApiCount > 0) {
    reasons.push(`${publicApiCount} public-API file${publicApiCount > 1 ? 's' : ''} touched`);
  }
  if (lowSafetyCount > 0) {
    reasons.push(`${lowSafetyCount} low edit-safety file${lowSafetyCount > 1 ? 's' : ''} (<40)`);
  }
  if (blastSum >= 25) {
    reasons.push(`blast-radius sum ≈ ${Math.min(999, blastSum)}`);
  }
  if (sastFindings > 0) {
    reasons.push(`${sastFindings} SAST finding${sastFindings > 1 ? 's' : ''}`);
  }
  if (secretsRisk) reasons.push('secrets-likely match in change set');
  if (cyclicCount > 0) reasons.push(`${cyclicCount} file${cyclicCount > 1 ? 's' : ''} inside an import cycle`);
  if (unknownConfidenceCount > 0) {
    reasons.push(`${unknownConfidenceCount} file${unknownConfidenceCount > 1 ? 's' : ''} with non-exact analyzer confidence`);
  }
  if (pr.hasConflicts) reasons.push('merge conflicts present');

  // Tier assignment. Critical = at least one severe signal *and* a
  // material change; Attention = soft signals; Safe = clean.
  let tier: RiskTier = 'safe';
  const severe =
    secretsRisk ||
    sastFindings >= 1 ||
    publicApiCount >= 3 ||
    lowSafetyCount >= 2 ||
    pr.hasConflicts;
  const soft =
    publicApiCount > 0 ||
    lowSafetyCount > 0 ||
    blastSum >= 25 ||
    cyclicCount > 0 ||
    unknownConfidenceCount >= 2;
  if (severe) tier = 'critical';
  else if (soft) tier = 'attention';

  return {
    tier,
    blastSum: Math.min(999, blastSum),
    publicApiCount,
    lowSafetyCount,
    cyclicCount,
    sastFindings,
    secretsRisk,
    avgCoverage: coverageN > 0 ? (coverageSum / coverageN) / 100 : null,
    unknownConfidenceCount,
    reasons,
  };
}

// CI summary — distilled to what the rail badge needs.
export type CiSummary = {
  required: { passed: number; failed: number; pending: number };
  optional: { passed: number; failed: number; pending: number };
  worst: CheckStatus;
};

export function summariseChecks(checks: CheckRun[]): CiSummary {
  const out: CiSummary = {
    required: { passed: 0, failed: 0, pending: 0 },
    optional: { passed: 0, failed: 0, pending: 0 },
    worst: 'success',
  };
  // Worst order: failure > running/pending > skipped > success.
  const rank: Record<CheckStatus, number> = {
    failure: 4,
    cancelled: 4,
    running: 3,
    pending: 3,
    skipped: 2,
    success: 1,
  };
  for (const c of checks) {
    const bucket = c.required ? out.required : out.optional;
    if (c.status === 'failure' || c.status === 'cancelled') bucket.failed++;
    else if (c.status === 'running' || c.status === 'pending') bucket.pending++;
    else if (c.status === 'success') bucket.passed++;
    if (rank[c.status] > rank[out.worst]) out.worst = c.status;
  }
  return out;
}
