# WBT-04 completion report — React host and UI runtime convergence

- ticket: `WBT-04` (WB-301..305)
- package: WBT-04 — **PARTIAL** (WB-301 + WB-304 landed & verified; WB-302/303/305 staged)
- branch: `main`
- implementation owner: Jo (assisted)

## Landed & verified (WB-301, WB-304)

- new `src/shared/workbench/react/**` (host-only React layer; contract/core stay React-free):
  - `lifecycle.ts` — pure surface state machine (register→activate→mount→hide↔show→dispose); invalid transition = typed `invalid-transition`; `hidden` keeps the view mounted (kept-alive), only `dispose` unmounts.
  - `WorkbenchProvider.tsx` (`WorkbenchRoot`) — composition root owning the canonical kernel session (app ScopeNode + registry + command + context-key + intent); disposes the app scope on unmount; StrictMode mount/unmount/mount recreates a disposed internal session with no leak. A *supplied* session is caller-owned.
  - `ScopeProvider.tsx` — projects a kernel ScopeNode into React; child scope disposed on unmount; identity addressed by stable id.
  - `hooks.ts` — `useCommand` / `useContextKey` register on the current scope and reclaim on unmount (canonical owner; no parallel tree).
  - `CrashBoundary.tsx` — isolates a view crash to its subtree (siblings survive), reports typed state, not a blank screen.
  - `SurfaceHost.tsx` — mounts a surface's view inside its scope + crash boundary honouring the lifecycle/visibility contract.
- `contract/errors.ts` — added `invalid-transition` reason.
- `src/app/providers/AppProviders.tsx` — `WorkbenchRoot` mounted **once**, outermost of the runtime providers (WB-304 composition root). *(This file carried pre-existing uncommitted edits; per prior owner approval they are included in this commit.)*

### GREEN

| command | exit | result |
|---|---:|---|
| `pnpm exec vitest run src/shared/workbench/react` | 0 | 2 files / 8 tests (lifecycle SM + host: dispose, StrictMode no-leak, scope+command reclaim, crash isolation) |
| `pnpm typecheck` | 0 | clean |
| `pnpm lint:strict` | 0 | 0 warnings |
| `pnpm test` (full repo) | 0 | 77 files / **578 tests** (was 570 — +8 new, 0 regression) |
| `pnpm build` | 0 | vite build succeeds with WorkbenchRoot mounted (heavy-rail proxy) |
| `pnpm ui-infra:audit` | 0 | forbidden imports 0 |

## Staged (WB-302/303/305) — convergence ledger

The existing `shared/ui/runtime/CommandService` is a **keybinding-dispatch** service
(`register({id,handler,keybinding,priority,isActive})`, `dispatchKeydown`, `execute(id)`),
a different abstraction from the kernel's scope-bound async `CommandService` (typed
results, AbortSignal, admission). Full delegation must not be faked on owner-local
green — it needs the running app verified. Remaining consumer-removal targets:

- **WB-302**: route `shared/ui/runtime/CommandService` registration/execution through the
  kernel command port while keeping the keybinding facade. Consumers to migrate (11 call
  sites via `useUIRuntime().commands` / `.register` / `.execute`); once migrated, the UI
  runtime must create **zero** `new CommandService()`.
- **WB-303**: make `UiScopeProvider` project `ScopeNode` identity/active-state and delete the
  parallel active/dispose tree; wire Dialog/Layer owner cleanup to scope disposal.
- **WB-305**: topmost-Escape / focus-trap-restore / keyboard-ownership rail + renderer a11y
  fixtures (`pnpm test:renderer`, `pnpm verify:ui`).

**Why staged, not done:** these edit the live UI runtime consumed app-wide; the honest
heavy rail is the running Tauri/web app in front of the owner (천공카드: owner-local green ≠
production works). The React host foundation above is the ready substrate for them.

## Verdict

- status: `IN_PROGRESS` — WB-301/304 DONE & verified on `main`; WB-302/303/305 staged with the ledger above.
- next: finish WB-302/303/305 with running-app verification, then `WBT-05`.
- reviewer: pending (owner).
