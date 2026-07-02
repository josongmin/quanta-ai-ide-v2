// ─── Billing plan tier ────────────────────────────────────────────────
// The canonical subscription-tier union shared across the billing,
// admin, and pricing surfaces. Each surface keeps its own Plan *object*
// shape (columns/pricing/features legitimately differ), but the tier id
// is one axis and lives here in the entity layer.
//
// NOTE: distinct from entities/facet's Plan ('free' | 'pro' | 'enterprise'),
// which is a licensing-tier axis for facet gating — a different concern.
export type PlanId = 'free' | 'team' | 'business' | 'enterprise';
