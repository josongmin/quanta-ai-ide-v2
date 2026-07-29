# WBT-09 — Campaign closeout & receipt ledger

> **권위 주의** — 실행 상태의 단일 권위는 [`00-ticket-status-board.md`](00-ticket-status-board.md)
> 다. 이 파일은 상태 권위가 아니라 **시점 서술(historical narrative)** 이며, 아래 표는
> 작성 당시 `origin/main`(pre-`2b9e097`) 스냅샷이다. 커널 수렴 이후의 정정은
> [`CONVERGENCE.md`](CONVERGENCE.md) 와 board 를 따른다. board/CONVERGENCE 와 충돌하면
> 그 둘이 우선한다.

reconciled: `2026-07-28 @ b597404`

Snapshot of the whole workbench-architecture campaign as landed at closeout time.
DONE means committed + gate-verified; STAGED means designed/partly-built with a
ledger, not falsely marked done. **주의: 아래 "WBT-02/03 kernel DONE" 행이 목록한
`core/*Service.ts` 는 이후 `2b9e097` 에서 삭제됐다 — [CONVERGENCE.md](CONVERGENCE.md).**

## Package status (작성 당시 origin/main, pre-`2b9e097`)

| package | status | evidence |
|---|---|---|
| WBT-00 guardrail | **DONE** | [WBT-00-RECEIPT](WBT-00-RECEIPT.md) — fixtures 14/14, audit fail-new |
| WBT-01 contract | **DONE** | [WBT-01-RECEIPT](WBT-01-RECEIPT.md) — zod SoT, 40 tests, hell-audit clean |
| WBT-02 kernel (scope/registry/command/contextkey/intent) | **DONE→SUPERSEDED @`2b9e097`** | [WBT-02-RECEIPT](WBT-02-RECEIPT.md) — 28 tests (역사적 @`fe37c7f`); registry/command/contextkey/intent 삭제, ScopeNode만 유지, command축=KeybindingService |
| WBT-03 kernel (workspace/context/layout/surface) | **DONE→SUPERSEDED @`2b9e097`** | [WBT-03-RECEIPT](WBT-03-RECEIPT.md) — 49 tests (역사적 @`e930178`); workspace/context/surface/layout 서비스 삭제, surface open=app/router/surfaceRuntime |
| WBT-04 react host + composition root (WB-301/304) | **DONE** | [WBT-04-RECEIPT](WBT-04-RECEIPT.md) — 8 host tests, build 0 |
| WBT-04 command/scope convergence (WB-302/303/305) | **STAGED** | entangled with WBT-05 live tab render; ledger in WBT-04 receipt |
| WBT-05 catalog/route/migration/alias + component-switch removal (WB-401/402/403/405, WB-404/406 partial) | **DONE (partial)** | [WBT-05-RECEIPT](WBT-05-RECEIPT.md) — centralSurfaceSwitch 8→6 |
| WBT-05 full closed-TabKind removal | **STAGED** | needs surfaceId-keyed store + generic route wired into router.tsx (live) |
| WBT-06 analysis reference family | **STAGED** | live feature migration; needs running-app heavy rail |
| WBT-07 app-page catalog / DX | **STAGED** | live route/page migration; needs running-app heavy rail |
| WBT-08 plugin admission (schema/trust/budget/crash rail + RFC) | **DONE** | admission 8 + rail 4 tests, RFC (no runtime) |
| WBT-09 closeout | **this file** | receipts per package; ledger below |

## Live wiring completed this autopilot

- **WB-403 live**: the tab store now carries canonical `surfaceId` + runs the
  idempotent persist migration (version 2→3) on load (`store.ts`).
- **WB-402 live**: the generic `/w/$workspaceId/$surfaceId` route is mounted in
  `router.tsx` (catalog-driven `WorkspaceSurface`); adding a surface needs no
  router edit; legacy tab paths stay read-only aliases.
