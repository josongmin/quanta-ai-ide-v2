// Token pricing SSOT.
//
// Constants are USD per 1M tokens. Numbers are intentionally coarse demo
// values — when this stops being a demo, swap in a policy bundle keyed off
// the real billing platform. Until then every cost-ish helper in the app
// reads from here so the dollar figures stay in sync.

export const OPUS_INPUT_USD_PER_MTOK = 3;
export const OPUS_OUTPUT_USD_PER_MTOK = 15;

export type TokenPricing = {
  /** USD per 1,000,000 input tokens. */
  inputPerMTok: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMTok: number;
};

export const DEFAULT_PRICING: TokenPricing = {
  inputPerMTok: OPUS_INPUT_USD_PER_MTOK,
  outputPerMTok: OPUS_OUTPUT_USD_PER_MTOK,
};
