import type { CycleCost, FixCandidate } from '@entities/fix-pipeline';

// Mock cost model. The exact numbers don't matter — what matters is that
// the telemetry is wired from Phase 1, so the team can ask "is this
// economical?" before scaling. Real impl meters LLM token bills + CI
// minutes from the build platform.
//
// Pricing constants are coarse and intentionally readable rather than
// authoritative. Move to a policy bundle when this stops being a demo.

const TOKEN_USD_PER_1M = { input: 3.0, output: 15.0 };
const CI_USD_PER_MINUTE = 0.04;

export const ZERO_COST: CycleCost = {
  tokensIn: 0,
  tokensOut: 0,
  ciSeconds: 0,
  usd: 0,
};

// Heuristic — bigger patches consume more generation tokens, more files
// trigger more CI steps. Stable across reloads so the demo is repeatable.
export function estimateCycleCost(candidate: FixCandidate): CycleCost {
  const tokensIn = 1800 + candidate.metrics.linesChanged * 40;
  const tokensOut = 600 + candidate.metrics.linesChanged * 25;
  const ciSeconds = 30 + candidate.metrics.filesChanged * 25 + candidate.metrics.modulesAffected * 18;
  const usd =
    (tokensIn / 1_000_000) * TOKEN_USD_PER_1M.input +
    (tokensOut / 1_000_000) * TOKEN_USD_PER_1M.output +
    (ciSeconds / 60) * CI_USD_PER_MINUTE;
  return { tokensIn, tokensOut, ciSeconds, usd };
}

export function addCost(a: CycleCost, b: CycleCost): CycleCost {
  return {
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
    ciSeconds: a.ciSeconds + b.ciSeconds,
    usd: a.usd + b.usd,
  };
}

export function formatUsd(usd: number): string {
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  return `${(n / 1000).toFixed(1)}k`;
}
