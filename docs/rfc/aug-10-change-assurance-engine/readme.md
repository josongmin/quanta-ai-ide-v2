# RFC-PR-001 — Quanta Change Assurance Engine

**Status:** Accepted (structure locked) — assurance-kernel refinements in progress
**Date:** 2026-08-10
**Target:** SOTA-grade Change Assurance / Governance Control Plane
**Priority:** P0 Core Architecture
**Scope:** Local agent changes, git commits, GitHub PRs, merge-group changes
**Primary Principle:** *Review is advisory. Evidence is authoritative. Structural risk is discharged, not discounted — it may be **revised upward by new facts**, but is **never lowered by passing tests, reviews, or proofs**.*

---

## 0. What changed from the draft

This supersedes the first draft (`residual-risk`-centric). The load-bearing correction:

> **Evidence does not lower risk. Evidence discharges obligations.**
> Inherent/structural risk and assurance state are **separate axes** and are never collapsed into one score.

Nine adopted changes, all folded in below:

1. **Impact → sensors + coverage/completeness subsystem.** Analysis carries epistemic semantics (`AnalysisFact<T>`), not bare values.
2. **`UNKNOWN` split into `NOT_APPLICABLE` / `UNKNOWN` / `KNOWN`.** Only *relevant* unknown blocks automation.
3. **Scalar residual-risk reduction is deleted.** Replaced by `Inherent Risk` + `Assurance Case`.
4. **Evidence hierarchy → Evidence Lattice** (polarity × soundness × completeness), not a scalar order.
5. **Remediation Loop is a first-class domain** (author ≠ grader).
6. **Budget Governor** added — budget may reduce automation, never assurance requirements.
7. **`AUTO_PASS` is an earned, scoped, expiring grant**, not a default route.
8. **Meta-Governance root-of-trust** — a policy change must be validated by the prior policy; the kernel cannot self-approve.
9. **P0 is a single end-to-end vertical** (Public-API/serialization first, AUTH second), `HUMAN_REQUIRED` throughout — no `AUTO_PASS` until calibrated.

### 0.1 Kernel refinements (this revision)

Six soundness fixes on top of the above (structure stays; these close holes):

1. **`RiskVector` split into three types** — `StructuralRiskAssessment` (revisable by facts, never discounted by evidence) vs `EpistemicState` vs `VerificationPosture` (§8).
2. **`ClaimSpec` is the assurance IR** — typed subject/predicate/scope/assumptions, not string ids (§8.4).
3. **Discharge Algebra** — a monotonic `Claim × DischargeRule × Evidence-set → {Satisfied, Unsatisfied, Refuted, Unknown}` engine replaces any scalar `EvidenceStrength` (§14.2).
4. **Relevant `UNKNOWN` never routes to `HUMAN_SAMPLE`** — it is `NEED_EVIDENCE` (if deterministic evidence can close it) or `HUMAN_REQUIRED`. `AutomationGrant.max_unknown` is deleted for explicit, safety-verified coverage exceptions (§16, §17).
5. **Evidence reuse is dependency-scoped**, not revision-scoped — bound to a semantic dependency-closure digest + assumptions + toolchain, so remediation doesn't invalidate untouched proofs (§14.1).
6. **Explicit Trusted Computing Base (TCB)** — a small, deterministic, no-LLM assurance kernel holds authority; all analyzers/reviewers are untrusted evidence producers outside it (§4.1).

### 0.2 Second-round kernel fixes (this revision)

Eight soundness fixes; structure unchanged:

1. **`InherentRisk` is not frozen** → `StructuralRiskAssessment` bound to a `fact_set_digest`: **revisable upward by new facts, never discounted by evidence** (§8, INV-11).
2. **Cross-revision evidence reuse gated on closure soundness** — an under-approx/heuristic dependency closure (built by an untrusted analyzer) may **not** carry a proof forward (§14.1, INV-19).
3. **`Obligation.required_strength` (scalar) deleted** → `discharge_rule: DischargeRuleId` (§9).
4. **Human approval ≠ technical truth** — attestation discharges governance claims (`AUTH-CHANGE-APPROVED`), never program-property claims (`AUTH-SAFE`) (§14.2, INV-20).
5. **TCB physically pinned** — all *evaluation* lives in `kernel/`; `claims/ obligations/ discharge/ policy/` are authoring-only (§5, §4.1).
6. **Policy-language vs policy-data change split** — a kernel/operator change uses a TCB upgrade ceremony, not the N-1 data path (§18.1, INV-21).
7. **Canonical `ClaimStatus { Satisfied, Unsatisfied, Refuted, Unknown }`** — no `Contested`; richer labels are UI projections (§15).
8. **Build order / P0 de-drifted** — adds `claims/ discharge/ kernel/`; structural risk no longer carries coverage/uncertainty (§26).

Canonical spine (final):
```
Change → Analysis Facts (+coverage semantics) → Structural Hazard Assessment
       → Typed Safety Claims → Discharge Requirements → Evidence Production
       → Evidence Validity → Claim Discharge → Assurance Case
       → Governance Requirements → Authority Decision
```
The whole design in two lines:
```
Structural risk MAY be REVISED by new semantic facts.
Structural risk can NEVER be DISCOUNTED by passing tests / reviews / proofs.
```

---

## 1. Definition

> **The Quanta Change Assurance Engine analyzes the semantic impact of a code change, derives the hazards and inherent risk it carries, compiles risk-proportional verification obligations, gathers evidence to discharge those obligations, assembles a machine-checkable assurance case, and grants integration authority only when that case satisfies policy for the change's inherent risk.**

The system is **not** a code-review tool, an AI reviewer, a PR bot, a Graphite/stacked-diff product, or a GitHub clone. AI reviewers are **replaceable evidence producers** inside it.

### Canonical spine

```
Change → Analysis Facts (+coverage semantics) → Structural Hazard Assessment
       → Typed Safety Claims → Discharge Requirements → Evidence Production
       → Evidence Validity → Claim Discharge → Assurance Case
       → Governance Requirements → Authority Decision
```

