# L2 Extension-Host Admission RFC (WB-704)

Status: **draft for approval** — no runtime code ships from this RFC. Implementation
is a separate L2 campaign gated on approval of the trust boundaries and owner
assignments below.

## 1. Scope & non-goals

In scope: the *admission boundary* an external extension crosses before any of its
code or contributions touch the workbench — schema conformance, trust/capability/
resource budget, owner teardown, and the threat model. Out of scope here (deferred
to the L2 implementation campaign): the Node/web extension host process, VSIX/Open
VSX install, untrusted code execution, webview sandbox implementation, marketplace/
signing backend.

## 2. Built-in vs external boundary (ADR)

- **Built-in native surfaces** (WBT-05 catalog) are `trust: 'core'`, loaded via
  in-process activators, and are the ONLY path allowed to take privileged/
  chromeless surfaces.
- **External extensions** are `trust: 'trusted' | 'untrusted'`, must pass the
  WBT-01 schema/validator (`schemaArtifact()` golden corpus) before becoming a
  registry-transaction candidate, and are admitted only through `admitExtension`
  (WB-702). A built-in native loader and an external loader **never masquerade as
  the same runtime type**.
- **Host choice (proposed):** external untrusted code runs in a separate process
  (Node host on desktop / Web Worker + iframe-sandboxed webview on web); the
  in-process path is reserved for `core`/first-party `trusted` extensions. Final
  host selection is an L2 ADR.

## 3. Trust boundaries & attacker model

- Attacker = a malicious or compromised external extension package. Assumed
  capabilities: arbitrary code in its own sandbox, crafted manifest, high-rate
  IPC, attempts at capability escalation, resource exhaustion, and crash loops.
- Trust tiers and default budgets are fixed in `contract/admission.ts`
  (`DEFAULT_BUDGETS`). Every denial is typed & auditable; nothing is silently
  dropped. Capability escalation and resource overflow are decided **before
  activation**.
- The kernel already enforces (WBT-02/03/08): scope-owned teardown, context
  sensitivity/durability admission, bounded intent queue, and the
  `ActivationRail` crash-quarantine (no auto-reactivation loop; operator receipt).

## 4. IPC envelope (proposed)

- All host↔extension messages are JSON-safe DTOs validated by the same
  `contract` schemas (no functions/handles crossing the boundary).
- Requests carry `{ ownerId, capability, payloadRef }`; the host resolves
  `payloadRef` against the `ContextStore` lease model — the extension never gets
  a raw payload it wasn't leased.

## 5. Scenarios that MUST be covered before L2 implementation

- process death / restart / version skew between host and extension
- permission revocation mid-session (granted capability removed → in-flight calls fail typed)
- signing verification failure and rollback to the last-good version
- crash loop → quarantine (covered by `ActivationRail`) with operator receipt
- resource overflow (contributions/context bytes/command rate/activation time) → pre-activation denial

## 6. Owners & operational responsibility (to assign at approval)

- schema artifact + golden corpus owner: workbench contract maintainers
- admission policy + budgets owner: workbench platform
- signing / marketplace / host process owner: **unassigned — must be named before any VSIX/Open VSX/webview work begins**

## 7. Approval gate

Per WBT-08 Stop/rollback: **no VSIX/Open VSX/webview/process-host work starts until
this threat model, host ADR, and signing/marketplace owner are approved.** Runtime
code diff from this RFC is 0.
