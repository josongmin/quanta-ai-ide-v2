// Public API for the billing entity: token pricing constants and the
// generic token → USD helper. Every cost-ish module reads from here so
// the per-MTok rates stay in one place.
export {
  OPUS_INPUT_USD_PER_MTOK,
  OPUS_OUTPUT_USD_PER_MTOK,
  DEFAULT_PRICING,
  type TokenPricing,
} from './model';

export { tokenCostUSD } from './lib/cost';