Not `risk-scoring`. Not `residual-risk`. The kernel's language is **Claims + Discharge**, not a risk scalar. The heart is the **Assurance Case**: a structured, evidence-backed argument that the obligations for a change's inherent risk have been met.

### Durable assets (the moat — three, not one)

```
Semantic Impact  +  Assurance Semantics  +  Evidence / Policy history
```

Models (Claude / GPT / Gemini / future) are swappable. Risk semantics, evidence contracts, obligation rules, assurance cases, policy history, and the semantic-impact graph accumulate and compound. These are Quanta.

---

## 2. Goals

### G1 — Decouple human review volume from code production volume
Human review must **not** grow linearly with AI-generated change volume.
```
low inherent risk + strong assurance + valid grant → no human
medium                                              → risk-weighted sampling
high inherent risk                                  → mandatory human
relevant coverage hole / critical uncertainty       → NEED_EVIDENCE / block
```
> **Near-term honesty:** with `NOT_APPLICABLE`/`UNKNOWN` discipline, hard-human rules, and `AUTO_PASS` as an *earned* capability, early automation is deliberately near-zero. **Phase 0–1 makes review *better and safer* (risk-focused, evidence-backed); reducing human load is a later, *earned* outcome.** `AUTO_PASS %` is never itself a goal.

### G2 — Route by semantic hazard, not diff size
A 700-LOC generated-fixture change may auto-pass; a 3-LOC authorization change may be human-required. LOC is at most one weak signal.

### G3 — Compile review into a verification plan
Detecting `AUTHORIZATION_BOUNDARY_CHANGED` emits obligations (security review, taint witness, authorization invariant, regression + adversarial tests, human approval) — not a number.

### G4 — Make every decision provable
Every merge decision answers: *why risky? what was required? what evidence discharged which obligation? what remains undischarged? under which policy version was authority granted?*

### G5 — SCM-independent assurance
`local agent patch | commit | branch | GitHub PR | merge group | future SCM` all normalize to one `ChangeSet`. GitHub is an adapter.

---

## 3. Non-Goals (P0)

```
stacked-diff / Graphite-style product
general GitHub clone
bespoke merge queue          (integrate GitHub's; do not rebuild)
project-management system
human-review-replacement UI
LLM-as-merge-authority
```
Stack *workflow* is out of scope. Change **lineage** is preserved (`parent`, `depends_on`, `derived_from`, `supersedes`).

---

## 4. Architecture (V2)

```
                         ┌───────────────────────────────┐
                         │   Meta-Governance /            │
                         │   Policy Root-of-Trust         │  (governs everything below)
                         └───────────────────────────────┘

   SCM / Agent Adapter
         ↓
   ChangeSet
         ↓
   Semantic Impact Sensors
         ↓
   Coverage / Completeness Map        ← epistemic state, not values
         ↓
   Hazard & Risk Claims               ← inherent/structural risk (does NOT decrease)
         ↓
   Obligation Compiler
         ↓
 ┌──────────────────────────────────┐
 │ Assurance Execution Planner      │
 │  + Cost / Latency Governor       │
 └──────────────┬───────────────────┘
        ↓                    ↓
 Deterministic          Agentic reviewers
 verification           (specialist, budgeted)
        └─────────┬──────────┘
                  ↓
           Evidence Lattice           ← polarity × soundness × completeness
                  ↓
           Assurance Case             ← ★ the heart: discharged? how? coverage? residual uncertainty?
                  ↓
           Decision Policy
        ┌─────────┼──────────┬──────────────┐
        ↓         ↓          ↓              ↓
      PASS     HUMAN      HUMAN          NEED_EVIDENCE / BLOCK
              SAMPLE      REQUIRED             │
                                               ▼
                                       Remediation Loop
                                       (author ≠ grader)
                                               │
                                               ▼
                                         New ChangeSet ──→ full re-assessment
        ↓ merge
   SCM integration → merge group → critical revalidation → merge
        ↓
   audit / incidents → Calibration → (earns) Automation Grants
```

### 4.1 Trust boundary — the Assurance TCB

The system is two parts. Everything that *produces* evidence is untrusted and swappable; only a small, deterministic kernel *judges* it and holds integration authority.

```
                UNTRUSTED / EVOLVABLE  (evidence producers)
   ─────────────────────────────────────────────────────────
   semantic analyzers · PTA / taint / codegraph · LLM reviewers
   tests · fuzzers · reproducer agents
                          │  evidence (typed, provenance-bearing)
                          ▼
   ═════════════════════════════════════════════════════════
                 TRUSTED ASSURANCE TCB  (`kernel`)
   ═════════════════════════════════════════════════════════
   claim semantics · obligation compiler · discharge algebra
   evidence validity · policy evaluator · authority grants
   immutable audit
   ═════════════════════════════════════════════════════════
                          │
                          ▼
                  INTEGRATION AUTHORITY
```

**TCB rules:** the kernel is `small · deterministic · no-LLM · no-plugin · no-dynamic-code · property-tested`. No evidence producer can grant authority — it can only submit evidence the kernel evaluates. A crashing/lying analyzer degrades to `UNKNOWN`/`NEED_EVIDENCE`, never to authority (INV-16). This is why the kernel, not any analyzer, is the security-critical surface.

---

## 5. Domain Packages

```
packages/
  contracts/         wire/domain contracts — SSOT, no cross-package internal deps
  changeset/         SCM/agent → canonical ChangeSet (+ lineage)
  impact/            semantic impact sensors + coverage/completeness map
  hazard/            hazards + inherent risk (typed, provenance-bearing)
  claims/            ClaimSpec authoring/AST (spec only — evaluated in kernel/)
  obligations/       obligation spec + compile-rules (authoring — evaluated in kernel/)
  planner/           assurance execution planner + budget governor
  verification/      deterministic verifiers (tests, static, taint, compat, proof)
  review-plan/       risk → reviewer topology + minimum-sufficient context
  ai-review/         specialist reviewers → structured findings
  findings/          finding verification (support / reproduce / refute)
  evidence/          Evidence Lattice + provenance + revision binding
  discharge/         DischargeRule DSL/AST (spec only — evaluated in kernel/)
  assurance/         Assurance Case assembly (projection / human-facing rollups)
  policy/            policy artifacts + hard-human rules + grants (authoring — interpreted in kernel/)
  kernel/            ★ TCB crate — the ONLY thing that grants authority. Evaluators:
                     claim_eval · obligation_eval · discharge_eval · evidence_validity
                     · policy_eval · grant_eval · audit.
                     deterministic · no-LLM · no-plugin · no-dynamic-code · property-tested (§4.1)
  remediation/       obligation → authoring agent → independent verify → re-assess
  integration/       SCM adapters (GitHub check-runs, merge-group)
  triage/            human surface (risk-focused; diff is drill-down)
  calibration/       shadow → canary → grant issuance; audit cohorts
  governance/        policy root-of-trust, signed artifacts, N-1 validation
```

