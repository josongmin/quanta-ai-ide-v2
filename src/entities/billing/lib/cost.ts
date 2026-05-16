import { DEFAULT_PRICING, type TokenPricing } from '../model';

// Generic token → USD conversion. Used everywhere the app needs to map
// (inputTokens, outputTokens) to a dollar figure. Single source of truth
// for the per-MTok rates so they don't drift across the cost telemetry,
// the fix-pipeline cycle cost, and the timeline dot sizing.

export function tokenCostUSD(
  inputTokens: number,
  outputTokens: number,
  pricing: TokenPricing = DEFAULT_PRICING,
): number {
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok
  );
}
