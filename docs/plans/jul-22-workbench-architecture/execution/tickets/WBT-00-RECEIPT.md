# WBT-00 completion report — Architecture guardrail

- ticket: `WBT-00` (WB-001, WB-002, WB-003, WB-004)
- package: WBT-00
- branch/PR: `feat/wbt-00-architecture-guardrail`
- HEAD: `feat/wbt-00-architecture-guardrail` branch tip (see `git log`)
- worktree status: committed on branch (owner approved including the pre-existing eslint/package/ci edits)
- implementation owner: Jo (assisted)

## Scope

- changed / new:
  - `scripts/ui-infra-audit.mjs` (untracked-new) — added `--root`/`--baseline` flags, baseline `version` fail-closed check, and 5 architecture rules (`workbenchReactImport`, `crossFamilyImport`, `deepImport`, `centralSurfaceSwitch`, `arbitraryProvider`) alongside the existing 5 content rules. Default-mode behaviour and ledger keys unchanged.
  - `scripts/ui-infra-audit.test.mjs` (untracked-new) — `node:test` fixture harness (WB-001): 6 fixture cases + missing-fixture guard + version-2 fail-closed + 6-case evasion/false-positive regression matrix. 14 tests.
  - `tools/ui-infra-fixtures/**` (untracked-new) — `valid` + 5 invalid fixtures (one antipattern each).
  - `tools/ui-infra-ledger.json` (untracked-new) — added the 5 new categories; existing 5 category counts byte-identical.
  - `eslint.config.js` (**modified on top of pre-existing uncommitted edits**) — ignore `tools/ui-infra-fixtures`; add `no-restricted-imports` zone banning React/DOM/router/state/Tauri in `src/shared/workbench/{contract,core}`.
  - `package.json` (**modified on top of pre-existing uncommitted edits**) — `test:ui-infra-audit` script.
  - `.github/workflows/ci.yml` (**modified on top of pre-existing uncommitted edits**) — `Architecture guardrail (fast-fail)` step after install / before Typecheck; removed the duplicate late UI-infra step.
- intentionally unchanged (non-goals honoured): no `src/shared/workbench/**` created; no bulk cleanup of existing violations; no UI runtime / router / tab migration; baseline numbers not inflated.
- out-of-scope follow-up: `@workbench/core/...` (a package literally named `@workbench`) is not matched by `deepImport` — non-existent alias in this repo; informational only.

## RED

- command: `pnpm test:ui-infra-audit`
- expected failure: each invalid fixture makes the real audit exit 1 with **exactly one** expected rule + offending path; valid exits 0; missing fixture makes the harness itself throw; `version: 999` baseline exits 2.
- observed failure → GREEN: each fixture behaves as specified; confirmed pre-fix that removing the rule/regex flips the corresponding case (mutation pairs in the regression matrix: `Provider ?:` caught, `myProvider?:` not caught, `Record<TabKind, React.ComponentType>` caught, `Record<TabKind, TabMeta>` not caught).
- fixture/seed: `tools/ui-infra-fixtures/{valid,invalid-*}` (deterministic; no RNG).

## GREEN

| command | exit | tests/result | artifact |
|---|---:|---|---|
| owner-local `pnpm test:ui-infra-audit` | 0 | 14 pass / 0 fail | node:test |
| `pnpm typecheck` | 0 | tsc -b clean | — |
| `pnpm lint:strict` | 0 | eslint 0 warnings | — |
| `pnpm ui-infra:audit` | 0 | ledger green; new cats `centralSurfaceSwitch:8, arbitraryProvider:1, workbench*:0` | ui-infra-ledger.json |

## Invariants

- [x] no dual-write (audit default mode + ledger keys unchanged; verified vs prior ledger — only 5 categories added, existing counts identical)
- [x] no silent fallback (baseline missing/invalid → exit 2; unknown CLI arg → exit 2)
- [x] no new cross-family import (rule added; 0 today, fail-new)
- [x] no unowned listener/layer/command/resource (n/a for this package)
- [x] migration rollback/idempotency (n/a — no data migration in WBT-00)

## 헬어딧 loop

- round 1: adversarial + objective agents (parallel). Adversarial raised 1 "blocker" (empty-tree vacuous pass) — **rejected as by-design** (fail-new allows decreases; real SCAN_ROOT=src is never empty), + 3 real defects (arbitraryProvider space-evasion, `myProvider?:` false-positive, `React.ComponentType` false-negative) + deepImport relative false-positive.
- fix + TDD: hardened 3 regexes + deepImport relative-skip; added 6-case regression matrix locking each.
- round 2: independent re-audit → **0 new defects**, all 3 fixes CONFIRMED, baseline unchanged. Loop clean.

## Residuals

- legacy adapters remaining: none (guardrail-only package).
- remaining consumers: n/a.
- blocker/deferred: resolved — committed at the `feat/wbt-00-architecture-guardrail` branch tip. Owner approved including the pre-existing `eslint.config.js` / `package.json` / `.github/workflows/ci.yml` edits in the WBT-00 commit.
- next ticket unlocked: `WBT-01` (`READY`).

## Verdict

- status: `DONE` @ the `feat/wbt-00-architecture-guardrail` branch tip (branch feat/wbt-00-architecture-guardrail).
- evidence location: this file; re-verify with `pnpm test:ui-infra-audit && pnpm ui-infra:audit && pnpm typecheck && pnpm lint:strict`.
- reviewer: pending (owner) — branch not yet pushed / PR not opened.