- **WBT-08 hardened**: adversarial audit found 2 fail-open BLOCKERs (NaN/negative
  resource bypass, throwing-setup leak) — both fixed fail-closed with regressions.

## Verified state on `main` (closeout 시점, pre-`2b9e097`)

- full repo test suite **614/614** (was 570 pre-campaign; +44 workbench tests, 0 regression); `pnpm build` 0
- `pnpm build` succeeds with the workbench mounted; `pnpm typecheck`, `pnpm lint:strict`, `pnpm ui-infra:audit`, `pnpm audit:cross-slice` all exit 0
- everything additive or behaviour-preserving: the existing app renders identically (the tab component-switch removal was proven identical across all 9 surfaces by parallel adversarial+objective audit)

## Reconciled state (`2026-07-28 @ b597404`, 실측)

- 커널 수렴(`2b9e097`) + 후속 P0-* 커밋 반영. workbench 표면 = `contract/**` + `core/ScopeNode` + `react/{WorkbenchRoot,KeybindingService}` + `app/workbench/surfaceCatalog` + `app/router/surfaceRuntime`.
- workbench 관련 테스트 **87/87 green** (`vitest run src/shared/workbench src/app/workbench src/app/router`); `pnpm typecheck` 0; `pnpm ui-infra:audit` 0 (`centralSurfaceSwitch:0 arbitraryProvider:0 noHardcodedSurfaceId:0 surfaceRootLocation:0` — closeout 당시 8→6 이던 switch 제거가 **0까지 완료**); `pnpm audit:cross-slice` 0.
- **정직 고지**: `pnpm lint:strict` 는 현재 exit 1 — 단 실패는 전부 campaign 밖(`features/chat-agent/*`, `shared/lib/__tests__/useAsyncResource.test.tsx`, 최신 P0-4 커밋발)이며 workbench write set 은 clean. board 의 게이트 baseline 표 참조.

## Legacy removal ledger (WB-406 / WB-302 consumer targets)

| legacy symbol | location | status | removal condition |
|---|---|---|---|
| `TAB_COMPONENTS`, `TAB_ICONS` (Record<TabKind, ComponentType>) | workspaceTabsRegistry.tsx | **removed** | derived from surface catalog |
| `Record<TabKind, TabKindDef>` (TAB_REGISTRY, RegistryContext) | workspaceTabsRegistry.tsx, RegistryContext.tsx | migration-only (baseline 6) | switch store/host to key on surfaceId |
| closed `TabKind` union + WORKSPACE_TAB_META | shared/config/workspaceTabs.ts | migration-only | after surfaceId-keyed store |
| UI `CommandService` (keybinding) parallel authority | shared/ui/runtime | migration-only | route through kernel command port (WB-302); 2 consumers |
| `UiScopeProvider` parallel active/dispose tree | shared/ui/runtime | migration-only | project ScopeNode (WB-303) |

## What's genuinely built and reusable

The full **React-free workbench kernel** (contract + registry + command + scope +
context-key + intent + workspace + context-store + surface + layout + activation
rail + admission policy) and its **React host** (WorkbenchRoot / ScopeProvider /
SurfaceHost / hooks / crash boundary) plus the **surface catalog + generic route +
tab migration + legacy alias**. Every piece is unit-tested and hell-audited. The
remaining STAGED items are the live-app render/route/command re-wiring that needs
the running app verified by the owner (천공카드: owner-local green ≠ production works).

## Continuation path (one increment at a time, each: RED → build → hell-audit → gate → commit → push)

1. WB-404/406 finish: surfaceId-keyed tab store + wire generic `/w/$workspaceId/$surfaceId` route into router.tsx; remove closed `TabKind`.
2. WB-302/303: route UI keybinding execution through the kernel command port; project `ScopeNode` in `UiScopeProvider`; delete the parallel trees (2 consumers).
3. WBT-06 / WBT-07: migrate analysis + app-page families onto the surface catalog.
