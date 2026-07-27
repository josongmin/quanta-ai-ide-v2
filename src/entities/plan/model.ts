// ─── Billing plan tier ────────────────────────────────────────────────
// The canonical subscription-tier union shared across the billing,
// admin, and pricing surfaces. Each surface keeps its own Plan *object*
// shape (columns/pricing/features legitimately differ), but the tier id
// is one axis and lives here in the entity layer.
//
// NOTE: distinct from entities/facet's Plan ('free' | 'pro' | 'enterprise'),
// which is a licensing-tier axis for facet gating — a different concern.
export type PlanId = 'free' | 'team' | 'business' | 'enterprise';

// Audit-log retention (days) per plan. MIRRORS the backend PLAN_TABLE.auditRetentionDays
// (accounts entitlements/domain/policy.ts) — a FIXED, plan-derived policy the org cannot
// configure. Kept here as a mirror because it's a small stable constant; keep in sync if
// the backend table changes. Used to DISPLAY the org's retention read-only.
export const AUDIT_RETENTION_DAYS_BY_PLAN: Record<PlanId, number> = {
  free: 7,
  team: 30,
  business: 90,
  enterprise: 365,
};
