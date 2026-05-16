// Layout insets shared by the chrome shell and any stage overlay that
// needs to align with the same margin grid (filter bar, focus-scan
// stack, floating toolbars). Lives in shared/ because both the app
// router and several features inside `src/features/` need to read it.
//
// Previously these constants lived in `app/router/intelligence/
// panelLayout.ts` and were imported by features via `@app/...` — a
// FSD direction violation (feature → app). Hoisting them to shared/
// keeps every consumer on the right side of the dependency rule.
export const STAGE_LAYOUT = {
  sideInset: 12,
  panelGap: 20,
  topInset: 12,
  bottomInset: 12,
  centerReserve: 88,
} as const;

export type StageLayout = typeof STAGE_LAYOUT;
