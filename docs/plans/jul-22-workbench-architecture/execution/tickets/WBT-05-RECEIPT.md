# WBT-05 completion report — Surface catalog, generic route, tab migration

- ticket: `WBT-05` (WB-401..406)
- package: WBT-05 — **substantially landed** (catalog + route + migrations + component-switch removal); full closed-`TabKind` union removal staged
- branch: `main`

## Landed & verified

- **WB-401** surface catalog — `src/app/workbench/{surfaceCatalog,discovery,builtinSurfaces,icons}.ts`: eager React-free metadata + lazy activators; validate-all + deterministic atomic materialisation; 9 built-in surfaces declared as open data.
- **WB-402** generic surface route — `src/app/router/workspaceSurfaceRoute.tsx`: pure `resolveSurfaceRoute` → typed `ok/unknown/disabled/untrusted` state; invalid deep link → typed error surface (no silent redirect); lazy views precomputed (no create-during-render); `SurfaceHost` gained a Suspense boundary.
- **WB-403** persisted tab migration — `src/features/workspace-tabs/model/migrateTabs.ts`: legacy `{kind}` → canonical `{id,surfaceId,stateVersion}`; unknown/corrupt quarantined with reason, valid tabs kept; pinned/order/label preserved; idempotent; no dual-write.
- **WB-404/406 (partial)** component-switch removal — `workspaceTabsRegistry.tsx` derives `TAB_REGISTRY` from `builtinCatalog` (removed the hard-coded `Record<TabKind, ComponentType>` component/icon maps); `WorkspaceTabsHost` drops the dead per-tab Provider branch (folded into the lazy view). Audit `centralSurfaceSwitch` baseline **8 → 6** (locked decrease).
- **WB-405** legacy URL alias — `src/app/router/legacyUrlAlias.ts`: legacy tab URLs alias one-way to canonical `{workspaceId, surfaceId}` identity; canonical `/w/...` never re-aliases (loop-free); surface↔legacy path round-trip.

### GREEN (each increment)
`typecheck` 0 · `lint:strict` 0 · `ui-infra:audit` green (centralSurfaceSwitch 6) · full repo **595/595** (0 regression) · `build` 0. Component-switch removal hell-audited (parallel adversarial+objective): identical behaviour across all 9 surfaces confirmed.

## Staged (WB-406 completion)

- The closed `TabKind` union + `WORKSPACE_TAB_META`/`DEFAULT_TAB_KINDS` in `shared/config/workspaceTabs.ts` and the `Record<TabKind, TabKindDef>` in `RegistryContext.tsx` remain as **migration-only** owners (baseline 6). Fully removing them means switching the tab store + strip + host to key on `surfaceId` (not `kind`) and wiring the generic `/w/$workspaceId/$surfaceId` route + `WorkspaceSurface` into `router.tsx`. That flip changes the live render/route path and is the natural next increment; the catalog, route, migration and alias above are the ready substrate.

## Verdict

- status: `IN_PROGRESS` — WB-401/402/403/405 done; WB-404/406 component-switch removed and baseline decreased; full TabKind removal staged.
- next: wire the generic route + surfaceId-keyed store (completes WB-404/406), then WBT-06.
