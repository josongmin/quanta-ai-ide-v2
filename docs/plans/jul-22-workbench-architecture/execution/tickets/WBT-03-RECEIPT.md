# WBT-03 completion report — Workspace, context, layout kernel

> ⚠ **SUPERSEDED BY CONVERGENCE (`2b9e097`, 2026-07-27).** 이 receipt가 목록한
> `core/{WorkspaceSession,ContextStore,SurfaceService,LayoutStore}.ts` 와 그 테스트는
> 커널 수렴에서 **삭제**됐다. 현재 HEAD `b597404` 에 존재하지 않는다. context 기반
> surface open 의 canonical owner 는 `core/SurfaceService.ts` 가 아니라
> `src/app/router/surfaceRuntime.ts`(`SURFACE_RUNTIME`) + `workspaceSurfaceRoute.tsx`
> + `src/app/workbench/surfaceCatalog.ts` + zustand tab store 다. 아래 89 test 수치는
> **착수 HEAD `e930178` 기준 역사적 증거**다. 단일 delta 근거:
> [`CONVERGENCE.md`](CONVERGENCE.md). 상태 권위: [`00-ticket-status-board.md`](00-ticket-status-board.md).

- ticket: `WBT-03` (WB-211..215)
- package: WBT-03 — landed @ `e930178`, **superseded @ `2b9e097`**
- branch: `main`
- HEAD (landed): `e930178`
- implementation owner: Jo (assisted)

## Scope

- new: `src/shared/workbench/core/{WorkspaceSession,ContextStore,SurfaceService,LayoutStore}.ts`
- tests: `core/__tests__/{workspaceSession,contextStore,surfaceService,layoutStore}.test.ts`
- contract: added WBT-03 runtime reason codes to `contract/errors.ts` (one taxonomy).
- non-goals honoured: React mount/navigation, router/tab-record migration, Search/Facts/blob payload ownership, cross-family wiring — all deferred.

## Components

- **WorkspaceSession (WB-211)** — workspace id + immutable revision + independent search/Facts generations; dirty tracked separately; `captureHandle`/`validateHandle` stale a handle on generation rollover (`stale-handle`) or foreign workspace (`wrong-workspace`); same revision string across workspaces is not the same identity.
- **ContextStore (WB-212)** — stores immutable envelopes (ref, not payload); leased handoff (entry lives while any lease is held, reclaimed at last close); injected `nowMs`; admission rejects `durable-secret` and `byte-budget`; acquire distinguishes `wrong-workspace`/`stale-handle`/`lease-expired`/`schema-skew`; idempotent lease release.
- **SurfaceService (WB-213)** — surface resolution + navigation are injected ports (Router-free); admission rejects `surface-not-found`/`surface-disabled`/untrusted; context admitted BEFORE instance creation (rejected context ⇒ 0 partial); reuse `new`/`active-compatible`(same opened kind only)/`singleton`; abort ⇒ no orphan instance.
- **LayoutStore (WB-214/215)** — v3 zod schema; operation transaction validates a working copy and commits atomically (`invalid-operation`, no partial); corrupt load quarantines raw+reason and falls back to a safe layout WITHOUT rewriting the bad blob; `migrateFrom` does v2→v3, is idempotent for v3, and fails (`migration-failed`) on unknown versions while preserving the legacy blob.

## GREEN

| command | exit | result |
|---|---:|---|
| `pnpm exec vitest run src/shared/workbench/core` | 0 | 9 files / 49 tests |
| `pnpm test:workbench` | 0 | 14 files / 89 tests |
| `pnpm typecheck` | 0 | clean |
| `pnpm lint:strict` | 0 | 0 warnings |
| `pnpm ui-infra:audit` | 0 | core forbidden imports 0 |
| `pnpm audit:cross-slice` | 0 | no core cross-slice edges |

## 헬어딧 loop

- round 1 (adversarial + objective, parallel, sandboxed to /tmp): adversarial found **MAJOR** — `ContextStore.put` on a duplicate `envelope.ref` leaked bytes and orphaned a lease; + 2 minor (acquire error precedence — kept as-is; empty-ops `apply` unnecessary save). Objective found 0 (again missed the byte leak — the dual lens earns its keep).
- fix + TDD: reject duplicate active ref (`duplicate-registration`); skip persistence on empty op batch. Added regressions (duplicate-ref no-leak, empty-ops no-save).
- round 2 (independent closing re-audit): both fixes CONFIRMED, regressions non-vacuous, **0 new defects**; added an extra test proving a ref is re-usable after eviction (no over-rejection).
- both audit rounds confirmed a clean `git status` (no scratch files left in the tree).

## Verdict

- status: `DONE` on `main`.
- next unlocked: `WBT-04` (React host / UI runtime convergence — modifies the live app; owner should verify the running app).
- reviewer: pending (owner).