---

## 6. ChangeSet (`changeset`)

```rust
struct ChangeSet {
    id: ChangeSetId,
    repository: RepositoryId,

    base_revision: RevisionId,
    head_revision: RevisionId,
    merge_base: RevisionId,

    changed_files: Vec<FileChange>,
    changed_symbols: Vec<SymbolChange>,

    lineage: ChangeLineage,
    origin: ChangeOrigin,

    author: ActorId,
    created_at: Timestamp,
}

enum ChangeOrigin { LocalAgent, Commit, PullRequest, MergeGroup }

struct ChangeLineage {
    parent:        Option<ChangeSetId>,
    depends_on:    Vec<ChangeSetId>,
    supersedes:    Vec<ChangeSetId>,
    derived_from:  Vec<ChangeSetId>,
}
```
Lineage matters in agent-native flows: `A → B → A'` (A′ caused by B's result) must not be read as three independent PRs.

---

## 7. Semantic Impact Sensors + Coverage Map (`impact`)

Raw diff is an **evidence source**, not the risk model. Sensors derive the semantic impact graph:

```rust
struct ImpactGraph {
    changed_symbols:     Vec<SymbolId>,
    callers_affected:    Set<SymbolId>,
    callees_affected:    Set<SymbolId>,
    taint_paths_affected: Vec<PathId>,
    types_affected:      Set<TypeId>,
    contracts_affected:  Vec<ContractRef>,
    persistence_affected: Vec<PersistenceRef>,
    runtime_surfaces:    Vec<RuntimeSurface>,
    owners:              Vec<OwnerRef>,
}
```

### 7.1 Every analysis result carries epistemic semantics

Bare values are forbidden downstream. Sensors emit facts:

```rust
struct AnalysisFact<T> {
    value: T,
    completeness: Complete | Partial | Unknown,
    semantics:    SoundOverApprox | SoundUnderApprox | Exact | Heuristic,
    scope:        AnalysisScope,
    revision:     RevisionId,
    producer:     AnalyzerId,
    producer_version: Version,
}
```

Why this is load-bearing: a taint analyzer reporting `NO PATH FOUND` means different things by semantics —
- **under-approximation** → `NO PATH FOUND ≠ path does not exist` (**not** absence evidence)
- **sound over-approximation** in scope → may be used as **absence evidence**

`UNKNOWN != LOW` only has teeth once analysis facts distinguish these.

### 7.2 Coverage / Completeness Map

The map of what could and could not be analyzed — a first-class subsystem, not an afterthought:

```rust
struct AnalysisCoverage {
    languages:          Map<Lang, CoverageState>,
    unresolved_symbols: Vec<SymbolRef>,
    dynamic_dispatch:   Vec<SiteRef>,
    reflection:         Vec<SiteRef>,
    ffi:                Vec<SiteRef>,
    generated_code:     Vec<PathRef>,
    config_edges:       Vec<ConfigRef>,
    graph_freshness:    Freshness,
    dirty_tree:         bool,
}
```

> **Scoping note (against "impact is 80%"):** the moat is *Semantic Impact **+** Assurance Semantics **+** Evidence/Policy history*. If we treat impact as the whole product we collapse into "build a great static analyzer." Impact is a **sensor plane feeding** the assurance kernel — excellent but not the entire system.

---

## 8. Hazard & Structural Risk (`hazard`)

The single `RiskVector` is **deleted** — it silently mixed three things that evolve differently. What is immutable is the **change itself**; the *risk assessment* is versioned and revisable as we learn more. Three types, with a strict rule on which axis may move, and how:

```rust
// (1) structural hazard of the change. MAY be REVISED UPWARD by new semantic facts
//     (e.g. dynamic dispatch later resolves → privilege_boundary discovered = Critical).
//     NEVER lowered by verification evidence. Bound to the fact-set it rests on.
struct StructuralRiskAssessment {
    fact_set_digest: Digest,   // which analysis facts produced this assessment
    blast_radius: RiskValue, dependency_fanout: RiskValue, runtime_criticality: RiskValue,
    taint: RiskValue, privilege_boundary: RiskValue, trust_boundary: RiskValue, data_sensitivity: RiskValue,
    public_api: RiskValue, schema: RiskValue, wire_protocol: RiskValue, persistence_contract: RiskValue,
    semantic_complexity: RiskValue, concurrency: RiskValue, state_machine: RiskValue, error_path: RiskValue,
    migration_irreversibility: RiskValue, rollback_difficulty: RiskValue, performance_sensitivity: RiskValue,
}

// (2) what we could / couldn't know — evolves as analyzers run
struct EpistemicState {
    analysis_coverage: AnalysisCoverage,
    analyzer_uncertainty: RiskValue,
    reviewer_uncertainty: RiskValue,
    unresolved_surfaces: Vec<SurfaceRef>,
}

// (3) how well the change is currently verified — evolves as evidence arrives
struct VerificationPosture {
    coverage_delta: RiskValue,
    invariant_coverage: RiskValue,
    evidence_gap: RiskValue,
}
```

The two motions that must never merge (INV-11):
```
new semantic facts   → MAY REVISE structural risk (usually upward)   ✓
verification evidence → MUST NOT DISCOUNT structural risk            ✗
```
Freezing `StructuralRiskAssessment` at first computation would be **unsound**: a hazard discovered only after a later, better analysis (dynamic-dispatch resolved, reflection target found) could never be raised. So it is versioned by `fact_set_digest`, not frozen. `EpistemicState` and `VerificationPosture` evolve separately and feed the assurance case — they are **not** risk.

### 8.1 Applicability is three-valued, and only *relevant* unknown blocks

```rust
enum Applicability { NotApplicable, Unknown, Known(RiskLevel) }
enum RiskLevel { Negligible, Low, Medium, High, Critical }
```

- Rust change, Java reflection analyzer never ran → `NotApplicable` (**not** `Unknown`).
- No FFI in the change → `ffi = NotApplicable`.
- FFI present but target resolution failed → `ffi = Unknown`.

**Critical invariant (refined):**
```
Relevant UNKNOWN cannot contribute to AUTO_PASS.
```
Not every unknown blocks — only a coverage hole on an **applicable** risk surface.

### 8.2 Every risk claim is provenance-bearing

```rust
struct RiskAssertion {
    dimension: RiskDimension,
    level: RiskLevel,
    reason: ReasonCode,
    evidence_refs: Vec<EvidenceId>,
    source: AnalyzerId,
    fact: AnalysisFact<()>,   // completeness/semantics/scope/revision
}
```

Risk rules build on the existing `admission-rules` engine, e.g.:
```
AUTH-001   when changed_symbol reaches auth boundary        → privilege_boundary = Critical
BLAST-003  when transitive callers > threshold              → blast_radius = High
CONTRACT-8 when public serialized type changed              → wire_protocol = High
```

### 8.3 Inherent risk is structural and permanent

```
Inherent / Structural risk        Assurance state (separate axis)
- privilege boundary              - obligations discharged?
- blast radius                    - by what evidence (kind/soundness/completeness)?
- public API / wire               - coverage sufficient?
- irreversible migration          - residual uncertainty?
        │                                 │
   evidence does NOT erase           evidence populates THIS
```

There is **no** `CRITICAL --tests pass--> MEDIUM`. Touching authorization stays structurally critical no matter how much evidence arrives; evidence answers *"are the required obligations met?"*, not *"is the code less risky now?"*.

### 8.4 Safety Claims (`claims`) — the assurance IR

Hazards generate **claims**, and claims — not risk numbers — are what obligations discharge. A `ClaimId` must never be a bare string; that would make the assurance case a pretty checklist. Claims are typed:

```rust
struct ClaimSpec {
    id: ClaimId,
    subject:   ClaimSubject,         // e.g. type FooResponseV2 / symbol authorize()
    predicate: ClaimPredicate,       // e.g. backward_decode_compatible / no_cross_user_read
    scope:     AnalysisScope,
    quantification: Quantification,  // ∀ callers / ∃ path / for-known-roles ...
    assumptions: Vec<AssumptionId>,  // e.g. unknown_fields_ignored
    validity:  ValidityDomain,
}
```
Example — `WIRE-COMPAT` is a specification, not a label:
```
WIRE-COMPAT {
  subject     = FooResponseV2
  predicate   = backward_decode_compatible
  consumers   = production clients <= version X
  schema      = json
  assumptions = unknown_fields_ignored
}
```
Assumptions are first-class: a false assumption invalidates the discharge, and assumptions participate in evidence validity (§14.1). Weak claim semantics ⇒ the whole assurance case degrades to a checklist, so `ClaimSpec` is the kernel's real IR — `RiskVector` was not.

---

## 9. Obligation Compiler (`obligations`)

Deterministic `(Claim, StructuralRiskAssessment) → VerificationPlan`. This is where "review" becomes "what must be proven": each claim (§8.4) compiles to the obligations that discharge it, scaled by structural risk.

```
taint ≥ High        → security-review, static-taint-witness, sink-path-validation
concurrency ≥ High  → concurrency-review, race-test, deterministic-stress-test
public_api ≥ High   → contract-diff, compatibility-check, api-test
privilege_boundary  → security-review, authorization-invariant, adversarial-test, human-approval
```

```rust
struct VerificationPlan { obligations: Vec<Obligation> }

struct Obligation {
    id: ObligationId,
    claim: ClaimId,                     // the safety claim this discharges
    discharge_rule: DischargeRuleId,    // the predicate that must hold (§14.2) — NOT a scalar strength
    reason: Vec<HazardRef>,
    failure_policy: ObligationFailurePolicy,
}
```

> **Who verifies the compiler (soundness liability).** A missing mapping = an unsafe `AUTO_PASS` on the exact thing the system exists to catch. Therefore the compiler is itself versioned and defended by a **mutation harness**: *inject an auth bypass / a wire-break / a race — does the compiled obligation set demand evidence that would catch it?* Compiler completeness is a tracked metric (§16), and the compiler lives under Meta-Governance (§18).

---

## 10. Assurance Execution Planner + Budget Governor (`planner`)

Plans *how* to discharge obligations under a resource budget, and routes deterministic vs agentic work.

```rust
struct VerificationBudget {
    wall_time: Duration, cpu: CpuBudget, memory: MemBudget,
    llm_tokens: TokenBudget, dollars: Money, agent_slots: u32,
}
```

**Budget invariant (hard):**
```
Budget exhaustion may reduce AUTOMATION, never ASSURANCE requirements.
```
```
budget exhausted
   → optional/agentic reviewers stop
   → any required obligation still undischarged?
       YES → NEED_EVIDENCE / MANUAL_ASSURANCE      (never a budget-driven AUTO_PASS)
```
Running out of money can force a human; it can never skip a required proof and pass.

---

## 11. Reviewer Planning + Minimum-Sufficient Context (`review-plan`)

Risk determines reviewer topology — not "run every reviewer."
```
auth change   → security, auth-contract, adversarial
DB migration  → schema, migration, rollback, data-loss
hot loop      → performance, allocation, concurrency
test-only     → test-quality, logic-lite
```
Context is compiled from the change, not the whole repo:
```
changed symbols + top-K callers/callees + relevant types + taint witness
+ affected contracts + selected tests + ownership + historical incidents
```
Principle: **minimum sufficient context** (↓ dilution, ↓ tokens, ↓ false positives, ↑ specialization).

---

## 12. AI Reviewers → Structured Findings (`ai-review`)

Reviewers emit structured findings, never prose comments as the primary artifact:

```rust
struct Finding {
    id: FindingId,
    kind: FindingKind,
    severity: Severity,
    polarity: Supports | Refutes,          // safety-supporting vs hazard-showing
    affected_symbols: Vec<SymbolId>,
    affected_hunks: Vec<HunkId>,
    claim: FindingClaim,
    confidence: Confidence,
    proposed_verification: Vec<VerificationRequest>,
    producer: ReviewerIdentity,
}
```
An AI finding is **candidate evidence**, never authoritative on its own (INV-04).

---

## 13. Finding Verification (`findings`)

Important findings are verified where possible:
```
AI: "authorization bypass possible"
  → attempt: call-path proof | taint witness | reproducer | test | symbolic/static check
```
```rust
enum FindingStatus { Unverified, Supported, Reproduced, Refuted, Inconclusive }
```
> **Honesty:** many findings are undecidable or reproducer-resistant → `Inconclusive` is common and routes to human/more-evidence, not to auto-block-on-confidence. Verification coverage is partial by nature; the economics of per-finding verification are governed by §10.

---

## 14. Evidence Lattice (`evidence`)

Evidence is **not** a scalar ranking. `reproduced failure > proof > test > AI` is deleted — it conflates **polarity** (supports-safe vs shows-unsafe) with **strength**. A reproduced exploit is strong *negative* evidence; 100 passing tests are limited *positive* evidence; they are not comparable on one axis.

```rust
struct Evidence {
    claim: ClaimId,
    polarity:     Supports | Refutes,
    kind:         FormalProof | StaticWitness | Reproducer | Test | DynamicTrace | AIAnalysis | HumanJudgment,
    soundness:    Sound | Bounded | Heuristic,
    completeness: Complete | Partial | Unknown,
    independence: IndependenceClass,
    scope:        AnalysisScope,
    envelope:     EvidenceEnvelope,
}

struct EvidenceEnvelope {
    evidence_id: EvidenceId,
    changeset_id: ChangeSetId,
    revision: RevisionId,          // bound (INV-03)
    producer: ProducerIdentity, producer_version: Version,
    created_at: Timestamp, payload_digest: Digest,
}
```

Discharge is **per-claim** and lattice-aware, e.g.:
```
discharge AUTH-SAFE:
    1 passing unit test                                   ✗
    sound static proof (in scope)                         ✓
    OR authorization-invariant + adversarial tests + human ✓
```
`AI confidence == proof` is never permitted.

### 14.1 Evidence validity is dependency-scoped, not revision-scoped

Binding evidence to a raw revision is too strong: a README typo fix would invalidate an untouched serialization proof, and the Remediation Loop (§21) would then re-analyze *everything* on every iteration — cost/latency explode. Evidence reuse is a **structural necessity** for agent-native flows, not an optimization.

Evidence is bound to the *semantic dependency closure* it actually rests on:
```rust
struct EvidenceValidity {
    revision: RevisionId,
    dependency_slice: Vec<EntityId>,     // symbols/types/contracts the claim depends on
    dependency_digest: Digest,           // hash of that closure's semantic state
    closure_semantics: Exact | SoundOverApprox | Heuristic | Partial,  // HOW the closure was built
    closure_completeness: Complete | Partial | Unknown,
    assumptions_digest: Digest,          // ClaimSpec.assumptions (§8.4)
    toolchain_digest: Digest,            // producer + version
}
```
At a new revision, evidence is **reusable** iff:
```
dependency_digest unchanged  AND  assumptions_digest unchanged
AND toolchain satisfies policy
AND closure_semantics ∈ { Exact, SoundOverApprox }        ← soundness gate
```
> **The closure-semantics gate is soundness, not caching.** The dependency closure is built by an *untrusted* analyzer (§4.1). If it under-approximates and misses a real dependency `C`, then editing `C` leaves `dependency_digest` unchanged and a stale proof would silently re-authorize — **unsound**. So a `Heuristic` / `Partial` / under-approximate closure may **never** carry evidence across revisions; only an exact or sound-over-approximate closure can (INV-19).

Otherwise that evidence → `stale` → selective revalidation of *only* the affected closure (INV-03 refined; INV-07 for merge groups).

### 14.2 Discharge Algebra (`discharge`)

The hard question is not "how strong is one piece of evidence" but **"does this *set* of evidence discharge this claim?"** Collapsing that to a scalar `EvidenceStrength` smuggles scalar scoring back in. Instead, each claim has a **discharge rule** — a monotonic boolean expression over typed evidence:

```
AUTH-SAFE :=                              // a program property — no signature can make it true
    formal_proof(Sound, Complete)
 OR (   invariant_test(Bounded, CompleteFor{known_roles})
    AND adversarial_test(Bounded, Partial)
    AND static_taint(SoundOverApprox, CompleteInScope) )

AUTH-CHANGE-APPROVED :=                    // a governance claim — human judgment IS the evidence
    human_attestation(SecurityApprover)
```
> **Human approval ≠ technical truth.** A `SecurityApprover` cannot make `AUTH-SAFE` (a program property) true by signing; they discharge `AUTH-CHANGE-APPROVED` (a governance authorization). Policy requires **both** for an auth change. `HumanJudgment` evidence is authoritative only for claims that are inherently human (e.g. `MIGRATION-PLAN-REVIEWED`), never for program-property claims (INV-20).
```rust
fn evaluate(claim: &ClaimSpec, rule: &DischargeRule, ev: &EvidenceSet)
    -> Satisfied | Unsatisfied | Refuted | Unknown;
```
Kernel-enforced properties:
- **Monotonic** — adding supporting evidence never flips `Satisfied → Unsatisfied`.
- **Polarity-aware** — any in-scope `Refutes` evidence ⇒ `Refuted`, regardless of supporting evidence (a reproduced exploit is not out-voted by passing tests).
- **Non-scalar** — discharge is rule satisfaction, never a threshold on a sum.

This engine sits beside the Obligation Compiler and is **just as important**: the compiler says *what must be proven*; the discharge algebra says *whether the evidence proves it*. Both live in the TCB (§4.1). (INV-17)

---

## 15. Assurance Case (`assurance`) — the heart

An assurance case is a structured, evidence-backed argument that the obligations for the change's inherent risk are met. It does **not** produce a reduced risk number.

```rust
struct AssuranceCase {
    changeset: ChangeSetId,
    structural_risk: StructuralRiskAssessment,  // revisable by facts, never discounted by evidence (§8)
    claims: Vec<AssuranceClaim>,
}

struct AssuranceClaim {
    claim: ClaimId,                            // e.g. AUTH-SAFE, WIRE-COMPAT
    required: Vec<ObligationId>,
    discharged_by: Vec<EvidenceId>,            // lattice-checked
    status: ClaimStatus,                       // the ONLY canonical state the kernel + policy read
    residual_uncertainty: Uncertainty,
}

// Canonical claim state. There is no `Contested`: any in-scope refuting evidence
// yields `Refuted` (§14.2), so supporting + refuting cannot deadlock. Richer labels
// (PartiallyDischarged, …) are UI projections over these four — never policy inputs.
enum ClaimStatus { Satisfied, Unsatisfied, Refuted, Unknown }

enum AssuranceState { Strong, Partial, Weak, Insufficient }   // human rollup; policy reads ClaimStatus
```

Worked example:
```
AUTH boundary = CRITICAL (inherent — permanent)

Obligations:
  [✓] taint safety claim        (static witness, Sound/Complete)
  [✓] cross-user invariant      (invariant proof)
  [✓] adversarial regression    (reproducer refutes exploit)
  [✓] specialist review         (verified finding)

Assurance = STRONG
BUT inherent structural risk = CRITICAL
→ Decision: HUMAN_REQUIRED
```
Evidence discharged every claim; the change is still structurally critical; policy still requires a human. Two axes, never merged.

---

## 16. Decision Policy (`policy`)

Decision is a function of **(inherent risk, assurance state, hard-human rules, automation grant)** — never a single score.

```rust
enum Decision { NeedEvidence, AutoPass, HumanSample, HumanRequired, Block }
```
```
if critical obligation failed / contested                  → BLOCK
else if relevant UNKNOWN present:
        deterministic evidence can close it?  → NEED_EVIDENCE
        else                                  → HUMAN_REQUIRED   (never HUMAN_SAMPLE)
else if relevant required obligation undischarged           → NEED_EVIDENCE
else if hard-human rule triggered                           → HUMAN_REQUIRED
else if structural risk ∈ {High, Critical}                  → HUMAN_REQUIRED
else if assurance != Strong                                 → HUMAN_SAMPLE
else if valid AutomationGrant covers (risk_class, assurance)→ AUTO_PASS
else                                                        → HUMAN_SAMPLE
```
> A relevant coverage hole must **never** fall into `HUMAN_SAMPLE` — sampling could let an unanalyzed change integrate unseen. Unknown on an *applicable* surface is closed by evidence or seen by a human, always (INV-18).

### 16.1 Hard-human rules (not learnable-away)
```
credential / security boundary · privilege escalation · irreversible migration
payment settlement · cryptographic primitive · high-impact authorization
production destructive op · critical compliance boundary
```
Org-configurable, but protected under Meta-Governance (§18).

### 16.2 Reproducibility
```rust
struct PolicyDecision {
    decision: Decision,
    policy_version: PolicyVersion,
    structural_risk: StructuralRiskAssessment,
    assurance_case: AssuranceCaseId,
    obligations: Vec<ObligationId>,
    evidence: Vec<EvidenceId>,
    grant: Option<AutomationGrantId>,
    timestamp: Timestamp,
}
```
"Why did build X merge?" is answerable deterministically from versioned inputs (INV-06).

---

## 17. Earned Automation (`policy` / `calibration`)

`AUTO_PASS` is a **capability that is earned, scoped, and expires** — not a default route.

```rust
struct AutomationGrant {
    id: AutomationGrantId,
    scope: GrantScope,              // repo / path / change-class
    risk_class: RiskClass,          // only up to some inherent level
    required_assurance: AssuranceState,
    // NO numeric unknown budget — "tolerate N unknowns" is unsafe in an assurance system.
    // Only explicit, safety-verified coverage exceptions are permitted:
    permitted_coverage_exceptions: Vec<ExplicitException>,
    audit_rate: Rate,               // mandatory sampling of granted passes
    issued_by: PolicyVersion,
    expires_at: Timestamp,
}
```
Grants are issued only through the calibration pipeline (§19) and are themselves versioned policy artifacts under Meta-Governance.

---

## 18. Meta-Governance / Policy Root-of-Trust (`governance`)

Quanta governs others' changes; **its own governance must be the strongest.** A new policy must be validated by the **prior** policy — it cannot self-approve.

```
Policy N  ── evaluates ──▶  Policy N+1 change
```
Otherwise: a new policy that says *"this change is now safe ^^"* approves itself — a bootstrap hole.

Protected kernel (special zone):
```
assurance-kernel/ · risk-rules/ · obligation-rules/
hard-human-policy/ · evidence-semantics/ · automation-grants/
```
Controls:
```
signed policy artifact · version · two-person approval
immutable audit · N-1 policy validation · break-glass path
```

### 18.1 Two change classes (the language-bootstrap problem)

Policy N cannot validate a policy that uses operators N doesn't understand — a `V1: AND/OR` evaluator cannot judge `V2: QUORUM(...)`. So governance splits by class:
```
Policy DATA change   (rules / thresholds / grants, existing operators)
    → validated by the N-1 policy evaluator                       (routine, §18)

Policy LANGUAGE / kernel change   (new operators, evaluator, evidence semantics)
    → TCB upgrade ceremony:
        reproducible build · dual approval · compatibility proof
        old + new evaluator dual-run on history · signed release · explicit bootstrap authority
```
A self-hosting assurance engine must never let a kernel/language upgrade ride the data-change path (INV-21).

---

## 19. Calibration & Human Sampling (`calibration`, `triage`)

Thresholds and grants are **not** learned online. Promotion path:
```
candidate policy → historical replay → shadow eval → random audit → canary → production grant
```
Sampling (fights selection bias):
```
AUTO_PASS  → 98% merge / 2% random audit   (audit cohort estimates false-negative rate)
Medium     → risk-weighted sampling
High       → 100% human
```
Calibration signals:
```
human accept/reject · false positive · false negative
post-merge failure · rollback · hotfix · security incident · test regression
```
> **Honesty:** the false-negative signal is rare and lagging; tight tuning is slow. Grants widen conservatively. `AUTO_PASS %` is an output of earned trust, never a target.

---

## 20. SCM Integration + Merge-Group Revalidation (`integration`)

GitHub is an execution adapter.
```
events: pull_request · push · check_run · check_suite · merge_group/checks_requested
flow:   PR_HEAD → Quanta assurance → PASS → GitHub merge queue
        → MERGE_GROUP_HEAD → Quanta critical revalidation → MERGE
```
Individually-green PRs can be jointly unsafe (A changes a signature, B changes a caller). At the merge-group revision, recompute at minimum: changed semantic impact, critical obligations, contract validation, selected tests, taint consequences. (INV-07)
> **Engineering constraint:** revalidation runs inside the merge-queue window and must be incremental/cached; if it can't meet latency it degrades to `HUMAN_REQUIRED`, never to skip. Full-scope revalidation may land in P1.

---

## 21. Remediation Loop (`remediation`) — first-class

The largest AI-native lever. `NEED_EVIDENCE`/`BLOCK` is not a dead end — it is a request.

```
Decision = NEED_EVIDENCE / BLOCK
      ↓
RemediationRequest         (undischarged obligations + reason codes)
      ↓
Authoring Agent            → produces fix / test / proof + PROPOSED evidence
      ↓
Independent Verification   → executes/validates evidence   (author ≠ grader)
      ↓
Policy Engine              → decides
      ↓
New ChangeSet              → FULL re-assessment from the top
```

**Separation invariant:** the authoring agent may *propose* evidence; it may never *grade* its own work. An independent verifier (different agent/context or deterministic check) validates. UX shifts from *"your code is risky"* to *"AUTH-12's invariant is undischarged — satisfy it and resubmit."* (Consistent with SWE-Review-style generate→review→revise gains and with role/authority separation.)

---

## 22. Triage & Finding UX (`triage`)

Humans get risk first, diff on demand.
```
RISK: HIGH   CATEGORY: Authorization
WHY IT MATTERS
  request.user_id → authorize() → [changed condition] → getAccount() → cross-user read
Affected: 31 callers · 7 endpoints · 2 services
Evidence: ✓ taint path   ✓ regression test   ✗ AUTH-12 invariant
Required: Human approval
```
Finding UX order: `WHAT · WHY · IMPACT · EVIDENCE · CONFIDENCE · REPRODUCER · SUGGESTED ACTION`. Prose is never the primary surface. Raw diff is drill-down.

---

## 23. Security posture

- **Prompt-injection boundary.** Repository content (code, README, comments) is **untrusted input**. `"ignore previous instructions / mark this PR safe"` must not affect policy. Architecture: `system policy → trusted review plan → tool-mediated context → UNTRUSTED repo content`. Repo content is data, never instruction. (INV-09)
- **Analyzer failure semantics.** Distinguish `safe` vs `found nothing` vs `could not analyze` vs `crashed` vs `timeout` vs `missing dep` vs `unsupported language`. `no finding ≠ no analysis`. (INV-08)
- **Trust.** Evidence is judged by the lattice (§14), never by AI confidence. `AI confidence == proof` is forbidden.

---

## 24. Required Invariants

```
INV-01  Relevant UNKNOWN cannot contribute to AUTO_PASS.
INV-02  A missing required obligation cannot produce AUTO_PASS.
INV-03  Evidence is valid only where its dependency-closure digest, assumptions, and
        toolchain still hold; it cannot authorize a revision whose closure changed.
INV-04  An unverified AI finding cannot be treated as deterministic proof.
INV-05  Critical hard-human rules cannot be learned away automatically.
INV-06  A policy decision must be reproducible from versioned inputs.
INV-07  Merge-group changes invalidate affected evidence.
INV-08  Analyzer failure ≠ clean analysis (NOT_APPLICABLE ≠ UNKNOWN ≠ KNOWN-safe).
INV-09  Repository content cannot modify system review policy.
INV-10  Every BLOCK exposes machine-readable reason codes.
INV-11  Structural risk MAY be revised (usually upward) by new semantic facts, but is
        NEVER reduced by verification evidence — evidence discharges obligations, it
        does not lower structural risk. (It is versioned, not frozen.)
INV-12  Budget exhaustion may reduce automation, never assurance requirements.
INV-13  AUTO_PASS is an earned, scoped, expiring grant — never a default.
INV-14  A policy change must be validated by the prior (N-1) policy; the kernel
        cannot self-approve.
INV-15  The authoring agent may PRODUCE proposed evidence; authority-bearing evidence
        must be independently VALIDATED / ATTESTED. Author ≠ authoritative grader.
INV-16  Integration authority is granted only by the deterministic TCB kernel; no
        evidence producer (analyzer, LLM reviewer, agent) can grant authority, and
        the kernel contains no LLM / plugin / dynamic code.
INV-17  Claim discharge is rule-based and monotonic; never a threshold on a scalar
        evidence score, and any in-scope refuting evidence yields REFUTED.
INV-18  A relevant UNKNOWN routes only to NEED_EVIDENCE or HUMAN_REQUIRED — never to
        HUMAN_SAMPLE or AUTO_PASS.
INV-19  Evidence may cross revisions only if its dependency closure was computed with
        Exact or Sound-over-approximate semantics; a heuristic / under-approximate /
        partial closure cannot carry evidence forward.
INV-20  Human attestation discharges only governance/authorization claims; it can never
        make a program-property claim (e.g. AUTH-SAFE) true.
INV-21  A policy-language / kernel change follows the TCB upgrade ceremony, not the
        N-1 data-change path; it cannot ship as a data change.
```

---

## 25. Metrics

Not `AI comment count` / `review time`. Primary:
```
Safety      escaped defect rate · escaped critical rate · rollback rate · post-merge incident · security escape
Calibration false-negative rate by risk bucket · false-positive rate · risk calibration error · relevant-unknown rate
            · obligation-compiler completeness (mutation catch rate)
Automation  auto-pass % · human-sample % · human-required % · block % · remediation success rate
Economics   human-review minutes / merged change · verification compute / change · LLM $ / change
```
North star:
```
human review ↓   WHILE   escaped risk ≤ target
```
`AUTO_PASS %` is never itself the objective.

---

## 26. Build Order

Deterministic spine (and its TCB) first; AI plugged in as an evidence producer **last**.
```
1 contracts        2 changeset        3 impact/facts (+coverage semantics)
4 hazard           5 claims           6 obligations
7 evidence         8 discharge        9 assurance
10 kernel + policy (grants = disabled)          11 integration (check-runs)
── deterministic spine + TCB complete here ──
12 planner/budget  13 review-plan     14 ai-review
15 findings        16 remediation     17 calibration     18 governance (root-of-trust)
```
Do **not** build AI-review before the spine is perfect. First complete
`Change → Facts → Structural Hazard → Claims → Obligations → Evidence → Discharge → Assurance → Decision`
deterministically, with the kernel as the sole authority.

### P0 — one end-to-end vertical, `HUMAN_REQUIRED` throughout (no AUTO_PASS)
Chosen first vertical: **Public API / serialization contract** — the oracle is the most deterministic (`change → risk → obligation → compatibility verification → evidence → decision`), which fastest-proves the *spine itself*.
```
P0-1 ChangeSet    GitHub PR + local commit ingestion, revision binding, basic lineage
P0-2 Impact       changed symbols · callers/callees · public-API surface
                  + Epistemic/Posture (separate from structural): coverage map, relevant-unknown
P0-3 Hazard       structural risk (admission link): public_api, wire_protocol, schema
P0-4 Claims+Obl   WIRE-COMPAT claim → obligations: contract-diff + compatibility + api-test
P0-5 Evidence     test · static finding · compat witness (typed, revision/closure-bound)
P0-6 Discharge    DischargeRule eval → ClaimStatus → assurance case
P0-7 Kernel+Pol   kernel evaluators + policy: HUMAN_REQUIRED / NEED_EVIDENCE / BLOCK (AUTO_PASS = OFF)
P0-8 Integration   GitHub check-run publishing + branch protection
```
**P0 success criteria (no AI reviewer involved).** The full spine runs end-to-end —
`change → semantic contract-change detection → typed inherent hazard → claim generation → obligation compile → compat verifier → typed evidence → discharge evaluation → assurance case → HUMAN_REQUIRED / NEED_EVIDENCE / BLOCK` — and provably:
```
100% deterministic replay
100% revision / dependency provenance
mutation-injected contract break is caught
a policy mutation cannot silently weaken assurance
an analyzer crash cannot become a clean analysis
```
The deterministic spine must be perfect *before* any AI reviewer is plugged in.

### P0.5 — second vertical: **AUTH / privilege boundary**
Higher value but a harder oracle (identity model, middleware, config, dynamic dispatch). Enter once taint/callgraph/admission are strong enough. Still `HUMAN_REQUIRED`, still no `AUTO_PASS` — accumulate calibration data.

### P1
```
contract/perf/concurrency reviewers · finding-verification agents · reproducer generation
EvidenceGraph persistence · risk-focused triage UI · random audit · shadow policy
merge-group full revalidation · Remediation Loop hardening · Budget Governor
```
### P2
```
cross-PR semantic interaction · historical incident retrieval · invariant synthesis
policy calibration · org-specific risk models · reviewer budgeting · dynamic evidence strength
first earned AutomationGrants (narrow scope, low inherent risk)
```
### P3 / Frontier — Change Assurance Compiler
On ingestion, automatically: compute impact → predict attack/bug surface → compile obligations →
plan agent topology → select tests/invariants/proofs → execute → build evidence lattice →
assemble assurance case → grant (or withhold) integration authority.

---

## 27. Product Positioning

Quanta is **not** an AI reviewer, a Graphite replacement, a GitHub replacement, or a PR bot.

> **Quanta is a semantic change-assurance and governance engine for AI-native software development.**

```
ordinary AI reviewer:   diff → LLM → comments
Quanta:                 diff → semantic program graph → impact → typed hazard/risk
                         → proof obligations → targeted verification → evidence lattice
                         → assurance case → governed, earned integration authority
```

---

## 28. Architectural North Star

```
AI reviews code.
Quanta decides what must be proven before the code is trusted,
demands evidence or a fix when it isn't,
and grants integration authority only when the assurance case satisfies policy.
```

Adopt:
```
impact-driven · hazard-typed · claim-based · obligation-compiled
discharge-algebra · evidence-lattice · assurance-case-centered
TCB-governed · remediation-closed · earned-automation · human-governed
```
Reject:
```
review-every-line · run-all-agents-always · LOC-gating · AI-confidence-as-proof
residual-risk-as-single-score · stacked-diff-as-core-product · blind online threshold learning
```
Keep:
```
change lineage · GitHub merge-queue integration · human random audit
critical human gates · SCM-independent ChangeSet
```

---

## 29. One-line Architecture

> **The Quanta Change Assurance Engine turns each change into a machine-checkable assurance case — interpreting semantic impact as immutable inherent risk, generating typed safety claims, compiling them into proof obligations, discharging those obligations through a monotonic discharge algebra over a polarity/soundness/completeness-typed evidence lattice, demanding evidence or a fix from the authoring agent when the case is insufficient, and — through a small deterministic trusted kernel — granting integration authority only when the assurance case satisfies a versioned, self-governed policy.**

This definition is the architectural north star for the entire system.
