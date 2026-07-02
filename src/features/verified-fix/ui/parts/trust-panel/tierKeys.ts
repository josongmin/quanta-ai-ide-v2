import type { DeliveryTier } from '../../../model/types';

// tier → i18n-key lookups. Replace the parallel switches; the keys are
// identical to the prior switch arms so the rendered copy is unchanged.
const TIER_KEY: Record<DeliveryTier, string> = {
  'safe-mechanical': 'tier.safeMechanical',
  'guarded':         'tier.guarded',
  'human-required':  'tier.humanRequired',
};

const TIER_EXPLAIN_KEY: Record<DeliveryTier, string> = {
  'safe-mechanical': 'tier.explainSafe',
  'guarded':         'tier.explainGuarded',
  'human-required':  'tier.explainHuman',
};

export function tierKey(tier: DeliveryTier): string {
  return TIER_KEY[tier];
}

export function tierExplainKey(tier: DeliveryTier): string {
  return TIER_EXPLAIN_KEY[tier];
}
