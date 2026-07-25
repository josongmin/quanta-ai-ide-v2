# WBT-02 completion report — Scope, registry, command kernel

- ticket: `WBT-02` (WB-201..205)
- package: WBT-02
- branch: `main`
- HEAD: branch tip (see `git log`)
- implementation owner: Jo (assisted)

## Scope

- new: `src/shared/workbench/core/{ScopeNode,ContributionRegistry,CommandService,ContextKeyService,IntentBus,index}.ts`
- tests: `core/__tests__/{scopeNode,contributionRegistry,commandService,contextKeyService,intentBus}.test.ts` (28 tests)
- contract: added kernel runtime reason codes to `contract/errors.ts` (one workbench error taxonomy — the kernel uses the contract's error type, not a parallel one).
- wiring: `test:workbench` now covers the whole workbench package (contract + core); CI "Workbench suite" step.
- non-goals honoured: no React provider/hooks, no `shared/ui/runtime` change, no layout/context persistence, no route/tab migration, no host IPC.

## Components

- **ScopeNode (WB-201)** — immutable-parent tree; no re-parent API; child-first, idempotent, isolated dispose (a throwing teardown cannot strand the rest); disposed register/createChild typed-reject; counts 0 after dispose.
- **ContributionRegistry (WB-202)** — validate-all atomic commit (no partial), owner index + unregister, deterministic sorted snapshot + FNV-1a hash (permutation-invariant), observers see committed state only, duplicate/foreign-namespace reason-coded.
- **CommandService (WB-203)** — scope-bound registration reclaimed on dispose; admission (inactive/disposed/capability); deterministic duplicate resolution (latest active seq); abort/timeout/handler-error as distinct typed results; handler guard always resolves (no unhandled rejection).
- **ContextKeyService (WB-204)** — scope-local keys, nearest-scope-shadow projection, dispose restores parent; primitive values only; fail-closed unknown-key/type-mismatch; order-independent when-eval.
- **IntentBus (WB-205)** — addressed/bubble delivery; bounded queue (count/bytes/TTL, injected `nowMs`); per-(owner,key) coalesce that respects the byte budget; overflow/expiry reason-coded (no silent drop); owner cancellation clears pending.

## GREEN

| command | exit | result |
|---|---:|---|
| `pnpm exec vitest run src/shared/workbench/core` | 0 | 5 files / 28 tests |
| `pnpm test:workbench` (contract+core) | 0 | 10 files / 68 tests |
| `pnpm typecheck` | 0 | clean |
| `pnpm lint:strict` | 0 | 0 warnings |
| `pnpm ui-infra:audit` | 0 | core forbidden imports 0 |
| `pnpm audit:cross-slice` | 0 | no core cross-slice edges |

## 헬어딧 loop

- round 1 (adversarial + objective, parallel): adversarial found 3 real issues — **BLOCKER** ScopeNode throwing-disposable aborts teardown; **MAJOR** IntentBus coalesce bypasses maxBytes; **MINOR** TTL boundary inclusive/untested. Objective found 0 (confirmation bias — exactly why the dual lens exists) but confirmed all DoD structurally.
- fix + TDD: isolated dispose; coalesce byte-budget check; documented closed-interval TTL. Added 3 regression tests (throwing-disposable teardown, coalesce byte overflow, ttl boundary).
- round 2 (independent closing re-audit): both fixes CONFIRMED, regressions verified non-vacuous, **0 new defects**. Loop clean.
- both audit agents were sandboxed to /tmp; `git status` confirmed no scratch files left in the tree.

## Invariants

- [x] ScopeNode is the single parent/child authority; resources reclaimed on owner dispose
- [x] no partial commit / no silent drop
- [x] kernel React-free; public exports don't bypass the WBT-01 boundary (deepImport=0)
- [x] one error taxonomy (contract `WorkbenchErrorReason`)

## Verdict

- status: `DONE` on `main`.
- next unlocked: `WBT-03` (workspace/context/layout kernel).
- reviewer: pending (owner) — branch not pushed / PR not opened.
