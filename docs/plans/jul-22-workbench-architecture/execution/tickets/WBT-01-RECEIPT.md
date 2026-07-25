# WBT-01 completion report — React-free contract, compatibility, configuration

- ticket: `WBT-01` (WB-101, WB-102, WB-103, WB-104, WB-106, WB-107, WB-105)
- package: WBT-01
- branch: `main`
- HEAD: branch tip (see `git log`)
- implementation owner: Jo (assisted)

## Scope

- new: `src/shared/workbench/contract/{errors,schemas,featureManifest,surface,command,scope,context,configuration,index}.ts` + `src/shared/workbench/index.ts`
- tests: `contract/__tests__/{manifest,contextCompatibility,serialization,configuration,publicBoundary}.test.ts` (40 tests)
- wiring: `package.json` `test:workbench-contract`; `.github/workflows/ci.yml` "Workbench contract suite" step (after architecture rail, before build)
- non-goals honoured: no React component/loader/handler, no registry/scope/store runtime, no browser/Tauri API, no persisted settings backend, no extension host.

## Design decisions

- **zod is the single source of truth.** TS DTO types are `DeepReadonly<z.infer<typeof schema>>`; runtime parser and JSON Schema (`manifestJsonSchema` via `z.toJSONSchema`) derive from the same schema objects — types and runtime cannot drift (Stop/rollback honoured).
- Reason-coded error union (`WorkbenchErrorReason`, 20 variants); every rejection returns `Result<T>` with `errors[]` (validate-all), never a boolean/string fallback.
- `.strict()` on every object → unknown keys map to a distinct `excess-payload` reason (not `schema-invalid`). Future `schemaVersion` → `unknown-schema-version` (no permissive parse).
- Context handoff policy is deterministic and validate-all: `context-kind-mismatch` / `sensitivity-downgrade` / `durable-secret` / `capability-escalation`.
- Manifest-set integrity is order-independent (ids collected in pass 1, references resolved in pass 2, errors sorted deterministically).
- Settings: precedence `default<user<workspace<folder`; secret-by-reference only (`secret-plaintext` rejects any non-null default); trust gates (`scope-not-allowed`, `untrusted-contribution`); unknown-setting migration returns a typed result.

## GREEN

| command | exit | result |
|---|---:|---|
| `pnpm test:workbench-contract` | 0 | 5 files / 40 tests pass |
| `pnpm typecheck` | 0 | tsc -b clean |
| `pnpm lint:strict` | 0 | 0 warnings |
| `pnpm ui-infra:audit` | 0 | contract forbidden imports 0 (`workbenchReactImport/crossFamilyImport/deepImport = 0`) |
| zero-discovery `vitest run …/nonexistent` | 1 | fails on no test files (WB-105) |

## 헬어딧 loop

- adversarial + objective agents (parallel) on the full contract diff.
- adversarial: **0 real defects** across 100+ probes (type/schema divergence, JSON-safety, reason distinctness, validate-all, order-independence, precedence, determinism). Circular-ref DoS noted as non-defect (input is JSON-parsed; DTOs are ref-only).
- objective: all WB-101..107 DoD PASS. A transient `lint FAIL` it reported was the adversarial agent's scratch file (`audit.test.ts`) existing mid-run; not present on disk — re-verified clean tree lint:strict exit 0.
- residual notes (accepted, not defects): `LayoutPreset`/`ContextReceiver`/scope+port types are hand-written because they are host/runtime contracts, not extension-boundary DTOs parsed from untrusted JSON — no schema to drift from. WB-104 deep-import fail-new is enforced by the WBT-00 `deepImport` rule + `invalid-deep-import` fixture.

## Invariants

- [x] schema/type single SoT (z.infer)
- [x] contract import graph: 0 React/DOM/Router/Zustand/Tauri
- [x] validate-all (one error ⇒ no accepted result)
- [x] order-independent verdict
- [x] no secret plaintext in manifest/config
- [x] no permissive parse of unknown/future versions

## Verdict

- status: `DONE` on `main`.
- next unlocked: `WBT-02` (scope/registry/command kernel).
- reviewer: pending (owner) — branch not pushed / PR not opened.
